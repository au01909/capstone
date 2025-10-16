const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authenticate, authorizeClientAccess, validateClientId } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const offlineAiService = require('../services/offlineAiService');
const localStorageService = require('../services/localStorageService');
const cleanupService = require('../services/cleanupService');
const logger = require('../utils/logger');

// Configure multer for file uploads to local storage
const storage = multer.memoryStorage(); // Store in memory for processing

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

// @route   POST /api/offline/conversations/upload
// @desc    Upload and process a conversation offline
// @access  Private
router.post('/upload', authenticate, upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No audio file provided'
    });
  }

  const { personName, notes } = req.body;
  
  if (!personName) {
    return res.status(400).json({
      success: false,
      message: 'Person name is required'
    });
  }

  try {
    const userId = req.user._id.toString();
    const filename = `conversation_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;

    // Save audio file to local storage
    const audioPath = await localStorageService.saveAudioFile(userId, req.file.buffer, filename);

    // Process audio in background
    processAudioOfflineAsync(userId, req.file.buffer, filename, personName, notes);

    res.status(201).json({
      success: true,
      message: 'Audio uploaded successfully. Processing started offline.',
      data: {
        filename,
        status: 'processing',
        personName
      }
    });

  } catch (error) {
    logger.error('Error uploading audio for offline processing:', error);
    throw error;
  }
}));

// Background function to process audio offline
async function processAudioOfflineAsync(userId, audioBuffer, filename, personName, notes = '') {
  try {
    logger.info('Starting offline audio processing', { userId, filename, personName });

    // Process with offline AI service
    const aiResult = await offlineAiService.processConversation(audioBuffer, filename, personName);

    // Create conversation data for local storage
    const conversationData = {
      _id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      personName,
      audioPath: path.join(__dirname, '../../local-storage/audio', userId, filename),
      transcript: aiResult.transcript,
      summary: aiResult.summary,
      keyTopics: aiResult.keyTopics,
      emotions: aiResult.emotions,
      sentiment: aiResult.sentiment,
      sentimentScore: aiResult.sentimentScore,
      keywords: aiResult.keywords,
      duration: aiResult.duration,
      language: aiResult.language,
      processingStatus: 'completed',
      notes,
      metadata: {
        recordingDevice: 'offline',
        audioQuality: 'medium',
        backgroundNoise: 'low',
        speakerCount: 2
      }
    };

    // Save conversation to local storage
    await localStorageService.saveConversation(userId, conversationData);

    logger.info('Offline conversation processed successfully', {
      userId,
      filename,
      personName,
      duration: aiResult.duration
    });

  } catch (error) {
    logger.error('Error processing conversation offline:', error);
    throw error;
  }
}

// @route   GET /api/offline/conversations/:userId
// @desc    Get conversations for a user from local storage
// @access  Private (User can only access their own)
router.get('/:userId', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { 
    page = 1, 
    limit = 20, 
    personName,
    search 
  } = req.query;

  // Verify user can only access their own data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get conversations from local storage
    const result = await localStorageService.getConversations(
      userId, 
      personName, 
      parseInt(limit), 
      offset
    );

    // Apply search filter if provided
    let filteredConversations = result.conversations;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredConversations = result.conversations.filter(conv => 
        conv.transcript.toLowerCase().includes(searchLower) ||
        conv.summary.toLowerCase().includes(searchLower) ||
        conv.personName.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: {
        conversations: filteredConversations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredConversations.length / parseInt(limit)),
          totalItems: filteredConversations.length,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error getting offline conversations:', error);
    throw error;
  }
}));

// @route   GET /api/offline/conversations/:userId/:conversationId
// @desc    Get a specific conversation from local storage
// @access  Private
router.get('/:userId/:conversationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;

  // Verify user can only access their own data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  try {
    const conversation = await localStorageService.getConversation(userId, conversationId);

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
  } catch (error) {
    logger.error('Error getting offline conversation:', error);
    throw error;
  }
}));

// @route   GET /api/offline/conversations/:userId/by-person/:personName
// @desc    Get conversations with a specific person from local storage
// @access  Private
router.get('/:userId/by-person/:personName', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { userId, personName } = req.params;
  const { limit = 20 } = req.query;

  // Verify user can only access their own data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  try {
    const conversations = await localStorageService.getConversationsByPerson(userId, personName, parseInt(limit));

    res.json({
      success: true,
      data: { conversations }
    });
  } catch (error) {
    logger.error('Error getting conversations by person:', error);
    throw error;
  }
}));

// @route   DELETE /api/offline/conversations/:userId/:conversationId
// @desc    Delete a conversation from local storage
// @access  Private
router.delete('/:userId/:conversationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;

  // Verify user can only access their own data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  try {
    await localStorageService.deleteConversation(userId, conversationId);

    logger.audit('offline_conversation_deleted', req.user._id, {
      conversationId,
      userId
    });

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting offline conversation:', error);
    throw error;
  }
}));

// @route   GET /api/offline/conversations/:userId/stats
// @desc    Get conversation statistics from local storage
// @access  Private
router.get('/:userId/stats', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Verify user can only access their own data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  try {
    const result = await localStorageService.getConversations(userId, null, 1000); // Get all conversations for stats
    const conversations = result.conversations;

    // Calculate statistics
    const stats = {
      totalConversations: conversations.length,
      totalDuration: conversations.reduce((sum, conv) => sum + (conv.duration || 0), 0),
      avgDuration: conversations.length > 0 ? 
        conversations.reduce((sum, conv) => sum + (conv.duration || 0), 0) / conversations.length : 0,
      avgSentimentScore: conversations.length > 0 ? 
        conversations.reduce((sum, conv) => sum + (conv.sentimentScore || 0), 0) / conversations.length : 0,
      positiveConversations: conversations.filter(conv => conv.sentiment === 'positive').length,
      negativeConversations: conversations.filter(conv => conv.sentiment === 'negative').length,
      neutralConversations: conversations.filter(conv => conv.sentiment === 'neutral').length,
      peopleCount: new Set(conversations.map(conv => conv.personName)).size
    };

    // Group by person
    const personStats = {};
    conversations.forEach(conv => {
      if (!personStats[conv.personName]) {
        personStats[conv.personName] = {
          conversationCount: 0,
          totalDuration: 0,
          avgSentiment: 0,
          lastConversation: null
        };
      }
      
      personStats[conv.personName].conversationCount++;
      personStats[conv.personName].totalDuration += conv.duration || 0;
      
      const convDate = new Date(conv.timestamp);
      if (!personStats[conv.personName].lastConversation || convDate > new Date(personStats[conv.personName].lastConversation)) {
        personStats[conv.personName].lastConversation = conv.timestamp;
      }
    });

    // Calculate average sentiment per person
    Object.keys(personStats).forEach(person => {
      const personConversations = conversations.filter(conv => conv.personName === person);
      personStats[person].avgSentiment = personConversations.length > 0 ? 
        personConversations.reduce((sum, conv) => sum + (conv.sentimentScore || 0), 0) / personConversations.length : 0;
    });

    res.json({
      success: true,
      data: {
        stats,
        personStats
      }
    });
  } catch (error) {
    logger.error('Error getting offline conversation stats:', error);
    throw error;
  }
}));

// @route   GET /api/offline/conversations/:userId/audio/:conversationId
// @desc    Stream audio file from local storage
// @access  Private
router.get('/:userId/audio/:conversationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { userId, conversationId } = req.params;

  // Verify user can only access their own data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  try {
    const conversation = await localStorageService.getConversation(userId, conversationId);

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
      logger.error('Error streaming audio from local storage:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming audio file'
        });
      }
    });
  } catch (error) {
    logger.error('Error streaming audio from local storage:', error);
    throw error;
  }
}));

// @route   POST /api/offline/conversations/:userId/cleanup
// @desc    Manually trigger cleanup of old recordings
// @access  Private (Admin only)
router.post('/:userId/cleanup', authenticate, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { monthsOld } = req.body;

  // Only admins can trigger cleanup
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  try {
    const result = await cleanupService.cleanupUser(userId, monthsOld);

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error during manual cleanup:', error);
    throw error;
  }
}));

// @route   GET /api/offline/conversations/:userId/storage-stats
// @desc    Get local storage statistics
// @access  Private
router.get('/:userId/storage-stats', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Verify user can only access their own data
  if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  try {
    const stats = await localStorageService.getStorageStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting storage stats:', error);
    throw error;
  }
}));

module.exports = router;
