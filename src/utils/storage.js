export const HISTORY_KEY = 'philippine-currency-scanner-history'

export function getStoredHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function saveStoredHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch (error) {
    console.warn('Unable to save scan history.', error)
  }
}

export function appendHistoryEntry(entry) {
  const current = getStoredHistory()
  const next = [entry, ...current].slice(0, 8)
  saveStoredHistory(next)
  return next
}
