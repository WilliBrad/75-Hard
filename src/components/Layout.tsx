import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const navigate = useNavigate()
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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>75 Hard Tracker</h1>
          <p>Shared accountability for your journey</p>
        </div>

        <nav className="nav-links">
          {!isLoading && !session ? (
            <NavLink
              to="/login"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Login
            </NavLink>
          ) : null}

          {!isLoading && session ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/tracker"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Tracker
              </NavLink>

              <NavLink
                to="/history"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                History
              </NavLink>

              <NavLink
                to="/join"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Join
              </NavLink>

              <NavLink
                to="/invite"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Invite
              </NavLink>

              <button type="button" className="secondary-button nav-button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : null}
        </nav>
      </header>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}