import { useRef, useState, useEffect, useCallback } from 'react'

const TOTAL_FRAMES = 97
const FPS = 24
const FRAME_DURATION = 1000 / FPS
const FRAME_SIZE = 720

type Phase = 'loading' | 'spinning' | 'finishing-spin' | 'opening' | 'revealed'

function getSpinFrameUrl(index: number): string {
  const num = String(index).padStart(4, '0')
  return `/frames-spin/frame_${num}.webp`
}

function getOpenFrameUrl(index: number): string {
  const num = String(index).padStart(4, '0')
  return `/frames-open/frame_${num}.webp`
}

export default function CaseOpening() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [spinImages, setSpinImages] = useState<HTMLImageElement[]>([])
  const [openImages, setOpenImages] = useState<HTMLImageElement[]>([])
  const [loadProgress, setLoadProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const frameRef = useRef(0)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef(0)
  const phaseRef = useRef<Phase>('loading')

  useEffect(() => { phaseRef.current = phase }, [phase])

  // Preload both frame sets
  useEffect(() => {
    const totalToLoad = TOTAL_FRAMES * 2
    let loaded = 0
    const spins: HTMLImageElement[] = new Array(TOTAL_FRAMES)
    const opens: HTMLImageElement[] = new Array(TOTAL_FRAMES)
    let cancelled = false

    const onLoad = () => {
      if (cancelled) return
      loaded++
      setLoadProgress(Math.round((loaded / totalToLoad) * 100))
      if (loaded === totalToLoad) {
        setSpinImages(spins)
        setOpenImages(opens)
      }
    }

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const spinImg = new Image()
      spinImg.src = getSpinFrameUrl(i)
      spinImg.onload = () => { spins[i - 1] = spinImg; onLoad() }
      spinImg.onerror = onLoad

      const openImg = new Image()
      openImg.src = getOpenFrameUrl(i)
      openImg.onload = () => { opens[i - 1] = openImg; onLoad() }
      openImg.onerror = onLoad
    }

    return () => { cancelled = true }
  }, [])

  const drawFrame = useCallback((imgs: HTMLImageElement[], index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !imgs[index]) return
    ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE)
    ctx.drawImage(imgs[index], 0, 0, FRAME_SIZE, FRAME_SIZE)
  }, [])

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp
    const elapsed = timestamp - lastTimeRef.current

    if (elapsed >= FRAME_DURATION) {
      lastTimeRef.current = timestamp - (elapsed % FRAME_DURATION)
      frameRef.current++

      if (phaseRef.current === 'spinning') {
        if (frameRef.current >= TOTAL_FRAMES) {
          frameRef.current = 0
        }
        drawFrame(spinImages, frameRef.current)
      } else if (phaseRef.current === 'finishing-spin') {
        // Finish current spin cycle, then switch to open
        if (frameRef.current >= TOTAL_FRAMES) {
          // Spin cycle done — start opening from frame 0
          setPhase('opening')
          frameRef.current = 0
          drawFrame(openImages, 0)
        } else {
          drawFrame(spinImages, frameRef.current)
        }
      } else if (phaseRef.current === 'opening') {
        if (frameRef.current >= TOTAL_FRAMES) {
          drawFrame(openImages, TOTAL_FRAMES - 1)
          setPhase('revealed')
          return
        }
        drawFrame(openImages, frameRef.current)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [drawFrame, spinImages, openImages])

  // Start spinning when loaded
  useEffect(() => {
    if (spinImages.length === TOTAL_FRAMES && openImages.length === TOTAL_FRAMES && phase === 'loading') {
      setPhase('spinning')
      frameRef.current = 0
      lastTimeRef.current = 0
      drawFrame(spinImages, 0)
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [spinImages, openImages, phase, animate, drawFrame])

  const handleClick = useCallback(() => {
    if (phase === 'spinning') {
      // Finish current spin cycle, then seamlessly transition to open
      setPhase('finishing-spin')
    } else if (phase === 'revealed') {
      // Replay — spin again
      setPhase('spinning')
      frameRef.current = 0
      lastTimeRef.current = 0
      drawFrame(spinImages, 0)
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [phase, animate, drawFrame, spinImages, openImages])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff',
    }}>
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '0.05em',
      }}>
        Apple Pack Opening
      </h1>

      <div style={{
        position: 'relative',
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        maxWidth: '90vw',
        maxHeight: '90vw',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(120, 100, 255, 0.15)',
      }}>
        <canvas
          ref={canvasRef}
          width={FRAME_SIZE}
          height={FRAME_SIZE}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: phase === 'spinning' || phase === 'revealed' ? 'pointer' : phase === 'finishing-spin' ? 'wait' : 'default',
          }}
          onClick={handleClick}
        />

        {/* Loading overlay */}
        {phase === 'loading' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 10, 15, 0.95)',
          }}>
            <div style={{
              width: '60%',
              height: 4,
              background: '#1a1a2e',
              borderRadius: 2,
              overflow: 'hidden',
              marginBottom: 12,
            }}>
              <div style={{
                width: `${loadProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
                borderRadius: 2,
                transition: 'width 0.15s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.875rem', color: '#888' }}>
              Loading frames... {loadProgress}%
            </span>
          </div>
        )}

        {/* Click hint while spinning */}
        {phase === 'spinning' && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 20px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              borderRadius: 20,
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.8)',
              pointerEvents: 'none',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            Click to open!
          </div>
        )}
      </div>

      {/* Replay button */}
      {phase === 'revealed' && (
        <button
          onClick={handleClick}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 2rem',
            fontSize: '1rem',
            fontWeight: 500,
            color: '#fff',
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Replay
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
