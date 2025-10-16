import axios, { AxiosInstance, AxiosResponse } from 'axios'
import Cookies from 'js-cookie'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials)
    const { data } = response.data
    
    // Store token in cookie
    Cookies.set('token', data.token, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    
    return data
  },

  register: async (userData: { 
    name: string; 
    email: string; 
    password: string; 
    role?: 'client' | 'admin' 
  }) => {
    const response = await api.post('/auth/register', userData)
    const { data } = response.data
    
    // Store token in cookie
    Cookies.set('token', data.token, { 
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    
    return data
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data.data
  },

  updateProfile: async (profileData: any) => {
    const response = await api.put('/auth/profile', profileData)
    return response.data.data
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword
    })
    return response.data
  },

  logout: async () => {
    await api.post('/auth/logout')
    Cookies.remove('token')
  },
}

// Conversations API
export const conversationsApi = {
  upload: async (formData: FormData) => {
    const response = await api.post('/conversations/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  getConversations: async (clientId: string, params?: any) => {
    const response = await api.get(`/conversations/${clientId}`, { params })
    return response.data.data
  },

  getConversation: async (clientId: string, conversationId: string) => {
    const response = await api.get(`/conversations/${clientId}/${conversationId}`)
    return response.data.data
  },

  getStats: async (clientId: string, params?: any) => {
    const response = await api.get(`/conversations/${clientId}/stats`, { params })
    return response.data.data
  },

  getByPerson: async (clientId: string, personId: string, params?: any) => {
    const response = await api.get(`/conversations/${clientId}/by-person/${personId}`, { params })
    return response.data.data
  },

  updateConversation: async (clientId: string, conversationId: string, data: any) => {
    const response = await api.put(`/conversations/${clientId}/${conversationId}`, data)
    return response.data.data
  },

  deleteConversation: async (clientId: string, conversationId: string) => {
    const response = await api.delete(`/conversations/${clientId}/${conversationId}`)
    return response.data
  },

  getAudioUrl: (clientId: string, conversationId: string) => {
    return `${api.defaults.baseURL}/conversations/${clientId}/audio/${conversationId}`
  },
}

// Offline Conversations API
export const offlineConversationsApi = {
  upload: async (formData: FormData) => {
    const response = await api.post('/offline/conversations/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  getConversations: async (userId: string, params?: any) => {
    const response = await api.get(`/offline/conversations/${userId}`, { params })
    return response.data.data
  },

  getConversation: async (userId: string, conversationId: string) => {
    const response = await api.get(`/offline/conversations/${userId}/${conversationId}`)
    return response.data.data
  },

  getStats: async (userId: string, params?: any) => {
    const response = await api.get(`/offline/conversations/${userId}/stats`, { params })
    return response.data.data
  },

  getByPerson: async (userId: string, personName: string, params?: any) => {
    const response = await api.get(`/offline/conversations/${userId}/by-person/${personName}`, { params })
    return response.data.data
  },

  deleteConversation: async (userId: string, conversationId: string) => {
    const response = await api.delete(`/offline/conversations/${userId}/${conversationId}`)
    return response.data
  },

  getAudioUrl: (userId: string, conversationId: string) => {
    return `${api.defaults.baseURL}/offline/conversations/${userId}/audio/${conversationId}`
  },

  getStorageStats: async (userId: string) => {
    const response = await api.get(`/offline/conversations/${userId}/storage-stats`)
    return response.data.data
  },

  cleanup: async (userId: string, monthsOld?: number) => {
    const response = await api.post(`/offline/conversations/${userId}/cleanup`, { monthsOld })
    return response.data.data
  },
}

// People API
export const peopleApi = {
  getPeople: async (clientId: string, params?: any) => {
    const response = await api.get(`/users/${clientId}/people`, { params })
    return response.data.data
  },

  createPerson: async (clientId: string, personData: any) => {
    const response = await api.post(`/users/${clientId}/people`, personData)
    return response.data.data
  },

  getPerson: async (clientId: string, personId: string) => {
    const response = await api.get(`/users/${clientId}/people/${personId}`)
    return response.data.data
  },

  updatePerson: async (clientId: string, personId: string, data: any) => {
    const response = await api.put(`/users/${clientId}/people/${personId}`, data)
    return response.data.data
  },

  deletePerson: async (clientId: string, personId: string) => {
    const response = await api.delete(`/users/${clientId}/people/${personId}`)
    return response.data
  },

  getPersonConversations: async (clientId: string, personId: string, params?: any) => {
    const response = await api.get(`/users/${clientId}/people/${personId}/conversations`, { params })
    return response.data.data
  },

  getPeopleStats: async (clientId: string) => {
    const response = await api.get(`/users/${clientId}/people/stats`)
    return response.data.data
  },

  updateFaceEmbedding: async (clientId: string, personId: string, embedding: number[]) => {
    const response = await api.post(`/users/${clientId}/people/${personId}/face-embedding`, {
      faceEmbedding: embedding
    })
    return response.data.data
  },

  updateVoiceEmbedding: async (clientId: string, personId: string, embedding: number[]) => {
    const response = await api.post(`/users/${clientId}/people/${personId}/voice-embedding`, {
      voiceEmbedding: embedding
    })
    return response.data.data
  },
}

// Notifications API
export const notificationsApi = {
  getNotifications: async (clientId: string, params?: any) => {
    const response = await api.get(`/notifications/${clientId}`, { params })
    return response.data.data
  },

  createNotification: async (clientId: string, notificationData: any) => {
    const response = await api.post(`/notifications/${clientId}`, notificationData)
    return response.data.data
  },

  updatePreferences: async (clientId: string, preferences: any) => {
    const response = await api.put(`/notifications/${clientId}/preferences`, preferences)
    return response.data.data
  },

  getPreferences: async (clientId: string) => {
    const response = await api.get(`/notifications/${clientId}/preferences`)
    return response.data.data
  },

  markAsRead: async (clientId: string, notificationId: string) => {
    const response = await api.put(`/notifications/${clientId}/${notificationId}/read`)
    return response.data.data
  },

  deleteNotification: async (clientId: string, notificationId: string) => {
    const response = await api.delete(`/notifications/${clientId}/${notificationId}`)
    return response.data
  },

  createDailySummary: async (clientId: string) => {
    const response = await api.post(`/notifications/${clientId}/daily-summary`)
    return response.data.data
  },

  getStats: async (clientId: string, params?: any) => {
    const response = await api.get(`/notifications/${clientId}/stats`, { params })
    return response.data.data
  },

  activateNotification: async (clientId: string, notificationId: string, isActive: boolean) => {
    const response = await api.put(`/notifications/${clientId}/${notificationId}/activate`, {
      isActive
    })
    return response.data.data
  },

  triggerNotification: async (clientId: string, notificationId: string) => {
    const response = await api.post(`/notifications/${clientId}/${notificationId}/trigger`)
    return response.data
  },

  getUnreadCount: async (clientId: string) => {
    const response = await api.get(`/notifications/${clientId}/unread`)
    return response.data.data
  },
}

// Users API
export const usersApi = {
  getDashboard: async (clientId: string) => {
    const response = await api.get(`/users/${clientId}/dashboard`)
    return response.data.data
  },

  updateProfile: async (clientId: string, profileData: any) => {
    const response = await api.put(`/users/${clientId}/profile`, profileData)
    return response.data.data
  },

  getProfile: async (clientId: string) => {
    const response = await api.get(`/users/${clientId}/profile`)
    return response.data.data
  },
}

// Admin API
export const adminApi = {
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard')
    return response.data.data
  },

  getUsers: async (params?: any) => {
    const response = await api.get('/admin/users', { params })
    return response.data.data
  },

  getUser: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data.data
  },

  updateUser: async (userId: string, userData: any) => {
    const response = await api.put(`/admin/users/${userId}`, userData)
    return response.data.data
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`)
    return response.data
  },

  getConversations: async (params?: any) => {
    const response = await api.get('/admin/conversations', { params })
    return response.data.data
  },

  getNotifications: async (params?: any) => {
    const response = await api.get('/admin/notifications', { params })
    return response.data.data
  },

  getAnalytics: async (params?: any) => {
    const response = await api.get('/admin/analytics', { params })
    return response.data.data
  },

  systemCleanup: async (tasks: string[]) => {
    const response = await api.post('/admin/system/cleanup', { tasks })
    return response.data.data
  },
}

export default api
