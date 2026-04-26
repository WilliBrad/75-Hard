import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
        } else {
          setMessage('Account created. Check your email to confirm your account if prompted.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setMessage(error.message)
        } else {
          navigate('/dashboard')
        }
      }
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="card auth-card">
      <h2>{mode === 'login' ? 'Login' : 'Create Account'}</h2>
      <p>
        Use your own login here. Later, we will connect both accounts into one shared
        75 Hard journey.
      </p>

      <form onSubmit={handleSubmit} className="form-stack">
        <label>
          <span>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>

      <div className="auth-switch-row">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage('')
          }}
        >
          {mode === 'login'
            ? 'Need an account? Switch to Sign Up'
            : 'Already have an account? Switch to Login'}
        </button>
      </div>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}