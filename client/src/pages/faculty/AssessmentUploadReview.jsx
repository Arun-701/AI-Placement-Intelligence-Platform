import { useState } from 'react'
import { api } from '../../api'
import './AssessmentUploadReview.css'

const isValidQuestion = (question) => question.question?.trim() && question.options?.length === 4 && question.options.every((option) => option?.trim()) && question.correctAnswer && question.options.includes(question.correctAnswer)

const normalizeQuestion = (question) => ({
  question: question.question || '',
  options: [...(question.options || []), '', '', '', ''].slice(0, 4),
  correctAnswer: question.correctAnswer || '',
  subject: question.subject || 'Faculty Material',
  topic: question.topic || 'Question Paper',
  difficulty: question.difficulty || 'Medium',
  explanation: question.explanation || '',
  marks: question.marks || 1,
  confirmed: false,
})

export default function FacultyAssessmentUploadReview({ onCreated }) {
  const [file, setFile] = useState(null)
  const [questions, setQuestions] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyMessage, setBusyMessage] = useState('')
  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [assessmentDescription, setAssessmentDescription] = useState('')
  const [assessmentDuration, setAssessmentDuration] = useState(60)

  const update = (index, field, value) => setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, [field]: value, confirmed: false } : question))
  const updateOption = (index, optionIndex, value) => setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, options: question.options.map((option, currentIndex) => currentIndex === optionIndex ? value : option), correctAnswer: question.correctAnswer === question.options[optionIndex] ? value : question.correctAnswer, confirmed: false } : question))
  const remove = (index) => setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index))
  const addOption = (index) => setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, options: [...question.options, ''] } : question))
  const confirm = (index) => setQuestions((current) => current.map((question, questionIndex) => questionIndex === index ? { ...question, confirmed: isValidQuestion(question) } : question))
  const confirmAll = () => setQuestions((current) => current.map((question) => ({ ...question, confirmed: isValidQuestion(question) })))

  const analyze = async (event) => {
    event.preventDefault(); setError(''); setStatus('')
    if (!file) return setError('Choose a PDF or DOCX question paper first.')
    setBusy(true); setBusyMessage('Reading question paper...')
    const extractionTimer = window.setTimeout(() => setBusyMessage('Extracting questions...'), 700)
    const ocrTimer = window.setTimeout(() => setBusyMessage('Scanned PDF detected. Reading pages locally...'), 1800)
    const formData = new FormData(); formData.append('material', file)
    const response = await api.upload('/faculty/assessments/extract', formData)
    window.clearTimeout(extractionTimer); window.clearTimeout(ocrTimer); setBusy(false); setBusyMessage('')
    if (!response.ok) return setError(response.data?.message || 'Question extraction failed.')
    const extracted = response.data?.data?.questions || []
    setQuestions(extracted.map(normalizeQuestion)); setStatus('Questions extracted. Review them before importing.')
  }

  const createAssessment = async () => {
    const confirmed = questions.filter((question) => question.confirmed && isValidQuestion(question))
    if (!assessmentTitle.trim() || !confirmed.length) return setError('Assessment title and at least one confirmed valid question are required.')
    setBusy(true); setError('')
    const response = await api.post('/faculty/assessments', { title: assessmentTitle.trim(), description: assessmentDescription.trim(), duration: Number(assessmentDuration), questions: confirmed })
    setBusy(false)
    if (!response.ok) return setError(response.data?.message || 'Assessment creation failed.')
    setStatus(response.data.message || 'Assessment created successfully.')
    setQuestions([]); setFile(null); setAssessmentTitle(''); setAssessmentDescription(''); setAssessmentDuration(60); await onCreated?.()
  }

  const validCount = questions.filter(isValidQuestion).length
  const confirmedCount = questions.filter((question) => question.confirmed && isValidQuestion(question)).length

  return <>
    {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
    {!questions.length && <form className="faculty-upload-shell" onSubmit={analyze}>
      <div className="faculty-upload-card">
        <div className="faculty-upload-dropzone">
          <div className="faculty-upload-copy">
            <h3>Upload assessment material</h3>
            <p>Extract questions from a PDF or DOCX and review them before creating a new assessment.</p>
          </div>
          <div className="faculty-file-actions">
            <label className="faculty-upload-input">
              <input id="faculty-question-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
            <button className="btn" disabled={busy}>{busy ? busyMessage : 'Upload & Analyze'}</button>
          </div>
        </div>
      </div>
    </form>}
    {questions.length > 0 && <div className="faculty-upload-shell">
      <div className="faculty-stat-grid">
        <div className="faculty-stat-card primary"><div><span>Total</span><strong>{questions.length}</strong></div><span>Questions</span></div>
        <div className="faculty-stat-card success"><div><span>Valid</span><strong>{validCount}</strong></div><span>Ready</span></div>
        <div className="faculty-stat-card warning"><div><span>Needs review</span><strong>{questions.length - validCount}</strong></div><span>Review</span></div>
      </div>
      <div className="faculty-upload-card">
        <div className="faculty-review-header">
          <h2>Review and import</h2>
          <button type="button" className="btn secondary" onClick={confirmAll}>Confirm all questions</button>
        </div>
        <div className="faculty-question-list">
          {questions.map((question, index) => <div className="faculty-question-card" key={`${question.sourceNumber || 'question'}-${index}`}>
            <div className="faculty-question-top">
              <h3>Question {index + 1}</h3>
              <div className="top-actions">
                <span className={`faculty-status-badge ${question.confirmed && isValidQuestion(question) ? 'confirmed' : 'needs'}`}>{question.confirmed && isValidQuestion(question) ? 'Confirmed' : 'Needs review'}</span>
                <button type="button" className="btn danger small" onClick={() => remove(index)}>Remove</button>
              </div>
            </div>
            <div className="faculty-meta-grid">
              <div className="faculty-input-stack">
                <div className="form-group"><label>Question text</label><textarea value={question.question} onChange={(event) => update(index, 'question', event.target.value)} /></div>
              </div>
              <div className="faculty-input-stack">
                <div className="form-group"><label>Subject</label><input value={question.subject} onChange={(event) => update(index, 'subject', event.target.value)} /></div>
                <div className="form-group"><label>Topic</label><input value={question.topic} onChange={(event) => update(index, 'topic', event.target.value)} /></div>
              </div>
            </div>
            <div className="faculty-option-list">
              {question.options.map((option, optionIndex) => <div className="faculty-option-row" key={optionIndex}><span className="faculty-option-letter">{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} /></div>)}
            </div>
            {question.options.length < 4 && <button type="button" className="btn secondary small" onClick={() => addOption(index)}>Add option</button>}
            <div className="faculty-meta-grid">
              <div className="form-group"><label>Correct answer</label><select value={question.correctAnswer} onChange={(event) => update(index, 'correctAnswer', event.target.value)}><option value="">Select answer</option>{question.options.map((option, optionIndex) => <option key={optionIndex} value={option}>{String.fromCharCode(65 + optionIndex)}. {option}</option>)}</select></div>
              <div className="form-group"><label>Difficulty</label><select value={question.difficulty} onChange={(event) => update(index, 'difficulty', event.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            </div>
            <div className="form-group"><label>Explanation</label><textarea value={question.explanation} onChange={(event) => update(index, 'explanation', event.target.value)} /></div>
            <button type="button" className="btn small" onClick={() => confirm(index)}>Confirm question</button>
          </div>)}
        </div>
      </div>
      <div className="faculty-upload-card faculty-create-card">
        <div className="faculty-review-header">
          <h2>Create assessment</h2>
          <span className="upload-pill">{confirmedCount} confirmed</span>
        </div>
        <div className="form-group"><label>Assessment title</label><input value={assessmentTitle} onChange={(event) => setAssessmentTitle(event.target.value)} placeholder="e.g. Cloud Computing Assessment" /></div>
        <div className="form-group"><label>Description / instructions</label><textarea value={assessmentDescription} onChange={(event) => setAssessmentDescription(event.target.value)} /></div>
        <div className="form-group"><label>Duration (minutes)</label><input type="number" min="1" value={assessmentDuration} onChange={(event) => setAssessmentDuration(event.target.value)} /></div>
        <button className="btn" disabled={busy || !confirmedCount} onClick={createAssessment}>{busy ? 'Creating...' : `Import and Create Assessment from ${confirmedCount} Questions`}</button>
      </div>
    </div>}
  </>
}
