'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text, Arrow, Image as KonvaImage, Transformer, Group, RegularPolygon } from 'react-konva'
import {
  Pencil, Square, Circle as CircleIcon, Type, ArrowRight, Eraser, Undo, Redo,
  Download, MousePointer, Minus, Highlighter, Ruler, MessageSquare, Triangle,
  Move, ZoomIn, ZoomOut, RotateCcw, Palette, Layers, Grid3X3, Eye, EyeOff,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, Copy, Trash2
} from 'lucide-react'

interface Annotation {
  id: string
  tool: string
  points?: number[]
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  text?: string
  color: string
  fillColor?: string
  strokeWidth: number
  fontSize?: number
  fontStyle?: string
  textAlign?: string
  opacity?: number
  rotation?: number
  sides?: number
  measurement?: { start: { x: number; y: number }; end: { x: number; y: number }; value: string }
  callout?: { text: string; pointer: { x: number; y: number } }
}

interface PhotoAnnotationCanvasProps {
  photoUrl?: string
  onExport: (dataURL: string) => void
  width?: number
  height?: number
}

// Professional color palette
const COLORS = {
  primary: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899'],
  neutral: ['#FFFFFF', '#F3F4F6', '#9CA3AF', '#4B5563', '#1F2937', '#000000'],
  transparent: 'transparent'
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64]

