'use client'

import * as React from 'react'
import { Trash2, Edit, Download, Layers } from 'lucide-react'
import { DrawingGalleryProps, Drawing } from './types'
import { downloadDataURL } from '@/lib/drawing/firebase-storage'

export function DrawingGallery({ drawings, onEdit, onDelete }: DrawingGalleryProps) {
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleDelete = async (id: string, drawing: Drawing) => {
    if (!confirm('Are you sure you want to delete this drawing? This action cannot be undone.')) {
      return
    }

    setDeletingId(id)
    try {
      await onDelete(id)
    } catch (error) {
      console.error('Error deleting drawing:', error)
      alert('Failed to delete drawing. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = (drawing: Drawing) => {
    const filename = `drawing-${drawing.mode}-${new Date().toISOString().split('T')[0]}.png`
    downloadDataURL(drawing.fullImageUrl, filename)
  }

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'auto-generated':
        return 'Auto-Generated'
      case 'photo-annotation':
        return 'Photo Annotation'
      case 'interactive-builder':
        return 'Interactive Builder'
      default:
        return mode
    }
  }

  const getModeBadgeColor = (mode: string) => {
    switch (mode) {
      case 'auto-generated':
        return 'bg-blue-100 text-blue-800'
      case 'photo-annotation':
        return 'bg-green-100 text-green-800'
      case 'interactive-builder':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (drawings.length === 0) {
    return null
  }

  return (
    <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <Layers className="w-5 h-5 mr-2 text-gray-700" />
        <h2 className="text-xl font-semibold text-gray-800">
          Saved Drawings ({drawings.length})
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {drawings.map((drawing) => (
          <div
            key={drawing.id}
            className="relative group rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow bg-white"
          >
            {/* Thumbnail */}
            <div
              className="aspect-[4/3] bg-gray-100 cursor-pointer"
              onClick={() => onEdit(drawing)}
            >
              {drawing.thumbnailUrl ? (
                <img
                  src={drawing.thumbnailUrl}
                  alt={`Drawing ${getModeLabel(drawing.mode)}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers className="w-12 h-12 text-gray-300" />
                </div>
              )}
            </div>

            {/* Mode Badge */}
            <div className="absolute top-2 left-2">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${getModeBadgeColor(
                  drawing.mode
                )}`}
              >
                {getModeLabel(drawing.mode)}
              </span>
            </div>

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(drawing)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  title="Edit drawing"
                >
                  <Edit className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => handleDownload(drawing)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                  title="Download drawing"
                >
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => handleDelete(drawing.id, drawing)}
                  disabled={deletingId === drawing.id}
                  className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                  title="Delete drawing"
                >
                  <Trash2
                    className={`w-4 h-4 ${
                      deletingId === drawing.id ? 'text-gray-400' : 'text-red-600'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Created Date */}
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                {typeof drawing.createdAt === 'string'
                  ? new Date(drawing.createdAt).toLocaleDateString()
                  : drawing.createdAt.toDate?.().toLocaleDateString() || 'Unknown date'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
