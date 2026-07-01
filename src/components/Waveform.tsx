// src/components/MatWaveform.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg'

const STATES = ['idle', 'listening', 'thinking'] as const
type WaveformState = typeof STATES[number]

const DOT_COLORS: Record<WaveformState, string> = {
  idle: '#555577',
  listening: '#007AFF',
  thinking: '#AF52DE',
}

const GRADIENT_STOPS: Record<WaveformState, [string, string, string]> = {
  idle: ['#3a3a6c', '#6655aa', '#3a3a6c'],
  listening: ['#007AFF', '#AF52DE', '#FF2D55'],
  thinking: ['#AF52DE', '#5E5CE6', '#007AFF'],
}

function easeInOut(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(c1: string, c2: string, t: number): string {
  const h = (s: string) => [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = h(c1)
  const [r2, g2, b2] = h(c2)
  const r = Math.round(lerp(r1, r2, t))
  const g = Math.round(lerp(g1, g2, t))
  const b = Math.round(lerp(b1, b2, t))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

interface Point {
  x: number
  y: number
}

function getLinePoints(time: number, W: number, H: number, COUNT: number, isListening: boolean): Point[] {
  const CY = H / 2
  const pts: Point[] = []
  for (let i = 0; i <= COUNT; i++) {
    const prog = i / COUNT
    const x = W * 0.06 + prog * (W * 0.88)
    let y = CY
    if (isListening) {
      const phase = time * 2.2
      const env = Math.sin(prog * Math.PI)
      y = CY + (
        -Math.sin(prog * Math.PI * 3 - phase) * (H * 0.33) +
        Math.sin(prog * Math.PI * 5 - phase * 0.7) * (H * 0.12) +
        Math.sin(prog * Math.PI * 8 - phase * 1.3) * (H * 0.05)
      ) * env
    } else {
      y = CY + Math.sin(prog * Math.PI * 2 + time * 0.5) * (H * 0.018)
    }
    pts.push({ x, y })
  }
  return pts
}

function getCirclePoints(time: number, W: number, H: number, COUNT: number): Point[] {
  const CX = W / 2
  const CY = H / 2
  const R = Math.min(W, H) * 0.32
  const pts: Point[] = []
  for (let i = 0; i <= COUNT; i++) {
    const angle = (i / COUNT) * 2 * Math.PI + time * 1.4
    pts.push({ x: CX + Math.cos(angle) * R, y: CY + Math.sin(angle) * R })
  }
  return pts
}

function lerpPoints(a: Point[], b: Point[], t: number): Point[] {
  return a.map((pa, i) => {
    const pb = b[Math.min(i, b.length - 1)]
    return { x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t) }
  })
}

const SEGMENTS = 60

interface Segment {
  d: string
  sw: number
  prog: number
}

function buildSegmentPaths(pts: Point[], minW: number, maxW: number): Segment[] {
  const total = pts.length - 1
  const step = Math.floor(total / SEGMENTS)
  const paths: Segment[] = []
  for (let s = 0; s < SEGMENTS; s++) {
    const i0 = s * step
    const i1 = Math.min(i0 + step, total)
    const prog = (s + 0.5) / SEGMENTS
    const env = Math.sin(prog * Math.PI)
    const sw = lerp(minW, maxW, env)

    let d = `M ${pts[i0].x.toFixed(1)} ${pts[i0].y.toFixed(1)}`
    for (let k = i0 + 1; k <= i1; k++) {
      const mx = (pts[k - 1].x + pts[k].x) / 2
      const my = (pts[k - 1].y + pts[k].y) / 2
      d += ` Q ${pts[k - 1].x.toFixed(1)} ${pts[k - 1].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
    }
    paths.push({ d, sw, prog })
  }
  return paths
}

interface MatWaveformProps {
  state: WaveformState
  compact?: boolean
}

export default function MatWaveform({ state, compact = false }: MatWaveformProps) {
  const stateIdx = STATES.indexOf(state)
  const prevIdxRef = useRef(0)
  const morphRef = useRef(1)
  const timeRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  const { width: screenWidth } = Dimensions.get('window')
  const W = screenWidth - 32 // Full width minus padding
  const H = 120
  const COUNT = 200

  const [segments, setSegments] = useState<Segment[]>([])
  const [gradientColors, setGradientColors] = useState<[string, string, string]>(GRADIENT_STOPS.idle)
  const [currentColor, setCurrentColor] = useState(DOT_COLORS.idle)

  const animate = useCallback(() => {
    timeRef.current += 0.016
    if (morphRef.current < 1) morphRef.current = Math.min(1, morphRef.current + 0.014)

    const ease = easeInOut(morphRef.current)
    const cur = STATES[stateIdx]
    const prev = STATES[prevIdxRef.current]
    const t = timeRef.current
    const morphDone = morphRef.current >= 0.98

    // Update gradient colors
    const stopsA = GRADIENT_STOPS[prev]
    const stopsB = GRADIENT_STOPS[cur]
    const stops = stopsA.map((c, i) => lerpColor(c, stopsB[i], ease)) as [string, string, string]
    setGradientColors(stops)
    setCurrentColor(lerpColor(DOT_COLORS[prev], DOT_COLORS[cur], ease))

    if (cur === 'thinking' && morphDone) {
      const circlePts = getCirclePoints(t, W, H, COUNT)
      const segs = buildSegmentPaths(circlePts, 0.4, 5.5)
      setSegments(segs)
      frameRef.current = requestAnimationFrame(animate)
      return
    }

    const curPts = cur === 'thinking' ? getCirclePoints(t, W, H, COUNT) : getLinePoints(t, W, H, COUNT, cur === 'listening')
    const prevPts = prev === 'thinking' ? getCirclePoints(t, W, H, COUNT) : getLinePoints(t, W, H, COUNT, prev === 'listening')
    const pts = morphRef.current >= 1 ? curPts : lerpPoints(prevPts, curPts, ease)

    const segs = buildSegmentPaths(pts, 0.4, 5.5)
    setSegments(segs)

    frameRef.current = requestAnimationFrame(animate)
  }, [stateIdx, W, H])

  useEffect(() => {
    morphRef.current = 0
    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      prevIdxRef.current = stateIdx
    }
  }, [stateIdx, animate])

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.svgContainer}>
        {!compact && <View style={[styles.glow, { backgroundColor: currentColor + '1a' }]} />}
        <Svg width={W} height={H} style={styles.svg}>
          <Defs>
            <LinearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="50%" stopColor={gradientColors[1]} />
              <Stop offset="100%" stopColor={gradientColors[2]} />
            </LinearGradient>
            <LinearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="50%" stopColor={gradientColors[1]} />
              <Stop offset="100%" stopColor={gradientColors[2]} />
            </LinearGradient>
            <LinearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="50%" stopColor={gradientColors[1]} />
              <Stop offset="100%" stopColor={gradientColors[2]} />
            </LinearGradient>
          </Defs>
          {segments.map((seg, i) => (
            <Path
              key={`g${i}`}
              d={seg.d}
              fill="none"
              stroke="url(#wg1)"
              strokeWidth={seg.sw * 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.15}
            />
          ))}
          {segments.map((seg, i) => (
            <Path
              key={`m${i}`}
              d={seg.d}
              fill="none"
              stroke="url(#wg2)"
              strokeWidth={seg.sw}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {segments.map((seg, i) => (
            <Path
              key={`s${i}`}
              d={seg.d}
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={seg.sw * 0.28}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.5}
            />
          ))}
        </Svg>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  containerCompact: {
    paddingVertical: 0,
  },
  svgContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    top: -24,
    left: -24,
    right: -24,
    bottom: -24,
    borderRadius: 999,
    opacity: 0.3,
  },
  svg: {
    overflow: 'visible',
  },
})
