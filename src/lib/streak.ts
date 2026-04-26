export type StreakEntry = {
  entry_date: string
  workout_one_done: boolean
  workout_two_done: boolean
  outdoor_workout_done: boolean
  reading_done: boolean
  water_oz: number
  diet_followed: boolean
  progress_photo_done: boolean
}

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(dateString: string, amount: number) {
  const date = parseLocalDate(dateString)
  date.setDate(date.getDate() + amount)
  return toDateString(date)
}

export function isEntryComplete(entry?: StreakEntry | null) {
  if (!entry) return false

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

export function getCompletedStreakEndingYesterday(
  entries: StreakEntry[],
  today: string,
) {
  const completeDates = new Set(
    entries.filter((entry) => isEntryComplete(entry)).map((entry) => entry.entry_date),
  )

  let streak = 0
  let cursor = addDays(today, -1)

  while (completeDates.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

export function getCurrentDayNumber(entries: StreakEntry[], today: string) {
  const streakEndingYesterday = getCompletedStreakEndingYesterday(entries, today)
  return streakEndingYesterday + 1
}

export function didResetToday(entries: StreakEntry[], today: string) {
  const yesterday = addDays(today, -1)
  const hasOlderEntries = entries.some((entry) => entry.entry_date < today)
  const yesterdayEntry = entries.find((entry) => entry.entry_date === yesterday)

  if (!hasOlderEntries) return false
  return !isEntryComplete(yesterdayEntry)
}