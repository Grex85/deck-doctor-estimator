'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Line, Text, Group, Circle, Arrow } from 'react-konva'
import { Download, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'

interface AutoDiagramCanvasProps {
  jobData: any
  onExport: (dataURL: string) => void
  width?: number
  height?: number
}

const SCALE_FACTOR = 8 // pixels per foot
const PADDING = 60

export function AutoDiagramCanvas({
  jobData,
  onExport,
  width = 800,
  height = 600
}: AutoDiagramCanvasProps) {
  const stageRef = useRef<any>(null)
  const [scale, setScale] = useState(1)
  const [diagram, setDiagram] = useState<any>(null)

  // Parse dimensions from job data
  const parseDimensions = () => {
    const jobAnswers = jobData?.jobSpecificAnswers || {}

    // Find deck dimensions from any deck job type
    let dimensions: { length: number; width: number }[] = []
    let deckHeight = 0
    let hasStairs = false
    let hasRailing = false
    let columnCount = 0
    let railingLinearFt = 0

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

    return { dimensions, deckHeight, hasStairs, hasRailing, columnCount, railingLinearFt }
  }

  const generateDiagram = () => {
    const { dimensions, deckHeight, hasStairs, hasRailing, columnCount, railingLinearFt } = parseDimensions()

    if (dimensions.length === 0) {
      // Create a sample/default diagram
      dimensions.push({ length: 16, width: 12 })
    }

    // Calculate total dimensions
    const totalLength = Math.max(...dimensions.map(d => d.length), 16)
    const totalWidth = Math.max(...dimensions.map(d => d.width), 12)

    // Calculate scale to fit in canvas
    const availableWidth = width - PADDING * 2
    const availableHeight = height - PADDING * 2
    const scaleX = availableWidth / (totalLength * SCALE_FACTOR)
    const scaleY = availableHeight / (totalWidth * SCALE_FACTOR)
    const autoScale = Math.min(scaleX, scaleY, 1.5)

    // Center the diagram
    const diagramWidth = totalLength * SCALE_FACTOR * autoScale
    const diagramHeight = totalWidth * SCALE_FACTOR * autoScale
    const offsetX = (width - diagramWidth) / 2
    const offsetY = (height - diagramHeight) / 2

    setDiagram({
      dimensions,
      totalLength,
      totalWidth,
      deckHeight,
      hasStairs,
      hasRailing,
      columnCount: columnCount || 4,
      railingLinearFt,
      autoScale,
      offsetX,
      offsetY,
    })
  }

  useEffect(() => {
    generateDiagram()
  }, [jobData, width, height])

  const handleExport = () => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 })
      onExport(dataURL)
    }
  }

  const renderDeckSection = (dim: { length: number; width: number }, index: number, offsetX: number, offsetY: number, autoScale: number) => {
    const sectionWidth = dim.length * SCALE_FACTOR * autoScale
    const sectionHeight = dim.width * SCALE_FACTOR * autoScale

    // Calculate joist positions (16" OC)
    const joistSpacing = (16 / 12) * SCALE_FACTOR * autoScale // 16 inches in feet, then to pixels
    const joistCount = Math.floor(sectionHeight / joistSpacing)

    return (
      <Group key={index}>
        {/* Main deck surface */}
        <Rect
          x={offsetX}
          y={offsetY}
          width={sectionWidth}
          height={sectionHeight}
          fill="#D2B48C"
          stroke="#8B4513"
          strokeWidth={2}
        />

        {/* Decking boards pattern */}
        {Array.from({ length: Math.ceil(sectionHeight / (6 * autoScale)) }).map((_, i) => (
          <Line
            key={`board-${i}`}
            points={[offsetX, offsetY + i * 6 * autoScale, offsetX + sectionWidth, offsetY + i * 6 * autoScale]}
            stroke="#BC8F8F"
            strokeWidth={0.5}
          />
        ))}

        {/* Joists */}
        {Array.from({ length: joistCount + 1 }).map((_, i) => (
          <Rect
            key={`joist-${i}`}
            x={offsetX - 2}
            y={offsetY + i * joistSpacing}
            width={sectionWidth + 4}
            height={3}
            fill="#654321"
            opacity={0.3}
          />
        ))}

        {/* Dimension labels */}
        {/* Length dimension (top) */}
        <Arrow
          points={[offsetX, offsetY - 25, offsetX + sectionWidth, offsetY - 25]}
          pointerLength={6}
          pointerWidth={6}
          fill="#333"
          stroke="#333"
          strokeWidth={1}
        />
        <Arrow
          points={[offsetX + sectionWidth, offsetY - 25, offsetX, offsetY - 25]}
          pointerLength={6}
          pointerWidth={6}
          fill="#333"
          stroke="#333"
          strokeWidth={1}
        />
        <Rect
          x={offsetX + sectionWidth / 2 - 20}
          y={offsetY - 35}
          width={40}
          height={16}
          fill="white"
        />
        <Text
          text={`${dim.length}'`}
          x={offsetX + sectionWidth / 2 - 15}
          y={offsetY - 33}
          fontSize={12}
          fontStyle="bold"
          fill="#333"
        />

        {/* Width dimension (right) */}
        <Arrow
          points={[offsetX + sectionWidth + 25, offsetY, offsetX + sectionWidth + 25, offsetY + sectionHeight]}
          pointerLength={6}
          pointerWidth={6}
          fill="#333"
          stroke="#333"
          strokeWidth={1}
        />
        <Arrow
          points={[offsetX + sectionWidth + 25, offsetY + sectionHeight, offsetX + sectionWidth + 25, offsetY]}
          pointerLength={6}
          pointerWidth={6}
          fill="#333"
          stroke="#333"
          strokeWidth={1}
        />
        <Rect
          x={offsetX + sectionWidth + 18}
          y={offsetY + sectionHeight / 2 - 8}
          width={30}
          height={16}
          fill="white"
        />
        <Text
          text={`${dim.width}'`}
          x={offsetX + sectionWidth + 20}
          y={offsetY + sectionHeight / 2 - 6}
          fontSize={12}
          fontStyle="bold"
          fill="#333"
        />
      </Group>
    )
  }

  const renderPosts = (offsetX: number, offsetY: number, sectionWidth: number, sectionHeight: number, count: number) => {
    const posts: React.ReactNode[] = []
    const positions = [
      { x: 0, y: 0 },
      { x: sectionWidth, y: 0 },
      { x: 0, y: sectionHeight },
      { x: sectionWidth, y: sectionHeight },
    ]

    // Add intermediate posts if count > 4
    if (count > 4) {
      const extraPosts = count - 4
      for (let i = 0; i < extraPosts; i++) {
        positions.push({
          x: sectionWidth * ((i + 1) / (extraPosts + 1)),
          y: sectionHeight
        })
      }
    }

    positions.slice(0, count).forEach((pos, i) => {
      posts.push(
        <Group key={`post-${i}`}>
          <Circle
            x={offsetX + pos.x}
            y={offsetY + pos.y}
            radius={8}
            fill="#2F4F4F"
            stroke="#1a1a1a"
            strokeWidth={2}
          />
          <Text
            text="6×6"
            x={offsetX + pos.x - 10}
            y={offsetY + pos.y + 12}
            fontSize={8}
            fill="#666"
          />
        </Group>
      )
    })

    return posts
  }

  const renderRailing = (offsetX: number, offsetY: number, sectionWidth: number, sectionHeight: number, linearFt: number) => {
    const railings = []
    const railingHeight = 6

    // Top railing
    railings.push(
      <Rect
        key="railing-top"
        x={offsetX}
        y={offsetY - railingHeight}
        width={sectionWidth}
        height={railingHeight}
        fill="#4A4A4A"
        stroke="#333"
        strokeWidth={1}
      />
    )

    // Left railing
    railings.push(
      <Rect
        key="railing-left"
        x={offsetX - railingHeight}
        y={offsetY}
        width={railingHeight}
        height={sectionHeight}
        fill="#4A4A4A"
        stroke="#333"
        strokeWidth={1}
      />
    )

    // Right railing
    railings.push(
      <Rect
        key="railing-right"
        x={offsetX + sectionWidth}
        y={offsetY}
        width={railingHeight}
        height={sectionHeight}
        fill="#4A4A4A"
        stroke="#333"
        strokeWidth={1}
      />
    )

    return railings
  }

  const renderStairs = (offsetX: number, offsetY: number, sectionHeight: number, autoScale: number) => {
    const stairWidth = 4 * SCALE_FACTOR * autoScale
    const stairDepth = 5 * SCALE_FACTOR * autoScale
    const stepCount = 5

    return (
      <Group>
        {/* Stair outline */}
        <Rect
          x={offsetX - stairWidth}
          y={offsetY + sectionHeight / 2 - stairDepth / 2}
          width={stairWidth}
          height={stairDepth}
          fill="#A0522D"
          stroke="#8B4513"
          strokeWidth={2}
        />

        {/* Stair treads */}
        {Array.from({ length: stepCount }).map((_, i) => (
          <Line
            key={`step-${i}`}
            points={[
              offsetX - stairWidth + (i * stairWidth / stepCount),
              offsetY + sectionHeight / 2 - stairDepth / 2,
              offsetX - stairWidth + (i * stairWidth / stepCount),
              offsetY + sectionHeight / 2 + stairDepth / 2
            ]}
            stroke="#654321"
            strokeWidth={1}
          />
        ))}

        {/* Stair label */}
        <Text
          text="Stairs"
          x={offsetX - stairWidth + 5}
          y={offsetY + sectionHeight / 2 - 5}
          fontSize={10}
          fill="white"
        />

        {/* Down arrow */}
        <Arrow
          points={[
            offsetX - stairWidth / 2,
            offsetY + sectionHeight / 2 - stairDepth / 2 - 15,
            offsetX - stairWidth / 2,
            offsetY + sectionHeight / 2 - stairDepth / 2 - 5
          ]}
          pointerLength={5}
          pointerWidth={5}
          fill="#333"
          stroke="#333"
          strokeWidth={1}
        />
        <Text
          text="Down"
          x={offsetX - stairWidth / 2 - 12}
          y={offsetY + sectionHeight / 2 - stairDepth / 2 - 30}
          fontSize={9}
          fill="#666"
        />
      </Group>
    )
  }

  const renderLedger = (offsetX: number, offsetY: number, sectionWidth: number, autoScale: number) => {
    return (
      <Group>
        {/* House wall representation */}
        <Rect
          x={offsetX}
          y={offsetY - 15}
          width={sectionWidth}
          height={12}
          fill="#808080"
          stroke="#555"
          strokeWidth={1}
        />
        <Text
          text="House / Ledger"
          x={offsetX + sectionWidth / 2 - 35}
          y={offsetY - 13}
          fontSize={9}
          fill="white"
        />
      </Group>
    )
  }

  if (!diagram) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-lg">
        <p className="text-gray-500">Loading diagram...</p>
      </div>
    )
  }

  const { dimensions, totalLength, totalWidth, hasStairs, hasRailing, columnCount, autoScale, offsetX, offsetY } = diagram
  const mainDim = dimensions[0] || { length: 16, width: 12 }
  const sectionWidth = mainDim.length * SCALE_FACTOR * autoScale
  const sectionHeight = mainDim.width * SCALE_FACTOR * autoScale

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
        <button
          onClick={generateDiagram}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>

        <div className="flex gap-1 border-l border-gray-300 pl-3">
          <button
            onClick={() => setScale(Math.min(scale + 0.1, 2))}
            className="p-2 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setScale(Math.max(scale - 0.1, 0.5))}
            className="p-2 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="px-2 py-1 text-sm text-gray-600">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <button
          onClick={handleExport}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 ml-auto"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {/* Title */}
            <Text
              text="Deck Plan - Top View"
              x={width / 2 / scale - 60}
              y={15}
              fontSize={16}
              fontStyle="bold"
              fill="#333"
            />

            {/* North arrow */}
            <Arrow
              points={[width / scale - 50, 30, width / scale - 50, 60]}
              pointerLength={8}
              pointerWidth={8}
              fill="#333"
              stroke="#333"
              strokeWidth={2}
            />
            <Text
              text="N"
              x={width / scale - 55}
              y={15}
              fontSize={12}
              fontStyle="bold"
              fill="#333"
            />

            {/* House/Ledger */}
            {renderLedger(offsetX, offsetY, sectionWidth, autoScale)}

            {/* Main deck sections */}
            {dimensions.map((dim: { length: number; width: number }, i: number) => renderDeckSection(dim, i, offsetX, offsetY + i * 20, autoScale))}

            {/* Railings */}
            {hasRailing && renderRailing(offsetX, offsetY, sectionWidth, sectionHeight, diagram.railingLinearFt)}

            {/* Posts */}
            {renderPosts(offsetX, offsetY, sectionWidth, sectionHeight, columnCount)}

            {/* Stairs */}
            {hasStairs && renderStairs(offsetX, offsetY, sectionHeight, autoScale)}

            {/* Legend */}
            <Group>
              <Rect
                x={15}
                y={height / scale - 100}
                width={120}
                height={85}
                fill="white"
                stroke="#ccc"
                strokeWidth={1}
              />
              <Text text="Legend:" x={20} y={height / scale - 95} fontSize={10} fontStyle="bold" fill="#333" />

              <Rect x={20} y={height / scale - 78} width={15} height={10} fill="#D2B48C" stroke="#8B4513" strokeWidth={1} />
              <Text text="Deck Surface" x={40} y={height / scale - 77} fontSize={9} fill="#333" />

              <Rect x={20} y={height / scale - 63} width={15} height={10} fill="#4A4A4A" stroke="#333" strokeWidth={1} />
              <Text text="Railing" x={40} y={height / scale - 62} fontSize={9} fill="#333" />

              <Circle x={27} y={height / scale - 43} radius={5} fill="#2F4F4F" stroke="#1a1a1a" strokeWidth={1} />
              <Text text="Post (6×6)" x={40} y={height / scale - 47} fontSize={9} fill="#333" />

              <Rect x={20} y={height / scale - 33} width={15} height={10} fill="#A0522D" stroke="#8B4513" strokeWidth={1} />
              <Text text="Stairs" x={40} y={height / scale - 32} fontSize={9} fill="#333" />
            </Group>

            {/* Scale bar */}
            <Group>
              <Line
                points={[width / scale - 130, height / scale - 30, width / scale - 30, height / scale - 30]}
                stroke="#333"
                strokeWidth={2}
              />
              <Line
                points={[width / scale - 130, height / scale - 35, width / scale - 130, height / scale - 25]}
                stroke="#333"
                strokeWidth={2}
              />
              <Line
                points={[width / scale - 30, height / scale - 35, width / scale - 30, height / scale - 25]}
                stroke="#333"
                strokeWidth={2}
              />
              <Text
                text={`${Math.round(100 / SCALE_FACTOR / autoScale)}' scale`}
                x={width / scale - 100}
                y={height / scale - 25}
                fontSize={9}
                fill="#666"
              />
            </Group>
          </Layer>
        </Stage>
      </div>

      {/* Info */}
      <div className="text-sm text-gray-500 text-center">
        <p>Auto-generated from your measurements. Dimensions: {mainDim.length}' × {mainDim.width}'</p>
        {columnCount > 0 && <p>Posts: {columnCount} | {hasRailing ? 'With railing' : 'No railing'} | {hasStairs ? 'With stairs' : 'No stairs'}</p>}
      </div>
    </div>
  )
}
