'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from 'react-query'
import { usersApi } from '@/lib/api'
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  BellIcon, 
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import ConversationCard from './ConversationCard'
import PersonCard from './PersonCard'
import UploadModal from './UploadModal'
import AccessibilitySettings from './AccessibilitySettings'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false)

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery(
    'dashboard',
    () => usersApi.getDashboard(user!.id),
    {
      enabled: !!user,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  )

  const navigation = [
    { name: 'Overview', id: 'overview', icon: HomeIcon },
    { name: 'Conversations', id: 'conversations', icon: ChatBubbleLeftRightIcon },
    { name: 'People', id: 'people', icon: UserGroupIcon },
    { name: 'Notifications', id: 'notifications', icon: BellIcon },
    { name: 'Settings', id: 'settings', icon: Cog6ToothIcon },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Welcome back, {user?.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {user?.role === 'admin' ? 'Administrator' : 'Client'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAccessibilitySettings(true)}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Accessibility settings"
              >
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
              
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600"
                aria-label="Sign out"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        activeTab === item.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="dashboard-widget">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Today's Conversations</p>
                        <p className="widget-value">{dashboardData?.todayConversations || 0}</p>
                      </div>
                      <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600" />
                    </div>
                  </div>

                  <div className="dashboard-widget">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total People</p>
                        <p className="widget-value">{dashboardData?.peopleCount || 0}</p>
                      </div>
                      <UserGroupIcon className="h-8 w-8 text-primary-600" />
                    </div>
                  </div>

                  <div className="dashboard-widget">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Unread Notifications</p>
                        <p className="widget-value">{dashboardData?.unreadNotifications || 0}</p>
                      </div>
                      <BellIcon className="h-8 w-8 text-primary-600" />
                    </div>
                  </div>

                  <div className="dashboard-widget">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Recent Conversations</p>
                        <p className="widget-value">{dashboardData?.recentConversations?.length || 0}</p>
                      </div>
                      <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600" />
                    </div>
                  </div>
                </div>

                {/* Recent Conversations */}
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Conversations</h2>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn-primary btn-sm"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Conversation
                    </button>
                  </div>
                  <div className="p-6">
                    {dashboardData?.recentConversations?.length > 0 ? (
                      <div className="space-y-4">
                        {dashboardData.recentConversations.map((conversation: any) => (
                          <ConversationCard key={conversation._id} conversation={conversation} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No conversations yet</p>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="btn-primary mt-4"
                        >
                          Upload Your First Conversation
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Frequent People */}
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Frequent Contacts</h2>
                  </div>
                  <div className="p-6">
                    {dashboardData?.frequentPeople?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dashboardData.frequentPeople.map((person: any) => (
                          <PersonCard key={person._id} person={person} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No people added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'conversations' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">All Conversations</h2>
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="btn-primary btn-sm"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Conversation
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-500">Conversations list will be implemented here</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'people' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">People</h2>
                    <button className="btn-primary btn-sm">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Person
                    </button>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-500">People management will be implemented here</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {dashboardData?.unreadNotifications > 0 ? (
                      <div className="p-6">
                        <p className="text-gray-500">Notification items will be implemented here</p>
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-500">Settings will be implemented here</p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {showAccessibilitySettings && (
        <AccessibilitySettings
          isOpen={showAccessibilitySettings}
          onClose={() => setShowAccessibilitySettings(false)}
        />
      )}
    </div>
  )
}
