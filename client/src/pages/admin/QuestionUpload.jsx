import { useState } from 'react'
import { api } from '../../api'
import AssessmentSectionNav from './AssessmentSectionNav'

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
  const validCount = questions.filter((q) => q.question?.trim() && q.options?.length === 4 && q.correctAnswer && q.options.includes(q.correctAnswer)).length
  return <>
    <AssessmentSectionNav />
    {embedded && <div className="section-title">Upload Question Paper</div>}
    {!embedded && <div className="page-title"><div><h1>Question Bank Upload</h1><div className="subtitle">Upload, review, and import MCQs into the existing question bank</div></div></div>}
    {error && <div className="alert error">{error}</div>}{status && <div className="alert success">{status}</div>}
    {importedQuestionIds.length > 0 && <div className="card mb"><h3>Create Assessment</h3><div className="form-group"><label>Assessment title</label><input value={assessmentTitle} onChange={(e) => setAssessmentTitle(e.target.value)} placeholder="e.g. Cloud Computing Assessment" /></div><div className="form-group"><label>Description / instructions</label><textarea value={assessmentDescription} onChange={(e) => setAssessmentDescription(e.target.value)} /></div><div className="form-group"><label>Duration (minutes)</label><input type="number" min="1" value={assessmentDuration} onChange={(e) => setAssessmentDuration(e.target.value)} /></div><button className="btn" disabled={busy} onClick={createAssessment}>{busy ? 'Creating...' : `Create Assessment from ${importedQuestionIds.length} Questions`}</button></div>}
    {!preview && <form className="card" onSubmit={analyze}><div className="form-group"><label htmlFor="question-file">Question paper</label><input id="question-file" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} /><small>Supported: PDF, DOC, DOCX. Maximum size: 5MB.</small></div><button className="btn" disabled={busy}>{busy ? 'Analyzing...' : 'Upload & Analyze'}</button></form>}
    {preview && <><div className="grid cols-3 mb"><div className="card"><strong>{questions.length}</strong><div>Total Questions</div></div><div className="card"><strong>{validCount}</strong><div>Valid</div></div><div className="card"><strong>{questions.length - validCount}</strong><div>Needs Review</div></div></div><div className="question-preview">{questions.map((question, index) => <div className="card" key={question.id || index}><div className="row between"><h3>Question {index + 1}</h3><button type="button" className="btn danger small" onClick={() => remove(index)}>Remove</button></div><div className="form-group"><label>Question</label><textarea value={question.question} onChange={(e) => update(index, 'question', e.target.value)} /></div>{question.options.map((option, optionIndex) => <div className="form-group" key={optionIndex}><label>Option {String.fromCharCode(65 + optionIndex)}</label><input value={option} onChange={(e) => update(index, 'options', question.options.map((item, i) => i === optionIndex ? e.target.value : item))} /></div>)}{question.options.length < 4 && <button type="button" className="btn secondary small" onClick={() => addOption(index)}>Add option</button>}<div className="form-group"><label>Correct answer</label><select value={question.correctAnswer} onChange={(e) => update(index, 'correctAnswer', e.target.value)}><option value="">Select answer</option>{question.options.map((option, i) => <option key={i} value={option}>{String.fromCharCode(65 + i)}. {option}</option>)}</select></div><div className="grid cols-2"><div className="form-group"><label>Subject</label><input value={question.subject} onChange={(e) => update(index, 'subject', e.target.value)} /></div><div className="form-group"><label>Topic</label><input value={question.topic} onChange={(e) => update(index, 'topic', e.target.value)} /></div></div><div className="grid cols-2"><div className="form-group"><label>Difficulty</label><select value={question.difficulty} onChange={(e) => update(index, 'difficulty', e.target.value)}><option value="">Select difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div><div className="form-group"><label>Explanation</label><input value={question.explanation} onChange={(e) => update(index, 'explanation', e.target.value)} /></div></div>{!(question.question?.trim() && question.options?.length === 4 && question.correctAnswer && question.options.includes(question.correctAnswer)) && <div className="alert error">Needs review: {question.reasons?.length ? question.reasons.join(', ') : 'check question text, four options, and a matching correct answer.'}</div>}</div>)}</div><div className="row"><button className="btn secondary" type="button" onClick={() => { setPreview(null); setQuestions([]) }}>Cancel</button><button className="btn" type="button" disabled={busy || validCount === 0} onClick={importValid}>{busy ? 'Importing...' : `Import ${validCount} Valid Questions`}</button></div></>}
  </>
}