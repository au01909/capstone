'use client'

import { format } from 'date-fns'
import { 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Person } from '@/types/conversation'

interface PersonCardProps {
  person: Person
}

export default function PersonCard({ person }: PersonCardProps) {
  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'family':
        return 'text-purple-600 bg-purple-100'
      case 'friend':
        return 'text-blue-600 bg-blue-100'
      case 'caregiver':
        return 'text-green-600 bg-green-100'
      case 'doctor':
        return 'text-red-600 bg-red-100'
      case 'therapist':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'family':
        return '👨‍👩‍👧‍👦'
      case 'friend':
        return '👫'
      case 'caregiver':
        return '🤝'
      case 'doctor':
        return '👨‍⚕️'
      case 'therapist':
        return '🧠'
      default:
        return '👤'
    }
  }

  return (
    <div className="card p-6 hover:shadow-medium transition-shadow duration-200">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {person.profileImage ? (
            <img
              src={person.profileImage}
              alt={person.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-8 w-8 text-primary-600" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {person.name}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRelationshipColor(person.relationship)}`}>
              <span className="mr-1">{getRelationshipIcon(person.relationship)}</span>
              {person.relationship}
            </span>
          </div>
          
          {/* Contact Information */}
          {person.contactInfo && (
            <div className="space-y-1 mb-3">
              {person.contactInfo.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{person.contactInfo.phone}</span>
                </div>
              )}
              {person.contactInfo.email && (
                <div className="flex items-center text-sm text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{person.contactInfo.email}</span>
                </div>
              )}
              {person.contactInfo.address && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{person.contactInfo.address}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Notes */}
          {person.notes && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {person.notes}
            </p>
          )}
          
          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
              <span>{person.interactionCount} conversations</span>
            </div>
            
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>
                {person.averageInteractionDuration > 0 
                  ? `${Math.round(person.averageInteractionDuration)} min avg`
                  : 'No data'
                }
              </span>
            </div>
          </div>
          
          {/* Last Seen */}
          <div className="mt-2 text-xs text-gray-400">
            Last seen: {format(new Date(person.lastSeen), 'MMM d, yyyy')}
          </div>
          
          {/* Tags */}
          {person.tags && person.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {person.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {tag}
                </span>
              ))}
              {person.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{person.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
