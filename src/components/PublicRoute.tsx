import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type PublicRouteProps = {
  children: React.ReactNode
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function getSession() {
      const { data } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(data.session)
      setIsLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <section className="card auth-card">
        <h2>Loading...</h2>
        <p>Checking your session.</p>
      </section>
    )
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}