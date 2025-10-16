'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authApi } from '@/lib/api'
import { User, LoginCredentials, RegisterData } from '@/types/auth'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Check if user is authenticated on mount
  const { data: userData, isLoading: userLoading } = useQuery(
    'auth-user',
    authApi.getCurrentUser,
    {
      retry: false,
      onError: () => {
        setUser(null)
        setIsLoading(false)
      },
      onSuccess: (data) => {
        setUser(data.user)
        setIsLoading(false)
      },
    }
  )

  // Login mutation
  const loginMutation = useMutation(authApi.login, {
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.setQueryData('auth-user', data)
      toast.success('Welcome back!')
      router.push('/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed')
    },
  })

  // Register mutation
  const registerMutation = useMutation(authApi.register, {
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.setQueryData('auth-user', data)
      toast.success('Account created successfully!')
      router.push('/dashboard')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Registration failed')
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation(
    (data: Partial<User>) => authApi.updateProfile(data),
    {
      onSuccess: (data) => {
        setUser(data.user)
        queryClient.setQueryData('auth-user', data)
        toast.success('Profile updated successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Profile update failed')
      },
    }
  )

  // Change password mutation
  const changePasswordMutation = useMutation(
    ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    {
      onSuccess: () => {
        toast.success('Password changed successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Password change failed')
      },
    }
  )

  // Logout function
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // Ignore logout errors
    } finally {
      setUser(null)
      queryClient.clear()
      localStorage.removeItem('token')
      toast.success('Logged out successfully')
      router.push('/')
    }
  }

  // Login function
  const login = async (credentials: LoginCredentials) => {
    await loginMutation.mutateAsync(credentials)
  }

  // Register function
  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data)
  }

  // Update profile function
  const updateProfile = async (data: Partial<User>) => {
    await updateProfileMutation.mutateAsync(data)
  }

  // Change password function
  const changePassword = async (currentPassword: string, newPassword: string) => {
    await changePasswordMutation.mutateAsync({ currentPassword, newPassword })
  }

  // Update loading state when user data changes
  useEffect(() => {
    setIsLoading(userLoading)
  }, [userLoading])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
