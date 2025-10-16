const cron = require('node-cron');
const localStorageService = require('./localStorageService');
const logger = require('../utils/logger');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = process.env.CLEANUP_INTERVAL || '0 0 1 * *'; // First day of every month at midnight
    this.retentionMonths = parseInt(process.env.RETENTION_MONTHS) || 1; // Keep recordings for 1 month by default
  }

  // Start the cleanup scheduler
  start() {
    if (this.isRunning) {
      logger.warn('Cleanup service is already running');
      return;
    }

    try {
      // Schedule monthly cleanup
      this.cleanupTask = cron.schedule(this.cleanupInterval, async () => {
        await this.performCleanup();
      }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'UTC'
      });

      this.isRunning = true;
      logger.info('Cleanup service started', { 
        schedule: this.cleanupInterval, 
        retentionMonths: this.retentionMonths 
      });

      // Run initial cleanup check
      this.performInitialCleanup();
    } catch (error) {
      logger.error('Error starting cleanup service:', error);
      throw new Error(`Failed to start cleanup service: ${error.message}`);
    }
  }

  // Stop the cleanup scheduler
  stop() {
    if (!this.isRunning) {
      logger.warn('Cleanup service is not running');
      return;
    }

    if (this.cleanupTask) {
      this.cleanupTask.destroy();
    }

    this.isRunning = false;
    logger.info('Cleanup service stopped');
  }

  // Perform cleanup for all users
  async performCleanup() {
    try {
      logger.info('Starting scheduled cleanup of old recordings');
      const startTime = Date.now();

      const users = await localStorageService.getAllUsers();
      let totalDeletedConversations = 0;
      let totalDeletedAudioFiles = 0;
      let processedUsers = 0;

      for (const userId of users) {
        try {
          const result = await localStorageService.deleteOldRecordings(userId, this.retentionMonths);
          totalDeletedConversations += result.deletedConversations;
          totalDeletedAudioFiles += result.deletedAudioFiles;
          processedUsers++;

          if (result.deletedConversations > 0 || result.deletedAudioFiles > 0) {
            logger.info('User cleanup completed', {
              userId,
              deletedConversations: result.deletedConversations,
              deletedAudioFiles: result.deletedAudioFiles
            });
          }
        } catch (userError) {
          logger.error('Error cleaning up user storage:', { userId, error: userError.message });
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Scheduled cleanup completed', {
        processedUsers,
        totalDeletedConversations,
        totalDeletedAudioFiles,
        duration: `${duration}ms`,
        retentionMonths: this.retentionMonths
      });

      return {
        processedUsers,
        totalDeletedConversations,
        totalDeletedAudioFiles,
        duration
      };
    } catch (error) {
      logger.error('Error during scheduled cleanup:', error);
      throw error;
    }
  }

  // Perform initial cleanup check on startup
  async performInitialCleanup() {
    try {
      logger.info('Performing initial cleanup check');
      
      // Check if cleanup is needed (run if last cleanup was more than 30 days ago)
      const shouldRunCleanup = await this.shouldRunInitialCleanup();
      
      if (shouldRunCleanup) {
        logger.info('Initial cleanup is needed, running now');
        await this.performCleanup();
        await this.updateLastCleanupTimestamp();
      } else {
        logger.info('Initial cleanup not needed');
      }
    } catch (error) {
      logger.error('Error during initial cleanup check:', error);
    }
  }

  // Check if initial cleanup should be run
  async shouldRunInitialCleanup() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const lastCleanupFile = path.join(__dirname, '../../local-storage/.last-cleanup');
      
      if (!fs.existsSync(lastCleanupFile)) {
        return true; // First time running
      }

      const lastCleanupTime = fs.readFileSync(lastCleanupFile, 'utf8');
      const lastCleanupDate = new Date(lastCleanupTime);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return lastCleanupDate < thirtyDaysAgo;
    } catch (error) {
      logger.error('Error checking last cleanup time:', error);
      return true; // Default to running cleanup if we can't determine
    }
  }

  // Update last cleanup timestamp
  async updateLastCleanupTimestamp() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const lastCleanupFile = path.join(__dirname, '../../local-storage/.last-cleanup');
      const timestamp = new Date().toISOString();
      
      fs.writeFileSync(lastCleanupFile, timestamp);
      logger.info('Last cleanup timestamp updated', { timestamp });
    } catch (error) {
      logger.error('Error updating last cleanup timestamp:', error);
    }
  }

  // Manual cleanup for a specific user
  async cleanupUser(userId, monthsOld = null) {
    try {
      const retentionPeriod = monthsOld || this.retentionMonths;
      
      logger.info('Starting manual cleanup for user', { userId, retentionPeriod });
      const startTime = Date.now();

      const result = await localStorageService.deleteOldRecordings(userId, retentionPeriod);
      
      const duration = Date.now() - startTime;
      logger.info('Manual cleanup completed for user', {
        userId,
        deletedConversations: result.deletedConversations,
        deletedAudioFiles: result.deletedAudioFiles,
        duration: `${duration}ms`
      });

      return result;
    } catch (error) {
      logger.error('Error during manual cleanup:', { userId, error: error.message });
      throw error;
    }
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const users = await localStorageService.getAllUsers();
      const stats = {
        totalUsers: users.length,
        retentionMonths: this.retentionMonths,
        isRunning: this.isRunning,
        nextCleanup: this.getNextCleanupTime(),
        userStats: []
      };

      for (const userId of users) {
        try {
          const userStats = await localStorageService.getStorageStats(userId);
          stats.userStats.push({
            userId,
            ...userStats
          });
        } catch (userError) {
          logger.warn('Error getting stats for user:', { userId, error: userError.message });
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }

  // Get next cleanup time
  getNextCleanupTime() {
    if (!this.cleanupTask) {
      return null;
    }

    // This is a simplified calculation - in a real implementation,
    // you'd use a proper cron parser to get the exact next run time
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  // Update cleanup settings
  updateSettings(newRetentionMonths, newSchedule = null) {
    try {
      const oldRetentionMonths = this.retentionMonths;
      const oldSchedule = this.cleanupInterval;

      this.retentionMonths = newRetentionMonths;
      
      if (newSchedule) {
        this.cleanupInterval = newSchedule;
        
        // Restart the scheduler with new settings
        if (this.isRunning) {
          this.stop();
          this.start();
        }
      }

      logger.info('Cleanup settings updated', {
        oldRetentionMonths,
        newRetentionMonths,
        oldSchedule,
        newSchedule: newSchedule || oldSchedule
      });

      return {
        retentionMonths: this.retentionMonths,
        schedule: this.cleanupInterval
      };
    } catch (error) {
      logger.error('Error updating cleanup settings:', error);
      throw error;
    }
  }
}

module.exports = new CleanupService();
