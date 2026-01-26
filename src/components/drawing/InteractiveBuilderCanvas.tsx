'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Line, Text, Group, Circle, Arrow, Shape } from 'react-konva'
import {
  Download, RotateCw, Trash2, ZoomIn, ZoomOut, Grid, Plus, Copy, Layers,
  Move, FlipHorizontal, FlipVertical, Lock, Unlock, Eye, EyeOff, Palette,
  Home, Square, CircleDot, Fence, Footprints, Sofa, Flame, Waves, TreePine
} from 'lucide-react'

interface DeckComponent {
  id: string
  type: ComponentType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
  material: Material
  label?: string
  locked?: boolean
  visible?: boolean
  zIndex?: number
}

type ComponentType = 'deck' | 'stairs' | 'railing' | 'post' | 'beam' | 'landing' |
  'pergola' | 'planter' | 'bench' | 'firepit' | 'hottub' | 'tree' | 'door' | 'window'

type Material = 'wood' | 'composite' | 'metal' | 'concrete' | 'stone'

interface InteractiveBuilderCanvasProps {
  onExport: (dataURL: string) => void
  width?: number
  height?: number
  initialComponents?: DeckComponent[]
}

const GRID_SIZE = 20
const SCALE_FACTOR = 10 // 1 foot = 10 pixels

// Material colors with variations
const MATERIAL_COLORS: Record<Material, { primary: string; secondary: string; accent: string }> = {
  wood: { primary: '#8B4513', secondary: '#A0522D', accent: '#D2691E' },
  composite: { primary: '#6B7280', secondary: '#9CA3AF', accent: '#4B5563' },
  metal: { primary: '#374151', secondary: '#6B7280', accent: '#1F2937' },
  concrete: { primary: '#9CA3AF', secondary: '#D1D5DB', accent: '#6B7280' },
  stone: { primary: '#78716C', secondary: '#A8A29E', accent: '#57534E' },
}

// Custom Minus icon component (defined before use)
const MinusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const componentTemplates: Record<ComponentType, { width: number; height: number; material: Material; label: string; icon: any }> = {
  deck: { width: 120, height: 100, material: 'wood', label: 'Deck', icon: Square },
  stairs: { width: 40, height: 60, material: 'wood', label: 'Stairs', icon: Footprints },
  railing: { width: 100, height: 8, material: 'wood', label: 'Railing', icon: Fence },
  post: { width: 12, height: 12, material: 'wood', label: 'Post', icon: CircleDot },
  beam: { width: 120, height: 6, material: 'wood', label: 'Beam', icon: MinusIcon },
  landing: { width: 50, height: 50, material: 'concrete', label: 'Landing', icon: Square },
  pergola: { width: 80, height: 80, material: 'wood', label: 'Pergola', icon: Grid },
  planter: { width: 30, height: 30, material: 'wood', label: 'Planter', icon: TreePine },
  bench: { width: 60, height: 20, material: 'wood', label: 'Bench', icon: Sofa },
  firepit: { width: 40, height: 40, material: 'stone', label: 'Fire Pit', icon: Flame },
  hottub: { width: 70, height: 70, material: 'composite', label: 'Hot Tub', icon: Waves },
  tree: { width: 40, height: 40, material: 'wood', label: 'Tree', icon: TreePine },
  door: { width: 36, height: 8, material: 'wood', label: 'Door', icon: Home },
  window: { width: 30, height: 6, material: 'metal', label: 'Window', icon: Square },
}

