# Deck Doctor Estimator - CLAUDE.md

## Project Overview

A Next.js application for deck construction estimation. Built for field estimators to generate job quotes, track competitive bids, and create deck diagrams.

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI**: Radix UI (headless components) + Lucide icons
- **Backend**: Firebase (Firestore + Storage)
- **Canvas**: Konva.js + React-Konva for drawing tools
- **File Uploads**: UploadThing
- **Drag and Drop**: React DnD

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier format
npm run format:check # Check formatting
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   ├── estimator/page.tsx    # Main estimator tool
│   ├── tracker/page.tsx      # Competitive bid tracker
│   └── api/
│       ├── uploadthing/      # File upload routes
│       └── cs-script/        # C# script execution
├── components/
│   ├── ui/                   # Radix UI primitives (Button, Input, Card, etc.)
│   ├── drawing/              # Konva canvas components
│   ├── estimator/            # Estimator-specific components
│   ├── EstimatorForms.tsx    # Main form (largest component)
│   └── CompetitiveTracker.tsx
├── lib/
│   ├── pricing.ts            # All pricing logic and calculations
│   ├── firebase.ts           # Firebase config and init
│   ├── utils.ts              # cn() helper (clsx + tailwind-merge)
│   ├── cs-script.ts          # C# script execution
│   └── drawing/
│       ├── firebase-storage.ts  # Canvas image upload/download
│       └── constants.ts         # Canvas dimensions, colors, component sizes
└── utils/                    # General helpers
```

## Key Architecture Decisions

- **No external state management** - React hooks only (useState, useEffect, useMemo, useCallback)
- **Firebase-first persistence** - Firestore for data, Storage for images/drawings
- **Monolithic EstimatorForms.tsx** - Most form logic lives in one large component
- **Client components** - Most components use `'use client'` due to heavy interactivity
- **No test suite** - No testing infrastructure exists

## Pricing & Calculation System

`src/lib/pricing.ts` is the core business logic (517 lines). Key concepts:

- Material database for all deck components (lumber, hardware, railings, etc.)
- **Markup**: 43% on materials + 10% waste factor
- **Overhead**: 18%
- **Profit**: 15%
- **Permit fee**: $3,500 (conditional)
- **Crew rates**: Crew A @ $166/hr, Crew B @ $95/hr
- "Pain in the ass" surcharge is a real named feature

Key functions:
- `estimateDeckCost()` - Full project cost estimation
- `calculateMaterialCost()` - Material pricing with waste
- `calculateLaborCost()` - Labor by unit
- `getMaterialPrice()` - Fuzzy material matching

## Firebase Collections

- `bids` - Competitive tracker entries (orderBy: createdAt desc)
- Estimates and drawings stored with Firebase Storage paths: `drawings/{estimateId}/{drawingId}_full.png`

## Drawing System (Konva)

Three canvas modes:
1. **AutoDiagramCanvas** - Auto-generates diagrams from form data
2. **PhotoAnnotationCanvas** - Annotate photos with arrows, measurements, text
3. **InteractiveBuilderCanvas** - Drag-and-drop deck component builder

Export: 2x resolution PNG (high quality), 0.25x thumbnails.

## Code Style

- **Prettier**: single quotes, 2 spaces, trailing commas, 80 char width, semicolons
- **Path alias**: `@/*` → `./src/*`
- **Imports**: React hooks destructured, lucide icons named imports
- Tailwind utility classes, conditional via `cn()` from `@/lib/utils`

## Component Pattern

```typescript
'use client';
import React, { useState, useEffect, useMemo } from 'react';

export default function MyComponent() {
  const [state, setState] = useState<Type>();
  // ...
  return <div className="tailwind-classes">...</div>;
}
```

## Git Workflow

- Main branch: `main`
- Feature branches: `claude/[name]` convention for Claude-authored branches
- Worktrees used for parallel Claude sessions (`.claude/worktrees/`)
