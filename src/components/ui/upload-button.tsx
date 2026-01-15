// File: src/components/ui/upload-button.tsx
'use client'

import { UploadButton as UTButton } from '@uploadthing/react'
import type { OurFileRouter } from '@/app/api/uploadthing/core'

type Props = {
  onUploadComplete: (urls: string[]) => void
}

export default function UploadMediaButton({ onUploadComplete }: Props) {
  return (
    <UTButton<OurFileRouter, "jobMedia">
      endpoint="jobMedia"
      onClientUploadComplete={(res) => {
        if (res) {
          const urls = res.map((f) => f.url)
          onUploadComplete(urls)
        }
      }}
    />
  )
}