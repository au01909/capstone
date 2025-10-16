const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Transcribe audio using OpenAI Whisper
  async transcribeAudio(audioBuffer, filename) {
    try {
      logger.ai('transcribe_audio_start', { filename });
      const startTime = Date.now();

      const transcription = await this.openai.audio.transcriptions.create({
        file: new File([audioBuffer], filename, { type: 'audio/mpeg' }),
        model: process.env.WHISPER_MODEL || 'whisper-1',
        language: 'en',
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
      });

      const duration = Date.now() - startTime;
      logger.ai('transcribe_audio_complete', { 
        filename, 
        duration: `${duration}ms`,
        wordCount: transcription.words?.length || 0
      });

      return {
        text: transcription.text,
        words: transcription.words || [],
        language: transcription.language,
        duration: transcription.duration
      };
    } catch (error) {
      logger.error('Audio transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  // Generate conversation summary using GPT
  async generateSummary(transcript, personName, conversationDuration) {
    try {
      logger.ai('generate_summary_start', { 
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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specialized in creating conversation summaries for dementia care patients. Be concise, clear, and focus on the most important information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const duration = Date.now() - startTime;
      logger.ai('generate_summary_complete', { 
        duration: `${duration}ms`,
        personName
      });

      try {
        const summaryData = JSON.parse(response.choices[0].message.content);
        return summaryData;
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          summary: response.choices[0].message.content,
          keyTopics: [],
          emotions: [],
          importantDetails: [],
          actionItems: [],
          sentiment: 'neutral',
          sentimentScore: 0
        };
      }
    } catch (error) {
      logger.error('Summary generation error:', error);
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  // Extract keywords from transcript
  async extractKeywords(transcript) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Extract the most important keywords from the conversation transcript. Return only a JSON array of strings.'
          },
          {
            role: 'user',
            content: `Extract keywords from: "${transcript}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      });

      try {
        const keywords = JSON.parse(response.choices[0].message.content);
        return Array.isArray(keywords) ? keywords : [];
      } catch (parseError) {
        return [];
      }
    } catch (error) {
      logger.error('Keyword extraction error:', error);
      return [];
    }
  }

  // Analyze emotions in the conversation
  async analyzeEmotions(transcript) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze the emotional content of this conversation. Return a JSON object with emotions and their confidence scores.'
          },
          {
            role: 'user',
            content: `Analyze emotions in: "${transcript}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      try {
        const emotions = JSON.parse(response.choices[0].message.content);
        return emotions;
      } catch (parseError) {
        return { emotions: [], overallSentiment: 'neutral' };
      }
    } catch (error) {
      logger.error('Emotion analysis error:', error);
      return { emotions: [], overallSentiment: 'neutral' };
    }
  }

  // Generate daily summary for multiple conversations
  async generateDailySummary(conversations) {
    try {
      logger.ai('generate_daily_summary_start', { 
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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate AI assistant creating daily summaries for dementia care patients. Be warm, encouraging, and focus on positive moments.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 800
      });

      const duration = Date.now() - startTime;
      logger.ai('generate_daily_summary_complete', { 
        duration: `${duration}ms`,
        conversationCount: conversations.length
      });

      try {
        const dailySummary = JSON.parse(response.choices[0].message.content);
        return dailySummary;
      } catch (parseError) {
        return {
          dailySummary: response.choices[0].message.content,
          peopleMentioned: [],
          keyTopics: [],
          positiveMoments: [],
          importantReminders: [],
          overallSentiment: 'neutral'
        };
      }
    } catch (error) {
      logger.error('Daily summary generation error:', error);
      throw new Error(`Daily summary generation failed: ${error.message}`);
    }
  }

  // Process conversation with full AI pipeline
  async processConversation(audioBuffer, filename, personName) {
    try {
      logger.ai('process_conversation_start', { filename, personName });
      const startTime = Date.now();

      // Step 1: Transcribe audio
      const transcription = await this.transcribeAudio(audioBuffer, filename);
      
      // Step 2: Generate summary
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
      logger.ai('process_conversation_complete', { 
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
      logger.error('Conversation processing error:', error);
      throw error;
    }
  }
}

module.exports = new AIService();
