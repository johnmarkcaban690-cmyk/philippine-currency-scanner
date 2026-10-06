export const HISTORY_KEY = 'philippine-currency-scanner-history'

export function getStoredHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    if (!Array.isArray(parsed)) throw new TypeError('Scan history must be a list.')
    return parsed
  } catch (error) {
    console.error('Unable to read scan history.', error)
    return []
  }
}

export function saveStoredHistory(entries) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch (error) {
    console.error('Unable to save scan history.', error)
    throw error
  }
}

export function saveScanToHistory(scanResult) {
  if (
    !scanResult?.detected ||
    !Array.isArray(scanResult.results) ||
    scanResult.results.length === 0 ||
    !Number.isFinite(scanResult.totalValue) ||
    scanResult.totalValue <= 0
  ) {
    throw new Error('Only completed scans with detected currency can be saved.')
  }

  const items = scanResult.results.map((result) => {
    if (
      !Number.isFinite(result.value) ||
      result.value <= 0 ||
      !Number.isInteger(result.count) ||
      result.count <= 0 ||
      !Number.isFinite(result.subtotal) ||
      result.subtotal !== result.value * result.count
    ) {
      throw new Error('The scan contains an invalid denomination summary.')
    }

    return {
      denomination: result.value,
      quantity: result.count,
      subtotal: result.subtotal,
    }
  })

  if (items.reduce((sum, item) => sum + item.subtotal, 0) !== scanResult.totalValue) {
    throw new Error('The scan total does not match its denomination subtotals.')
  }

  const now = new Date()
  const entry = {
    id: globalThis.crypto?.randomUUID?.() || `${now.getTime()}-${Math.random().toString(36).slice(2)}`,
    date: new Intl.DateTimeFormat('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now),
    time: new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(now),
    items,
    totalValue: scanResult.totalValue,
  }

  const next = [entry, ...getStoredHistory()]
  saveStoredHistory(next)
  return { entry, history: next }
}
