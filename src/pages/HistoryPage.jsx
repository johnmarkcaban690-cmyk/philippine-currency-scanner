import { useMemo } from 'react'

function formatPeso(value) {
  return `₱${Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

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
                  <strong>{entry.date || 'Recent scan'}</strong>
                  <small>{entry.time || entry.label || 'Currency scan'}</small>
                  {entry.items?.map((item) => (
                    <small key={`${item.denomination}-${item.quantity}`}>
                      {formatPeso(item.denomination)} × {item.quantity} ={' '}
                      {formatPeso(item.subtotal)}
                    </small>
                  ))}
                </div>
                <div className="history-meta">
                  <span>TOTAL</span>
                  <strong>{formatPeso(entry.totalValue || 0)}</strong>
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
