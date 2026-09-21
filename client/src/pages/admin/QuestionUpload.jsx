import { useState } from 'react'
import { api } from '../../api'
import AssessmentSectionNav from './AssessmentSectionNav'
import './QuestionUpload.css'

export default function AdminQuestionUpload({ embedded = false }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [questions, setQuestions] = useState([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [importedQuestionIds, setImportedQuestionIds] = useState([])
  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [assessmentDescription, setAssessmentDescription] = useState('')
  const [assessmentDuration, setAssessmentDuration] = useState(60)
  const analyze = async (event) => { event.preventDefault(); setError(''); setStatus(''); if (!file) return setError('Choose a PDF, DOC, or DOCX file first.'); setBusy(true); const form = new FormData(); form.append('file', file); const result = await api.upload('/admin/questions/upload', form); setBusy(false); if (!result.ok) return setError(result.data?.message || 'Upload failed.'); setPreview(result.data.data); setQuestions(result.data.data.questions); setStatus('Questions extracted. Review them before importing.') }
  const update = (index, field, value) => setQuestions((current) => current.map((question, i) => i === index ? { ...question, [field]: value } : question))
  const addOption = (index) => setQuestions((current) => current.map((question, i) => i === index ? { ...question, options: [...question.options, ''] } : question))
  const remove = (index) => setQuestions((current) => current.filter((_, i) => i !== index))
  const importValid = async () => {
    const validQuestions = questions.filter((q) => q.question?.trim() && q.options?.length === 4 && q.correctAnswer && q.options.includes(q.correctAnswer))
    console.log('=== ADMIN IMPORT START ===')
    console.log('Valid questions:', validQuestions)
    console.log('Valid question count:', validQuestions.length)
    if (!preview?.token || !validQuestions.length) return setError('There are no valid questions to import.')
    setBusy(true); setError('')
    const payload = { previewToken: preview.token, questions: validQuestions }
    console.log('Import request started')
    console.log('Import payload:', payload)
    const result = await api.post('/admin/questions/import', payload)
    console.log('Import HTTP status:', result.status)
    console.log('Import response:', result.data)
    setBusy(false)
    if (!result.ok) return setError(result.data?.message || 'Import failed.')
    setStatus(result.data.message); setImportedQuestionIds(result.data.data?.questionIds || []); setPreview(null); setQuestions([]); setFile(null)
  }
  const createAssessment = async () => {
    if (!assessmentTitle.trim() || !importedQuestionIds.length) return setError('Assessment title is required.')
    setBusy(true); setError('')
    const result = await api.post('/admin/assessments', { title: assessmentTitle.trim(), description: assessmentDescription.trim(), duration: Number(assessmentDuration), questionIds: importedQuestionIds })
    setBusy(false)
    if (!result.ok) return setError(result.data?.message || 'Assessment creation failed.')
    setStatus(result.data.message); setImportedQuestionIds([]); setAssessmentTitle(''); setAssessmentDescription(''); setAssessmentDuration(60)
  }
  const isQuestionValid = (question) => question.question?.trim() && question.options?.length === 4 && question.correctAnswer && question.options.includes(question.correctAnswer)
  const validCount = questions.filter(isQuestionValid).length
  return <>
    <AssessmentSectionNav />
    <div className="question-upload-page">
      {embedded && <div className="section-title">Upload Question Paper</div>}
      {!embedded && <div className="page-title"><div><h1>Question Bank Upload</h1><div className="subtitle">Upload, review, and import MCQs into the existing question bank</div></div></div>}
      {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
      {importedQuestionIds.length > 0 && <div className="upload-panel"><div className="question-card-top"><h3>Create Assessment</h3><span className="upload-pill">{importedQuestionIds.length} questions ready</span></div><div className="form-grid"><div className="form-group"><label>Assessment title</label><input value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} placeholder="e.g. Cloud Computing Assessment" /></div><div className="form-group"><label>Duration (minutes)</label><input type="number" min="1" value={assessmentDuration} onChange={(e) => setAssessmentDuration(e.target.value)} /></div></div><div className="form-group"><label>Description / instructions</label><textarea value={assessmentDescription} onChange={(e) => setAssessmentDescription(e.target.value)} /></div><button className="btn" disabled={busy} onClick={createAssessment}>{busy ? 'Creating...' : `Create Assessment from ${importedQuestionIds.length} Questions`}</button></div>}
      {!preview && <form className="upload-panel question-upload-shell" onSubmit={analyze}>
        <div className="upload-hero">
          <div className="upload-hero-copy">
            <span className="upload-hero-kicker">Question upload</span>
            <h2>Build your assessment bank</h2>
            <p>Upload a document, validate the extracted questions, and add them to the existing question bank.</p>
          </div>
          <span className="upload-pill">Supported PDF / DOC / DOCX</span>
        </div>
        <div className="upload-dropzone">
          <div className="upload-file-meta">
            <span className="upload-file-label">Question paper</span>
            <span className="upload-file-name">{file ? file.name : 'No file selected yet'}</span>
            <span className="upload-file-hint">Supported: PDF, DOC, DOCX. Maximum size: 5MB.</span>
          </div>
          <div className="upload-actions">
            <label className="inline-file-input">
              <input id="question-file" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} />
              Choose file
            </label>
            <button className="btn" disabled={busy}>{busy ? 'Analyzing...' : 'Upload & Analyze'}</button>
          </div>
        </div>
      </form>}
      {preview && <div className="question-upload-shell"><div className="upload-hero"><div className="upload-hero-copy"><span className="upload-hero-kicker">Review queue</span><h2>Validate extracted questions</h2><p>Check each answer set and import only the questions that are complete and accurate.</p></div><span className="upload-pill">{validCount} valid questions</span></div><div className="q-upload-stats"><div className="q-stat-card primary"><div><div className="stat-label">Total</div><div className="stat-value">{questions.length}</div></div><span>Questions</span></div><div className="q-stat-card success"><div><div className="stat-label">Valid</div><div className="stat-value">{validCount}</div></div><span>Ready</span></div><div className="q-stat-card warning"><div><div className="stat-label">Needs review</div><div className="stat-value">{questions.length - validCount}</div></div><span>Review</span></div></div><div className="question-review-shell"><div className="section-header"><h3>Question review</h3><button className="btn secondary" type="button" onClick={() => { setPreview(null); setQuestions([]) }}>Cancel</button></div><div className="question-preview-list">{questions.map((question, index) => <div className="question-preview-card" key={question.id || index}><div className="question-card-top"><h4>Question {index + 1}</h4><div className={`question-card-status ${isQuestionValid(question) ? 'confirmed' : 'needs'}`}>{isQuestionValid(question) ? 'Ready' : 'Needs review'}</div></div><div className="form-group"><label>Question</label><textarea value={question.question} onChange={(e) => update(index, 'question', e.target.value)} /></div><div className="option-editor">{question.options.map((option, optionIndex) => <div className="option-row" key={optionIndex}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(e) => update(index, 'options', question.options.map((item, i) => i === optionIndex ? e.target.value : item))} /></div>)}</div>{question.options.length < 4 && <button type="button" className="btn secondary small" onClick={() => addOption(index)}>Add option</button>}<div className="form-grid"><div className="form-group"><label>Correct answer</label><select value={question.correctAnswer} onChange={(e) => update(index, 'correctAnswer', e.target.value)}><option value="">Select answer</option>{question.options.map((option, i) => <option key={i} value={option}>{String.fromCharCode(65 + i)}. {option}</option>)}</select></div><div className="form-group"><label>Difficulty</label><select value={question.difficulty} onChange={(e) => update(index, 'difficulty', e.target.value)}><option value="">Select difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div></div><div className="form-grid"><div className="form-group"><label>Subject</label><input value={question.subject} onChange={(e) => update(index, 'subject', e.target.value)} /></div><div className="form-group"><label>Topic</label><input value={question.topic} onChange={(e) => update(index, 'topic', e.target.value)} /></div></div><div className="form-group"><label>Explanation</label><input value={question.explanation} onChange={(e) => update(index, 'explanation', e.target.value)} /></div>{!isQuestionValid(question) && <div className="validation-note">Needs review: {question.reasons?.length ? question.reasons.join(', ') : 'check question text, four options, and a matching correct answer.'}</div>}<div className="review-actions"><button type="button" className="btn danger small" onClick={() => remove(index)}>Remove</button></div></div>)}</div><div className="review-actions"><button className="btn" type="button" disabled={busy || validCount === 0} onClick={importValid}>{busy ? 'Importing...' : `Import ${validCount} Valid Questions`}</button></div></div></div>}
    </div>
  </>
}