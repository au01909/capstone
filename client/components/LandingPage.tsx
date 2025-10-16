'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  CpuChipIcon, 
  ChatBubbleLeftRightIcon, 
  BellIcon, 
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'AI-Powered Summaries',
    description: 'Automatically transcribe and summarize your conversations using advanced AI technology.',
    icon: CpuChipIcon,
  },
  {
    name: 'Person Recognition',
    description: 'Identify and remember people you talk to through face and voice recognition.',
    icon: UserGroupIcon,
  },
  {
    name: 'Smart Reminders',
    description: 'Get gentle reminders to review your conversation summaries at your preferred times.',
    icon: BellIcon,
  },
  {
    name: 'Privacy & Security',
    description: 'Your conversations are encrypted and stored securely with full privacy protection.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Easy Access',
    description: 'Simple, accessible interface designed specifically for dementia care patients.',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    name: 'Progress Tracking',
    description: 'Monitor your social interactions and emotional wellbeing over time.',
    icon: ChartBarIcon,
  },
]

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Dementia Care Patient',
    content: 'This app has helped me remember my conversations with my family. I feel more connected and confident.',
    avatar: '/avatars/sarah.jpg',
  },
  {
    name: 'Dr. Michael Chen',
    role: 'Geriatric Specialist',
    content: 'The AI-powered summaries provide valuable insights for both patients and caregivers.',
    avatar: '/avatars/michael.jpg',
  },
  {
    name: 'Emma Williams',
    role: 'Family Caregiver',
    content: 'Seeing my mother\'s conversation summaries helps me understand her daily interactions better.',
    avatar: '/avatars/emma.jpg',
  },
]

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <CpuChipIcon className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  Dementia Care
                </span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="#testimonials" className="text-gray-600 hover:text-gray-900">
                Testimonials
              </Link>
              <Link href="#about" className="text-gray-600 hover:text-gray-900">
                About
              </Link>
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-gray-900"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
              <Link href="#features" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="#testimonials" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Testimonials
              </Link>
              <Link href="#about" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                About
              </Link>
              <Link href="/auth/login" className="block px-3 py-2 text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link href="/auth/register" className="block px-3 py-2 text-primary-600 hover:text-primary-700">
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero section */}
      <div className="relative bg-gradient-to-br from-primary-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
            >
              Remember Your
              <span className="text-primary-600"> Conversations</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
            >
              AI-powered conversation summaries and gentle reminders to help dementia care patients 
              stay connected with their loved ones and maintain their social relationships.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/auth/register"
                className="btn-primary btn-lg"
              >
                Start Your Journey
              </Link>
              <Link
                href="#features"
                className="btn-secondary btn-lg"
              >
                Learn More
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-powered system helps you remember and stay connected with the people who matter most.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="card p-6 text-center hover:shadow-medium transition-shadow duration-200"
              >
                <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100 mb-4">
                  <feature.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials section */}
      <div id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What People Are Saying
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real stories from patients, families, and healthcare professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="card p-6"
              >
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-lg font-semibold text-gray-600">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "{testimonial.content}"
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA section */}
      <div className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Join thousands of families who are using AI to stay connected and preserve precious memories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/register"
                className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg"
              >
                Create Free Account
              </Link>
              <Link
                href="/auth/login"
                className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 btn-lg"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <CpuChipIcon className="h-8 w-8 text-primary-400" />
                <span className="ml-2 text-xl font-bold">
                  Dementia Care
                </span>
              </div>
              <p className="text-gray-400 mb-4">
                AI-powered conversation summaries and reminders to help dementia care patients 
                maintain their social connections and preserve precious memories.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-400 hover:text-white">Features</Link></li>
                <li><Link href="/auth/register" className="text-gray-400 hover:text-white">Get Started</Link></li>
                <li><Link href="/auth/login" className="text-gray-400 hover:text-white">Sign In</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="#about" className="text-gray-400 hover:text-white">About</Link></li>
                <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 Dementia Care Summary. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
