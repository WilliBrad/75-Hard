export function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatDateLabel(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getDayNumberFromStart(startDate: string | null, currentDate: string) {
  if (!startDate) return null

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
  const [currentYear, currentMonth, currentDay] = currentDate.split('-').map(Number)

  const start = new Date(startYear, startMonth - 1, startDay)
  const current = new Date(currentYear, currentMonth - 1, currentDay)

  const diffMs = current.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

  if (diffDays < 1) return 1
  return diffDays
}