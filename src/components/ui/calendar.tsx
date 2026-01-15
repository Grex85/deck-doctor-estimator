// src/components/ui/calendar.tsx
'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

export function Calendar(props: React.ComponentProps<typeof DayPicker>) {
  return (
    <div className="rounded-md border p-3">
      <DayPicker {...props} />
    </div>
  )
}