import { useMemo, useState } from 'react'

const denominations = [
  { value: 1, label: '₱1' },
  { value: 5, label: '₱5' },
  { value: 10, label: '₱10' },
  { value: 20, label: '₱20' },
  { value: 50, label: '₱50' },
  { value: 100, label: '₱100' },
  { value: 200, label: '₱200' },
  { value: 500, label: '₱500' },
  { value: 1000, label: '₱1000' },
]

function CalculatePage() {
  const [counts, setCounts] = useState(() =>
    denominations.reduce((acc, denom) => ({ ...acc, [denom.value]: 0 }), {}),
  )

  const updateCount = (value, diff) => {
    setCounts((current) => {
      const nextValue = Math.max(0, (current[value] || 0) + diff)
      return { ...current, [value]: nextValue }
    })
  }

  const resetCounts = () => {
    setCounts(denominations.reduce((acc, denom) => ({ ...acc, [denom.value]: 0 }), {}))
  }

  const totals = useMemo(
    () =>
      denominations.map((denom) => {
        const quantity = counts[denom.value] || 0
        return {
          ...denom,
          quantity,
          subtotal: denom.value * quantity,
        }
      }),
    [counts],
  )

  const grandTotal = totals.reduce((sum, item) => sum + item.subtotal, 0)

  return (
    <div className="page-panel">
      <div className="page-header center-header">
        <div>
          <p className="eyebrow">Manual totals</p>
          <h1>Calculator</h1>
        </div>
      </div>

      <div className="calculator-summary">
        <h2>Grand Total</h2>
        <p>₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <div className="calculator-list">
        {totals.map((item) => (
          <div key={item.value} className="denomination-card">
            <div className="denomination-column">
              <span className="denom-label">{item.label}</span>
              <p className="denom-value">
                {item.quantity} × {item.label} = ₱{item.subtotal.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="quantity-controls">
              <button type="button" aria-label={`Decrease ${item.label}`} onClick={() => updateCount(item.value, -1)}>
                −
              </button>
              <span>{item.quantity}</span>
              <button type="button" aria-label={`Increase ${item.label}`} onClick={() => updateCount(item.value, 1)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="secondary-button" onClick={resetCounts}>
        Reset
      </button>
    </div>
  )
}

export default CalculatePage
