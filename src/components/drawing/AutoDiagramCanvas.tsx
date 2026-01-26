'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Line, Text, Group, Circle, Arrow, Shape } from 'react-konva'
import { Download, RefreshCw, ZoomIn, ZoomOut, Layers, Eye, Printer, FileImage } from 'lucide-react'

interface AutoDiagramCanvasProps {
  jobData: any
  onExport: (dataURL: string) => void
  width?: number
  height?: number
}

const SCALE_FACTOR = 8 // pixels per foot
const PADDING = 80

// Professional blueprint color scheme
const COLORS = {
  background: '#F8FAFC',
  gridMajor: '#CBD5E1',
  gridMinor: '#E2E8F0',
  deckSurface: '#D4A574',
  deckBoardLines: '#BC8F6F',
  deckBorder: '#8B6914',
  railing: '#4A5568',
  railingDetail: '#2D3748',
  post: '#374151',
  postCap: '#1F2937',
  stairs: '#C9A66B',
  stairTread: '#B8956A',
  ledger: '#64748B',
  ledgerText: '#F1F5F9',
  dimension: '#1E40AF',
  dimensionLine: '#3B82F6',
  dimensionText: '#1E3A8A',
  legend: '#1F2937',
  title: '#0F172A',
  shadow: 'rgba(0,0,0,0.15)',
}

