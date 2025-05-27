'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ActivityTracker() {
  const pathname = usePathname()
  let startTime = Date.now()

  useEffect(() => {
    const trackActivity = async () => {
      const duration = Date.now() - startTime
      
      try {
        await fetch('/api/track-activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: pathname,
            duration
          }),
        })
      } catch (error) {
        console.error('Error tracking activity:', error)
      }
    }


    return () => {
      trackActivity()
    }
  }, [pathname])


  useEffect(() => {
    const handleBeforeUnload = () => {
      const duration = Date.now() - startTime
      

      navigator.sendBeacon('/api/track-activity', JSON.stringify({
        path: pathname,
        duration
      }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname])

  return null
} 