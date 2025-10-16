const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Person = require('../models/Person');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// All admin routes require admin role
router.use(authenticate);
router.use(authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', asyncHandler(async (req, res) => {
  // Get total users
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const totalClients = await User.countDocuments({ role: 'client' });
  const totalAdmins = await User.countDocuments({ role: 'admin' });

  // Get total conversations
  const totalConversations = await Conversation.countDocuments();
  const completedConversations = await Conversation.countDocuments({ processingStatus: 'completed' });
  const pendingConversations = await Conversation.countDocuments({ processingStatus: 'pending' });
  const processingConversations = await Conversation.countDocuments({ processingStatus: 'processing' });
  const failedConversations = await Conversation.countDocuments({ processingStatus: 'failed' });

  // Get total people
  const totalPeople = await Person.countDocuments();
  const activePeople = await Person.countDocuments({ isActive: true });

  // Get total notifications
  const totalNotifications = await Notification.countDocuments();
  const activeNotifications = await Notification.countDocuments({ isActive: true });

  // Get today's statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayConversations = await Conversation.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow }
  });

  const todayUsers = await User.countDocuments({
    createdAt: { $gte: today, $lt: tomorrow }
  });

  // Get recent activity
  const recentConversations = await Conversation.find()
    .populate('clientId', 'name email')
    .populate('personId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('name email role createdAt lastLogin');

  res.json({
    success: true,
    data: {
      overview: {
        totalUsers,
        activeUsers,
        totalClients,
        totalAdmins,
        totalConversations,
        completedConversations,
        pendingConversations,
        processingConversations,
        failedConversations,
        totalPeople,
        activePeople,
        totalNotifications,
        activeNotifications
      },
      today: {
        conversations: todayConversations,
        newUsers: todayUsers
      },
      recentActivity: {
        conversations: recentConversations,
        users: recentUsers
      }
    }
  });
}));

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Private (Admin only)
router.get('/users', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    role, 
    isActive, 
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let query = {};

  // Apply filters
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const users = await User.find(query)
    .select('-password')
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
}));

// @route   GET /api/admin/users/:userId
// @desc    Get a specific user
// @access  Private (Admin only)
router.get('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select('-password');
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get user's conversations count
  const conversationsCount = await Conversation.countDocuments({ clientId: userId });
  
  // Get user's people count
  const peopleCount = await Person.countDocuments({ clientId: userId });

  // Get user's notifications count
  const notificationsCount = await Notification.countDocuments({ clientId: userId });

  res.json({
    success: true,
    data: {
      user,
      stats: {
        conversationsCount,
        peopleCount,
        notificationsCount
      }
    }
  });
}));

// @route   PUT /api/admin/users/:userId
// @desc    Update a user
// @access  Private (Admin only)
router.put('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, role, isActive, notificationPreferences } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (notificationPreferences) updateData.notificationPreferences = notificationPreferences;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  logger.audit('admin_user_updated', req.user._id, {
    targetUserId: userId,
    fields: Object.keys(updateData)
  });

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
}));

// @route   DELETE /api/admin/users/:userId
// @desc    Delete a user
// @access  Private (Admin only)
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Prevent admin from deleting themselves
  if (userId === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete your own account'
    });
  }

  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  logger.audit('admin_user_deleted', req.user._id, {
    targetUserId: userId,
    targetUserEmail: user.email
  });

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

// @route   GET /api/admin/conversations
// @desc    Get all conversations with pagination and filters
// @access  Private (Admin only)
router.get('/conversations', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    clientId, 
    processingStatus, 
    sentiment,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let query = {};

  // Apply filters
  if (clientId) query.clientId = clientId;
  if (processingStatus) query.processingStatus = processingStatus;
  if (sentiment) query.sentiment = sentiment;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const conversations = await Conversation.find(query)
    .populate('clientId', 'name email')
    .populate('personId', 'name relationship')
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Conversation.countDocuments(query);

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

// @route   GET /api/admin/notifications
// @desc    Get all notifications with pagination and filters
// @access  Private (Admin only)
router.get('/notifications', asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    clientId, 
    type, 
    status,
    isActive,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let query = {};

  // Apply filters
  if (clientId) query.clientId = clientId;
  if (type) query.type = type;
  if (status) query.status = status;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const notifications = await Notification.find(query)
    .populate('clientId', 'name email')
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Notification.countDocuments(query);

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }
  });
}));

// @route   GET /api/admin/analytics
// @desc    Get system analytics
// @access  Private (Admin only)
router.get('/analytics', asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // days
  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // User registration trends
  const userTrends = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  // Conversation trends
  const conversationTrends = await Conversation.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$audioDuration' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  // Sentiment analysis
  const sentimentAnalysis = await Conversation.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        processingStatus: 'completed'
      }
    },
    {
      $group: {
        _id: '$sentiment',
        count: { $sum: 1 },
        avgScore: { $avg: '$sentimentScore' }
      }
    }
  ]);

  // Processing status distribution
  const processingStatus = await Conversation.aggregate([
    {
      $group: {
        _id: '$processingStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  // Top people by interaction count
  const topPeople = await Person.aggregate([
    {
      $group: {
        _id: '$name',
        interactionCount: { $sum: '$interactionCount' },
        uniqueClients: { $addToSet: '$clientId' }
      }
    },
    {
      $project: {
        name: '$_id',
        interactionCount: 1,
        clientCount: { $size: '$uniqueClients' }
      }
    },
    {
      $sort: { interactionCount: -1 }
    },
    {
      $limit: 10
    }
  ]);

  res.json({
    success: true,
    data: {
      period: days,
      userTrends,
      conversationTrends,
      sentimentAnalysis,
      processingStatus,
      topPeople
    }
  });
}));

// @route   POST /api/admin/system/cleanup
// @desc    Perform system cleanup tasks
// @access  Private (Admin only)
router.post('/system/cleanup', asyncHandler(async (req, res) => {
  const { tasks = ['failed-conversations', 'old-notifications'] } = req.body;
  const results = {};

  try {
    // Clean up failed conversations older than 7 days
    if (tasks.includes('failed-conversations')) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const deletedConversations = await Conversation.deleteMany({
        processingStatus: 'failed',
        createdAt: { $lt: sevenDaysAgo }
      });
      
      results.failedConversations = deletedConversations.deletedCount;
    }

    // Clean up old notifications
    if (tasks.includes('old-notifications')) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deletedNotifications = await Notification.deleteMany({
        type: 'reminder',
        status: 'sent',
        createdAt: { $lt: thirtyDaysAgo }
      });
      
      results.oldNotifications = deletedNotifications.deletedCount;
    }

    logger.audit('admin_system_cleanup', req.user._id, {
      tasks,
      results
    });

    res.json({
      success: true,
      message: 'System cleanup completed',
      data: { results }
    });
  } catch (error) {
    logger.error('System cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'System cleanup failed',
      error: error.message
    });
  }
}));

module.exports = router;
