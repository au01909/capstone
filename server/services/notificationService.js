const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const aiService = require('./aiService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.transporter = null;
    this.cronJobs = new Map();
    this.initializeEmailTransporter();
    this.startScheduler();
  }

  // Initialize email transporter
  initializeEmailTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      logger.info('Email transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  // Start the notification scheduler
  startScheduler() {
    // Check for notifications every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledNotifications();
    });

    logger.info('Notification scheduler started');
  }

  // Process notifications that are ready to be sent
  async processScheduledNotifications() {
    try {
      const readyNotifications = await Notification.getReadyToSend();
      
      for (const notification of readyNotifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      logger.error('Error processing scheduled notifications:', error);
    }
  }

  // Send a notification
  async sendNotification(notification) {
    try {
      logger.info('Sending notification', { 
        notificationId: notification._id,
        type: notification.type,
        clientId: notification.clientId
      });

      let success = false;

      // Send based on delivery method
      switch (notification.deliveryMethod) {
        case 'email':
          success = await this.sendEmailNotification(notification);
          break;
        case 'in-app':
          success = await this.sendInAppNotification(notification);
          break;
        case 'both':
          const emailSuccess = await this.sendEmailNotification(notification);
          const inAppSuccess = await this.sendInAppNotification(notification);
          success = emailSuccess || inAppSuccess;
          break;
        default:
          logger.warn('Unknown delivery method', { 
            method: notification.deliveryMethod 
          });
      }

      if (success) {
        await notification.trigger();
        logger.info('Notification sent successfully', { 
          notificationId: notification._id 
        });
      } else {
        await notification.markFailed('Failed to send notification');
        logger.error('Failed to send notification', { 
          notificationId: notification._id 
        });
      }
    } catch (error) {
      logger.error('Error sending notification:', error);
      await notification.markFailed(error.message);
    }
  }

  // Send email notification
  async sendEmailNotification(notification) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const user = await User.findById(notification.clientId);
      if (!user || !user.email) {
        throw new Error('User email not found');
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@dementiacare.com',
        to: user.email,
        subject: notification.title,
        html: this.generateEmailTemplate(notification, user)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { 
        messageId: result.messageId,
        to: user.email
      });

      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      return false;
    }
  }

  // Send in-app notification (store in database)
  async sendInAppNotification(notification) {
    try {
      // For in-app notifications, we just mark them as sent
      // The frontend will fetch and display them
      await notification.markDelivered('in-app', {
        deliveredAt: new Date(),
        platform: 'web'
      });

      return true;
    } catch (error) {
      logger.error('In-app notification failed:', error);
      return false;
    }
  }

  // Generate email template
  generateEmailTemplate(notification, user) {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧠 Dementia Care Summary</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>${notification.message}</p>
    `;

    let content = baseTemplate;

    // Add specific content based on notification type
    if (notification.type === 'summary' && notification.metadata?.summaryData) {
      const summaryData = notification.metadata.summaryData;
      content += `
        <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>📝 Today's Summary</h3>
          <p><strong>Conversations:</strong> ${summaryData.conversationCount}</p>
          <p><strong>People you talked to:</strong> ${summaryData.peopleMentioned?.join(', ') || 'N/A'}</p>
          <p><strong>Key topics:</strong> ${summaryData.keyTopics?.join(', ') || 'N/A'}</p>
        </div>
      `;
    }

    content += `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" class="button">View Full Summary</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message from your Dementia Care Summary system.</p>
          <p>If you have any questions, please contact your caregiver.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return content;
  }

  // Create a new notification
  async createNotification(clientId, notificationData) {
    try {
      const notification = new Notification({
        clientId,
        ...notificationData
      });

      await notification.save();
      logger.info('Notification created', { 
        notificationId: notification._id,
        clientId,
        type: notification.type
      });

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create daily summary notification
  async createDailySummaryNotification(clientId) {
    try {
      // Get today's conversations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const conversations = await Conversation.find({
        clientId,
        createdAt: { $gte: today, $lt: tomorrow },
        processingStatus: 'completed'
      }).populate('personId', 'name relationship');

      if (conversations.length === 0) {
        logger.info('No conversations found for daily summary', { clientId });
        return null;
      }

      // Generate daily summary
      const conversationData = conversations.map(conv => ({
        personName: conv.personId?.name || 'Unknown',
        summary: conv.summary,
        keyTopics: conv.keyTopics || []
      }));

      const dailySummary = await aiService.generateDailySummary(conversationData);

      // Create notification
      const notification = await this.createNotification(clientId, {
        type: 'summary',
        title: 'Daily Conversation Summary',
        message: `You had ${conversations.length} conversations today. Here's your summary!`,
        frequency: 'once',
        deliveryMethod: 'in-app',
        metadata: {
          conversationCount: conversations.length,
          summaryData: dailySummary
        }
      });

      return notification;
    } catch (error) {
      logger.error('Error creating daily summary notification:', error);
      throw error;
    }
  }

  // Update user notification preferences
  async updateNotificationPreferences(clientId, preferences) {
    try {
      const user = await User.findById(clientId);
      if (!user) {
        throw new Error('User not found');
      }

      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...preferences
      };

      await user.save();

      // Update or create recurring notifications based on preferences
      await this.updateRecurringNotifications(clientId, preferences);

      logger.info('Notification preferences updated', { clientId, preferences });
      return user.notificationPreferences;
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Update recurring notifications based on user preferences
  async updateRecurringNotifications(clientId, preferences) {
    try {
      // Remove existing recurring notifications
      await Notification.deleteMany({
        clientId,
        type: 'reminder',
        frequency: { $in: ['hourly', 'daily', 'weekly'] }
      });

      // Create new recurring notification if enabled
      if (preferences.enabled && preferences.frequency !== 'none') {
        await this.createNotification(clientId, {
          type: 'reminder',
          title: 'Check Your Conversation Summary',
          message: 'Take a moment to review your recent conversations and summaries.',
          frequency: preferences.frequency,
          scheduledTime: preferences.time,
          deliveryMethod: preferences.deliveryMethod,
          isActive: true
        });
      }
    } catch (error) {
      logger.error('Error updating recurring notifications:', error);
      throw error;
    }
  }

  // Get notifications for a client
  async getClientNotifications(clientId, limit = 20, skip = 0) {
    try {
      const notifications = await Notification.find({ clientId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return notifications;
    } catch (error) {
      logger.error('Error fetching client notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId, clientId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        clientId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Add read status to metadata
      if (!notification.metadata) {
        notification.metadata = {};
      }
      notification.metadata.readAt = new Date();
      notification.metadata.read = true;

      await notification.save();
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
