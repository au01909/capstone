const chokidar = require("chokidar");
const path = require("path");
const logger = require("../utils/logger");
const { processOfflineAudio } = require("./offlineAiService"); // Your AI pipeline

// Folder where all user audios are saved
const AUDIO_PATH = path.resolve("./local-storage/audio");

// Initialize file watcher
function initWatcher() {
  logger.info("[watcher] Starting watcher service...");

  const watcher = chokidar.watch(AUDIO_PATH, {
    ignored: /^\./,
    persistent: true,
    depth: 3, // watch nested user folders
  });

  watcher
    .on("add", async (filePath) => {
      if (!filePath.match(/\.(mp3|wav|m4a|ogg)$/i)) return;
      logger.info(`[watcher] New audio detected: ${filePath}`);

      try {
        await processOfflineAudio(filePath);
        logger.info(`[watcher] Processed successfully: ${path.basename(filePath)}`);
      } catch (err) {
        logger.error(`[watcher] Error processing ${filePath}: ${err.message}`);
      }
    })
    .on("error", (err) => {
      logger.error("[watcher] Watcher error:", err);
    });
}

module.exports = { initWatcher };
