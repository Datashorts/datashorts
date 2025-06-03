"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type Particle = {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  alpha: number
}

export function HeroAnimation({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    let animationFrameId: number
    let width = 0
    let height = 0

    const colors = [
      "rgba(59, 130, 246, 0.8)",  // Blue
      "rgba(139, 92, 246, 0.8)",  // Purple
      "rgba(45, 212, 191, 0.8)",  // Teal
      "rgba(20, 184, 166, 0.8)",  // Cyan
    ]
    
    const handleResize = () => {
      width = window.innerWidth
      height = Math.min(window.innerHeight * 0.7, 800)
      
      canvas.width = width
      canvas.height = height
      
      // Reinitialize particles when resizing
      initParticles()
    }
    
    const initParticles = () => {
      particlesRef.current = []
      const particleCount = Math.floor((width * height) / 15000) // Adjust density
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 1,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.2
        })
      }
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height)
      
      // Update and draw particles ONLY - NO GRID BACKGROUND
      particlesRef.current.forEach((particle, i) => {
        particle.x += particle.speedX
        particle.y += particle.speedY
        
        // Boundary check with wrap-around
        if (particle.x < 0) particle.x = width
        if (particle.x > width) particle.x = 0
        if (particle.y < 0) particle.y = height
        if (particle.y > height) particle.y = 0
        
        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.alpha
        ctx.fill()
        
        // Draw connections between particles that are close
        connectParticles(particle, i)
      })
      
      animationFrameId = requestAnimationFrame(animate)
    }
    
    const connectParticles = (particle: Particle, index: number) => {
      for (let j = index + 1; j < particlesRef.current.length; j++) {
        const otherParticle = particlesRef.current[j]
        const dx = particle.x - otherParticle.x
        const dy = particle.y - otherParticle.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 100) {
          ctx.beginPath()
          ctx.strokeStyle = particle.color
          ctx.globalAlpha = 0.2 * (1 - distance / 100)
          ctx.lineWidth = 0.5
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(otherParticle.x, otherParticle.y)
          ctx.stroke()
        }
      }
    }
    
    window.addEventListener("resize", handleResize)
    handleResize()
    animate()
    
    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])
  
  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 z-0", className)}
      style={{ 
        background: 'transparent', // NO BACKGROUND PATTERN
        backgroundImage: 'none'     // REMOVE ANY BACKGROUND IMAGE
      }}
    />
  )
}