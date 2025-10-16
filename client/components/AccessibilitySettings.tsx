'use client'

import { useState } from 'react'
import { useAccessibility } from '@/contexts/AccessibilityContext'
import { 
  XMarkIcon,
  EyeIcon,
  SpeakerWaveIcon,
  CursorArrowRaysIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

interface AccessibilitySettingsProps {
  isOpen: boolean
  onClose: () => void
}

export default function AccessibilitySettings({ isOpen, onClose }: AccessibilitySettingsProps) {
  const { settings, updateSettings, resetSettings } = useAccessibility()
  const [localSettings, setLocalSettings] = useState(settings)

  const handleSave = () => {
    updateSettings(localSettings)
    onClose()
  }

  const handleReset = () => {
    resetSettings()
    setLocalSettings({
      fontSize: 'medium',
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      keyboardNavigation: false,
      focusVisible: true,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Accessibility Settings
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Font Size */}
            <div>
              <div className="flex items-center mb-3">
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400 mr-2" />
                <label className="text-sm font-medium text-gray-900">
                  Font Size
                </label>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                  { value: 'extra-large', label: 'Extra Large' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLocalSettings(prev => ({ ...prev, fontSize: option.value as any }))}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${
                      localSettings.fontSize === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div>
              <div className="flex items-center mb-3">
                <EyeIcon className="h-5 w-5 text-gray-400 mr-2" />
                <label className="text-sm font-medium text-gray-900">
                  High Contrast Mode
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="highContrast"
                  checked={localSettings.highContrast}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, highContrast: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="highContrast" className="ml-2 text-sm text-gray-700">
                  Enable high contrast colors for better visibility
                </label>
              </div>
            </div>

            {/* Reduced Motion */}
            <div>
              <div className="flex items-center mb-3">
                <SpeakerWaveIcon className="h-5 w-5 text-gray-400 mr-2" />
                <label className="text-sm font-medium text-gray-900">
                  Reduced Motion
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="reducedMotion"
                  checked={localSettings.reducedMotion}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, reducedMotion: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="reducedMotion" className="ml-2 text-sm text-gray-700">
                  Reduce animations and motion effects
                </label>
              </div>
            </div>

            {/* Focus Visible */}
            <div>
              <div className="flex items-center mb-3">
                <CursorArrowRaysIcon className="h-5 w-5 text-gray-400 mr-2" />
                <label className="text-sm font-medium text-gray-900">
                  Focus Indicators
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="focusVisible"
                  checked={localSettings.focusVisible}
                  onChange={(e) => setLocalSettings(prev => ({ ...prev, focusVisible: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="focusVisible" className="ml-2 text-sm text-gray-700">
                  Show focus indicators for keyboard navigation
                </label>
              </div>
            </div>

            {/* Screen Reader Detection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Screen Reader Detection
              </h4>
              <p className="text-sm text-blue-700">
                {settings.screenReader 
                  ? 'Screen reader detected - enhanced accessibility features are enabled'
                  : 'No screen reader detected'
                }
              </p>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Preview
              </h4>
              <div 
                className={`p-4 rounded-lg border ${
                  localSettings.highContrast 
                    ? 'bg-white border-black text-black' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                style={{
                  fontSize: localSettings.fontSize === 'small' ? '14px' :
                           localSettings.fontSize === 'medium' ? '16px' :
                           localSettings.fontSize === 'large' ? '18px' : '20px'
                }}
              >
                <p className="font-semibold mb-2">Sample Text</p>
                <p>This is how your text will appear with the current settings.</p>
                <button 
                  className={`mt-2 px-3 py-1 rounded ${
                    localSettings.highContrast
                      ? 'bg-black text-white border-2 border-black'
                      : 'bg-primary-600 text-white'
                  }`}
                  style={{
                    transition: localSettings.reducedMotion ? 'none' : 'all 0.2s ease'
                  }}
                >
                  Sample Button
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="btn-secondary"
              >
                Reset to Defaults
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
