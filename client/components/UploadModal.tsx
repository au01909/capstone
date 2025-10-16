'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { conversationsApi, peopleApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { 
  XMarkIcon, 
  CloudArrowUpIcon, 
  MusicalNoteIcon,
  UserIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const uploadSchema = z.object({
  personId: z.string().optional(),
  personName: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => data.personId || data.personName, {
  message: "Either select a person or enter a name",
  path: ["personName"],
})

type UploadFormData = z.infer<typeof uploadSchema>

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  })

  const selectedPersonId = watch('personId')

  // Fetch people for dropdown
  const { data: peopleData } = useQuery(
    'people',
    () => peopleApi.getPeople(user!.id),
    { enabled: !!user }
  )

  // Upload mutation
  const uploadMutation = useMutation(conversationsApi.upload, {
    onSuccess: () => {
      toast.success('Conversation uploaded successfully!')
      queryClient.invalidateQueries('dashboard')
      queryClient.invalidateQueries('conversations')
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Upload failed')
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload an audio file (MP3, WAV, MP4, or OGG)')
        return
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 50MB')
        return
      }

      setUploadedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.mp4', '.ogg']
    },
    multiple: false,
  })

  const onSubmit = async (data: UploadFormData) => {
    if (!uploadedFile || !user) return

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('audio', uploadedFile)
      
      if (data.personId) {
        formData.append('personId', data.personId)
      } else if (data.personName) {
        formData.append('personName', data.personName)
      }
      
      if (data.notes) {
        formData.append('notes', data.notes)
      }

      await uploadMutation.mutateAsync(formData)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setUploadedFile(null)
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Conversation
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* File Upload */}
            <div>
              <label className="form-label">Audio File</label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : uploadedFile
                    ? 'border-success-500 bg-success-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                {uploadedFile ? (
                  <div className="space-y-2">
                    <MusicalNoteIcon className="h-12 w-12 text-success-600 mx-auto" />
                    <p className="text-sm font-medium text-success-900">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-success-700">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      {isDragActive
                        ? 'Drop the audio file here'
                        : 'Drag & drop an audio file, or click to select'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      MP3, WAV, MP4, or OGG (max 50MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Person Selection */}
            <div>
              <label className="form-label">Who did you talk to?</label>
              <div className="space-y-3">
                <select
                  {...register('personId')}
                  className={`form-input ${errors.personId ? 'border-error-500' : ''}`}
                  aria-describedby={errors.personId ? 'person-error' : undefined}
                >
                  <option value="">Select a person...</option>
                  {peopleData?.people?.map((person: any) => (
                    <option key={person._id} value={person._id}>
                      {person.name} ({person.relationship})
                    </option>
                  ))}
                </select>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('personName')}
                    type="text"
                    placeholder="Or enter a new person's name"
                    className={`form-input pl-10 ${errors.personName ? 'border-error-500' : ''}`}
                    aria-describedby={errors.personName ? 'person-name-error' : undefined}
                    disabled={!!selectedPersonId}
                  />
                </div>
                
                {(errors.personId || errors.personName) && (
                  <p className="form-error" role="alert">
                    {errors.personId?.message || errors.personName?.message}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="form-label">
                Notes (optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="form-input"
                placeholder="Add any additional notes about this conversation..."
              />
            </div>

            {/* File Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">
                    Audio Requirements
                  </h4>
                  <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>Clear audio with minimal background noise</li>
                    <li>Supported formats: MP3, WAV, MP4, OGG</li>
                    <li>Maximum file size: 50MB</li>
                    <li>Processing may take a few minutes</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!uploadedFile || isUploading}
                className="btn-primary"
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner h-4 w-4 mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  'Upload Conversation'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
