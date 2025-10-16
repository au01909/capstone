export interface User {
  id: string
  name: string
  email: string
  role: 'client' | 'admin'
  notificationPreferences: NotificationPreferences
  profile?: UserProfile
  lastLogin?: string
  createdAt: string
}

export interface NotificationPreferences {
  frequency: 'hourly' | 'daily' | 'weekly' | 'none'
  time: string
  deliveryMethod: 'email' | 'in-app' | 'both'
  enabled: boolean
}

export interface UserProfile {
  dateOfBirth?: string
  emergencyContact?: {
    name: string
    phone: string
    email: string
  }
  medicalInfo?: {
    conditions: string[]
    medications: string[]
    allergies: string[]
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  role?: 'client' | 'admin'
}

export interface AuthResponse {
  user: User
  token: string
}
