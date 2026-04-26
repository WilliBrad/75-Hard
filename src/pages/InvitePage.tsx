import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Journey = {
  id: string
  name: string
  join_code: string | null
  created_by: string
}

export default function InvitePage() {
  const [journey, setJourney] = useState<Journey | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadInvite() {
      setIsLoading(true)
      setMessage('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage('Could not load your account.')
        setIsLoading(false)
        return
      }

      setCurrentUserId(user.id)

      const { data: membership, error: membershipError } = await supabase
        .from('journey_members')
        .select('journey_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (membershipError || !membership) {
        setMessage('Could not find your journey.')
        setIsLoading(false)
        return
      }

      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select('id, name, join_code, created_by')
        .eq('id', membership.journey_id)
        .maybeSingle()

      if (journeyError) {
        setMessage(journeyError.message)
      } else {
        setJourney(journeyData)
      }

      setIsLoading(false)
    }

    loadInvite()
  }, [])

  async function copyCode() {
    if (!journey?.join_code) return

    try {
      await navigator.clipboard.writeText(journey.join_code)
      setMessage('Invite code copied.')
    } catch {
      setMessage('Could not copy invite code.')
    }
  }

  if (isLoading) {
    return (
      <section className="card auth-card">
        <h2>Loading invite...</h2>
        <p>Getting your journey code.</p>
      </section>
    )
  }

  if (!journey) {
    return (
      <section className="card auth-card">
        <h2>No Journey Found</h2>
        <p>You need to create or join a journey first.</p>
        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    )
  }

  const isOwner = currentUserId === journey.created_by

  return (
    <section className="card auth-card">
      <p className="eyebrow">Invite</p>
      <h2>{isOwner ? 'Invite Your Wife' : 'Journey Invite Code'}</h2>
      <p>
        Share this code so another account can join <strong>{journey.name}</strong>.
      </p>

      <div className="join-code-box compact-code-box">{journey.join_code || 'No code available yet'}</div>

      <div className="dashboard-actions">
        <button type="button" onClick={copyCode}>
          Copy Code
        </button>
      </div>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}