import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function JoinJourneyPage() {
  const navigate = useNavigate()

  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [message, setMessage] = useState('')

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsJoining(true)
    setMessage('')

    try {
      const { error } = await supabase.rpc('join_journey_by_code', {
        p_code: joinCode.trim(),
      })

      if (error) {
        setMessage(error.message)
        setIsJoining(false)
        return
      }

      navigate('/dashboard')
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong while joining the journey.')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <section className="card auth-card">
      <h2>Join a Journey</h2>
      <p>
        Enter the join code from your partner&apos;s dashboard to connect your account to the
        shared 75 Hard journey.
      </p>

      <form onSubmit={handleJoin} className="form-stack">
        <label>
          <span>Join code</span>
          <input
            type="text"
            placeholder="Enter 8-digit code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            required
          />
        </label>

        <button type="submit" disabled={isJoining}>
          {isJoining ? 'Joining...' : 'Join Journey'}
        </button>
      </form>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}