'use client'

import * as React from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DrawingModalProps, DrawingMode } from './types'

export function DrawingModal({
  isOpen,
  onClose,
  jobData,
  uploadedFiles,
  onSaveDrawing,
  existingDrawing,
}: DrawingModalProps) {
  const [activeMode, setActiveMode] = React.useState<DrawingMode>('auto-generated')
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement save logic based on active mode
      console.log('Saving drawing in mode:', activeMode)

      // For now, just close the modal
      onClose()
    } catch (error) {
      console.error('Error saving drawing:', error)
      alert('Failed to save drawing. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate 2D Drawing</DialogTitle>
          <DialogDescription>
            Choose a drawing mode to create diagrams for your estimate
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeMode}
          onValueChange={(value) => setActiveMode(value as DrawingMode)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="auto-generated">
              Auto-Generated
            </TabsTrigger>
            <TabsTrigger value="photo-annotation">
              Photo Annotation
            </TabsTrigger>
            <TabsTrigger value="interactive-builder">
              Interactive Builder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto-generated" className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-600 mb-4">
                Automatically generate a 2D diagram based on the measurements you entered in the form.
              </p>
              <div className="bg-white rounded border border-gray-300 p-8 min-h-[400px] flex items-center justify-center">
                <p className="text-gray-400">
                  Auto-generated diagram canvas will appear here
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photo-annotation" className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-600 mb-4">
                Select a photo and draw annotations to highlight areas of interest.
              </p>
              <div className="bg-white rounded border border-gray-300 p-8 min-h-[400px] flex items-center justify-center">
                <p className="text-gray-400">
                  Photo annotation canvas will appear here
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interactive-builder" className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
              <p className="text-gray-600 mb-4">
                Drag and drop deck components to build your custom plan.
              </p>
              <div className="bg-white rounded border border-gray-300 p-8 min-h-[400px] flex items-center justify-center">
                <p className="text-gray-400">
                  Interactive builder canvas will appear here
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Drawing'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
