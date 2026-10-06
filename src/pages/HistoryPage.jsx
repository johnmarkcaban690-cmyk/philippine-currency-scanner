import { useMemo } from 'react'

function HistoryPage({ history }) {
  const entries = useMemo(() => history, [history])

  return (
    <div className="page-panel">
      <div className="page-header center-header">
        <div>
          <p className="eyebrow">Saved results</p>
          <h1>History</h1>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="empty-panel">
          <p className="empty-state large-empty">No scan history yet.</p>
        </div>
      ) : (
        <div className="history-panel">
          <ul className="history-list">
            {entries.map((entry) => (
              <li key={entry.id} className="history-item detailed-item">
                <div>
                  <strong>{entry.label || 'Currency scan'}</strong>
                  <small>{entry.date || 'Recent scan'}</small>
                </div>
                <div className="history-meta">
                  <span>{entry.status || 'Queued'}</span>
                  <strong>{entry.totalValue ? `₱${entry.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00'}</strong>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default HistoryPage
