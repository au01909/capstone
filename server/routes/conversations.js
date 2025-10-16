const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Person = require('../models/Person');
const { authenticate, authorize, authorizeClientAccess, validateClientId } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const aiService = require('../services/aiService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const clientDir = path.join(uploadPath, req.user._id.toString());
    
    // Create client directory if it doesn't exist
    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }
    
    cb(null, clientDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `conversation-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = (process.env.ALLOWED_AUDIO_TYPES || 'audio/mpeg,audio/wav,audio/mp4,audio/ogg').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB default
  }
});

// @route   POST /api/conversations/upload
// @desc    Upload and process a conversation
// @access  Private
router.post('/upload', authenticate, upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided'
    });
  }

  const { personId, personName, notes } = req.body;
  
  if (!personId && !personName) {
    return res.status(400).json({
      success: false,
      message: 'Either personId or personName is required'
    });
  }

  try {
    // Create conversation record
    const conversation = new Conversation({
      clientId: req.user._id,
      personId: personId || null,
      audioPath: req.file.path,
      audioDuration: 0, // Will be updated after processing
      processingStatus: 'pending',
      notes: notes || ''
    });

    await conversation.save();

    // Process audio in background
    processAudioAsync(conversation._id, req.file.path, personName || 'Unknown');

    res.status(201).json({
      success: true,
      message: 'Audio uploaded successfully. Processing started.',
      data: {
        conversationId: conversation._id,
        status: 'processing'
      }
    });

  } catch (error) {
    // Clean up uploaded file if conversation creation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw error;
  }
}));

// Background function to process audio
async function processAudioAsync(conversationId, audioPath, personName) {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      logger.error('Conversation not found for processing', { conversationId });
      return;
    }

    // Update status to processing
    conversation.processingStatus = 'processing';
    await conversation.save();

    // Read audio file
    const audioBuffer = fs.readFileSync(audioPath);
    const filename = path.basename(audioPath);

    // Process with AI service
    const aiResult = await aiService.processConversation(audioBuffer, filename, personName);

    // Update conversation with AI results
    conversation.transcript = aiResult.transcript;
    conversation.summary = aiResult.summary;
    conversation.keyTopics = aiResult.keyTopics.map(topic => ({ topic, confidence: 0.8 }));
    conversation.emotions = aiResult.emotions.map(emotion => ({ 
      emotion, 
      confidence: 0.7, 
      timestamp: 0 
    }));
    conversation.sentiment = aiResult.sentiment;
    conversation.sentimentScore = aiResult.sentimentScore;
    conversation.keywords = aiResult.keywords;
    conversation.audioDuration = aiResult.duration;
    conversation.language = aiResult.language;
    conversation.processingStatus = 'completed';

    await conversation.save();

    // Create or update person record if personName was provided
    if (personName && !conversation.personId) {
      let person = await Person.findOne({ 
        clientId: conversation.clientId, 
        name: personName 
      });

      if (!person) {
        person = new Person({
          clientId: conversation.clientId,
          name: personName,
          relationship: 'other'
        });
        await person.save();
      }

      conversation.personId = person._id;
      await conversation.save();
    }

    logger.info('Conversation processed successfully', {
      conversationId,
      personName,
      duration: aiResult.duration
    });

  } catch (error) {
    logger.error('Error processing conversation:', error);
    
    // Update conversation status to failed
    await Conversation.findByIdAndUpdate(conversationId, {
      processingStatus: 'failed',
      processingError: error.message
    });
  }
}

// @route   GET /api/conversations/:clientId
// @desc    Get conversations for a client
// @access  Private (Client can only access their own, Admin can access any)
router.get('/:clientId', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { 
    page = 1, 
    limit = 20, 
    personId, 
    sentiment, 
    startDate, 
    endDate,
    search 
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let query = { clientId };

  // Apply filters
  if (personId) query.personId = personId;
  if (sentiment) query.sentiment = sentiment;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  let conversations;
  let total;

  if (search) {
    // Text search
    conversations = await Conversation.search(clientId, search, {
      personId,
      sentiment,
      startDate,
      endDate,
      limit: parseInt(limit),
      skip
    });
    total = conversations.length;
  } else {
    // Regular query
    conversations = await Conversation.find(query)
      .populate('personId', 'name relationship')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    total = await Conversation.countDocuments(query);
  }

  res.json({
    success: true,
    data: {
      conversations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
}));

// @route   GET /api/conversations/:clientId/:conversationId
// @desc    Get a specific conversation
// @access  Private
router.get('/:clientId/:conversationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, conversationId } = req.params;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    clientId
  }).populate('personId', 'name relationship contactInfo');

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  res.json({
    success: true,
    data: { conversation }
  });
}));

// @route   GET /api/conversations/:clientId/stats
// @desc    Get conversation statistics for a client
// @access  Private
router.get('/:clientId/stats', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { startDate, endDate } = req.query;

  const stats = await Conversation.getStats(clientId, startDate, endDate);
  const dailySummaries = await Conversation.getDailySummaries(clientId, 7);

  res.json({
    success: true,
    data: {
      stats: stats[0] || {
        totalConversations: 0,
        totalDuration: 0,
        avgDuration: 0,
        avgSentimentScore: 0,
        positiveConversations: 0,
        negativeConversations: 0,
        neutralConversations: 0
      },
      dailySummaries
    }
  });
}));

// @route   GET /api/conversations/:clientId/by-person/:personId
// @desc    Get conversations with a specific person
// @access  Private
router.get('/:clientId/by-person/:personId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, personId } = req.params;
  const { limit = 10, skip = 0 } = req.query;

  const conversations = await Conversation.getByPerson(
    clientId, 
    personId, 
    parseInt(limit), 
    parseInt(skip)
  );

  res.json({
    success: true,
    data: { conversations }
  });
}));

// @route   PUT /api/conversations/:clientId/:conversationId
// @desc    Update a conversation
// @access  Private
router.put('/:clientId/:conversationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, conversationId } = req.params;
  const { notes, tags, isPrivate } = req.body;

  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, clientId },
    { notes, tags, isPrivate },
    { new: true, runValidators: true }
  );

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  logger.audit('conversation_updated', req.user._id, {
    conversationId,
    fields: Object.keys(req.body)
  });

  res.json({
    success: true,
    message: 'Conversation updated successfully',
    data: { conversation }
  });
}));

// @route   DELETE /api/conversations/:clientId/:conversationId
// @desc    Delete a conversation
// @access  Private
router.delete('/:clientId/:conversationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, conversationId } = req.params;

  const conversation = await Conversation.findOne({ _id: conversationId, clientId });
  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  // Delete audio file
  if (conversation.audioPath && fs.existsSync(conversation.audioPath)) {
    fs.unlinkSync(conversation.audioPath);
  }

  await Conversation.findByIdAndDelete(conversationId);

  logger.audit('conversation_deleted', req.user._id, {
    conversationId,
    clientId
  });

  res.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
}));

// @route   GET /api/conversations/:clientId/audio/:conversationId
// @desc    Stream audio file
// @access  Private
router.get('/:clientId/audio/:conversationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, conversationId } = req.params;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    clientId
  });

  if (!conversation) {
    return res.status(404).json({
      success: false,
      message: 'Conversation not found'
    });
  }

  if (!conversation.audioPath || !fs.existsSync(conversation.audioPath)) {
    return res.status(404).json({
      success: false,
      message: 'Audio file not found'
    });
  }

  // Set appropriate headers for audio streaming
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(conversation.audioPath)}"`);

  // Stream the audio file
  const audioStream = fs.createReadStream(conversation.audioPath);
  audioStream.pipe(res);

  audioStream.on('error', (error) => {
    logger.error('Error streaming audio:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error streaming audio file'
      });
    }
  });
}));

module.exports = router;
