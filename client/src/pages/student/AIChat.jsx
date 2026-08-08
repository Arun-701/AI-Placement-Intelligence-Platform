import { useState } from 'react'
import { api } from '../../api'

export default function AIChat() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (!prompt.trim() || busy) return
    setBusy(true)
    setError('')
    const r = await api.post('/ai/chat', { prompt })
    setBusy(false)
    if (r.ok) {
      const text = r.data.data?.response || ''
      setResponse(text)
      setHistory([...history, { q: prompt, a: text }])
      setPrompt('')
    } else {
      setError(r.data?.message || 'AI request failed (check your Gemini API key and quota)')
    }
  }

  return (
    <>
      <div className="page-title">
        <div>
          <h1>AI Mentor Chat</h1>
          <div className="subtitle">Ask questions, get concept explanations and interview help</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card mb">
        <h3>Ask the AI Mentor</h3>
        <div className="row">
          <textarea
            style={{ flex: 1, minHeight: 60 }}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Explain OOP concepts with examples, or recommend resources for SQL interviews"
          />
        </div>
        <button className="btn mt" onClick={send} disabled={busy || !prompt.trim()}>
          {busy ? 'Thinking...' : 'Send'}
        </button>
      </div>

      {response && (
        <div className="card mb">
          <h3>AI Response</h3>
          <div className="ai-box">{response}</div>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3>Chat History</h3>
          {history.map((h, i) => (
            <div key={i} className="list-item">
              <p><strong>Q:</strong> {h.q}</p>
              <div className="ai-box mt">{h.a}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}