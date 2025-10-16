const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class LocalStorageService {
  constructor() {
    this.baseStoragePath = path.join(__dirname, '../../local-storage');
    this.conversationsPath = path.join(this.baseStoragePath, 'conversations');
    this.audioPath = path.join(this.baseStoragePath, 'audio');
    this.initializeStorage();
  }

  initializeStorage() {
    try {
      // Create base storage directories
      if (!fs.existsSync(this.baseStoragePath)) {
        fs.mkdirSync(this.baseStoragePath, { recursive: true });
      }
      
      if (!fs.existsSync(this.conversationsPath)) {
        fs.mkdirSync(this.conversationsPath, { recursive: true });
      }
      
      if (!fs.existsSync(this.audioPath)) {
        fs.mkdirSync(this.audioPath, { recursive: true });
      }

      logger.info('Local storage initialized successfully');
    } catch (error) {
      logger.error('Error initializing local storage:', error);
      throw new Error(`Failed to initialize local storage: ${error.message}`);
    }
  }

  // Get user-specific storage path
  getUserStoragePath(userId) {
    const userPath = path.join(this.conversationsPath, userId);
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }
    return userPath;
  }

  // Get user-specific audio path
  getUserAudioPath(userId) {
    const userPath = path.join(this.audioPath, userId);
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }
    return userPath;
  }

  // Save conversation data locally
  async saveConversation(userId, conversationData) {
    try {
      const userPath = this.getUserStoragePath(userId);
      const conversationId = conversationData._id || this.generateConversationId();
      
      // Create person-specific directory
      const personName = conversationData.personName || 'unknown';
      const personPath = path.join(userPath, this.sanitizeFileName(personName));
      if (!fs.existsSync(personPath)) {
        fs.mkdirSync(personPath, { recursive: true });
      }

      // Save conversation metadata
      const conversationFile = path.join(personPath, `${conversationId}.json`);
      const conversationMetadata = {
        id: conversationId,
        userId,
        personName,
        timestamp: new Date().toISOString(),
        audioPath: conversationData.audioPath,
        transcript: conversationData.transcript,
        summary: conversationData.summary,
        keyTopics: conversationData.keyTopics,
        emotions: conversationData.emotions,
        sentiment: conversationData.sentiment,
        sentimentScore: conversationData.sentimentScore,
        keywords: conversationData.keywords,
        duration: conversationData.duration,
        language: conversationData.language,
        processingStatus: conversationData.processingStatus || 'completed',
        metadata: conversationData.metadata || {}
      };

      fs.writeFileSync(conversationFile, JSON.stringify(conversationMetadata, null, 2));

      logger.info('Conversation saved locally', { userId, conversationId, personName });
      return conversationMetadata;
    } catch (error) {
      logger.error('Error saving conversation locally:', error);
      throw new Error(`Failed to save conversation locally: ${error.message}`);
    }
  }

  // Get conversations for a user
  async getConversations(userId, personName = null, limit = 50, offset = 0) {
    try {
      const userPath = this.getUserStoragePath(userId);
      const conversations = [];

      if (!fs.existsSync(userPath)) {
        return { conversations: [], total: 0 };
      }

      const personDirs = fs.readdirSync(userPath);
      
      for (const personDir of personDirs) {
        if (personName && this.sanitizeFileName(personName) !== personDir) {
          continue;
        }

        const personPath = path.join(userPath, personDir);
        if (!fs.statSync(personPath).isDirectory()) continue;

        const conversationFiles = fs.readdirSync(personPath)
          .filter(file => file.endsWith('.json'))
          .sort((a, b) => b.localeCompare(a)); // Sort by filename (timestamp) descending

        for (const file of conversationFiles) {
          try {
            const filePath = path.join(personPath, file);
            const conversationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            conversations.push(conversationData);
          } catch (parseError) {
            logger.warn('Error parsing conversation file:', { file, error: parseError.message });
          }
        }
      }

      // Sort all conversations by timestamp
      conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const total = conversations.length;
      const paginatedConversations = conversations.slice(offset, offset + limit);

      return {
        conversations: paginatedConversations,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      logger.error('Error getting conversations:', error);
      throw new Error(`Failed to get conversations: ${error.message}`);
    }
  }

  // Get conversations by person
  async getConversationsByPerson(userId, personName, limit = 20) {
    try {
      const result = await this.getConversations(userId, personName, limit);
      return result.conversations;
    } catch (error) {
      logger.error('Error getting conversations by person:', error);
      throw error;
    }
  }

  // Get conversation by ID
  async getConversation(userId, conversationId) {
    try {
      const userPath = this.getUserStoragePath(userId);
      const personDirs = fs.readdirSync(userPath);

      for (const personDir of personDirs) {
        const personPath = path.join(userPath, personDir);
        if (!fs.statSync(personPath).isDirectory()) continue;

        const conversationFile = path.join(personPath, `${conversationId}.json`);
        if (fs.existsSync(conversationFile)) {
          const conversationData = JSON.parse(fs.readFileSync(conversationFile, 'utf8'));
          return conversationData;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting conversation:', error);
      throw new Error(`Failed to get conversation: ${error.message}`);
    }
  }

  // Delete conversation
  async deleteConversation(userId, conversationId) {
    try {
      const conversation = await this.getConversation(userId, conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const userPath = this.getUserStoragePath(userId);
      const personName = this.sanitizeFileName(conversation.personName);
      const conversationFile = path.join(userPath, personName, `${conversationId}.json`);

      // Delete conversation file
      if (fs.existsSync(conversationFile)) {
        fs.unlinkSync(conversationFile);
      }

      // Delete associated audio file if it exists
      if (conversation.audioPath && fs.existsSync(conversation.audioPath)) {
        fs.unlinkSync(conversation.audioPath);
      }

      logger.info('Conversation deleted locally', { userId, conversationId });
      return true;
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  // Delete old recordings (monthly cleanup)
  async deleteOldRecordings(userId, monthsOld = 1) {
    try {
      const userPath = this.getUserStoragePath(userId);
      const userAudioPath = this.getUserAudioPath(userId);
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

      let deletedConversations = 0;
      let deletedAudioFiles = 0;

      if (!fs.existsSync(userPath)) {
        return { deletedConversations, deletedAudioFiles };
      }

      const personDirs = fs.readdirSync(userPath);

      for (const personDir of personDirs) {
        const personPath = path.join(userPath, personDir);
        if (!fs.statSync(personPath).isDirectory()) continue;

        const conversationFiles = fs.readdirSync(personPath)
          .filter(file => file.endsWith('.json'));

        for (const file of conversationFiles) {
          try {
            const filePath = path.join(personPath, file);
            const conversationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const conversationDate = new Date(conversationData.timestamp);

            if (conversationDate < cutoffDate) {
              // Delete conversation file
              fs.unlinkSync(filePath);
              deletedConversations++;

              // Delete associated audio file
              if (conversationData.audioPath && fs.existsSync(conversationData.audioPath)) {
                fs.unlinkSync(conversationData.audioPath);
                deletedAudioFiles++;
              }
            }
          } catch (parseError) {
            logger.warn('Error processing file for deletion:', { file, error: parseError.message });
          }
        }

        // Remove empty person directories
        try {
          const remainingFiles = fs.readdirSync(personPath);
          if (remainingFiles.length === 0) {
            fs.rmdirSync(personPath);
          }
        } catch (rmdirError) {
          // Directory not empty or other error, ignore
        }
      }

      logger.info('Old recordings cleanup completed', { 
        userId, 
        deletedConversations, 
        deletedAudioFiles,
        monthsOld 
      });

      return { deletedConversations, deletedAudioFiles };
    } catch (error) {
      logger.error('Error deleting old recordings:', error);
      throw new Error(`Failed to delete old recordings: ${error.message}`);
    }
  }

  // Get storage statistics
  async getStorageStats(userId) {
    try {
      const userPath = this.getUserStoragePath(userId);
      const userAudioPath = this.getUserAudioPath(userId);

      let totalConversations = 0;
      let totalSize = 0;
      let personStats = {};

      if (!fs.existsSync(userPath)) {
        return {
          totalConversations: 0,
          totalSize: 0,
          personStats: {},
          storagePath: userPath
        };
      }

      const personDirs = fs.readdirSync(userPath);

      for (const personDir of personDirs) {
        const personPath = path.join(userPath, personDir);
        if (!fs.statSync(personPath).isDirectory()) continue;

        const conversationFiles = fs.readdirSync(personPath)
          .filter(file => file.endsWith('.json'));

        personStats[personDir] = {
          conversationCount: conversationFiles.length,
          totalSize: 0
        };

        for (const file of conversationFiles) {
          const filePath = path.join(personPath, file);
          const stats = fs.statSync(filePath);
          personStats[personDir].totalSize += stats.size;
          totalSize += stats.size;
        }

        totalConversations += conversationFiles.length;
      }

      return {
        totalConversations,
        totalSize,
        personStats,
        storagePath: userPath
      };
    } catch (error) {
      logger.error('Error getting storage stats:', error);
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  // Save audio file locally
  async saveAudioFile(userId, audioBuffer, filename) {
    try {
      const userAudioPath = this.getUserAudioPath(userId);
      const sanitizedFilename = this.sanitizeFileName(filename);
      const audioFilePath = path.join(userAudioPath, sanitizedFilename);

      fs.writeFileSync(audioFilePath, audioBuffer);

      logger.info('Audio file saved locally', { userId, filename: sanitizedFilename });
      return audioFilePath;
    } catch (error) {
      logger.error('Error saving audio file:', error);
      throw new Error(`Failed to save audio file: ${error.message}`);
    }
  }

  // Utility functions
  sanitizeFileName(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all users with stored conversations
  async getAllUsers() {
    try {
      if (!fs.existsSync(this.conversationsPath)) {
        return [];
      }

      const userDirs = fs.readdirSync(this.conversationsPath)
        .filter(dir => {
          const dirPath = path.join(this.conversationsPath, dir);
          return fs.statSync(dirPath).isDirectory();
        });

      return userDirs;
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw new Error(`Failed to get all users: ${error.message}`);
    }
  }

  // Cleanup storage for a specific user
  async cleanupUserStorage(userId) {
    try {
      const userPath = this.getUserStoragePath(userId);
      const userAudioPath = this.getUserAudioPath(userId);

      if (fs.existsSync(userPath)) {
        fs.rmSync(userPath, { recursive: true, force: true });
      }

      if (fs.existsSync(userAudioPath)) {
        fs.rmSync(userAudioPath, { recursive: true, force: true });
      }

      logger.info('User storage cleaned up', { userId });
      return true;
    } catch (error) {
      logger.error('Error cleaning up user storage:', error);
      throw new Error(`Failed to cleanup user storage: ${error.message}`);
    }
  }
}

module.exports = new LocalStorageService();
