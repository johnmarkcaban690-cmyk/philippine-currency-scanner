import { useState } from 'react'
import BottomNav from './components/BottomNav'
import CalculatePage from './pages/CalculatePage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import ScanPage from './pages/ScanPage'
import { getStoredHistory } from './utils/storage'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [history] = useState(() => getStoredHistory())

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage history={history} onNavigate={setActiveTab} />
      case 'scan':
        return <ScanPage />
      case 'history':
        return <HistoryPage history={history} />
      case 'calculate':
        return <CalculatePage />
      default:
        return <HomePage history={history} onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <header className="top-bar">
          <div className="status-pill">AI-ready</div>
          <div className="signal-indicator" aria-label="Application status">
            <span className="signal-dot" />
          </div>
        </header>

        <main className="content-area">{renderPage()}</main>

        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  )
}

export default App
