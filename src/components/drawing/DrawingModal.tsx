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
import { DrawingModalProps, DrawingMode, Drawing } from './types'
import { PhotoAnnotationCanvas } from './PhotoAnnotationCanvas'
import { InteractiveBuilderCanvas } from './InteractiveBuilderCanvas'
import { AutoDiagramCanvas } from './AutoDiagramCanvas'
import { Upload, Image as ImageIcon, X } from 'lucide-react'

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
  const [exportedImage, setExportedImage] = React.useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null)
  const [uploadedPhoto, setUploadedPhoto] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleExport = (dataURL: string) => {
    setExportedImage(dataURL)
  }

  const handleSave = async () => {
    if (!exportedImage) {
      alert('Please export your drawing first using the Export button on the canvas.')
      return
    }

    setIsSaving(true)
    try {
      const drawing: Drawing = {
        id: existingDrawing?.id || uuidv4(),
        mode: activeMode,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        thumbnailUrl: exportedImage,
        fullImageUrl: exportedImage,
        metadata: {
          canvasWidth: 800,
          canvasHeight: 600,
          scale: 1,
          units: 'feet',
        },
        data: {
          type: activeMode,
          jobType: jobData?.jobTypes?.[0] || 'Unknown',
          sourceData: jobData?.jobSpecificAnswers || {},
          elements: [],
        } as any,
      }

      onSaveDrawing(drawing)
      onClose()
    } catch (error) {
      console.error('Error saving drawing:', error)
      alert('Failed to save drawing. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedPhoto(event.target?.result as string)
        setSelectedPhoto(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownload = () => {
    if (exportedImage) {
      const link = document.createElement('a')
      link.download = `deck-drawing-${new Date().toISOString().split('T')[0]}.png`
      link.href = exportedImage
      link.click()
    }
  }

  // Get image files from uploadedFiles
  const imageFiles = (uploadedFiles || []).filter(
    (file: any) => file.type?.startsWith('image/') || file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[1000px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>2D Drawing Tool</DialogTitle>
          <DialogDescription>
            Create diagrams and annotate photos for your estimate
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeMode}
          onValueChange={(value) => {
            setActiveMode(value as DrawingMode)
            setExportedImage(null)
          }}
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
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-gray-600 mb-4 text-sm">
                Automatically generate a 2D diagram based on the measurements you entered in the form.
              </p>
              <AutoDiagramCanvas
                jobData={jobData}
                onExport={handleExport}
                width={900}
                height={500}
              />
            </div>
          </TabsContent>

          <TabsContent value="photo-annotation" className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-gray-600 mb-4 text-sm">
                Select or upload a photo and draw annotations to highlight areas of interest.
              </p>

              {/* Photo selection */}
              {!selectedPhoto && (
                <div className="space-y-4 mb-4">
                  {/* Upload button */}
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </button>
                    <span className="text-sm text-gray-500">or select from uploaded files below</span>
                  </div>

                  {/* Existing uploaded photos */}
                  {imageFiles.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {imageFiles.map((file: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedPhoto(file.url)}
                          className="relative aspect-video bg-gray-200 rounded overflow-hidden hover:ring-2 hover:ring-blue-500"
                        >
                          <img
                            src={file.url}
                            alt={file.name || `Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {imageFiles.length === 0 && !uploadedPhoto && (
                    <div className="text-center py-8 bg-white rounded border border-dashed border-gray-300">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No photos available. Upload a photo to annotate.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Photo annotation canvas */}
              {selectedPhoto && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Annotating photo</span>
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Choose Different Photo
                    </button>
                  </div>
                  <PhotoAnnotationCanvas
                    photoUrl={selectedPhoto}
                    onExport={handleExport}
                    width={900}
                    height={500}
                  />
                </div>
              )}

              {/* Blank canvas option */}
              {!selectedPhoto && (
                <button
                  onClick={() => setSelectedPhoto('')}
                  className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600"
                >
                  Or draw on a blank canvas
                </button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="interactive-builder" className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-gray-600 mb-4 text-sm">
                Drag and drop deck components to build your custom plan. Click to select, drag to move, use handles to resize.
              </p>
              <InteractiveBuilderCanvas
                onExport={handleExport}
                width={900}
                height={500}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Exported image preview */}
        {exportedImage && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-800 font-medium">Drawing exported successfully!</span>
              <button
                onClick={handleDownload}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Download Image
              </button>
            </div>
            <img
              src={exportedImage}
              alt="Exported drawing"
              className="max-h-32 rounded border border-green-300"
            />
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !exportedImage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Drawing'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
