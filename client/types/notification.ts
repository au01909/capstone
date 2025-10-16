export interface Notification {
  _id: string
  clientId: string
  type: 'reminder' | 'summary' | 'system' | 'alert'
  title: string
  message: string
  frequency: 'hourly' | 'daily' | 'weekly' | 'once'
  scheduledTime: string
  deliveryMethod: 'email' | 'in-app' | 'push' | 'sms'
  status: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  isActive: boolean
  lastTriggered?: string
  nextTrigger?: string
  deliveryHistory: Array<{
    sentAt: string
    status: 'sent' | 'delivered' | 'failed'
    deliveryMethod: string
    errorMessage?: string
    metadata?: any
  }>
  metadata: {
    conversationCount?: number
    summaryData?: any
    priority: 'low' | 'medium' | 'high' | 'urgent'
  }
  conditions: {
    minConversations: number
    timeRange?: {
      start: string
      end: string
    }
    daysOfWeek?: number[]
  }
  createdAt: string
  updatedAt: string
}

export interface NotificationStats {
  totalNotifications: number
  sentNotifications: number
  deliveredNotifications: number
  failedNotifications: number
  activeNotifications: number
}

export interface NotificationFilters {
  type?: 'reminder' | 'summary' | 'system' | 'alert'
  status?: 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled'
  page?: number
  limit?: number
}
