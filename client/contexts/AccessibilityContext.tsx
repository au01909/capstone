'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  highContrast: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  focusVisible: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (settings: Partial<AccessibilitySettings>) => void
  resetSettings: () => void
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: false,
  focusVisible: true,
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...defaultSettings, ...parsed })
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error)
      }
    }

    // Detect screen reader
    const detectScreenReader = () => {
      const hasScreenReader = 
        !!window.speechSynthesis ||
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver')
      
      setSettings(prev => ({ ...prev, screenReader: hasScreenReader }))
    }

    detectScreenReader()

    // Detect reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }))
    }

    mediaQuery.addEventListener('change', handleMotionChange)
    setSettings(prev => ({ ...prev, reducedMotion: mediaQuery.matches }))

    return () => mediaQuery.removeEventListener('change', handleMotionChange)
  }, [])

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement

    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large')
    root.classList.add(`font-${settings.fontSize}`)

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    // Focus visible
    if (settings.focusVisible) {
      root.classList.add('focus-visible')
    } else {
      root.classList.remove('focus-visible')
    }

    // Update CSS custom properties
    root.style.setProperty('--font-size-multiplier', getFontSizeMultiplier(settings.fontSize))
  }, [settings])

  // Update settings function
  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    localStorage.setItem('accessibility-settings', JSON.stringify(updatedSettings))
  }

  // Reset settings function
  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.removeItem('accessibility-settings')
  }

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    resetSettings,
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Helper function to get font size multiplier
function getFontSizeMultiplier(fontSize: AccessibilitySettings['fontSize']): string {
  switch (fontSize) {
    case 'small':
      return '0.875'
    case 'medium':
      return '1'
    case 'large':
      return '1.125'
    case 'extra-large':
      return '1.25'
    default:
      return '1'
  }
}
