function HomePage({ history, onNavigate }) {
  const recentEntries = history.slice(0, 3)
  const totalValue = history.reduce((sum, entry) => sum + Number(entry.totalValue || 0), 0)

  return (
    <div className="page-panel home-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">AI currency recognition</p>
          <h1>Philippine Currency Scanner</h1>
        </div>
      </div>

      <section className="summary-card wide-card">
        <div>
          <p className="label-muted">Research project</p>
          <p className="project-description">
            AI-Based Multi-Denomination Philippine Currency Detection, Classification, and
            Counting with Automatic Total Value Calculation Using Computer Vision.
          </p>
        </div>
      </section>

      <section className="info-card status-card">
        <div className="card-row-between">
          <div>
            <p className="label-muted">HOG-SVM AI status</p>
            <h2>Model not installed</h2>
          </div>
          <span className="status-pill warning">Offline</span>
        </div>
        <p className="muted-text">The scanner is ready for a future HOG-SVM deployment.</p>
      </section>

      <button type="button" className="primary-button" onClick={() => onNavigate('scan')}>
        Scan Currency
      </button>

      <section className="summary-grid">
        <article className="summary-card">
          <p className="label-muted">Total value</p>
          <h3>₱{totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
        </article>
        <article className="summary-card">
          <p className="label-muted">Recent scans</p>
          <h3>{recentEntries.length}</h3>
        </article>
      </section>

      <section className="list-card">
        <div className="card-row-between">
          <h3>Recent scan preview</h3>
          <button type="button" className="link-button" onClick={() => onNavigate('history')}>
            View all
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <p className="empty-state">No scan history yet.</p>
        ) : (
          <ul className="history-list compact-list">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="history-item">
                <div>
                  <strong>{entry.label || 'Philippine currency'}</strong>
                  <small>{entry.date || 'Recent scan'}</small>
                </div>
                <span>{entry.totalValue ? `₱${entry.totalValue.toLocaleString('en-PH', { maximumFractionDigits: 2 })}` : '₱0.00'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default HomePage
