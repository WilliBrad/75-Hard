import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateLabel, getDayNumberFromStart } from '../lib/date'
import {
  didResetToday,
  getCurrentDayNumber,
  isEntryComplete,
  type StreakEntry,
} from '../lib/streak'
import { useLocalDateString } from '../hooks/useLocalDateString'

type Profile = {
  id: string
  email: string | null
  display_name: string | null
}

type Journey = {
  id: string
  name: string
  start_date: string | null
  created_by: string
  join_code: string | null
}

type DailyEntry = {
  id: string
  journey_id: string
  user_id: string
  entry_date: string
  workout_one_done: boolean
  workout_two_done: boolean
  outdoor_workout_done: boolean
  reading_done: boolean
  water_oz: number
  diet_followed: boolean
  progress_photo_done: boolean
  progress_photo_url: string | null
  weight_lb: number | null
  notes: string | null
}

type MemberProfile = {
  id: string
  display_name: string | null
  email: string | null
}

export default function DashboardPage() {
  const today = useLocalDateString()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadDashboard() {
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        setMessage(profileError.message)
      } else {
        setProfile(profileData)
      }

      const { data: membership, error: membershipError } = await supabase
        .from('journey_members')
        .select('journey_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (membershipError) {
        setMessage(membershipError.message)
        setIsLoading(false)
        return
      }

      if (!membership) {
        setJourney(null)
        setIsLoading(false)
        return
      }

      const journeyId = membership.journey_id

      const { data: journeyData, error: journeyError } = await supabase
        .from('journeys')
        .select('id, name, start_date, created_by, join_code')
        .eq('id', journeyId)
        .maybeSingle()

      if (journeyError) {
        setMessage(journeyError.message)
      } else {
        setJourney(journeyData)
      }

      const { data: memberRows, error: memberError } = await supabase
        .from('journey_members')
        .select('user_id')
        .eq('journey_id', journeyId)

      if (memberError) {
        setMessage(memberError.message)
        setIsLoading(false)
        return
      }

      const memberIds = memberRows.map((row) => row.user_id)

      const { data: profileRows, error: profileRowsError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', memberIds)

      if (profileRowsError) {
        setMessage(profileRowsError.message)
      } else {
        setMembers(profileRows || [])
      }

      const { data: entryRows, error: entryError } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('journey_id', journeyId)
        .lte('entry_date', today)

      if (entryError) {
        setMessage(entryError.message)
      } else {
        setEntries(entryRows || [])
      }

      setIsLoading(false)
    }

    loadDashboard()
  }, [today])

  function getEntriesForUser(userId: string) {
    return entries.filter((entry) => entry.user_id === userId)
  }

  function getTodayEntryForUser(userId: string) {
    return entries.find((entry) => entry.user_id === userId && entry.entry_date === today)
  }

  function getProgressCount(entry?: DailyEntry) {
    if (!entry) return 0

    let completed = 0
    if (entry.workout_one_done) completed += 1
    if (entry.workout_two_done) completed += 1
    if (entry.outdoor_workout_done) completed += 1
    if (entry.reading_done) completed += 1
    if (entry.water_oz >= 128) completed += 1
    if (entry.diet_followed) completed += 1
    if (entry.progress_photo_done) completed += 1

    return completed
  }

  function getCompletionPercent(entry?: DailyEntry) {
    return Math.round((getProgressCount(entry) / 7) * 100)
  }

  function getMissingItems(entry?: DailyEntry) {
    if (!entry) {
      return [
        'Workout 1',
        'Workout 2',
        'Outdoor workout',
        'Read 10 pages',
        'Drink 128 oz water',
        'Follow diet',
        'Take progress photo',
      ]
    }

    const missing: string[] = []
    if (!entry.workout_one_done) missing.push('Workout 1')
    if (!entry.workout_two_done) missing.push('Workout 2')
    if (!entry.outdoor_workout_done) missing.push('Outdoor workout')
    if (!entry.reading_done) missing.push('Read 10 pages')
    if (entry.water_oz < 128) missing.push(`Water (${entry.water_oz}/128 oz)`)
    if (!entry.diet_followed) missing.push('Follow diet')
    if (!entry.progress_photo_done) missing.push('Progress photo')
    return missing
  }

  if (isLoading) {
    return (
      <section className="card auth-card">
        <h2>Loading dashboard...</h2>
        <p>Pulling your account and journey info.</p>
      </section>
    )
  }

  if (!journey) {
    return (
      <section className="card auth-card">
        <h2>No Journey Yet</h2>
        <p>You are logged in, but you have not created or joined a journey yet.</p>

        <div className="dashboard-actions">
          <Link to="/setup" className="setup-link-button">
            Create Journey
          </Link>

          <Link to="/join" className="secondary-link-button">
            Join Journey
          </Link>
        </div>

        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    )
  }

  const journeyDayNumber = getDayNumberFromStart(journey.start_date, today)
  const challengeComplete = journeyDayNumber !== null && journeyDayNumber > 75

  return (
    <section className="dashboard-stack">
      <section className="dashboard-hero-grid single-hero">
        <div className="card dashboard-hero-card compact-hero-card">
          <div className="compact-hero-top">
            <div>
              <p className="eyebrow">Today</p>
              <h2 className="compact-hero-title">{formatDateLabel(today)}</h2>
            </div>

            <div className="hero-day-pill">
              {journeyDayNumber
                ? `Day ${journeyDayNumber}${challengeComplete ? '+' : ''}`
                : 'No start date'}
            </div>
          </div>

          <div className="compact-meta-row">
            <span className="compact-meta-pill">{journey.name}</span>
            <span className="compact-meta-pill">
              {profile?.display_name || profile?.email || 'Unknown user'}
            </span>
            <span className="compact-meta-pill">
              {journey.start_date ? `Started ${journey.start_date}` : 'No start date'}
            </span>
          </div>

          <div className="compact-action-row">
            <Link to="/tracker" className="setup-link-button compact-button primary">
              Open Tracker
            </Link>

            <Link to="/history" className="secondary-link-button compact-button">
              History
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-member-grid">
        {members.map((member) => {
          const userEntries = getEntriesForUser(member.id)
          const todayEntry = getTodayEntryForUser(member.id)
          const percent = getCompletionPercent(todayEntry)
          const complete = isEntryComplete(todayEntry)
          const missing = getMissingItems(todayEntry)
          const streakDay = getCurrentDayNumber(userEntries as StreakEntry[], today)
          const resetToday = didResetToday(userEntries as StreakEntry[], today)

          return (
            <article key={member.id} className="card member-progress-card">
              <div className="member-card-header">
                <div>
                  <p className="eyebrow">Daily Status</p>
                  <h2>{member.display_name || member.email || 'Journey Member'}</h2>
                </div>

                <div className="member-badge-stack">
                  <span className="day-pill">Day {streakDay}</span>
                  <span className={complete ? 'status-badge complete' : 'status-badge incomplete'}>
                    {complete ? 'Complete' : 'In Progress'}
                  </span>
                </div>
              </div>

              <div className="member-top-stats">
                <div className="mini-stat">
                  <span className="summary-label">Progress</span>
                  <strong>{percent}%</strong>
                </div>

                <div className="mini-stat">
                  <span className="summary-label">Weight</span>
                  <strong>{todayEntry?.weight_lb != null ? `${todayEntry.weight_lb} lb` : '—'}</strong>
                </div>

                <div className="mini-stat">
                  <span className="summary-label">Water</span>
                  <strong>{todayEntry ? `${todayEntry.water_oz} oz` : '0 oz'}</strong>
                </div>
              </div>

              {resetToday ? (
                <div className="reset-box">
                  Yesterday was incomplete, so today reset back to Day 1.
                </div>
              ) : null}

              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
              </div>

              {todayEntry?.progress_photo_url ? (
                <div className="photo-preview-wrap">
                  <img
                    src={todayEntry.progress_photo_url}
                    alt={`${member.display_name || member.email || 'Member'} progress`}
                    className="photo-preview"
                  />
                </div>
              ) : (
                <div className="photo-empty-state">No progress photo uploaded today.</div>
              )}

              <div className="check-grid">
                <div className="check-item">
                  <span>Workout 1</span>
                  <strong>{todayEntry?.workout_one_done ? '✅' : '❌'}</strong>
                </div>

                <div className="check-item">
                  <span>Workout 2</span>
                  <strong>{todayEntry?.workout_two_done ? '✅' : '❌'}</strong>
                </div>

                <div className="check-item">
                  <span>Outdoor</span>
                  <strong>{todayEntry?.outdoor_workout_done ? '✅' : '❌'}</strong>
                </div>

                <div className="check-item">
                  <span>Reading</span>
                  <strong>{todayEntry?.reading_done ? '✅' : '❌'}</strong>
                </div>

                <div className="check-item">
                  <span>Diet</span>
                  <strong>{todayEntry?.diet_followed ? '✅' : '❌'}</strong>
                </div>

                <div className="check-item">
                  <span>Photo</span>
                  <strong>{todayEntry?.progress_photo_done ? '✅' : '❌'}</strong>
                </div>
              </div>

              <div className="missing-box">
                <strong>Still left</strong>
                {missing.length === 0 ? (
                  <p className="complete-text">Everything done for today.</p>
                ) : (
                  <ul className="missing-list">
                    {missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="notes-box">
                <strong>Notes</strong>
                <p>{todayEntry?.notes || 'No notes yet.'}</p>
              </div>
            </article>
          )
        })}
      </section>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}