export function AutoDiagramCanvas({
  jobData,
  onExport,
  width = 800,
  height = 600
}: AutoDiagramCanvasProps) {
  const stageRef = useRef<any>(null)
  const [scale, setScale] = useState(1)
  const [diagram, setDiagram] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'plan' | 'elevation'>('plan')
  const [showDetails, setShowDetails] = useState(true)

  // Parse dimensions from job data
  const parseDimensions = () => {
    const jobAnswers = jobData?.jobSpecificAnswers || {}

    let dimensions: { length: number; width: number }[] = []
    let deckHeight = 0
    let hasStairs = false
    let hasRailing = false
    let columnCount = 0
    let railingLinearFt = 0
    let deckingDirection = 'horizontal'

    Object.keys(jobAnswers).forEach(key => {
      if (key.includes('main_deck_dimensions')) {
        const dims = jobAnswers[key]
        if (Array.isArray(dims)) {
          dimensions = dims.map((d: any) => ({
            length: parseFloat(d.length) || 0,
            width: parseFloat(d.width) || 0
          })).filter(d => d.length > 0 && d.width > 0)
        }
      }
      if (key.includes('deck_height')) {
        deckHeight = parseFloat(jobAnswers[key]) || 0
      }
      if (key.includes('deck_has_stairs') || key.includes('stairs_needed')) {
        hasStairs = Array.isArray(jobAnswers[key])
          ? jobAnswers[key].includes('Yes')
          : jobAnswers[key] === true
      }
      if (key.includes('does_deck_have_railings') || key.includes('railing_needed')) {
        hasRailing = Array.isArray(jobAnswers[key])
          ? jobAnswers[key].includes('Yes')
          : jobAnswers[key] === true
      }
      if (key.includes('total_columns_needed')) {
        columnCount = parseInt(jobAnswers[key]) || 4
      }
      if (key.includes('total_level_railing_linear_ft')) {
        railingLinearFt = parseFloat(jobAnswers[key]) || 0
      }
    })

    return { dimensions, deckHeight, hasStairs, hasRailing, columnCount, railingLinearFt, deckingDirection }
  }

  const generateDiagram = () => {
    const { dimensions, deckHeight, hasStairs, hasRailing, columnCount, railingLinearFt, deckingDirection } = parseDimensions()

    if (dimensions.length === 0) {
      dimensions.push({ length: 16, width: 12 })
    }

    const totalLength = Math.max(...dimensions.map(d => d.length), 16)
    const totalWidth = Math.max(...dimensions.map(d => d.width), 12)

    const availableWidth = width - PADDING * 2
    const availableHeight = height - PADDING * 2 - 60 // Extra space for title
    const scaleX = availableWidth / (totalLength * SCALE_FACTOR)
    const scaleY = availableHeight / (totalWidth * SCALE_FACTOR)
    const autoScale = Math.min(scaleX, scaleY, 1.5)

    const diagramWidth = totalLength * SCALE_FACTOR * autoScale
    const diagramHeight = totalWidth * SCALE_FACTOR * autoScale
    const offsetX = (width - diagramWidth) / 2
    const offsetY = (height - diagramHeight) / 2 + 20

    setDiagram({
      dimensions,
      totalLength,
      totalWidth,
      deckHeight: deckHeight || 3,
      hasStairs,
      hasRailing,
      columnCount: columnCount || 4,
      railingLinearFt,
      deckingDirection,
      autoScale,
      offsetX,
      offsetY,
      diagramWidth,
      diagramHeight,
    })
  }

  useEffect(() => {
    generateDiagram()
  }, [jobData, width, height])

  const handleExport = () => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 3 })
      onExport(dataURL)
    }
  }

  const renderGrid = (offsetX: number, offsetY: number, diagramWidth: number, diagramHeight: number) => {
    const lines = []
    const gridSize = SCALE_FACTOR * (diagram?.autoScale || 1)

    // Background pattern
    for (let i = -2; i <= diagramWidth / gridSize + 2; i++) {
      lines.push(
        <Line
          key={`grid-v-${i}`}
          points={[offsetX + i * gridSize, offsetY - 20, offsetX + i * gridSize, offsetY + diagramHeight + 20]}
          stroke={i % 5 === 0 ? COLORS.gridMajor : COLORS.gridMinor}
          strokeWidth={i % 5 === 0 ? 1 : 0.5}
          opacity={0.5}
        />
      )
    }
    for (let i = -2; i <= diagramHeight / gridSize + 2; i++) {
      lines.push(
        <Line
          key={`grid-h-${i}`}
          points={[offsetX - 20, offsetY + i * gridSize, offsetX + diagramWidth + 20, offsetY + i * gridSize]}
          stroke={i % 5 === 0 ? COLORS.gridMajor : COLORS.gridMinor}
          strokeWidth={i % 5 === 0 ? 1 : 0.5}
          opacity={0.5}
        />
      )
    }
    return lines
  }

  const renderDeckingPattern = (x: number, y: number, w: number, h: number, autoScale: number) => {
    const boards = []
    const boardWidth = 5.5 * autoScale // 5.5" board width
    const gapWidth = 0.25 * autoScale

    const totalBoardWidth = boardWidth + gapWidth
    const boardCount = Math.ceil(h / totalBoardWidth)

    for (let i = 0; i < boardCount; i++) {
      const yPos = y + i * totalBoardWidth
      if (yPos < y + h) {
        // Main board
        boards.push(
          <Rect
            key={`board-${i}`}
            x={x + 1}
            y={yPos}
            width={w - 2}
            height={Math.min(boardWidth, y + h - yPos)}
            fill={i % 2 === 0 ? COLORS.deckSurface : '#CFA06A'}
          />
        )
        // Board edge highlight
        boards.push(
          <Line
            key={`board-edge-${i}`}
            points={[x + 2, yPos + boardWidth - 1, x + w - 2, yPos + boardWidth - 1]}
            stroke={COLORS.deckBoardLines}
            strokeWidth={0.5}
            opacity={0.6}
          />
        )
      }
    }
    return boards
  }

  const renderDeckSection = (dim: { length: number; width: number }, index: number, offsetX: number, offsetY: number, autoScale: number) => {
    const sectionWidth = dim.length * SCALE_FACTOR * autoScale
    const sectionHeight = dim.width * SCALE_FACTOR * autoScale

    return (
      <Group key={`deck-section-${index}`}>
        {/* Shadow */}
        <Rect
          x={offsetX + 4}
          y={offsetY + 4}
          width={sectionWidth}
          height={sectionHeight}
          fill={COLORS.shadow}
          cornerRadius={2}
        />

        {/* Main deck surface */}
        <Rect
          x={offsetX}
          y={offsetY}
          width={sectionWidth}
          height={sectionHeight}
          fill={COLORS.deckSurface}
          stroke={COLORS.deckBorder}
          strokeWidth={2}
          cornerRadius={2}
        />

        {/* Decking board pattern */}
        {showDetails && renderDeckingPattern(offsetX, offsetY, sectionWidth, sectionHeight, autoScale)}

        {/* Perimeter frame highlight */}
        <Rect
          x={offsetX}
          y={offsetY}
          width={sectionWidth}
          height={sectionHeight}
          fill="transparent"
          stroke={COLORS.deckBorder}
          strokeWidth={3}
          cornerRadius={2}
        />

        {/* Dimension annotations */}
        {renderDimensionAnnotation(
          offsetX, offsetY - 35,
          offsetX + sectionWidth, offsetY - 35,
          `${dim.length}'`,
          'horizontal'
        )}
        {renderDimensionAnnotation(
          offsetX + sectionWidth + 35, offsetY,
          offsetX + sectionWidth + 35, offsetY + sectionHeight,
          `${dim.width}'`,
          'vertical'
        )}
      </Group>
    )
  }

  const renderDimensionAnnotation = (x1: number, y1: number, x2: number, y2: number, label: string, orientation: 'horizontal' | 'vertical') => {
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2

    return (
      <Group>
        {/* Dimension line */}
        <Line
          points={[x1, y1, x2, y2]}
          stroke={COLORS.dimensionLine}
          strokeWidth={1.5}
        />

        {/* End ticks */}
        {orientation === 'horizontal' ? (
          <>
            <Line points={[x1, y1 - 8, x1, y1 + 8]} stroke={COLORS.dimensionLine} strokeWidth={1.5} />
            <Line points={[x2, y2 - 8, x2, y2 + 8]} stroke={COLORS.dimensionLine} strokeWidth={1.5} />
          </>
        ) : (
          <>
            <Line points={[x1 - 8, y1, x1 + 8, y1]} stroke={COLORS.dimensionLine} strokeWidth={1.5} />
            <Line points={[x2 - 8, y2, x2 + 8, y2]} stroke={COLORS.dimensionLine} strokeWidth={1.5} />
          </>
        )}

        {/* Label background */}
        <Rect
          x={midX - 18}
          y={midY - 10}
          width={36}
          height={20}
          fill="white"
          stroke={COLORS.dimensionLine}
          strokeWidth={1}
          cornerRadius={3}
        />

        {/* Label text */}
        <Text
          x={midX - 14}
          y={midY - 6}
          text={label}
          fontSize={12}
          fontStyle="bold"
          fill={COLORS.dimensionText}
        />
      </Group>
    )
  }

  const renderPosts = (offsetX: number, offsetY: number, sectionWidth: number, sectionHeight: number, count: number, autoScale: number) => {
    const posts: React.ReactNode[] = []
    const postSize = 8 * autoScale

    // Calculate post positions
    const positions = []
    const colsX = Math.ceil(Math.sqrt(count * (sectionWidth / sectionHeight)))
    const rowsY = Math.ceil(count / colsX)

    for (let row = 0; row < rowsY; row++) {
      for (let col = 0; col < colsX; col++) {
        if (positions.length < count) {
          positions.push({
            x: col === 0 ? 0 : col === colsX - 1 ? sectionWidth : col * (sectionWidth / (colsX - 1)),
            y: row === 0 ? 0 : row === rowsY - 1 ? sectionHeight : row * (sectionHeight / (rowsY - 1))
          })
        }
      }
    }

    positions.forEach((pos, i) => {
      posts.push(
        <Group key={`post-${i}`}>
          {/* Post shadow */}
          <Rect
            x={offsetX + pos.x - postSize / 2 + 2}
            y={offsetY + pos.y - postSize / 2 + 2}
            width={postSize}
            height={postSize}
            fill={COLORS.shadow}
            cornerRadius={2}
          />
          {/* Post base */}
          <Rect
            x={offsetX + pos.x - postSize / 2}
            y={offsetY + pos.y - postSize / 2}
            width={postSize}
            height={postSize}
            fill={COLORS.post}
            stroke={COLORS.postCap}
            strokeWidth={1.5}
            cornerRadius={2}
          />
          {/* Post cap detail */}
          <Rect
            x={offsetX + pos.x - postSize / 2 + 2}
            y={offsetY + pos.y - postSize / 2 + 2}
            width={postSize - 4}
            height={postSize - 4}
            fill={COLORS.postCap}
            cornerRadius={1}
          />
          {/* Post label */}
          {showDetails && (
            <Text
              x={offsetX + pos.x - 10}
              y={offsetY + pos.y + postSize / 2 + 3}
              text="6×6"
              fontSize={8}
              fill={COLORS.legend}
              fontStyle="bold"
            />
          )}
        </Group>
      )
    })

    return posts
  }

  const renderRailing = (offsetX: number, offsetY: number, sectionWidth: number, sectionHeight: number, autoScale: number) => {
    const railings = []
    const railWidth = 6 * autoScale
    const balusterSpacing = 20 * autoScale
    const balusterWidth = 3 * autoScale

    // Top railing
    railings.push(
      <Group key="railing-top">
        <Rect
          x={offsetX}
          y={offsetY - railWidth - 2}
          width={sectionWidth}
          height={railWidth}
          fill={COLORS.railing}
          stroke={COLORS.railingDetail}
          strokeWidth={1}
          cornerRadius={1}
        />
        {/* Balusters */}
        {showDetails && Array.from({ length: Math.floor(sectionWidth / balusterSpacing) }).map((_, i) => (
          <Rect
            key={`baluster-top-${i}`}
            x={offsetX + i * balusterSpacing + 5}
            y={offsetY - railWidth - 12}
            width={balusterWidth}
            height={15}
            fill={COLORS.railingDetail}
            cornerRadius={1}
          />
        ))}
        {/* Top rail cap */}
        <Rect
          x={offsetX - 2}
          y={offsetY - railWidth - 15}
          width={sectionWidth + 4}
          height={4}
          fill={COLORS.railingDetail}
          cornerRadius={2}
        />
      </Group>
    )

    // Left railing
    railings.push(
      <Group key="railing-left">
        <Rect
          x={offsetX - railWidth - 2}
          y={offsetY}
          width={railWidth}
          height={sectionHeight}
          fill={COLORS.railing}
          stroke={COLORS.railingDetail}
          strokeWidth={1}
          cornerRadius={1}
        />
        {showDetails && Array.from({ length: Math.floor(sectionHeight / balusterSpacing) }).map((_, i) => (
          <Rect
            key={`baluster-left-${i}`}
            x={offsetX - railWidth - 12}
            y={offsetY + i * balusterSpacing + 5}
            width={15}
            height={balusterWidth}
            fill={COLORS.railingDetail}
            cornerRadius={1}
          />
        ))}
      </Group>
    )

    // Right railing
    railings.push(
      <Group key="railing-right">
        <Rect
          x={offsetX + sectionWidth + 2}
          y={offsetY}
          width={railWidth}
          height={sectionHeight}
          fill={COLORS.railing}
          stroke={COLORS.railingDetail}
          strokeWidth={1}
          cornerRadius={1}
        />
        {showDetails && Array.from({ length: Math.floor(sectionHeight / balusterSpacing) }).map((_, i) => (
          <Rect
            key={`baluster-right-${i}`}
            x={offsetX + sectionWidth + 5}
            y={offsetY + i * balusterSpacing + 5}
            width={15}
            height={balusterWidth}
            fill={COLORS.railingDetail}
            cornerRadius={1}
          />
        ))}
      </Group>
    )

    return railings
  }

  const renderStairs = (offsetX: number, offsetY: number, sectionHeight: number, deckHeight: number, autoScale: number) => {
    const stairWidth = 4 * SCALE_FACTOR * autoScale
    const stepRise = 7.5 // inches
    const stepRun = 10 // inches
    const totalRise = deckHeight * 12 // convert feet to inches
    const stepCount = Math.ceil(totalRise / stepRise)
    const stairDepth = stepCount * (stepRun / 12) * SCALE_FACTOR * autoScale

    return (
      <Group>
        {/* Stair stringers (sides) */}
        <Rect
          x={offsetX - stairWidth - 2}
          y={offsetY + sectionHeight / 2 - stairDepth / 2 - 10}
          width={stairWidth + 4}
          height={stairDepth + 20}
          fill={COLORS.stairs}
          stroke={COLORS.deckBorder}
          strokeWidth={2}
          cornerRadius={3}
        />

        {/* Individual treads */}
        {Array.from({ length: stepCount }).map((_, i) => (
          <Group key={`stair-step-${i}`}>
            {/* Tread */}
            <Rect
              x={offsetX - stairWidth}
              y={offsetY + sectionHeight / 2 - stairDepth / 2 + i * (stairDepth / stepCount)}
              width={stairWidth}
              height={stairDepth / stepCount - 2}
              fill={i % 2 === 0 ? COLORS.stairs : COLORS.stairTread}
              stroke={COLORS.deckBorder}
              strokeWidth={1}
            />
            {/* Tread nosing highlight */}
            <Line
              points={[
                offsetX - stairWidth + 2,
                offsetY + sectionHeight / 2 - stairDepth / 2 + i * (stairDepth / stepCount) + 2,
                offsetX - 2,
                offsetY + sectionHeight / 2 - stairDepth / 2 + i * (stairDepth / stepCount) + 2
              ]}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={2}
            />
          </Group>
        ))}

        {/* Down arrow with background */}
        <Group>
          <Rect
            x={offsetX - stairWidth / 2 - 12}
            y={offsetY + sectionHeight / 2 - stairDepth / 2 - 25}
            width={24}
            height={18}
            fill="white"
            stroke={COLORS.dimensionLine}
            strokeWidth={1}
            cornerRadius={3}
          />
          <Arrow
            points={[
              offsetX - stairWidth / 2,
              offsetY + sectionHeight / 2 - stairDepth / 2 - 20,
              offsetX - stairWidth / 2,
              offsetY + sectionHeight / 2 - stairDepth / 2 - 8
            ]}
            pointerLength={6}
            pointerWidth={6}
            fill={COLORS.dimensionLine}
            stroke={COLORS.dimensionLine}
            strokeWidth={2}
          />
        </Group>

        {/* Stair label */}
        <Group>
          <Rect
            x={offsetX - stairWidth - 25}
            y={offsetY + sectionHeight / 2 - 10}
            width={50}
            height={20}
            fill="white"
            stroke={COLORS.legend}
            strokeWidth={1}
            cornerRadius={3}
          />
          <Text
            text={`${stepCount} Steps`}
            x={offsetX - stairWidth - 22}
            y={offsetY + sectionHeight / 2 - 5}
            fontSize={10}
            fill={COLORS.legend}
            fontStyle="bold"
          />
        </Group>

        {/* Dimension: stair width */}
        {showDetails && (
          <Group>
            <Line
              points={[
                offsetX - stairWidth,
                offsetY + sectionHeight / 2 + stairDepth / 2 + 15,
                offsetX,
                offsetY + sectionHeight / 2 + stairDepth / 2 + 15
              ]}
              stroke={COLORS.dimensionLine}
              strokeWidth={1}
            />
            <Text
              text={`4'`}
              x={offsetX - stairWidth / 2 - 6}
              y={offsetY + sectionHeight / 2 + stairDepth / 2 + 18}
              fontSize={10}
              fill={COLORS.dimensionText}
              fontStyle="bold"
            />
          </Group>
        )}
      </Group>
    )
  }

  const renderLedger = (offsetX: number, offsetY: number, sectionWidth: number, autoScale: number) => {
    return (
      <Group>
        {/* House wall shadow */}
        <Rect
          x={offsetX - 2}
          y={offsetY - 28}
          width={sectionWidth + 4}
          height={22}
          fill={COLORS.shadow}
        />
        {/* House wall */}
        <Rect
          x={offsetX}
          y={offsetY - 25}
          width={sectionWidth}
          height={18}
          fill={COLORS.ledger}
          stroke="#475569"
          strokeWidth={2}
        />
        {/* Siding pattern */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Line
            key={`siding-${i}`}
            points={[offsetX + 2, offsetY - 23 + i * 4, offsetX + sectionWidth - 2, offsetY - 23 + i * 4]}
            stroke="#94A3B8"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
        {/* Label */}
        <Rect
          x={offsetX + sectionWidth / 2 - 40}
          y={offsetY - 22}
          width={80}
          height={14}
          fill="rgba(255,255,255,0.9)"
          cornerRadius={2}
        />
        <Text
          text="HOUSE / LEDGER"
          x={offsetX + sectionWidth / 2 - 35}
          y={offsetY - 20}
          fontSize={9}
          fill={COLORS.legend}
          fontStyle="bold"
        />
      </Group>
    )
  }

  const renderLegend = () => {
    const legendItems = [
      { color: COLORS.deckSurface, label: 'Deck Surface', border: COLORS.deckBorder },
      { color: COLORS.railing, label: 'Railing', border: COLORS.railingDetail },
      { color: COLORS.post, label: 'Posts (6×6)', border: COLORS.postCap },
      { color: COLORS.stairs, label: 'Stairs', border: COLORS.deckBorder },
      { color: COLORS.ledger, label: 'House', border: '#475569' },
    ]

    return (
      <Group x={15} y={height / scale - 115}>
        {/* Legend container */}
        <Rect
          width={130}
          height={105}
          fill="white"
          stroke="#E2E8F0"
          strokeWidth={1}
          cornerRadius={6}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.1}
          shadowOffsetY={2}
        />

        {/* Legend title */}
        <Text
          text="LEGEND"
          x={8}
          y={8}
          fontSize={10}
          fontStyle="bold"
          fill={COLORS.title}
        />

        {/* Divider */}
        <Line
          points={[8, 22, 122, 22]}
          stroke="#E2E8F0"
          strokeWidth={1}
        />

        {/* Legend items */}
        {legendItems.map((item, i) => (
          <Group key={`legend-${i}`} y={28 + i * 15}>
            <Rect
              x={10}
              y={0}
              width={16}
              height={10}
              fill={item.color}
              stroke={item.border}
              strokeWidth={1}
              cornerRadius={2}
            />
            <Text
              x={32}
              y={1}
              text={item.label}
              fontSize={9}
              fill={COLORS.legend}
            />
          </Group>
        ))}
      </Group>
    )
  }

  const renderNorthArrow = () => {
    return (
      <Group x={width / scale - 60} y={60}>
        {/* Circle background */}
        <Circle
          radius={20}
          fill="white"
          stroke="#E2E8F0"
          strokeWidth={1}
        />
        {/* Arrow */}
        <Arrow
          points={[0, 12, 0, -12]}
          pointerLength={8}
          pointerWidth={8}
          fill={COLORS.title}
          stroke={COLORS.title}
          strokeWidth={2}
        />
        {/* N label */}
        <Text
          text="N"
          x={-5}
          y={-30}
          fontSize={14}
          fontStyle="bold"
          fill={COLORS.title}
        />
      </Group>
    )
  }

  const renderScaleBar = () => {
    const barLength = 100
    const feetPerBar = Math.round(barLength / SCALE_FACTOR / (diagram?.autoScale || 1))

    return (
      <Group x={width / scale - 140} y={height / scale - 40}>
        {/* Scale bar container */}
        <Rect
          width={130}
          height={30}
          fill="white"
          stroke="#E2E8F0"
          strokeWidth={1}
          cornerRadius={4}
        />

        {/* Scale bar */}
        <Line
          points={[15, 15, 15 + barLength, 15]}
          stroke={COLORS.title}
          strokeWidth={2}
        />

        {/* Tick marks */}
        <Line points={[15, 10, 15, 20]} stroke={COLORS.title} strokeWidth={2} />
        <Line points={[15 + barLength / 2, 12, 15 + barLength / 2, 18]} stroke={COLORS.title} strokeWidth={1} />
        <Line points={[15 + barLength, 10, 15 + barLength, 20]} stroke={COLORS.title} strokeWidth={2} />

        {/* Labels */}
        <Text text="0" x={12} y={21} fontSize={8} fill={COLORS.legend} />
        <Text text={`${feetPerBar}'`} x={100} y={21} fontSize={8} fill={COLORS.legend} />
        <Text text="Scale" x={50} y={4} fontSize={8} fill={COLORS.legend} fontStyle="italic" />
      </Group>
    )
  }

  const renderTitle = () => {
    const projectName = jobData?.customerInfo?.name || 'Deck Project'
    const address = jobData?.customerInfo?.address || ''
    const date = new Date().toLocaleDateString()

    return (
      <Group x={width / scale / 2} y={25}>
        {/* Title */}
        <Text
          text="DECK PLAN - TOP VIEW"
          x={-80}
          y={0}
          fontSize={16}
          fontStyle="bold"
          fill={COLORS.title}
        />
        {/* Subtitle */}
        {projectName && (
          <Text
            text={projectName}
            x={-50}
            y={20}
            fontSize={11}
            fill={COLORS.legend}
          />
        )}
      </Group>
    )
  }

  if (!diagram) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Generating diagram...</p>
        </div>
      </div>
    )
  }

  const { dimensions, totalLength, totalWidth, hasStairs, hasRailing, columnCount, autoScale, offsetX, offsetY, diagramWidth, diagramHeight, deckHeight } = diagram
  const mainDim = dimensions[0] || { length: 16, width: 12 }
  const sectionWidth = mainDim.length * SCALE_FACTOR * autoScale
  const sectionHeight = mainDim.width * SCALE_FACTOR * autoScale

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={generateDiagram}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Regenerate</span>
          </button>

          <div className="w-px h-8 bg-slate-600" />

          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              showDetails ? 'bg-blue-500 text-white' : 'bg-slate-900/50 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">Details</span>
          </button>

          <div className="w-px h-8 bg-slate-600" />

          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            <button
              onClick={() => setScale(Math.min(scale + 0.25, 2))}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs text-slate-300 font-mono">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(Math.max(scale - 0.25, 0.5))}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30 ml-auto"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-inner">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
          style={{ background: COLORS.background }}
        >
          <Layer>
            {/* Background grid */}
            {showDetails && renderGrid(offsetX, offsetY, diagramWidth, diagramHeight)}

            {/* Title */}
            {renderTitle()}

            {/* House/Ledger */}
            {renderLedger(offsetX, offsetY, sectionWidth, autoScale)}

            {/* Main deck sections */}
            {dimensions.map((dim: { length: number; width: number }, i: number) =>
              renderDeckSection(dim, i, offsetX, offsetY, autoScale)
            )}

            {/* Railings */}
            {hasRailing && renderRailing(offsetX, offsetY, sectionWidth, sectionHeight, autoScale)}

            {/* Posts */}
            {renderPosts(offsetX, offsetY, sectionWidth, sectionHeight, columnCount, autoScale)}

            {/* Stairs */}
            {hasStairs && renderStairs(offsetX, offsetY, sectionHeight, deckHeight, autoScale)}

            {/* Legend */}
            {renderLegend()}

            {/* North Arrow */}
            {renderNorthArrow()}

            {/* Scale Bar */}
            {renderScaleBar()}
          </Layer>
        </Stage>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg py-2 px-4 text-sm text-slate-600">
        <div>
          <span className="font-medium">Dimensions:</span> {mainDim.length}' × {mainDim.width}' ({mainDim.length * mainDim.width} sq ft)
        </div>
        <div className="flex gap-4">
          <span><span className="font-medium">Posts:</span> {columnCount}</span>
          <span><span className="font-medium">Railing:</span> {hasRailing ? 'Yes' : 'No'}</span>
          <span><span className="font-medium">Stairs:</span> {hasStairs ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  )
}
