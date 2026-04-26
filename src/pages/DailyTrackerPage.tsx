import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateLabel } from '../lib/date'
import { getCurrentDayNumber, isEntryComplete, type StreakEntry } from '../lib/streak'
import { useLocalDateString } from '../hooks/useLocalDateString'

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

export default function DailyTrackerPage() {
  const today = useLocalDateString()

  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [dayNumber, setDayNumber] = useState(1)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadEntry() {
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

      const { data: userEntries, error: userEntriesError } = await supabase
        .from('daily_entries')
        .select(
          'entry_date, workout_one_done, workout_two_done, outdoor_workout_done, reading_done, water_oz, diet_followed, progress_photo_done',
        )
        .eq('user_id', user.id)
        .lte('entry_date', today)
        .order('entry_date', { ascending: false })

      if (userEntriesError) {
        setMessage(userEntriesError.message)
        setIsLoading(false)
        return
      }

      setDayNumber(getCurrentDayNumber((userEntries || []) as StreakEntry[], today))

      const { data: existingEntry, error: entryError } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle()

      if (entryError) {
        setMessage(entryError.message)
        setIsLoading(false)
        return
      }

      if (existingEntry) {
        setEntry(existingEntry)
      } else {
        setEntry({
          id: '',
          journey_id: membership.journey_id,
          user_id: user.id,
          entry_date: today,
          workout_one_done: false,
          workout_two_done: false,
          outdoor_workout_done: false,
          reading_done: false,
          water_oz: 0,
          diet_followed: false,
          progress_photo_done: false,
          progress_photo_url: null,
          weight_lb: null,
          notes: '',
        })
      }

      setPhotoFile(null)
      setIsLoading(false)
    }

    loadEntry()
  }, [today])

  function updateField<K extends keyof DailyEntry>(field: K, value: DailyEntry[K]) {
    setEntry((prev) => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
  }

  function getFileExtension(file: File) {
    const parts = file.name.split('.')
    return parts.length > 1 ? parts.pop()?.toLowerCase() || 'jpg' : 'jpg'
  }

  async function uploadPhoto(userId: string) {
    if (!photoFile) {
      return entry?.progress_photo_url || null
    }

    const extension = getFileExtension(photoFile)
    const safeDate = today.replaceAll('-', '')
    const filePath = `${userId}/${safeDate}-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(filePath, photoFile, {
        cacheControl: '3600',
        contentType: photoFile.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage.from('progress-photos').getPublicUrl(filePath)
    return data.publicUrl
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!entry || !journeyId) return

    setIsSaving(true)
    setMessage('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage('You must be logged in to save your progress.')
        setIsSaving(false)
        return
      }

      const uploadedPhotoUrl = await uploadPhoto(user.id)

      const payload = {
        journey_id: journeyId,
        user_id: user.id,
        entry_date: today,
        workout_one_done: entry.workout_one_done,
        workout_two_done: entry.workout_two_done,
        outdoor_workout_done: entry.outdoor_workout_done,
        reading_done: entry.reading_done,
        water_oz: Number(entry.water_oz) || 0,
        diet_followed: entry.diet_followed,
        progress_photo_done: entry.progress_photo_done || Boolean(uploadedPhotoUrl),
        progress_photo_url: uploadedPhotoUrl,
        weight_lb:
          entry.weight_lb === null || Number.isNaN(Number(entry.weight_lb))
            ? null
            : Number(entry.weight_lb),
        notes: entry.notes || '',
        updated_at: new Date().toISOString(),
      }

      const { data: existingEntry } = await supabase
        .from('daily_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle()

      if (existingEntry) {
        const { error } = await supabase
          .from('daily_entries')
          .update(payload)
          .eq('id', existingEntry.id)

        if (error) {
          setMessage(error.message)
          setIsSaving(false)
          return
        }
      } else {
        const { error } = await supabase.from('daily_entries').insert(payload)

        if (error) {
          setMessage(error.message)
          setIsSaving(false)
          return
        }
      }

      setEntry((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          progress_photo_done: Boolean(uploadedPhotoUrl) || prev.progress_photo_done,
          progress_photo_url: uploadedPhotoUrl,
        }
      })

      setPhotoFile(null)

      const completedNow = isEntryComplete({
        entry_date: today,
        workout_one_done: payload.workout_one_done,
        workout_two_done: payload.workout_two_done,
        outdoor_workout_done: payload.outdoor_workout_done,
        reading_done: payload.reading_done,
        water_oz: payload.water_oz,
        diet_followed: payload.diet_followed,
        progress_photo_done: payload.progress_photo_done,
      })

      setMessage(completedNow ? `Day ${dayNumber} complete.` : `Day ${dayNumber} saved.`)
    } catch (error) {
      console.error(error)
      setMessage(error instanceof Error ? error.message : 'Something went wrong while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !entry) {
    return (
      <section className="card auth-card">
        <h2>Loading tracker...</h2>
        <p>Getting today&apos;s checklist ready.</p>
      </section>
    )
  }

  const todayComplete = isEntryComplete(entry)

  return (
    <section className="card tracker-card polished-tracker-card">
      <div className="tracker-header-row">
        <div>
          <p className="eyebrow">Today&apos;s Checklist</p>
          <h2>{formatDateLabel(today)}</h2>
        </div>

        <div className="day-pill">Day {dayNumber}</div>
      </div>

      <div className="tracker-status-box">
        <div>
          <strong>{todayComplete ? `Day ${dayNumber} complete.` : `Working on Day ${dayNumber}`}</strong>
          <p className="muted-text">
            {todayComplete
              ? 'Everything is checked off for today.'
              : 'Finish every requirement before your local day ends to keep the streak going.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="form-stack">
        <div className="tracker-section">
          <h3>Body + Photo</h3>

          <label>
            <span>Weight (lb)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="258.0"
              value={entry.weight_lb ?? ''}
              onChange={(e) =>
                updateField('weight_lb', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={entry.progress_photo_done}
              onChange={(e) => updateField('progress_photo_done', e.target.checked)}
            />
            <span>Progress photo taken</span>
          </label>

          <label>
            <span>Upload progress photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </label>

          {entry.progress_photo_url ? (
            <div className="photo-preview-wrap">
              <img
                src={entry.progress_photo_url}
                alt="Today's progress"
                className="photo-preview"
              />
            </div>
          ) : (
            <div className="photo-empty-state">No photo uploaded yet.</div>
          )}
        </div>

        <div className="tracker-section">
          <h3>Checklist</h3>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={entry.workout_one_done}
              onChange={(e) => updateField('workout_one_done', e.target.checked)}
            />
            <span>Workout 1 complete</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={entry.workout_two_done}
              onChange={(e) => updateField('workout_two_done', e.target.checked)}
            />
            <span>Workout 2 complete</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={entry.outdoor_workout_done}
              onChange={(e) => updateField('outdoor_workout_done', e.target.checked)}
            />
            <span>Outdoor workout complete</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={entry.reading_done}
              onChange={(e) => updateField('reading_done', e.target.checked)}
            />
            <span>Read 10 pages</span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={entry.diet_followed}
              onChange={(e) => updateField('diet_followed', e.target.checked)}
            />
            <span>Diet followed</span>
          </label>

          <label>
            <span>Water (oz)</span>
            <input
              type="number"
              min="0"
              value={entry.water_oz}
              onChange={(e) => updateField('water_oz', Number(e.target.value))}
            />
          </label>
        </div>

        <div className="tracker-section">
          <h3>Notes</h3>

          <label>
            <span>Anything worth noting today?</span>
            <input
              type="text"
              placeholder="Energy, mood, meals, cardio, etc."
              value={entry.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </label>
        </div>

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Today'}
        </button>
      </form>

      {message ? <p className="auth-message">{message}</p> : null}
    </section>
  )
}