export function PhotoAnnotationCanvas({
  photoUrl,
  onExport,
  width = 800,
  height = 600
}: PhotoAnnotationCanvasProps) {
  const [tool, setTool] = useState<string>('select')
  const [color, setColor] = useState('#EF4444')
  const [fillColor, setFillColor] = useState<string>('transparent')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [opacity, setOpacity] = useState(1)
  const [fontSize, setFontSize] = useState(20)
  const [fontStyle, setFontStyle] = useState<string>('normal')
  const [textAlign, setTextAlign] = useState<string>('left')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [history, setHistory] = useState<Annotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })
  const [showColorPicker, setShowColorPicker] = useState<'stroke' | 'fill' | null>(null)
  const [scale, setScale] = useState(1)
  const [showGrid, setShowGrid] = useState(false)
  const [measurementStart, setMeasurementStart] = useState<{ x: number; y: number } | null>(null)
  const [calloutMode, setCalloutMode] = useState<'text' | 'pointer' | null>(null)
  const [calloutText, setCalloutText] = useState('')
  const [calloutTextPos, setCalloutTextPos] = useState<{ x: number; y: number } | null>(null)

  const stageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)

  // Load image when photoUrl changes
  useEffect(() => {
    if (photoUrl) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.src = photoUrl
      img.onload = () => {
        setImage(img)
      }
    }
  }, [photoUrl])

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = stageRef.current
      const selectedNode = stage?.findOne('#' + selectedId)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer().batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
    }
  }, [selectedId])

  const saveToHistory = useCallback((newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newAnnotations])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations([...history[historyIndex - 1]])
      setSelectedId(null)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations([...history[historyIndex + 1]])
    }
  }

  const handleMouseDown = (e: any) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    const scaledPos = { x: pos.x / scale, y: pos.y / scale }

    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage()
      if (clickedOnEmpty) {
        setSelectedId(null)
      }
      return
    }

    if (tool === 'eraser') {
      return
    }

    const id = Date.now().toString()

    if (tool === 'text') {
      setTextPosition(scaledPos)
      setShowTextInput(true)
      return
    }

    if (tool === 'callout') {
      if (!calloutMode) {
        setCalloutTextPos(scaledPos)
        setCalloutMode('text')
        setShowTextInput(true)
        return
      }
      return
    }

    if (tool === 'measurement') {
      if (!measurementStart) {
        setMeasurementStart(scaledPos)
      } else {
        // Calculate distance
        const dx = scaledPos.x - measurementStart.x
        const dy = scaledPos.y - measurementStart.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const feetValue = (distance / 10).toFixed(1) // Assuming 10 pixels = 1 foot

        const newAnnotation: Annotation = {
          id,
          tool: 'measurement',
          color,
          strokeWidth: 2,
          opacity: 1,
          measurement: {
            start: measurementStart,
            end: scaledPos,
            value: `${feetValue}'`
          }
        }

        const newAnnotations = [...annotations, newAnnotation]
        setAnnotations(newAnnotations)
        saveToHistory(newAnnotations)
        setMeasurementStart(null)
      }
      return
    }

    const newAnnotation: Annotation = {
      id,
      tool,
      color,
      fillColor: fillColor === 'transparent' ? undefined : fillColor,
      strokeWidth,
      opacity,
      fontSize,
      fontStyle,
      textAlign,
      ...(tool === 'pen' || tool === 'highlighter' || tool === 'line' || tool === 'arrow'
        ? { points: [scaledPos.x, scaledPos.y] }
        : tool === 'polygon'
        ? { x: scaledPos.x, y: scaledPos.y, radius: 0, sides: 6 }
        : { x: scaledPos.x, y: scaledPos.y, width: 0, height: 0, radius: 0 }
      ),
    }

    setCurrentAnnotation(newAnnotation)
  }

  const handleMouseMove = (e: any) => {
    if (!currentAnnotation) return

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    const scaledPos = { x: pos.x / scale, y: pos.y / scale }

    if (currentAnnotation.tool === 'pen' || currentAnnotation.tool === 'highlighter') {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...(currentAnnotation.points || []), scaledPos.x, scaledPos.y],
      })
    } else if (currentAnnotation.tool === 'line' || currentAnnotation.tool === 'arrow') {
      const points = currentAnnotation.points || []
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [points[0], points[1], scaledPos.x, scaledPos.y],
      })
    } else if (currentAnnotation.tool === 'rect') {
      setCurrentAnnotation({
        ...currentAnnotation,
        width: scaledPos.x - (currentAnnotation.x || 0),
        height: scaledPos.y - (currentAnnotation.y || 0),
      })
    } else if (currentAnnotation.tool === 'circle') {
      const dx = scaledPos.x - (currentAnnotation.x || 0)
      const dy = scaledPos.y - (currentAnnotation.y || 0)
      setCurrentAnnotation({
        ...currentAnnotation,
        radius: Math.sqrt(dx * dx + dy * dy),
      })
    } else if (currentAnnotation.tool === 'polygon') {
      const dx = scaledPos.x - (currentAnnotation.x || 0)
      const dy = scaledPos.y - (currentAnnotation.y || 0)
      setCurrentAnnotation({
        ...currentAnnotation,
        radius: Math.sqrt(dx * dx + dy * dy),
      })
    }
  }

  const handleMouseUp = () => {
    if (currentAnnotation) {
      const newAnnotations = [...annotations, currentAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
      setCurrentAnnotation(null)
    }
  }

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      if (calloutMode === 'text' && calloutTextPos) {
        setCalloutText(textInput)
        setCalloutMode('pointer')
        setTextInput('')
        setShowTextInput(false)
        return
      }

      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        tool: 'text',
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        color,
        strokeWidth,
        fontSize,
        fontStyle,
        textAlign,
        opacity,
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
    }
    setTextInput('')
    setShowTextInput(false)
    setCalloutMode(null)
    setCalloutTextPos(null)
  }

  const handleCalloutPointer = (e: any) => {
    if (calloutMode === 'pointer' && calloutTextPos && calloutText) {
      const stage = e.target.getStage()
      const pos = stage.getPointerPosition()
      const scaledPos = { x: pos.x / scale, y: pos.y / scale }

      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        tool: 'callout',
        x: calloutTextPos.x,
        y: calloutTextPos.y,
        color,
        strokeWidth: 2,
        fontSize,
        opacity: 1,
        callout: {
          text: calloutText,
          pointer: scaledPos
        }
      }

      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
      setCalloutMode(null)
      setCalloutTextPos(null)
      setCalloutText('')
      setTool('select')
    }
  }

  const handleDelete = () => {
    if (selectedId) {
      const newAnnotations = annotations.filter(a => a.id !== selectedId)
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
      setSelectedId(null)
    }
  }

  const handleDuplicate = () => {
    if (selectedId) {
      const annotation = annotations.find(a => a.id === selectedId)
      if (annotation) {
        const newAnnotation = {
          ...annotation,
          id: Date.now().toString(),
          x: (annotation.x || 0) + 20,
          y: (annotation.y || 0) + 20,
        }
        const newAnnotations = [...annotations, newAnnotation]
        setAnnotations(newAnnotations)
        saveToHistory(newAnnotations)
        setSelectedId(newAnnotation.id)
      }
    }
  }

  const handleExport = () => {
    if (stageRef.current) {
      // Temporarily deselect for clean export
      const prevSelected = selectedId
      setSelectedId(null)

      setTimeout(() => {
        const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 })
        onExport(dataURL)
        setSelectedId(prevSelected)
      }, 50)
    }
  }

  const clearAll = () => {
    setAnnotations([])
    saveToHistory([])
    setSelectedId(null)
  }

  const renderGrid = () => {
    const lines = []
    const gridSize = 20
    for (let i = 0; i <= width / gridSize; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * gridSize, 0, i * gridSize, height]}
          stroke="#ddd"
          strokeWidth={0.5}
          opacity={0.5}
        />
      )
    }
    for (let i = 0; i <= height / gridSize; i++) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * gridSize, width, i * gridSize]}
          stroke="#ddd"
          strokeWidth={0.5}
          opacity={0.5}
        />
      )
    }
    return lines
  }

  const renderAnnotation = (annotation: Annotation) => {
    const commonProps = {
      id: annotation.id,
      key: annotation.id,
      stroke: annotation.color,
      strokeWidth: annotation.strokeWidth,
      opacity: annotation.opacity || 1,
      onClick: () => tool === 'select' && setSelectedId(annotation.id),
      onTap: () => tool === 'select' && setSelectedId(annotation.id),
      draggable: tool === 'select',
    }

    switch (annotation.tool) {
      case 'pen':
        return (
          <Line
            {...commonProps}
            points={annotation.points}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
          />
        )
      case 'highlighter':
        return (
          <Line
            {...commonProps}
            points={annotation.points}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth * 4}
            opacity={0.4}
          />
        )
      case 'line':
        return (
          <Line
            {...commonProps}
            points={annotation.points}
            lineCap="round"
          />
        )
      case 'arrow':
        return (
          <Arrow
            {...commonProps}
            points={annotation.points || []}
            pointerLength={12}
            pointerWidth={12}
            fill={annotation.color}
          />
        )
      case 'rect':
        return (
          <Rect
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill={annotation.fillColor || 'transparent'}
            cornerRadius={2}
          />
        )
      case 'circle':
        return (
          <Circle
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            radius={annotation.radius}
            fill={annotation.fillColor || 'transparent'}
          />
        )
      case 'polygon':
        return (
          <RegularPolygon
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            sides={annotation.sides || 6}
            radius={annotation.radius || 0}
            fill={annotation.fillColor || 'transparent'}
          />
        )
      case 'text':
        return (
          <Text
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            text={annotation.text}
            fontSize={annotation.fontSize || 20}
            fontStyle={annotation.fontStyle || 'normal'}
            align={annotation.textAlign || 'left'}
            fill={annotation.color}
          />
        )
      case 'measurement':
        if (annotation.measurement) {
          const { start, end, value } = annotation.measurement
          const midX = (start.x + end.x) / 2
          const midY = (start.y + end.y) / 2
          return (
            <Group key={annotation.id}>
              <Line
                points={[start.x, start.y, end.x, end.y]}
                stroke={annotation.color}
                strokeWidth={2}
                dash={[5, 5]}
              />
              {/* Start cap */}
              <Line
                points={[start.x - 5, start.y - 10, start.x - 5, start.y + 10]}
                stroke={annotation.color}
                strokeWidth={2}
              />
              {/* End cap */}
              <Line
                points={[end.x + 5, end.y - 10, end.x + 5, end.y + 10]}
                stroke={annotation.color}
                strokeWidth={2}
              />
              {/* Label background */}
              <Rect
                x={midX - 25}
                y={midY - 12}
                width={50}
                height={24}
                fill="white"
                stroke={annotation.color}
                strokeWidth={1}
                cornerRadius={4}
              />
              <Text
                x={midX - 20}
                y={midY - 8}
                text={value}
                fontSize={14}
                fontStyle="bold"
                fill={annotation.color}
              />
            </Group>
          )
        }
        return null
      case 'callout':
        if (annotation.callout) {
          const { text, pointer } = annotation.callout
          const boxWidth = Math.max(text.length * 8 + 20, 80)
          const boxHeight = 36
          return (
            <Group key={annotation.id} draggable={tool === 'select'} onClick={() => tool === 'select' && setSelectedId(annotation.id)}>
              {/* Arrow from box to pointer */}
              <Arrow
                points={[
                  (annotation.x || 0) + boxWidth / 2,
                  (annotation.y || 0) + boxHeight,
                  pointer.x,
                  pointer.y
                ]}
                pointerLength={10}
                pointerWidth={10}
                fill={annotation.color}
                stroke={annotation.color}
                strokeWidth={2}
              />
              {/* Text box */}
              <Rect
                x={annotation.x}
                y={annotation.y}
                width={boxWidth}
                height={boxHeight}
                fill="white"
                stroke={annotation.color}
                strokeWidth={2}
                cornerRadius={6}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.2}
                shadowOffsetX={2}
                shadowOffsetY={2}
              />
              <Text
                x={(annotation.x || 0) + 10}
                y={(annotation.y || 0) + 10}
                text={text}
                fontSize={annotation.fontSize || 14}
                fill={annotation.color}
                fontStyle="bold"
              />
            </Group>
          )
        }
        return null
      default:
        return null
    }
  }

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select & Move' },
    { id: 'pen', icon: Pencil, label: 'Freehand Pen' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter' },
    { id: 'line', icon: Minus, label: 'Straight Line' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, label: 'Circle/Ellipse' },
    { id: 'polygon', icon: Triangle, label: 'Polygon' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'measurement', icon: Ruler, label: 'Measurement' },
    { id: 'callout', icon: MessageSquare, label: 'Callout Box' },
  ]

  return (
    <div className="space-y-3">
      {/* Main Toolbar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTool(t.id)
                  setMeasurementStart(null)
                  setCalloutMode(null)
                }}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  tool === t.id
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
                title={t.label}
              >
                <t.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-600" />

          {/* Stroke Color */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(showColorPicker === 'stroke' ? null : 'stroke')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <div
                className="w-5 h-5 rounded border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-300">Stroke</span>
            </button>
            {showColorPicker === 'stroke' && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl z-50 border border-slate-200">
                <div className="grid grid-cols-8 gap-1.5 mb-2">
                  {COLORS.primary.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setShowColorPicker(null) }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        color === c ? 'border-slate-800 ring-2 ring-blue-400' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLORS.neutral.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setShowColorPicker(null) }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        color === c ? 'border-slate-800 ring-2 ring-blue-400' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fill Color */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(showColorPicker === 'fill' ? null : 'fill')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <div
                className={`w-5 h-5 rounded border-2 border-white shadow-sm ${fillColor === 'transparent' ? 'bg-gradient-to-br from-white to-slate-200' : ''}`}
                style={{ backgroundColor: fillColor === 'transparent' ? undefined : fillColor }}
              >
                {fillColor === 'transparent' && (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">/</div>
                )}
              </div>
              <span className="text-xs text-slate-300">Fill</span>
            </button>
            {showColorPicker === 'fill' && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl z-50 border border-slate-200">
                <button
                  onClick={() => { setFillColor('transparent'); setShowColorPicker(null) }}
                  className={`w-full mb-2 px-3 py-1.5 text-sm rounded-lg border-2 ${
                    fillColor === 'transparent' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  No Fill
                </button>
                <div className="grid grid-cols-8 gap-1.5 mb-2">
                  {COLORS.primary.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setFillColor(c); setShowColorPicker(null) }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        fillColor === c ? 'border-slate-800 ring-2 ring-blue-400' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLORS.neutral.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setFillColor(c); setShowColorPicker(null) }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        fillColor === c ? 'border-slate-800 ring-2 ring-blue-400' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-600" />

          {/* Stroke Width */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg">
            <span className="text-xs text-slate-400">Width</span>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-20 accent-blue-500"
            />
            <span className="text-xs text-white font-mono w-5">{strokeWidth}</span>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg">
            <Eye className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-16 accent-blue-500"
            />
            <span className="text-xs text-white font-mono w-6">{Math.round(opacity * 100)}%</span>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-600" />

          {/* View Controls */}
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-all ${showGrid ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
              title="Toggle Grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale(Math.min(scale + 0.25, 3))}
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
            <button
              onClick={() => setScale(1)}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Second Row - Text Options & Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-600">
          {/* Text Options */}
          {(tool === 'text' || tool === 'callout') && (
            <div className="flex items-center gap-2">
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-slate-900/50 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600"
              >
                {FONT_SIZES.map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
              <div className="flex bg-slate-900/50 rounded-lg p-0.5">
                <button
                  onClick={() => setFontStyle(fontStyle === 'bold' ? 'normal' : 'bold')}
                  className={`p-1.5 rounded ${fontStyle === 'bold' ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                  className={`p-1.5 rounded ${fontStyle === 'italic' ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
                >
                  <Italic className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Selection Actions */}
          {selectedId && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-900/50 text-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}

          {/* History & Export Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex bg-slate-900/50 rounded-lg p-0.5">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 rounded text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 rounded text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {(tool === 'measurement' && measurementStart) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm">
          Click to set the measurement end point. Distance will be calculated in feet.
        </div>
      )}
      {calloutMode === 'pointer' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
          Click where you want the callout arrow to point.
        </div>
      )}

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">
              {calloutMode === 'text' ? 'Add Callout Text' : 'Add Text'}
            </h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 mb-4 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              placeholder={calloutMode === 'text' ? "Enter callout text..." : "Enter text..."}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowTextInput(false); setCalloutMode(null); setCalloutTextPos(null) }}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTextSubmit}
                className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
              >
                {calloutMode === 'text' ? 'Next' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner"
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      >
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onClick={calloutMode === 'pointer' ? handleCalloutPointer : undefined}
        >
          <Layer>
            {/* Grid */}
            {showGrid && renderGrid()}

            {/* Background image if provided */}
            {image && (
              <KonvaImage
                image={image}
                width={width / scale}
                height={height / scale}
                listening={false}
              />
            )}

            {/* Render all annotations */}
            {annotations.map(renderAnnotation)}

            {/* Render current annotation being drawn */}
            {currentAnnotation && renderAnnotation(currentAnnotation)}

            {/* Measurement preview line */}
            {tool === 'measurement' && measurementStart && (
              <Group>
                <Circle
                  x={measurementStart.x}
                  y={measurementStart.y}
                  radius={5}
                  fill={color}
                />
              </Group>
            )}

            {/* Transformer for selected items */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox
                }
                return newBox
              }}
              anchorFill="#fff"
              anchorStroke="#3B82F6"
              anchorSize={10}
              anchorCornerRadius={3}
              borderStroke="#3B82F6"
              borderStrokeWidth={2}
              borderDash={[4, 4]}
            />
          </Layer>
        </Stage>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-slate-500 bg-slate-50 rounded-lg py-2 px-4">
        {tool === 'select' && 'Click to select objects. Drag to move. Use handles to resize.'}
        {tool === 'pen' && 'Click and drag to draw freehand lines.'}
        {tool === 'highlighter' && 'Click and drag to highlight areas with a transparent marker.'}
        {tool === 'line' && 'Click and drag to draw a straight line.'}
        {tool === 'arrow' && 'Click and drag to draw an arrow.'}
        {tool === 'rect' && 'Click and drag to draw a rectangle.'}
        {tool === 'circle' && 'Click and drag from center to draw a circle.'}
        {tool === 'polygon' && 'Click and drag to draw a hexagon shape.'}
        {tool === 'text' && 'Click anywhere to add text.'}
        {tool === 'measurement' && 'Click two points to measure distance. Result shown in feet.'}
        {tool === 'callout' && 'Click to place text box, then click again to point the arrow.'}
      </div>
    </div>
  )
}
