const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate, authorize, authorizeClientAccess, validateClientId } = require('../middleware/auth');
const { validate, notificationSchema, notificationPreferencesSchema } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// @route   GET /api/notifications/:clientId
// @desc    Get notifications for a client
// @access  Private
router.get('/:clientId', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { page = 1, limit = 20, type, status } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let query = { clientId };

  // Apply filters
  if (type) query.type = type;
  if (status) query.status = status;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
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

// @route   POST /api/notifications/:clientId
// @desc    Create a new notification
// @access  Private
router.post('/:clientId', authenticate, authorizeClientAccess, validateClientId, validate(notificationSchema), asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const notificationData = req.body;

  const notification = await notificationService.createNotification(clientId, notificationData);

  logger.audit('notification_created', req.user._id, {
    notificationId: notification._id,
    clientId,
    type: notification.type
  });

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: { notification }
  });
}));

// @route   PUT /api/notifications/:clientId/preferences
// @desc    Update notification preferences
// @access  Private
router.put('/:clientId/preferences', authenticate, authorizeClientAccess, validateClientId, validate(notificationPreferencesSchema), asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const preferences = req.body;

  const updatedPreferences = await notificationService.updateNotificationPreferences(clientId, preferences);

  logger.audit('notification_preferences_updated', req.user._id, {
    clientId,
    preferences
  });

  res.json({
    success: true,
    message: 'Notification preferences updated successfully',
    data: { preferences: updatedPreferences }
  });
}));

// @route   GET /api/notifications/:clientId/preferences
// @desc    Get notification preferences
// @access  Private
router.get('/:clientId/preferences', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const user = await require('../models/User').findById(clientId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { preferences: user.notificationPreferences }
  });
}));

// @route   PUT /api/notifications/:clientId/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/:clientId/:notificationId/read', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, notificationId } = req.params;

  const notification = await notificationService.markNotificationAsRead(notificationId, clientId);

  logger.audit('notification_marked_read', req.user._id, {
    notificationId,
    clientId
  });

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification }
  });
}));

// @route   DELETE /api/notifications/:clientId/:notificationId
// @desc    Delete a notification
// @access  Private
router.delete('/:clientId/:notificationId', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    clientId
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  logger.audit('notification_deleted', req.user._id, {
    notificationId,
    clientId
  });

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
}));

// @route   POST /api/notifications/:clientId/daily-summary
// @desc    Create daily summary notification
// @access  Private
router.post('/:clientId/daily-summary', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const notification = await notificationService.createDailySummaryNotification(clientId);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'No conversations found for today'
    });
  }

  logger.audit('daily_summary_created', req.user._id, {
    notificationId: notification._id,
    clientId
  });

  res.status(201).json({
    success: true,
    message: 'Daily summary notification created successfully',
    data: { notification }
  });
}));

// @route   GET /api/notifications/:clientId/stats
// @desc    Get notification statistics
// @access  Private
router.get('/:clientId/stats', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { startDate, endDate } = req.query;

  const stats = await Notification.getStats(clientId, startDate, endDate);

  res.json({
    success: true,
    data: { stats: stats[0] || {
      totalNotifications: 0,
      sentNotifications: 0,
      deliveredNotifications: 0,
      failedNotifications: 0,
      activeNotifications: 0
    }}
  });
}));

// @route   PUT /api/notifications/:clientId/:notificationId/activate
// @desc    Activate/deactivate a notification
// @access  Private
router.put('/:clientId/:notificationId/activate', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, notificationId } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'isActive must be a boolean value'
    });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, clientId },
    { isActive },
    { new: true, runValidators: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  // Recalculate next trigger time if activating
  if (isActive) {
    notification.calculateNextTrigger();
    await notification.save();
  }

  logger.audit('notification_activation_changed', req.user._id, {
    notificationId,
    clientId,
    isActive
  });

  res.json({
    success: true,
    message: `Notification ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: { notification }
  });
}));

// @route   POST /api/notifications/:clientId/:notificationId/trigger
// @desc    Manually trigger a notification
// @access  Private
router.post('/:clientId/:notificationId/trigger', authenticate, authorizeClientAccess, asyncHandler(async (req, res) => {
  const { clientId, notificationId } = req.params;

  const notification = await Notification.findOne({
    _id: notificationId,
    clientId
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  if (!notification.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Cannot trigger inactive notification'
    });
  }

  const success = await notification.trigger();

  if (success) {
    logger.audit('notification_manually_triggered', req.user._id, {
      notificationId,
      clientId
    });

    res.json({
      success: true,
      message: 'Notification triggered successfully'
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to trigger notification'
    });
  }
}));

// @route   GET /api/notifications/:clientId/unread
// @desc    Get unread notifications count
// @access  Private
router.get('/:clientId/unread', authenticate, authorizeClientAccess, validateClientId, asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  const unreadCount = await Notification.countDocuments({
    clientId,
    'metadata.read': { $ne: true }
  });

  res.json({
    success: true,
    data: { unreadCount }
  });
}));

module.exports = router;
