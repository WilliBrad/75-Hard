import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { formatDateLabel, getLocalDateString } from '../lib/date'

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

type EntryGroup = {
  date: string
  entries: DailyEntry[]
}

type ChartRow = {
  date: string
  label: string
  [key: string]: string | number | null
}

export default function HistoryPage() {
  const today = useMemo(() => getLocalDateString(), [])
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [groups, setGroups] = useState<EntryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadHistory() {
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

      setJourneyId(membership.journey_id)

      const { data: memberRows, error: memberError } = await supabase
        .from('journey_members')
        .select('user_id')
        .eq('journey_id', membership.journey_id)

      if (memberError) {
        setMessage(memberError.message)
        setIsLoading(false)
        return
      }

      const memberIds = memberRows.map((row) => row.user_id)

      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', memberIds)

      if (profileError) {
        setMessage(profileError.message)
      } else {
        setMembers(profileRows || [])
      }

      const startDate = new Date(`${today}T00:00:00`)
      startDate.setDate(startDate.getDate() - 13)

      const startYear = startDate.getFullYear()
      const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
      const startDay = String(startDate.getDate()).padStart(2, '0')
      const startDateString = `${startYear}-${startMonth}-${startDay}`

      const { data: entryRows, error: entryError } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('journey_id', membership.journey_id)
        .gte('entry_date', startDateString)
        .order('entry_date', { ascending: false })

      if (entryError) {
        setMessage(entryError.message)
        setIsLoading(false)
        return
      }

      const map = new Map<string, DailyEntry[]>()

      for (const entry of entryRows || []) {
        const existing = map.get(entry.entry_date) || []
        existing.push(entry)
        map.set(entry.entry_date, existing)
      }

      const grouped: EntryGroup[] = Array.from(map.entries()).map(([date, entries]) => ({
        date,
        entries,
      }))

      grouped.sort((a, b) => (a.date < b.date ? 1 : -1))

      setGroups(grouped)
      setIsLoading(false)
    }

    loadHistory()
  }, [today])

  function getMemberLabel(userId: string) {
    const member = members.find((m) => m.id === userId)
    return member?.display_name || member?.email || 'Journey Member'
  }

  function getProgressCount(entry: DailyEntry) {
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

  function getCompletionPercent(entry: DailyEntry) {
    return Math.round((getProgressCount(entry) / 7) * 100)
  }

  function isFullyComplete(entry: DailyEntry) {
    return (
      entry.workout_one_done &&
      entry.workout_two_done &&
      entry.outdoor_workout_done &&
      entry.reading_done &&
      entry.water_oz >= 128 &&
      entry.diet_followed &&
      entry.progress_photo_done
    )
  }

  const chartData: ChartRow[] = useMemo(() => {
    const rows = [...groups].sort((a, b) => (a.date > b.date ? 1 : -1))

    return rows.map((group) => {
      const row: ChartRow = {
        date: group.date,
        label: group.date.slice(5),
      }

      for (const member of members) {
        const entry = group.entries.find((e) => e.user_id === member.id)
        const key = member.display_name || member.email || member.id
        row[key] = entry?.weight_lb ?? null
      }

      return row
    })
  }, [groups, members])

  if (isLoading) {
    return (
      <section className="card auth-card">
        <h2>Loading history...</h2>
        <p>Pulling recent entries.</p>
      </section>
    )
  }

  if (!journeyId) {
    return (
      <section className="card auth-card">
        <h2>No Journey Found</h2>
        <p>You need to create or join a journey first.</p>
        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    )
  }

  return (
    <section className="history-stack">
      <div className="card">
        <h2>Recent History</h2>
        <p>Showing the last 14 days of entries for your shared journey.</p>
      </div>

      <section className="card">
        <h2>Weight Trend</h2>
        {chartData.length === 0 ? (
          <p>No weight data yet.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip />
                {members.map((member) => {
                  const key = member.display_name || member.email || member.id
                  return <Line key={member.id} type="monotone" dataKey={key} connectNulls />
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {groups.length === 0 ? (
        <section className="card">
          <h2>No Entries Yet</h2>
          <p>Once you start saving daily trackers, your recent history will show here.</p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="card">
            <h2>{formatDateLabel(group.date)}</h2>

            <div className="dashboard-grid">
              {group.entries.map((entry) => {
                const percent = getCompletionPercent(entry)
                const complete = isFullyComplete(entry)

                return (
                  <div key={entry.id} className="history-entry-card">
                    <div className="member-card-header">
                      <h3>{getMemberLabel(entry.user_id)}</h3>
                      <span className={complete ? 'status-badge complete' : 'status-badge incomplete'}>
                        {complete ? 'Complete' : 'In Progress'}
                      </span>
                    </div>

                    <p><strong>Progress:</strong> {percent}%</p>
                    <p><strong>Weight:</strong> {entry.weight_lb != null ? `${entry.weight_lb} lb` : 'No weigh-in'}</p>

                    {entry.progress_photo_url ? (
                      <div className="photo-preview-wrap">
                        <img
                          src={entry.progress_photo_url}
                          alt={`${getMemberLabel(entry.user_id)} progress`}
                          className="photo-preview"
                        />
                      </div>
                    ) : null}

                    <ul className="task-list">
                      <li>Workout 1: {entry.workout_one_done ? '✅' : '❌'}</li>
                      <li>Workout 2: {entry.workout_two_done ? '✅' : '❌'}</li>
                      <li>Outdoor workout: {entry.outdoor_workout_done ? '✅' : '❌'}</li>
                      <li>Read 10 pages: {entry.reading_done ? '✅' : '❌'}</li>
                      <li>Water: {entry.water_oz} oz</li>
                      <li>Diet followed: {entry.diet_followed ? '✅' : '❌'}</li>
                      <li>Progress photo: {entry.progress_photo_done ? '✅' : '❌'}</li>
                    </ul>

                    <p><strong>Notes:</strong> {entry.notes || 'No notes'}</p>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}