export function InteractiveBuilderCanvas({
  onExport,
  width = 800,
  height = 600,
  initialComponents = []
}: InteractiveBuilderCanvasProps) {
  const [components, setComponents] = useState<DeckComponent[]>(initialComponents)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [scale, setScale] = useState(1)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showMaterialPicker, setShowMaterialPicker] = useState(false)
  const stageRef = useRef<any>(null)

  const addComponent = (type: ComponentType) => {
    const template = componentTemplates[type]
    const colors = MATERIAL_COLORS[template.material]
    const newComponent: DeckComponent = {
      id: Date.now().toString(),
      type,
      x: width / 2 - template.width / 2,
      y: height / 2 - template.height / 2,
      width: template.width,
      height: template.height,
      rotation: 0,
      color: colors.primary,
      material: template.material,
      label: template.label,
      locked: false,
      visible: true,
      zIndex: components.length,
    }
    setComponents([...components, newComponent])
    setSelectedId(newComponent.id)
  }

  const updateComponent = useCallback((id: string, updates: Partial<DeckComponent>) => {
    setComponents(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ))
  }, [])

  const deleteComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id))
    setSelectedId(null)
  }

  const duplicateComponent = () => {
    if (!selectedId) return
    const component = components.find(c => c.id === selectedId)
    if (component) {
      const newComponent = {
        ...component,
        id: Date.now().toString(),
        x: component.x + 30,
        y: component.y + 30,
        zIndex: components.length,
      }
      setComponents([...components, newComponent])
      setSelectedId(newComponent.id)
    }
  }

  const rotateComponent = (id: string) => {
    const component = components.find(c => c.id === id)
    if (component && !component.locked) {
      updateComponent(id, { rotation: (component.rotation + 90) % 360 })
    }
  }

  const toggleLock = (id: string) => {
    const component = components.find(c => c.id === id)
    if (component) {
      updateComponent(id, { locked: !component.locked })
    }
  }

  const toggleVisibility = (id: string) => {
    const component = components.find(c => c.id === id)
    if (component) {
      updateComponent(id, { visible: !component.visible })
    }
  }

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...components.map(c => c.zIndex || 0))
    updateComponent(id, { zIndex: maxZ + 1 })
  }

  const sendToBack = (id: string) => {
    const minZ = Math.min(...components.map(c => c.zIndex || 0))
    updateComponent(id, { zIndex: minZ - 1 })
  }

  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }

  const handleDragEnd = (id: string, e: any) => {
    const component = components.find(c => c.id === id)
    if (component?.locked) return

    const node = e.target
    updateComponent(id, {
      x: snapToGrid(node.x()),
      y: snapToGrid(node.y()),
    })
  }

  const handleExport = () => {
    if (stageRef.current) {
      const prevSelected = selectedId
      setSelectedId(null)

      setTimeout(() => {
        const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 })
        onExport(dataURL)
        setSelectedId(prevSelected)
      }, 100)
    }
  }

  const renderGrid = () => {
    const lines = []
    // Major grid lines (every 5 feet)
    const majorGridSize = GRID_SIZE * 5
    for (let i = 0; i <= width / majorGridSize; i++) {
      lines.push(
        <Line
          key={`mv-${i}`}
          points={[i * majorGridSize, 0, i * majorGridSize, height]}
          stroke="#c0c0c0"
          strokeWidth={1}
        />
      )
    }
    for (let i = 0; i <= height / majorGridSize; i++) {
      lines.push(
        <Line
          key={`mh-${i}`}
          points={[0, i * majorGridSize, width, i * majorGridSize]}
          stroke="#c0c0c0"
          strokeWidth={1}
        />
      )
    }
    // Minor grid lines
    for (let i = 0; i <= width / GRID_SIZE; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]}
          stroke="#e8e8e8"
          strokeWidth={0.5}
        />
      )
    }
    for (let i = 0; i <= height / GRID_SIZE; i++) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * GRID_SIZE, width, i * GRID_SIZE]}
          stroke="#e8e8e8"
          strokeWidth={0.5}
        />
      )
    }
    return lines
  }

  const renderWoodGrain = (x: number, y: number, w: number, h: number, color: string) => {
    const grainLines = []
    const lineCount = Math.floor(h / 4)
    for (let i = 0; i < lineCount; i++) {
      grainLines.push(
        <Line
          key={`grain-${i}`}
          points={[x + 2, y + i * 4 + 2, x + w - 2, y + i * 4 + 2]}
          stroke={color}
          strokeWidth={0.5}
          opacity={0.3}
        />
      )
    }
    return grainLines
  }

  const renderComponent = (component: DeckComponent) => {
    if (!component.visible) return null

    const isSelected = selectedId === component.id
    const colors = MATERIAL_COLORS[component.material]

    const commonGroupProps = {
      key: component.id,
      x: component.x,
      y: component.y,
      rotation: component.rotation,
      draggable: !component.locked,
      onClick: () => setSelectedId(component.id),
      onTap: () => setSelectedId(component.id),
      onDragEnd: (e: any) => handleDragEnd(component.id, e),
    }

    const renderComponentShape = () => {
      switch (component.type) {
        case 'deck':
          return (
            <>
              {/* Main deck surface with wood grain effect */}
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 1.5}
                cornerRadius={3}
                shadowColor="black"
                shadowBlur={isSelected ? 10 : 5}
                shadowOpacity={0.2}
                shadowOffsetX={3}
                shadowOffsetY={3}
              />
              {/* Decking board lines */}
              {Array.from({ length: Math.floor(component.height / 8) }).map((_, i) => (
                <Line
                  key={`deck-board-${i}`}
                  points={[2, i * 8 + 4, component.width - 2, i * 8 + 4]}
                  stroke={colors.secondary}
                  strokeWidth={1}
                  opacity={0.4}
                />
              ))}
              {/* Highlight edge */}
              <Line
                points={[2, 2, component.width - 2, 2]}
                stroke={colors.accent}
                strokeWidth={2}
                opacity={0.3}
              />
            </>
          )

        case 'stairs':
          const stepCount = Math.floor(component.height / 12)
          return (
            <>
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 1.5}
                cornerRadius={2}
                shadowColor="black"
                shadowBlur={8}
                shadowOpacity={0.25}
                shadowOffsetX={2}
                shadowOffsetY={4}
              />
              {/* Stair treads with 3D effect */}
              {Array.from({ length: stepCount }).map((_, i) => (
                <Group key={`step-${i}`}>
                  <Rect
                    x={0}
                    y={i * (component.height / stepCount)}
                    width={component.width}
                    height={component.height / stepCount - 2}
                    fill={i % 2 === 0 ? colors.primary : colors.secondary}
                    stroke={colors.accent}
                    strokeWidth={0.5}
                  />
                  <Line
                    points={[
                      2, i * (component.height / stepCount) + 2,
                      component.width - 2, i * (component.height / stepCount) + 2
                    ]}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth={1}
                  />
                </Group>
              ))}
              {/* Down arrow indicator */}
              <Arrow
                points={[component.width / 2, 10, component.width / 2, component.height - 10]}
                pointerLength={8}
                pointerWidth={8}
                fill="white"
                stroke="white"
                strokeWidth={2}
                opacity={0.7}
              />
            </>
          )

        case 'railing':
          const postCount = Math.ceil(component.width / 30)
          return (
            <>
              {/* Main rail bar */}
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 1}
                cornerRadius={2}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.2}
                shadowOffsetY={2}
              />
              {/* Rail posts (balusters) */}
              {Array.from({ length: postCount }).map((_, i) => (
                <Rect
                  key={`baluster-${i}`}
                  x={i * (component.width / postCount) + 2}
                  y={-15}
                  width={4}
                  height={20}
                  fill={colors.secondary}
                  stroke={colors.accent}
                  strokeWidth={0.5}
                  cornerRadius={1}
                />
              ))}
              {/* Top rail */}
              <Rect
                x={0}
                y={-18}
                width={component.width}
                height={5}
                fill={colors.primary}
                stroke={colors.accent}
                strokeWidth={0.5}
                cornerRadius={2}
              />
            </>
          )

        case 'post':
          return (
            <>
              {/* 3D post effect */}
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 1.5}
                cornerRadius={2}
                shadowColor="black"
                shadowBlur={6}
                shadowOpacity={0.3}
                shadowOffsetX={2}
                shadowOffsetY={2}
              />
              {/* Post cap */}
              <Rect
                x={-2}
                y={-2}
                width={component.width + 4}
                height={4}
                fill={colors.secondary}
                cornerRadius={1}
              />
              {/* Center highlight */}
              <Circle
                x={component.width / 2}
                y={component.height / 2}
                radius={3}
                fill={colors.accent}
              />
            </>
          )

        case 'beam':
          return (
            <>
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 1}
                cornerRadius={1}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.2}
                shadowOffsetY={2}
              />
              {/* Wood grain texture */}
              <Line
                points={[0, component.height / 2, component.width, component.height / 2]}
                stroke={colors.secondary}
                strokeWidth={1}
                opacity={0.4}
              />
            </>
          )

        case 'landing':
          return (
            <>
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : '#666'}
                strokeWidth={isSelected ? 3 : 1.5}
                cornerRadius={3}
                shadowColor="black"
                shadowBlur={8}
                shadowOpacity={0.15}
                shadowOffsetX={2}
                shadowOffsetY={2}
              />
              {/* Concrete texture dots */}
              {Array.from({ length: 8 }).map((_, i) => (
                <Circle
                  key={`texture-${i}`}
                  x={10 + (i % 4) * (component.width - 20) / 3}
                  y={10 + Math.floor(i / 4) * (component.height - 20)}
                  radius={2}
                  fill={colors.secondary}
                  opacity={0.4}
                />
              ))}
            </>
          )

        case 'pergola':
          const beamCount = 4
          return (
            <>
              {/* Pergola frame */}
              <Rect
                width={component.width}
                height={component.height}
                fill="transparent"
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 2}
                dash={[10, 5]}
              />
              {/* Cross beams */}
              {Array.from({ length: beamCount }).map((_, i) => (
                <Rect
                  key={`pergola-beam-${i}`}
                  x={-5}
                  y={i * (component.height / (beamCount - 1)) - 3}
                  width={component.width + 10}
                  height={6}
                  fill={component.color}
                  stroke={colors.accent}
                  strokeWidth={1}
                  cornerRadius={1}
                  shadowColor="black"
                  shadowBlur={3}
                  shadowOpacity={0.2}
                  shadowOffsetY={2}
                />
              ))}
              {/* Corner posts */}
              {[
                { x: -3, y: -3 },
                { x: component.width - 9, y: -3 },
                { x: -3, y: component.height - 9 },
                { x: component.width - 9, y: component.height - 9 },
              ].map((pos, i) => (
                <Rect
                  key={`pergola-post-${i}`}
                  x={pos.x}
                  y={pos.y}
                  width={12}
                  height={12}
                  fill={colors.secondary}
                  stroke={colors.accent}
                  strokeWidth={1}
                  cornerRadius={2}
                />
              ))}
            </>
          )

        case 'planter':
          return (
            <>
              {/* Planter box */}
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 2}
                cornerRadius={3}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.2}
                shadowOffsetX={2}
                shadowOffsetY={2}
              />
              {/* Soil/plants inside */}
              <Rect
                x={3}
                y={3}
                width={component.width - 6}
                height={component.height - 6}
                fill="#3D2914"
                cornerRadius={2}
              />
              {/* Plant representation */}
              <Circle
                x={component.width / 2}
                y={component.height / 2}
                radius={component.width / 4}
                fill="#228B22"
                opacity={0.8}
              />
            </>
          )

        case 'bench':
          return (
            <>
              {/* Bench seat */}
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : colors.accent}
                strokeWidth={isSelected ? 3 : 1.5}
                cornerRadius={3}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.2}
                shadowOffsetX={2}
                shadowOffsetY={3}
              />
              {/* Seat slats */}
              {Array.from({ length: 3 }).map((_, i) => (
                <Line
                  key={`slat-${i}`}
                  points={[3, 5 + i * 6, component.width - 3, 5 + i * 6]}
                  stroke={colors.secondary}
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              ))}
              {/* Legs */}
              <Rect x={5} y={component.height} width={6} height={8} fill={colors.secondary} cornerRadius={1} />
              <Rect x={component.width - 11} y={component.height} width={6} height={8} fill={colors.secondary} cornerRadius={1} />
            </>
          )

        case 'firepit':
          return (
            <>
              {/* Outer ring */}
              <Circle
                x={component.width / 2}
                y={component.height / 2}
                radius={component.width / 2}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : '#444'}
                strokeWidth={isSelected ? 3 : 2}
                shadowColor="black"
                shadowBlur={8}
                shadowOpacity={0.3}
              />
              {/* Inner fire area */}
              <Circle
                x={component.width / 2}
                y={component.height / 2}
                radius={component.width / 3}
                fill="#1a1a1a"
              />
              {/* Fire glow effect */}
              <Circle
                x={component.width / 2}
                y={component.height / 2}
                radius={component.width / 4}
                fill="#FF6B35"
                opacity={0.6}
              />
              <Circle
                x={component.width / 2}
                y={component.height / 2}
                radius={component.width / 6}
                fill="#FFD700"
                opacity={0.8}
              />
            </>
          )

        case 'hottub':
          return (
            <>
              {/* Hot tub shell */}
              <Rect
                width={component.width}
                height={component.height}
                fill={component.color}
                stroke={isSelected ? '#3B82F6' : '#333'}
                strokeWidth={isSelected ? 3 : 3}
                cornerRadius={10}
                shadowColor="black"
                shadowBlur={10}
                shadowOpacity={0.3}
                shadowOffsetX={3}
                shadowOffsetY={3}
              />
              {/* Water inside */}
              <Rect
                x={5}
                y={5}
                width={component.width - 10}
                height={component.height - 10}
                fill="#4FC3F7"
                cornerRadius={8}
                opacity={0.7}
              />
              {/* Jets/bubbles */}
              {Array.from({ length: 4 }).map((_, i) => (
                <Circle
                  key={`jet-${i}`}
                  x={15 + (i % 2) * (component.width - 30)}
                  y={15 + Math.floor(i / 2) * (component.height - 30)}
                  radius={5}
                  fill="white"
                  opacity={0.6}
                />
              ))}
            </>
          )

        case 'tree':
          return (
            <>
              {/* Tree canopy */}
              <Circle
                x={component.width / 2}
                y={component.height / 2}
                radius={component.width / 2}
                fill="#228B22"
                stroke={isSelected ? '#3B82F6' : '#1a5f1a'}
                strokeWidth={isSelected ? 3 : 2}
                shadowColor="black"
                shadowBlur={8}
                shadowOpacity={0.25}
                shadowOffsetX={3}
                shadowOffsetY={3}
              />
              {/* Inner highlight */}
              <Circle
                x={component.width / 2 - 5}
                y={component.height / 2 - 5}
                radius={component.width / 4}
                fill="#32CD32"
                opacity={0.5}
              />
              {/* Trunk hint */}
              <Rect
                x={component.width / 2 - 4}
                y={component.height - 5}
                width={8}
                height={10}
                fill="#654321"
                cornerRadius={1}
              />
            </>
          )

        case 'door':
          return (
            <>
              <Rect
                width={component.width}
                height={component.height}
                fill="#5D4E37"
                stroke={isSelected ? '#3B82F6' : '#3D3326'}
                strokeWidth={isSelected ? 3 : 2}
                cornerRadius={1}
              />
              {/* Door panels */}
              <Rect x={3} y={2} width={component.width / 2 - 5} height={component.height - 4} fill="#4A3F2F" cornerRadius={1} />
              <Rect x={component.width / 2 + 2} y={2} width={component.width / 2 - 5} height={component.height - 4} fill="#4A3F2F" cornerRadius={1} />
              {/* Handle */}
              <Circle x={component.width - 8} y={component.height / 2} radius={2} fill="#C0C0C0" />
            </>
          )

        case 'window':
          return (
            <>
              <Rect
                width={component.width}
                height={component.height}
                fill="#87CEEB"
                stroke={isSelected ? '#3B82F6' : '#555'}
                strokeWidth={isSelected ? 3 : 2}
                cornerRadius={1}
              />
              {/* Window panes */}
              <Line points={[component.width / 2, 0, component.width / 2, component.height]} stroke="#555" strokeWidth={1} />
              <Line points={[0, component.height / 2, component.width, component.height / 2]} stroke="#555" strokeWidth={1} />
            </>
          )

        default:
          return (
            <Rect
              width={component.width}
              height={component.height}
              fill={component.color}
              stroke={isSelected ? '#3B82F6' : '#333'}
              strokeWidth={isSelected ? 3 : 1}
            />
          )
      }
    }

    return (
      <Group {...commonGroupProps}>
        {renderComponentShape()}

        {/* Label */}
        {component.label && (
          <Text
            text={component.label}
            x={2}
            y={component.height + 5}
            fontSize={10}
            fill="#666"
            fontStyle="bold"
          />
        )}

        {/* Dimensions label */}
        <Group>
          <Rect
            x={component.width / 2 - 22}
            y={component.height + 16}
            width={44}
            height={14}
            fill="white"
            stroke="#ccc"
            strokeWidth={0.5}
            cornerRadius={2}
            opacity={0.9}
          />
          <Text
            text={`${Math.round(component.width / SCALE_FACTOR)}'×${Math.round(component.height / SCALE_FACTOR)}'`}
            x={component.width / 2 - 18}
            y={component.height + 18}
            fontSize={9}
            fill="#444"
            fontStyle="bold"
          />
        </Group>

        {/* Selection handles */}
        {isSelected && !component.locked && (
          <>
            {/* Resize handle */}
            <Rect
              x={component.width - 8}
              y={component.height - 8}
              width={16}
              height={16}
              fill="#3B82F6"
              cornerRadius={3}
              shadowColor="black"
              shadowBlur={4}
              shadowOpacity={0.3}
              draggable
              onDragMove={(e) => {
                const node = e.target
                const newWidth = Math.max(20, snapToGrid(component.width + node.x() - component.width + 8))
                const newHeight = Math.max(20, snapToGrid(component.height + node.y() - component.height + 8))
                updateComponent(component.id, { width: newWidth, height: newHeight })
                node.position({ x: component.width - 8, y: component.height - 8 })
              }}
            />
            {/* Resize icon */}
            <Text
              x={component.width - 4}
              y={component.height - 5}
              text="⤡"
              fontSize={10}
              fill="white"
              listening={false}
            />
          </>
        )}

        {/* Lock indicator */}
        {component.locked && (
          <Group x={component.width - 16} y={-16}>
            <Circle radius={8} fill="#EF4444" />
            <Text x={-4} y={-5} text="🔒" fontSize={8} />
          </Group>
        )}
      </Group>
    )
  }

  const selectedComponent = components.find(c => c.id === selectedId)

  // Sort by zIndex for proper layering
  const sortedComponents = [...components].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  // Component categories for the toolbar
  const componentCategories = {
    'Structure': ['deck', 'stairs', 'landing', 'railing', 'post', 'beam'],
    'Features': ['pergola', 'bench', 'planter', 'firepit', 'hottub'],
    'Landscape': ['tree'],
    'House': ['door', 'window'],
  }

  return (
    <div className="space-y-3">
      {/* Main Toolbar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Component Categories */}
          {Object.entries(componentCategories).map(([category, types]) => (
            <div key={category} className="flex items-center">
              <span className="text-xs text-slate-400 mr-2">{category}:</span>
              <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
                {types.map((type) => {
                  const template = componentTemplates[type as ComponentType]
                  const Icon = template.icon
                  return (
                    <button
                      key={type}
                      onClick={() => addComponent(type as ComponentType)}
                      className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-all"
                      title={`Add ${template.label}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Divider */}
          <div className="w-px h-8 bg-slate-600" />

          {/* View Controls */}
          <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-all ${showGrid ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-600'}`}
              title="Toggle Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScale(Math.min(scale + 0.25, 2))}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs text-slate-300 font-mono">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(Math.max(scale - 0.25, 0.5))}
              className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30 ml-auto"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Selection Actions Row */}
        {selectedComponent && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-600">
            {/* Actions */}
            <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
              <button
                onClick={() => rotateComponent(selectedId!)}
                disabled={selectedComponent.locked}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={duplicateComponent}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleLock(selectedId!)}
                className={`p-2 rounded-lg ${selectedComponent.locked ? 'bg-red-500/30 text-red-400' : 'text-slate-300 hover:bg-slate-600'}`}
                title={selectedComponent.locked ? 'Unlock' : 'Lock'}
              >
                {selectedComponent.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
              <button
                onClick={() => bringToFront(selectedId!)}
                className="p-2 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white"
                title="Bring to Front"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            {/* Size inputs */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/50 rounded-lg">
              <span className="text-xs text-slate-400">Size:</span>
              <input
                type="number"
                value={Math.round(selectedComponent.width / SCALE_FACTOR)}
                onChange={(e) => updateComponent(selectedId!, { width: Number(e.target.value) * SCALE_FACTOR })}
                className="w-12 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white text-center"
                min="1"
                disabled={selectedComponent.locked}
              />
              <span className="text-slate-400">×</span>
              <input
                type="number"
                value={Math.round(selectedComponent.height / SCALE_FACTOR)}
                onChange={(e) => updateComponent(selectedId!, { height: Number(e.target.value) * SCALE_FACTOR })}
                className="w-12 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white text-center"
                min="1"
                disabled={selectedComponent.locked}
              />
              <span className="text-xs text-slate-400">ft</span>
            </div>

            {/* Material selector */}
            <div className="relative">
              <button
                onClick={() => setShowMaterialPicker(!showMaterialPicker)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 rounded-lg hover:bg-slate-600"
              >
                <div
                  className="w-5 h-5 rounded border border-white/30"
                  style={{ backgroundColor: selectedComponent.color }}
                />
                <span className="text-xs text-slate-300 capitalize">{selectedComponent.material}</span>
              </button>
              {showMaterialPicker && (
                <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl z-50 border">
                  <div className="space-y-2">
                    {(Object.keys(MATERIAL_COLORS) as Material[]).map((material) => (
                      <button
                        key={material}
                        onClick={() => {
                          const colors = MATERIAL_COLORS[material]
                          updateComponent(selectedId!, { material, color: colors.primary })
                          setShowMaterialPicker(false)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 ${
                          selectedComponent.material === material ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: MATERIAL_COLORS[material].primary }}
                        />
                        <span className="text-sm capitalize">{material}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => deleteComponent(selectedId!)}
              className="flex items-center gap-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
          onClick={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedId(null)
            }
          }}
        >
          <Layer>
            {/* Grid */}
            {showGrid && renderGrid()}

            {/* Scale indicator */}
            <Group x={10} y={height / scale - 45}>
              <Rect
                width={120}
                height={35}
                fill="white"
                stroke="#ddd"
                strokeWidth={1}
                cornerRadius={5}
                opacity={0.95}
              />
              <Text
                text={`Scale: 1 grid = 2 ft`}
                x={8}
                y={8}
                fontSize={10}
                fill="#666"
              />
              <Text
                text={`Zoom: ${Math.round(scale * 100)}%`}
                x={8}
                y={22}
                fontSize={10}
                fill="#666"
              />
            </Group>

            {/* Components */}
            {sortedComponents.map(renderComponent)}
          </Layer>
        </Stage>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-slate-500 bg-slate-50 rounded-lg py-2 px-4">
        Click a component button to add it. Drag to move. Drag the corner handle to resize. Use the toolbar to customize.
      </div>
    </div>
  )
}
