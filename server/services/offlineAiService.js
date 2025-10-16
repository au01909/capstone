const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class OfflineAIService {
  constructor() {
    this.whisper = null;
    this.ollamaClient = null;
    this.isInitialized = false;
  }

  async initializeServices() {
    try {
      logger.info('Initializing offline AI services...');
      
      // Check if Ollama is available
      if (process.env.OLLAMA_BASE_URL) {
        try {
          const { createClient } = require('@anthropic-ai/sdk');
          this.ollamaClient = createClient({
            baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            apiKey: 'ollama' // Ollama doesn't require a real API key
          });
          logger.info('Ollama client initialized');
        } catch (error) {
          logger.warn('Ollama client initialization failed:', error.message);
        }
      } else {
        logger.warn('OLLAMA_BASE_URL not set, using fallback processing');
      }

      // Initialize Whisper model for local transcription (optional)
      try {
        const { Whisper } = require('@xenova/transformers');
        this.whisper = await Whisper.from_pretrained('Xenova/whisper-tiny.en');
        logger.info('Whisper model initialized successfully');
      } catch (error) {
        logger.warn('Whisper model initialization failed:', error.message);
        logger.info('Will use fallback transcription method');
      }

      this.isInitialized = true;
      logger.info('Offline AI services initialized successfully');
    } catch (error) {
      logger.error('Error initializing offline AI services:', error);
      throw new Error(`Failed to initialize offline AI services: ${error.message}`);
    }
  }

  // Transcribe audio using local Whisper model or fallback
  async transcribeAudio(audioBuffer, filename) {
    try {
      logger.ai('transcribe_audio_start_offline', { filename });
      const startTime = Date.now();

      if (this.whisper) {
        // Use Whisper for transcription
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, filename);
        fs.writeFileSync(tempFilePath, audioBuffer);

        try {
          const result = await this.whisper(tempFilePath, {
            language: 'english',
            task: 'transcribe',
            return_timestamps: true
          });

          fs.unlinkSync(tempFilePath);

          return {
            text: result.text,
            words: this.extractWordsWithTimestamps(result),
            language: 'en',
            duration: this.calculateAudioDuration(audioBuffer)
          };
        } catch (transcriptionError) {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          throw transcriptionError;
        }
      } else {
        // Fallback transcription - return mock data
        logger.warn('Using fallback transcription method');
        return {
          text: `[Audio transcription placeholder for ${filename}] This is a mock transcription that would be generated from the audio file. In a real implementation, this would be replaced with actual speech-to-text processing.`,
          words: [],
          language: 'en',
          duration: this.calculateAudioDuration(audioBuffer)
        };
      }
    } catch (error) {
      logger.error('Offline audio transcription error:', error);
      throw new Error(`Offline transcription failed: ${error.message}`);
    }
  }

  // Extract words with timestamps from Whisper result
  extractWordsWithTimestamps(result) {
    if (!result.chunks || !Array.isArray(result.chunks)) {
      return [];
    }

    return result.chunks.map(chunk => ({
      word: chunk.text.trim(),
      start: chunk.timestamp[0],
      end: chunk.timestamp[1]
    }));
  }

  // Calculate audio duration (simplified estimation)
  calculateAudioDuration(audioBuffer) {
    // This is a rough estimation - in a real implementation, you'd use an audio library
    return Math.round(audioBuffer.length / 16000); // Assuming 16kHz sample rate
  }

  // Generate conversation summary using local LLM (Ollama)
  async generateSummary(transcript, personName, conversationDuration) {
    try {
      logger.ai('generate_summary_start_offline', { 
        transcriptLength: transcript.length,
        personName,
        duration: conversationDuration
      });
      const startTime = Date.now();

      const prompt = `You are an AI assistant helping dementia care patients remember their conversations. 

Please analyze this conversation transcript and create a helpful summary:

Person: ${personName}
Duration: ${conversationDuration} seconds
Transcript: "${transcript}"

Please provide:
1. A brief 2-3 sentence summary of what was discussed
2. Key topics mentioned
3. Emotional tone (positive/negative/neutral)
4. Important details the person should remember
5. Any action items or follow-ups mentioned

Format your response as JSON with these fields:
{
  "summary": "Brief summary here",
  "keyTopics": ["topic1", "topic2"],
  "emotions": ["emotion1", "emotion2"],
  "importantDetails": ["detail1", "detail2"],
  "actionItems": ["item1", "item2"],
  "sentiment": "positive/negative/neutral",
  "sentimentScore": -1.0 to 1.0
}`;

      let summaryData;
      
      if (this.ollamaClient) {
        try {
          // Use Ollama for local LLM processing
          const response = await this.ollamaClient.messages.create({
            model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful AI assistant specialized in creating conversation summaries for dementia care patients. Be concise, clear, and focus on the most important information. Always respond with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 500,
            temperature: 0.3
          });

          try {
            summaryData = JSON.parse(response.content[0].text);
          } catch (parseError) {
            summaryData = this.createFallbackSummary(response.content[0].text);
          }
        } catch (ollamaError) {
          logger.warn('Ollama processing failed, using fallback:', ollamaError.message);
          summaryData = this.createRuleBasedSummary(transcript, personName);
        }
      } else {
        summaryData = this.createRuleBasedSummary(transcript, personName);
      }

      const duration = Date.now() - startTime;
      logger.ai('generate_summary_complete_offline', { 
        duration: `${duration}ms`,
        personName
      });

      return summaryData;
    } catch (error) {
      logger.error('Offline summary generation error:', error);
      return this.createFallbackSummary(transcript, personName);
    }
  }

  // Create fallback summary when JSON parsing fails
  createFallbackSummary(text, personName) {
    return {
      summary: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      keyTopics: this.extractSimpleTopics(text),
      emotions: ['neutral'],
      importantDetails: [],
      actionItems: [],
      sentiment: 'neutral',
      sentimentScore: 0
    };
  }

  // Create rule-based summary when Ollama is not available
  createRuleBasedSummary(transcript, personName) {
    const words = transcript.toLowerCase().split(' ');
    const positiveWords = ['good', 'great', 'happy', 'love', 'wonderful', 'amazing', 'excellent', 'fantastic'];
    const negativeWords = ['bad', 'sad', 'angry', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated'];
    
    let sentimentScore = 0;
    positiveWords.forEach(word => {
      if (words.includes(word)) sentimentScore += 0.1;
    });
    negativeWords.forEach(word => {
      if (words.includes(word)) sentimentScore -= 0.1;
    });

    const sentiment = sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral';

    return {
      summary: `Conversation with ${personName}: ${transcript.substring(0, 150)}${transcript.length > 150 ? '...' : ''}`,
      keyTopics: this.extractSimpleTopics(transcript),
      emotions: [sentiment],
      importantDetails: this.extractSimpleDetails(transcript),
      actionItems: [],
      sentiment: sentiment,
      sentimentScore: Math.max(-1, Math.min(1, sentimentScore))
    };
  }

  // Extract simple topics using keyword matching
  extractSimpleTopics(text) {
    const topicKeywords = {
      'family': ['family', 'mother', 'father', 'son', 'daughter', 'brother', 'sister'],
      'health': ['health', 'doctor', 'medicine', 'hospital', 'pain', 'sick'],
      'food': ['food', 'eat', 'dinner', 'lunch', 'breakfast', 'cook'],
      'weather': ['weather', 'rain', 'sunny', 'cold', 'hot', 'temperature'],
      'travel': ['travel', 'trip', 'vacation', 'car', 'plane', 'hotel'],
      'work': ['work', 'job', 'office', 'boss', 'colleague', 'meeting']
    };

    const topics = [];
    const textLower = text.toLowerCase();
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics.length > 0 ? topics : ['general'];
  }

  // Extract simple details using sentence analysis
  extractSimpleDetails(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(s => s.trim()).filter(s => s.length > 0);
  }

  // Extract keywords from transcript (simplified)
  async extractKeywords(transcript) {
    try {
      const words = transcript.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

      // Count word frequency
      const wordCount = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });

      // Return top 10 most frequent words
      return Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
    } catch (error) {
      logger.error('Keyword extraction error:', error);
      return [];
    }
  }

  // Analyze emotions in the conversation (simplified)
  async analyzeEmotions(transcript) {
    try {
      const emotionKeywords = {
        happy: ['happy', 'joy', 'excited', 'wonderful', 'great', 'amazing'],
        sad: ['sad', 'depressed', 'upset', 'disappointed', 'hurt'],
        angry: ['angry', 'mad', 'furious', 'annoyed', 'irritated'],
        fearful: ['afraid', 'scared', 'worried', 'anxious', 'nervous'],
        surprised: ['surprised', 'shocked', 'amazed', 'unexpected'],
        neutral: ['okay', 'fine', 'normal', 'alright']
      };

      const textLower = transcript.toLowerCase();
      const emotions = [];
      
      Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
        const count = keywords.reduce((acc, keyword) => {
          return acc + (textLower.split(keyword).length - 1);
        }, 0);
        
        if (count > 0) {
          emotions.push({
            emotion,
            confidence: Math.min(1, count / 5) // Normalize confidence
          });
        }
      });

      return {
        emotions: emotions.length > 0 ? emotions : [{ emotion: 'neutral', confidence: 0.8 }],
        overallSentiment: emotions.length > 0 ? emotions[0].emotion : 'neutral'
      };
    } catch (error) {
      logger.error('Emotion analysis error:', error);
      return { emotions: [{ emotion: 'neutral', confidence: 0.8 }], overallSentiment: 'neutral' };
    }
  }

  // Generate daily summary for multiple conversations
  async generateDailySummary(conversations) {
    try {
      logger.ai('generate_daily_summary_start_offline', { 
        conversationCount: conversations.length
      });
      const startTime = Date.now();

      const conversationSummaries = conversations.map(conv => 
        `Person: ${conv.personName}\nSummary: ${conv.summary}\nTopics: ${conv.keyTopics.join(', ')}`
      ).join('\n\n');

      const prompt = `You are creating a daily summary for a dementia care patient. Here are their conversations from today:

${conversationSummaries}

Please create a comprehensive daily summary that:
1. Highlights the most important interactions
2. Mentions key people they talked to
3. Summarizes main topics discussed
4. Notes any positive moments or achievements
5. Reminds them of any important information

Keep it warm, encouraging, and easy to understand. Format as JSON:
{
  "dailySummary": "Main summary here",
  "peopleMentioned": ["person1", "person2"],
  "keyTopics": ["topic1", "topic2"],
  "positiveMoments": ["moment1", "moment2"],
  "importantReminders": ["reminder1", "reminder2"],
  "overallSentiment": "positive/negative/neutral"
}`;

      let dailySummary;
      
      if (this.ollamaClient) {
        try {
          const response = await this.ollamaClient.messages.create({
            model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
            messages: [
              {
                role: 'system',
                content: 'You are a compassionate AI assistant creating daily summaries for dementia care patients. Be warm, encouraging, and focus on positive moments. Always respond with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 800,
            temperature: 0.4
          });

          try {
            dailySummary = JSON.parse(response.content[0].text);
          } catch (parseError) {
            dailySummary = this.createFallbackDailySummary(conversations);
          }
        } catch (ollamaError) {
          logger.warn('Ollama daily summary failed, using fallback:', ollamaError.message);
          dailySummary = this.createFallbackDailySummary(conversations);
        }
      } else {
        dailySummary = this.createFallbackDailySummary(conversations);
      }

      const duration = Date.now() - startTime;
      logger.ai('generate_daily_summary_complete_offline', { 
        duration: `${duration}ms`,
        conversationCount: conversations.length
      });

      return dailySummary;
    } catch (error) {
      logger.error('Offline daily summary generation error:', error);
      return this.createFallbackDailySummary(conversations);
    }
  }

  // Create fallback daily summary
  createFallbackDailySummary(conversations) {
    const peopleMentioned = [...new Set(conversations.map(c => c.personName))];
    const allTopics = conversations.flatMap(c => c.keyTopics);
    const uniqueTopics = [...new Set(allTopics)];

    return {
      dailySummary: `You had ${conversations.length} conversations today with ${peopleMentioned.join(', ')}. The main topics discussed were ${uniqueTopics.join(', ')}.`,
      peopleMentioned,
      keyTopics: uniqueTopics,
      positiveMoments: ['Had meaningful conversations'],
      importantReminders: [],
      overallSentiment: 'positive'
    };
  }

  // Process conversation with full AI pipeline (offline version)
  async processConversation(audioBuffer, filename, personName) {
    try {
      logger.ai('process_conversation_start_offline', { filename, personName });
      const startTime = Date.now();

      // Step 1: Transcribe audio using local Whisper
      const transcription = await this.transcribeAudio(audioBuffer, filename);
      
      // Step 2: Generate summary using local LLM
      const summary = await this.generateSummary(
        transcription.text, 
        personName, 
        transcription.duration
      );

      // Step 3: Extract keywords
      const keywords = await this.extractKeywords(transcription.text);

      // Step 4: Analyze emotions
      const emotions = await this.analyzeEmotions(transcription.text);

      const duration = Date.now() - startTime;
      logger.ai('process_conversation_complete_offline', { 
        filename, 
        personName,
        duration: `${duration}ms`
      });

      return {
        transcript: transcription.text,
        summary: summary.summary,
        keyTopics: summary.keyTopics,
        emotions: emotions.emotions || [],
        sentiment: summary.sentiment,
        sentimentScore: summary.sentimentScore,
        keywords: keywords,
        importantDetails: summary.importantDetails,
        actionItems: summary.actionItems,
        duration: transcription.duration,
        language: transcription.language
      };
    } catch (error) {
      logger.error('Offline conversation processing error:', error);
      throw error;
    }
  }
}

module.exports = new OfflineAIService();
