export interface Conversation {
  _id: string
  clientId: string
  personId?: string
  person?: Person
  audioPath: string
  audioDuration: number
  transcript: string
  summary: string
  keyTopics: Array<{
    topic: string
    confidence: number
  }>
  emotions: Array<{
    emotion: 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted' | 'neutral'
    confidence: number
    timestamp: number
  }>
  sentiment: 'positive' | 'negative' | 'neutral'
  sentimentScore: number
  keywords: string[]
  language: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingError?: string
  metadata: {
    recordingDevice?: string
    audioQuality: 'low' | 'medium' | 'high'
    backgroundNoise: 'low' | 'medium' | 'high'
    speakerCount: number
  }
  isPrivate: boolean
  tags: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Person {
  _id: string
  name: string
  clientId: string
  relationship: 'family' | 'friend' | 'caregiver' | 'doctor' | 'therapist' | 'other'
  faceEmbedding: number[]
  voiceEmbedding: number[]
  profileImage?: string
  contactInfo?: {
    phone?: string
    email?: string
    address?: string
  }
  notes?: string
  isActive: boolean
  lastSeen: string
  interactionCount: number
  averageInteractionDuration: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ConversationStats {
  totalConversations: number
  totalDuration: number
  avgDuration: number
  avgSentimentScore: number
  positiveConversations: number
  negativeConversations: number
  neutralConversations: number
}

export interface DailySummary {
  _id: {
    year: number
    month: number
    day: number
  }
  conversations: number
  totalDuration: number
  avgSentiment: number
  people: string[]
  summaries: string[]
}

export interface ConversationFilters {
  personId?: string
  sentiment?: 'positive' | 'negative' | 'neutral'
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}
