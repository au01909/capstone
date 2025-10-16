'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Conversation } from '@/types/conversation'

interface ConversationCardProps {
  conversation: Conversation
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-success-600 bg-success-100'
      case 'negative':
        return 'text-error-600 bg-error-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'negative':
        return '😔'
      default:
        return '😐'
    }
  }

  return (
    <div className="conversation-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
            {conversation.person?.profileImage ? (
              <img
                src={conversation.person.profileImage}
                alt={conversation.person.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-6 w-6 text-primary-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {conversation.person?.name || 'Unknown Person'}
            </h3>
            <p className="text-sm text-gray-500">
              {conversation.person?.relationship || 'Other'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(conversation.sentiment)}`}>
            <span className="mr-1">{getSentimentIcon(conversation.sentiment)}</span>
            {conversation.sentiment}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
        <p className="conversation-summary text-gray-600">
          {conversation.summary || 'No summary available yet...'}
        </p>
      </div>

      {/* Key Topics */}
      {conversation.keyTopics && conversation.keyTopics.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Key Topics</h4>
          <div className="flex flex-wrap gap-2">
            {conversation.keyTopics.slice(0, 3).map((topic, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
              >
                {topic.topic}
              </span>
            ))}
            {conversation.keyTopics.length > 3 && (
              <span className="text-xs text-gray-500">
                +{conversation.keyTopics.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Audio Player */}
      <div className="audio-player mb-4">
        <div className="audio-controls">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center justify-center w-10 h-10 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors duration-200"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5" />
            )}
          </button>
          
          <div className="flex-1 ml-4">
            <div className="audio-progress">
              <div 
                className="audio-progress-bar"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(conversation.audioDuration)}</span>
            </div>
          </div>
          
          <SpeakerWaveIcon className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            {format(new Date(conversation.createdAt), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            {format(new Date(conversation.createdAt), 'h:mm a')}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {conversation.processingStatus === 'completed' && (
            <span className="status-success">Completed</span>
          )}
          {conversation.processingStatus === 'processing' && (
            <span className="status-warning">Processing</span>
          )}
          {conversation.processingStatus === 'failed' && (
            <span className="status-error">Failed</span>
          )}
          {conversation.processingStatus === 'pending' && (
            <span className="status-info">Pending</span>
          )}
        </div>
      </div>
    </div>
  )
}
