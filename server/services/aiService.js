const logger = require('../utils/logger');
let OpenAI;
try { OpenAI = require('openai'); } catch (err) { /* optional dependency */ }

class AIService {
  constructor() {
    this.openai = null;

    if (OpenAI && process.env.OPENAI_API_KEY) {
      try {
        // OpenAI v4 client exposes a default export constructor in some versions
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        logger.info('OpenAI client initialized');
      } catch (err) {
        logger.warn('Failed to initialize OpenAI client:', err.message);
        this.openai = null;
      }
    } else {
      logger.warn('OPENAI_API_KEY not set or openai package missing — AIService running in degraded mode');
    }
  }

  // Transcribe audio using OpenAI Whisper
  async transcribeAudio(audioBuffer, filename) {
    try {
      logger.ai('transcribe_audio_start', { filename });
      const startTime = Date.now();

      // Server-side: OpenAI client expects a Readable stream or file path. We guard for presence of the method.
      if (this.openai && this.openai.audio && typeof this.openai.audio.transcriptions?.create === 'function') {
        // Provide a compatible input. In Node the SDK may accept a Buffer or stream.
        const fileInput = audioBuffer;
        const transcription = await this.openai.audio.transcriptions.create({
          file: fileInput,
          model: process.env.WHISPER_MODEL || 'whisper-1',
          language: 'en'
        });

        const duration = Date.now() - startTime;
        logger.ai('transcribe_audio_complete', {
          filename,
          duration: `${duration}ms`,
          wordCount: transcription?.words?.length || 0
        });

        return {
          text: transcription.text || (transcription?.data?.text) || '',
          words: transcription.words || [],
          language: transcription.language || 'en',
          duration: transcription.duration || Math.round(audioBuffer.length / 16000)
        };
      }

      // Fallback transcription
      logger.warn('OpenAI transcription unavailable, returning fallback transcription');
      return {
        text: `[Audio transcription placeholder for ${filename}] This is a mock transcription.`,
        words: [],
        language: 'en',
        duration: Math.round(audioBuffer.length / 16000)
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

      // Guard chat completion usage: OpenAI client shape differs between versions; support multiple safe call patterns
      const canUseChat = this.openai && (
        (this.openai.chat && typeof this.openai.chat.completions?.create === 'function') ||
        (typeof this.openai.chat?.create === 'function') ||
        (typeof this.openai.completions?.create === 'function')
      );

      if (canUseChat) {
        let response;
        try {
          if (this.openai.chat && typeof this.openai.chat.completions?.create === 'function') {
            response = await this.openai.chat.completions.create({
              model: process.env.AI_MODEL || 'gpt-4',
              messages: [
                { role: 'system', content: 'You are a helpful AI assistant specialized in creating conversation summaries for dementia care patients. Be concise, clear, and focus on the most important information.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.3,
              max_tokens: 500
            });
          } else if (typeof this.openai.chat?.create === 'function') {
            response = await this.openai.chat.create({ model: process.env.AI_MODEL || 'gpt-4', messages: [{ role: 'user', content: prompt }] });
          } else {
            response = await this.openai.completions.create({ model: process.env.AI_MODEL || 'gpt-4', prompt, max_tokens: 500 });
          }
        } catch (callErr) {
          logger.warn('OpenAI call failed:', callErr.message);
          response = null;
        }

        const duration = Date.now() - startTime;
        logger.ai('generate_summary_complete', { 
          duration: `${duration}ms`,
          personName
        });

        if (response) {
          try {
            // Try multiple response shapes
            const content = response?.choices?.[0]?.message?.content || response?.choices?.[0]?.text || response?.content || response?.data?.choices?.[0]?.message?.content || '';
            const summaryData = JSON.parse(content);
            return summaryData;
          } catch (parseError) {
            const raw = response?.choices?.[0]?.message?.content || response?.choices?.[0]?.text || response?.content || '';
            return {
              summary: raw,
              keyTopics: [],
              emotions: [],
              importantDetails: [],
              actionItems: [],
              sentiment: 'neutral',
              sentimentScore: 0
            };
          }
        }
      }

      // Degraded rule-based summary
      logger.warn('OpenAI summary unavailable, using local rule-based summary');
      return this.createRuleBasedSummary(transcript, personName);
    } catch (error) {
      logger.error('Summary generation error:', error);
      throw new Error(`Summary generation failed: ${error.message}`);
    }
  }

  // Extract keywords from transcript
  async extractKeywords(transcript) {
    try {
      if (this.openai && this.openai.chat && typeof this.openai.chat.completions.create === 'function') {
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
      }

      // Fallback simple keyword extraction
      const words = transcript.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

      const wordCount = {};
      words.forEach(word => { wordCount[word] = (wordCount[word] || 0) + 1; });
      return Object.entries(wordCount).sort(([,a],[,b]) => b-a).slice(0,10).map(([w]) => w);
    } catch (error) {
      logger.error('Keyword extraction error:', error);
      return [];
    }
  }

  // Analyze emotions in the conversation
  async analyzeEmotions(transcript) {
    try {
      if (this.openai && this.openai.chat && typeof this.openai.chat.completions.create === 'function') {
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
      }

      // Fallback emotion analysis
      const emotionKeywords = {
        happy: ['happy', 'joy', 'excited', 'wonderful', 'great', 'amazing'],
        sad: ['sad', 'depressed', 'upset', 'disappointed', 'hurt'],
        angry: ['angry', 'mad', 'furious', 'annoyed', 'irritated']
      };
      const textLower = transcript.toLowerCase();
      const emotions = [];
      Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
        const count = keywords.reduce((acc, k) => acc + (textLower.split(k).length - 1), 0);
        if (count > 0) emotions.push({ emotion, confidence: Math.min(1, count / 5) });
      });

      return { emotions: emotions.length > 0 ? emotions : [{ emotion: 'neutral', confidence: 0.8 }], overallSentiment: emotions.length > 0 ? emotions[0].emotion : 'neutral' };
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

      // Guard chat usage similarly to other methods
      const canUseChat = this.openai && (
        (this.openai.chat && typeof this.openai.chat.completions?.create === 'function') ||
        (typeof this.openai.chat?.create === 'function') ||
        (typeof this.openai.completions?.create === 'function')
      );

      if (!canUseChat) {
        logger.warn('OpenAI unavailable for daily summary, using fallback');
        const peopleMentioned = [...new Set(conversations.map(c => c.personName))];
        const allTopics = conversations.flatMap(c => c.keyTopics || []);
        const uniqueTopics = [...new Set(allTopics)];
        return {
          dailySummary: `You had ${conversations.length} conversations today with ${peopleMentioned.join(', ')}. The main topics discussed were ${uniqueTopics.join(', ')}.`,
          peopleMentioned,
          keyTopics: uniqueTopics,
          positiveMoments: [],
          importantReminders: [],
          overallSentiment: 'neutral'
        };
      }

      let response;
      try {
        if (this.openai.chat && typeof this.openai.chat.completions?.create === 'function') {
          response = await this.openai.chat.completions.create({
            model: process.env.AI_MODEL || 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a compassionate AI assistant creating daily summaries for dementia care patients. Be warm, encouraging, and focus on positive moments.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.4,
            max_tokens: 800
          });
        } else if (typeof this.openai.chat?.create === 'function') {
          response = await this.openai.chat.create({ model: process.env.AI_MODEL || 'gpt-4', messages: [{ role: 'user', content: prompt }] });
        } else {
          response = await this.openai.completions.create({ model: process.env.AI_MODEL || 'gpt-4', prompt, max_tokens: 800 });
        }
      } catch (err) {
        logger.warn('OpenAI daily summary call failed, using fallback:', err.message);
        const peopleMentioned = [...new Set(conversations.map(c => c.personName))];
        const allTopics = conversations.flatMap(c => c.keyTopics || []);
        const uniqueTopics = [...new Set(allTopics)];
        return {
          dailySummary: `You had ${conversations.length} conversations today with ${peopleMentioned.join(', ')}. The main topics discussed were ${uniqueTopics.join(', ')}.`,
          peopleMentioned,
          keyTopics: uniqueTopics,
          positiveMoments: [],
          importantReminders: [],
          overallSentiment: 'neutral'
        };
      }

      const duration = Date.now() - startTime;
      logger.ai('generate_daily_summary_complete', {
        duration: `${duration}ms`,
        conversationCount: conversations.length
      });

      try {
        const content = response?.choices?.[0]?.message?.content || response?.choices?.[0]?.text || response?.content || '';
        const dailySummary = JSON.parse(content);
        return dailySummary;
      } catch (parseError) {
        const raw = response?.choices?.[0]?.message?.content || response?.choices?.[0]?.text || response?.content || '';
        return {
          dailySummary: raw,
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
