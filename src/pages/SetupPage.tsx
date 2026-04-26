import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  email: string | null
  display_name: string | null
}

export default function SetupPage() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [journeyName, setJourneyName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true)
      setMessage('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage('Could not load your user information.')
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        setMessage(error.message)
      } else if (data) {
        setProfile(data)
        setDisplayName(data.display_name ?? '')
        setJourneyName('Our 75 Hard Journey')
      }

      setIsLoading(false)
    }

    loadProfile()
  }, [])

  async function handleCreateJourney(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSaving(true)
    setMessage('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage('You must be logged in to create a journey.')
        setIsSaving(false)
        return
      }

      if (!journeyName.trim()) {
        setMessage('Please enter a journey name.')
        setIsSaving(false)
        return
      }

      const finalDisplayName = displayName.trim()

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: finalDisplayName || null,
        })
        .eq('id', user.id)

      if (profileError) {
        setMessage(profileError.message)
        setIsSaving(false)
        return
      }

      const { data: journey, error: journeyError } = await supabase
        .from('journeys')
        .insert({
          name: journeyName.trim(),
          start_date: startDate || null,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (journeyError || !journey) {
        setMessage(journeyError?.message || 'Could not create journey.')
        setIsSaving(false)
        return
      }

      const { error: memberError } = await supabase
        .from('journey_members')
        .insert({
          journey_id: journey.id,
          user_id: user.id,
          role: 'owner',
        })

      if (memberError) {
        setMessage(memberError.message)
        setIsSaving(false)
        return
      }

      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong while creating your journey.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="card auth-card">
        <h2>Loading setup...</h2>
        <p>Getting your account ready.</p>
      </section>
    )
  }

  return (
    <section className="card auth-card">
      <h2>Set Up Your Journey</h2>
      <p>
        This creates your shared 75 Hard journey. Your wife will join it later with her own
        login.
      </p>

      <div className="setup-user-box">
        <p><strong>Email:</strong> {profile?.email ?? 'No email found'}</p>
      </div>

      <form onSubmit={handleCreateJourney} className="form-stack">
        <label>
          <span>Your display name</span>
          <input
            type="text"
            placeholder="William"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>

        <label>
          <span>Journey name</span>
          <input
            type="text"
            placeholder="Our 75 Hard Journey"
            value={journeyName}
            onChange={(e) => setJourneyName(e.target.value)}
            required
          />
        </label>

        <label>
          <span>Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Creating journey...' : 'Create Journey'}
        </button>
      </form>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}