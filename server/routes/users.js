const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Person = require('../models/Person');
const { authenticate, authorize, authorizeClientAccess, validateClientId } = require('../middleware/auth');
const { validate, personSchema, profileSchema } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @route   GET /api/users/:clientId/people
// @desc    Get people associated with a client
// @access  Private
router.get('/:clientId/people', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { page = 1, limit = 20, relationship, search } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let query = { clientId, isActive: true };

  // Apply filters
  if (relationship) query.relationship = relationship;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  const people = await Person.find(query)
    .sort({ lastSeen: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Person.countDocuments(query);

  res.json({
    success: true,
    data: {
      people,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
}));

// @route   POST /api/users/:clientId/people
// @desc    Create a new person
// @access  Private
router.post('/:clientId/people', authenticate, authorizeClientAccess, validateClientId, validate(personSchema), asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const personData = req.body;

  const person = new Person({
    clientId,
    ...personData
  });

  await person.save();

  logger.audit('person_created', req.user._id, {
    personId: person._id,
    clientId,
    name: person.name
  });

  res.status(201).json({
    success: true,
    message: 'Person created successfully',
    data: { person }
  });
}));

// @route   GET /api/users/:clientId/people/:personId
// @desc    Get a specific person
// @access  Private
router.get('/:clientId/people/:personId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, personId } = req.params;

  const person = await Person.findOne({
    _id: personId,
    clientId
  });

  if (!person) {
    return res.status(404).json({
      success: false,
      message: 'Person not found'
    });
  }

  res.json({
    success: true,
    data: { person }
  });
}));

// @route   PUT /api/users/:clientId/people/:personId
// @desc    Update a person
// @access  Private
router.put('/:clientId/people/:personId', authenticate, authorizeClientAccess, validate(personSchema), asyncHandler(async (req, res) => {
  const { clientId, personId } = req.params;
  const updateData = req.body;

  const person = await Person.findOneAndUpdate(
    { _id: personId, clientId },
    updateData,
    { new: true, runValidators: true }
  );

  if (!person) {
    return res.status(404).json({
      success: false,
      message: 'Person not found'
    });
  }

  logger.audit('person_updated', req.user._id, {
    personId,
    clientId,
    fields: Object.keys(updateData)
  });

  res.json({
    success: true,
    message: 'Person updated successfully',
    data: { person }
  });
}));

// @route   DELETE /api/users/:clientId/people/:personId
// @desc    Delete a person
// @access  Private
router.delete('/:clientId/people/:personId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, personId } = req.params;

  const person = await Person.findOneAndDelete({
    _id: personId,
    clientId
  });

  if (!person) {
    return res.status(404).json({
      success: false,
      message: 'Person not found'
    });
  }

  logger.audit('person_deleted', req.user._id, {
    personId,
    clientId,
    name: person.name
  });

  res.json({
    success: true,
    message: 'Person deleted successfully'
  });
}));

// @route   GET /api/users/:clientId/people/:personId/conversations
// @desc    Get conversations with a specific person
// @access  Private
router.get('/:clientId/people/:personId/conversations', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, personId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const conversations = await require('../models/Conversation').find({
    clientId,
    personId,
    processingStatus: 'completed'
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await require('../models/Conversation').countDocuments({
    clientId,
    personId,
    processingStatus: 'completed'
  });

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

// @route   GET /api/users/:clientId/people/stats
// @desc    Get people interaction statistics
// @access  Private
router.get('/:clientId/people/stats', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const stats = await Person.getInteractionStats(clientId);

  res.json({
    success: true,
    data: { stats }
  });
}));

// @route   PUT /api/users/:clientId/profile
// @desc    Update user profile
// @access  Private
router.put('/:clientId/profile', authenticate, authorizeClientAccess, validateClientId, validate(profileSchema), asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const profileData = req.body;

  const user = await User.findByIdAndUpdate(
    clientId,
    { profile: profileData },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  logger.audit('profile_updated', req.user._id, {
    clientId,
    fields: Object.keys(profileData)
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { profile: user.profile }
  });
}));

// @route   GET /api/users/:clientId/profile
// @desc    Get user profile
// @access  Private
router.get('/:clientId/profile', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const user = await User.findById(clientId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { profile: user.profile }
  });
}));

// @route   GET /api/users/:clientId/dashboard
// @desc    Get dashboard data for a client
// @access  Private
router.get('/:clientId/dashboard', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  // Get recent conversations
  const recentConversations = await require('../models/Conversation').find({
    clientId,
    processingStatus: 'completed'
  })
    .populate('personId', 'name relationship')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get people count
  const peopleCount = await Person.countDocuments({ clientId, isActive: true });

  // Get today's conversation count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayConversations = await require('../models/Conversation').countDocuments({
    clientId,
    createdAt: { $gte: today, $lt: tomorrow },
    processingStatus: 'completed'
  });

  // Get unread notifications count
  const unreadNotifications = await require('../models/Notification').countDocuments({
    clientId,
    'metadata.read': { $ne: true }
  });

  // Get most frequent people
  const frequentPeople = await Person.find({ clientId, isActive: true })
    .sort({ interactionCount: -1 })
    .limit(5)
    .select('name relationship interactionCount lastSeen');

  res.json({
    success: true,
    data: {
      recentConversations,
      peopleCount,
      todayConversations,
      unreadNotifications,
      frequentPeople
    }
  });
}));

// @route   POST /api/users/:clientId/people/:personId/face-embedding
// @desc    Update face embedding for a person
// @access  Private
router.post('/:clientId/people/:personId/face-embedding', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, personId } = req.params;
  const { faceEmbedding } = req.body;

  if (!Array.isArray(faceEmbedding)) {
    return res.status(400).json({
      success: false,
      message: 'Face embedding must be an array'
    });
  }

  const person = await Person.findOneAndUpdate(
    { _id: personId, clientId },
    { faceEmbedding },
    { new: true, runValidators: true }
  );

  if (!person) {
    return res.status(404).json({
      success: false,
      message: 'Person not found'
    });
  }

  logger.audit('face_embedding_updated', req.user._id, {
    personId,
    clientId
  });

  res.json({
    success: true,
    message: 'Face embedding updated successfully',
    data: { person }
  });
}));

// @route   POST /api/users/:clientId/people/:personId/voice-embedding
// @desc    Update voice embedding for a person
// @access  Private
router.post('/:clientId/people/:personId/voice-embedding', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, personId } = req.params;
  const { voiceEmbedding } = req.body;

  if (!Array.isArray(voiceEmbedding)) {
    return res.status(400).json({
      success: false,
      message: 'Voice embedding must be an array'
    });
  }

  const person = await Person.findOneAndUpdate(
    { _id: personId, clientId },
    { voiceEmbedding },
    { new: true, runValidators: true }
  );

  if (!person) {
    return res.status(404).json({
      success: false,
      message: 'Person not found'
    });
  }

  logger.audit('voice_embedding_updated', req.user._id, {
    personId,
    clientId
  });

  res.json({
    success: true,
    message: 'Voice embedding updated successfully',
    data: { person }
  });
}));

module.exports = router;
