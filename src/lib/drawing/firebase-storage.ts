import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { EXPORT_PIXEL_RATIO, THUMBNAIL_PIXEL_RATIO } from './constants';

/**
 * Upload a drawing image to Firebase Storage
 * @param estimateId - The estimate ID for organizing drawings
 * @param drawingId - Unique drawing ID
 * @param dataURL - Canvas data URL (base64 PNG)
 * @param isThumbnail - Whether this is a thumbnail (lower resolution)
 * @returns Download URL for the uploaded image
 */
export async function uploadDrawingImage(
  estimateId: string,
  drawingId: string,
  dataURL: string,
  isThumbnail: boolean = false
): Promise<string> {
  try {
    // Convert data URL to Blob
    const blob = await fetch(dataURL).then((r) => r.blob());

    // Create storage reference
    const suffix = isThumbnail ? '_thumb.png' : '_full.png';
    const storagePath = `drawings/${estimateId}/${drawingId}${suffix}`;
    const storageRef = ref(storage, storagePath);

    // Upload blob
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading drawing image:', error);
    throw new Error('Failed to upload drawing image');
  }
}

/**
 * Delete a drawing image from Firebase Storage
 * @param estimateId - The estimate ID
 * @param drawingId - Unique drawing ID
 * @param deleteThumbnail - Whether to also delete the thumbnail
 */
export async function deleteDrawingImage(
  estimateId: string,
  drawingId: string,
  deleteThumbnail: boolean = true
): Promise<void> {
  try {
    // Delete full image
    const fullImagePath = `drawings/${estimateId}/${drawingId}_full.png`;
    const fullImageRef = ref(storage, fullImagePath);
    await deleteObject(fullImageRef);

    // Delete thumbnail if requested
    if (deleteThumbnail) {
      const thumbPath = `drawings/${estimateId}/${drawingId}_thumb.png`;
      const thumbRef = ref(storage, thumbPath);
      await deleteObject(thumbRef);
    }
  } catch (error) {
    console.error('Error deleting drawing image:', error);
    throw new Error('Failed to delete drawing image');
  }
}

/**
 * Export Konva stage to data URL
 * @param stage - Konva Stage instance
 * @param pixelRatio - Resolution multiplier (2 = 2x resolution)
 * @returns Data URL of the exported image
 */
export function exportStageToDataURL(stage: any, pixelRatio: number = EXPORT_PIXEL_RATIO): string {
  return stage.toDataURL({
    pixelRatio,
    mimeType: 'image/png',
  });
}

/**
 * Generate thumbnail from a full-resolution data URL
 * @param fullDataURL - Full resolution data URL
 * @param thumbnailWidth - Target thumbnail width
 * @param thumbnailHeight - Target thumbnail height
 * @returns Promise resolving to thumbnail data URL
 */
export async function generateThumbnail(
  fullDataURL: string,
  thumbnailWidth: number = 200,
  thumbnailHeight: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas for thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = thumbnailWidth;
      canvas.height = thumbnailHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate aspect ratio
      const aspectRatio = img.width / img.height;
      const targetAspectRatio = thumbnailWidth / thumbnailHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (aspectRatio > targetAspectRatio) {
        // Image is wider
        drawHeight = thumbnailHeight;
        drawWidth = thumbnailHeight * aspectRatio;
        offsetX = -(drawWidth - thumbnailWidth) / 2;
        offsetY = 0;
      } else {
        // Image is taller or same
        drawWidth = thumbnailWidth;
        drawHeight = thumbnailWidth / aspectRatio;
        offsetX = 0;
        offsetY = -(drawHeight - thumbnailHeight) / 2;
      }

      // Draw image
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Export as data URL
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
    img.src = fullDataURL;
  });
}

/**
 * Download a data URL as a file
 * @param dataURL - Data URL to download
 * @param filename - Name for the downloaded file
 */
export function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validate if data URL is valid
 * @param dataURL - Data URL to validate
 * @returns True if valid
 */
export function isValidDataURL(dataURL: string): boolean {
  return dataURL.startsWith('data:image/');
}

/**
 * Get file size from data URL (in bytes)
 * @param dataURL - Data URL
 * @returns File size in bytes
 */
export function getDataURLSize(dataURL: string): number {
  const base64 = dataURL.split(',')[1];
  const bytes = atob(base64).length;
  return bytes;
}

/**
 * Get human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
