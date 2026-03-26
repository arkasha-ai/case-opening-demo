import { useRef, useState, useEffect, useCallback } from 'react'

const TOTAL_FRAMES = 97
const FPS = 24
const FRAME_DURATION = 1000 / FPS
const FRAME_SIZE = 720

type Phase = 'loading' | 'spinning' | 'opening' | 'revealed'

function getFrameUrl(index: number): string {
  const num = String(index).padStart(4, '0')
  return `/frames/frame_${num}.webp`
}

export default function CaseOpening() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [images, setImages] = useState<HTMLImageElement[]>([])
  const [loadProgress, setLoadProgress] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const frameRef = useRef(0)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef(0)
  const phaseRef = useRef<Phase>('loading')

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase }, [phase])

  // Preload all frames
  useEffect(() => {
    let loaded = 0
    const imgs: HTMLImageElement[] = new Array(TOTAL_FRAMES)
    let cancelled = false

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      img.src = getFrameUrl(i)
      img.onload = () => {
        if (cancelled) return
        loaded++
        imgs[i - 1] = img
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100))
        if (loaded === TOTAL_FRAMES) {
          setImages(imgs)
        }
      }
      img.onerror = () => {
        if (cancelled) return
        loaded++
        setLoadProgress(Math.round((loaded / TOTAL_FRAMES) * 100))
      }
    }

    return () => { cancelled = true }
  }, [])

  // Draw a specific frame on canvas
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !images[index]) return
    ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE)
    ctx.drawImage(images[index], 0, 0, FRAME_SIZE, FRAME_SIZE)
  }, [images])

  // Animation loop — spins in a loop, or plays to end on "opening"
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp

    const elapsed = timestamp - lastTimeRef.current

    if (elapsed >= FRAME_DURATION) {
      lastTimeRef.current = timestamp - (elapsed % FRAME_DURATION)
      frameRef.current++

      if (phaseRef.current === 'spinning') {
        // Loop back to frame 0
        if (frameRef.current >= TOTAL_FRAMES) {
          frameRef.current = 0
        }
        drawFrame(frameRef.current)
      } else if (phaseRef.current === 'opening') {
        if (frameRef.current >= TOTAL_FRAMES) {
          // Done — show last frame
          drawFrame(TOTAL_FRAMES - 1)
          setPhase('revealed')
          return
        }
        drawFrame(frameRef.current)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [drawFrame])

  // Start spinning as soon as images are loaded
  useEffect(() => {
    if (images.length === TOTAL_FRAMES && phase === 'loading') {
      setPhase('spinning')
      frameRef.current = 0
      lastTimeRef.current = 0
      drawFrame(0)
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [images, phase, animate, drawFrame])

  // Handle click — switch from spinning to opening (play through to end)
  const handleClick = useCallback(() => {
    if (phase === 'spinning') {
      setPhase('opening')
      // Continue from current frame, animation loop handles the rest
    } else if (phase === 'revealed') {
      // Replay — start spinning again
      setPhase('spinning')
      frameRef.current = 0
      lastTimeRef.current = 0
      drawFrame(0)
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [phase, animate, drawFrame])

  // Cleanup RAF on unmount
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
            cursor: phase === 'spinning' || phase === 'revealed' ? 'pointer' : 'default',
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
