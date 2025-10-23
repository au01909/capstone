const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const offlineAiService = require('./offlineAiService');
const localStorageService = require('./localStorageService');

// Folder where all user audios are saved
const AUDIO_PATH = path.resolve('./local-storage/audio');

// Helper to process a newly added audio file
async function handleNewAudioFile(filePath) {
  try {
    // Only process audio files
    if (!filePath.match(/\.(mp3|wav|m4a|ogg)$/i)) return;

    logger.info(`[watcher] New audio detected: ${filePath}`);

    // Read file buffer
    const buffer = fs.readFileSync(filePath);

    // Attempt to determine userId from path: local-storage/audio/<userId>/<filename>
    const rel = path.relative(AUDIO_PATH, filePath);
    const parts = rel.split(path.sep);
    const userId = parts.length > 1 ? parts[0] : 'unknown_user';
    const filename = parts.length > 0 ? parts[parts.length - 1] : path.basename(filePath);

    // Use a default person name when not available
    const personName = 'Unknown';

    // Call the offline AI pipeline (transcription + summary)
    const aiResult = await offlineAiService.processConversation(buffer, filename, personName);

    // Build conversation object similar to other offline entrypoints
    const conversationData = {
      _id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      personName,
      audioPath: filePath,
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
      metadata: {
        recordingDevice: 'watcher',
        audioQuality: 'medium'
      }
    };

    // Save to local storage
    await localStorageService.saveConversation(userId, conversationData);

    logger.info(`[watcher] Processed and saved: ${filename} for user ${userId}`);
  } catch (err) {
    logger.error(`[watcher] Error processing ${filePath}: ${err.stack || err.message}`);
  }
}

// Initialize file watcher
function initWatcher() {
  logger.info('[watcher] Starting watcher service...');

  const watcher = chokidar.watch(AUDIO_PATH, {
    ignored: /^\./,
    persistent: true,
    depth: 3 // watch nested user folders
  });

  watcher
    .on('add', async (filePath) => {
      // Fire-and-forget processing
      handleNewAudioFile(filePath);
    })
    .on('error', (err) => {
      logger.error('[watcher] Watcher error:', err);
    });
}

module.exports = { initWatcher };
