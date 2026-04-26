import { useEffect, useState } from 'react'
import { getLocalDateString } from '../lib/date'

export function useLocalDateString() {
  const [today, setToday] = useState(getLocalDateString())

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = getLocalDateString()
      setToday((current) => (current === next ? current : next))
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return today
}