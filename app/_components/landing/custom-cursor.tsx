"use client"

import { useEffect, useRef } from "react"

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorOuterRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const cursor = cursorRef.current
    const cursorOuter = cursorOuterRef.current
    
    if (!cursor || !cursorOuter) return
    
    // Add class to body to indicate custom cursor is active
    document.body.classList.add('custom-cursor-active')
    
    let mouseX = 0
    let mouseY = 0
    let cursorX = 0
    let cursorY = 0
    let cursorOuterX = 0
    let cursorOuterY = 0
    
    // Add event listener for mouse movement
    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    
    window.addEventListener("mousemove", onMouseMove)
    
    // Animation loop for smooth cursor movement
    const animate = () => {
      // Smooth movement for inner cursor
      cursorX += (mouseX - cursorX) * 0.2
      cursorY += (mouseY - cursorY) * 0.2
      
      // Smoother movement for outer cursor
      cursorOuterX += (mouseX - cursorOuterX) * 0.1
      cursorOuterY += (mouseY - cursorOuterY) * 0.1
      
      // Apply transformations
      cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`
      cursorOuter.style.transform = `translate(${cursorOuterX}px, ${cursorOuterY}px)`
      
      requestAnimationFrame(animate)
    }
    
    animate()
    
    // Detect interactive elements for cursor size change
    const handleMouseEnter = () => {
      cursor.classList.add("scale-[2.5]")
      cursorOuter.classList.add("scale-50", "opacity-30")
    }
    
    const handleMouseLeave = () => {
      cursor.classList.remove("scale-[2.5]")
      cursorOuter.classList.remove("scale-50", "opacity-30")
    }
    
    // Add event listeners to all interactive elements
    const addHoverListeners = () => {
      document.querySelectorAll("a, button, [role='button'], input, textarea, select").forEach(el => {
        el.addEventListener("mouseenter", handleMouseEnter)
        el.addEventListener("mouseleave", handleMouseLeave)
      })
    }
    
    // Initial setup
    addHoverListeners()
    
    // Re-run when DOM changes (for dynamic content)
    const observer = new MutationObserver(addHoverListeners)
    observer.observe(document.body, { childList: true, subtree: true })
    
    return () => {
      // Remove class when component unmounts
      document.body.classList.remove('custom-cursor-active')
      
      window.removeEventListener("mousemove", onMouseMove)
      observer.disconnect()
      document.querySelectorAll("a, button, [role='button'], input, textarea, select").forEach(el => {
        el.removeEventListener("mouseenter", handleMouseEnter)
        el.removeEventListener("mouseleave", handleMouseLeave)
      })
    }
  }, [])
  
  // Only show custom cursor on desktop
  const isMobile = 
    typeof window !== 'undefined' && 
    window.matchMedia("(max-width: 768px)").matches
  
  if (isMobile) return null
  
  return (
    <>
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full pointer-events-none z-[9999] transform -translate-x-1/2 -translate-y-1/2 mix-blend-difference transition-transform duration-150"
      />
      <div 
        ref={cursorOuterRef}
        className="fixed top-0 left-0 w-9 h-9 border border-white/30 rounded-full pointer-events-none z-[9998] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
      />
    </>
  )
}