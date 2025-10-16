import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

interface User {
  id: string
  name: string
  email: string
  role: 'client' | 'admin'
  notificationPreferences: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'none'
    time: string
    deliveryMethod: 'email' | 'in-app' | 'both'
    enabled: boolean
  }
  profile?: {
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
  lastLogin?: string
  createdAt: string
}

export async function getServerSession(): Promise<{ user: User } | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return null
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any

    // Make API call to get user data
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return { user: data.data.user }
  } catch (error) {
    console.error('Session verification error:', error)
    return null
  }
}

export async function getToken(): Promise<string | null> {
  try {
    const cookieStore = cookies()
    return cookieStore.get('token')?.value || null
  } catch (error) {
    return null
  }
}
