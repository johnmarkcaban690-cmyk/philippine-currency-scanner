const navItems = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'scan', label: 'Scan', icon: '◉' },
  { id: 'history', label: 'History', icon: '◫' },
  { id: 'calculate', label: 'Calculate', icon: '∑' },
]

function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
          aria-label={item.label}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
