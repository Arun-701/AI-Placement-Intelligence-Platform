const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { PDFParse } = require('pdf-parse');
const { parseQuestionPaper } = require('./adapters/questionParser');

const previews = new Map();
const previewLifetime = 30 * 60 * 1000;
const cleanText = (value) => String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();

const extractText = async (file) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const buffer = await fs.readFile(file.path);
  if (extension === '.pdf') {
    if (buffer.subarray(0, 4).toString() !== '%PDF') throw new Error('Uploaded file is not a valid PDF.');
    const parser = new PDFParse({ data: buffer });
    try { return (await parser.getText())?.text || ''; } finally { await parser.destroy(); }
  }
  if (extension === '.docx') return (await mammoth.extractRawText({ buffer })).value || '';
  if (extension === '.doc') return (await new WordExtractor().extract(buffer)).getBody() || '';
  throw new Error('Unsupported question file type.');
};

const normalizeParsedQuestion = (question, index = 0) => {
  const rawQuestionText = String(question?.question || '').trim();
  const options = Array.isArray(question?.options) ? question.options.map((option) => cleanText(option)) : [];
  const normalizedOptions = Array.from({ length: 4 }, (_, optionIndex) => cleanText(options[optionIndex] || ''));
  const correctAnswer = cleanText(question?.correctAnswer || question?.correctOptionText || '');
  const explicitAnswerFromLetter = question?.correctOption ? normalizedOptions[(question.correctOption.toUpperCase().charCodeAt(0) - 65)] || '' : '';
  const titleBase = cleanText(question?.title || rawQuestionText.slice(0, 120));
  const fallbackTopic = cleanText(question?.topic || 'General') || 'General';

  return {
    id: question?.id || crypto.randomUUID(),
    title: titleBase || `Question ${index + 1}`,
    subject: cleanText(question?.subject || 'Imported Questions') || 'Imported Questions',
    topic: fallbackTopic || 'General',
    difficulty: ['Easy', 'Medium', 'Hard'].includes(question?.difficulty) ? question.difficulty : 'Medium',
    marks: Number(question?.marks) > 0 ? Number(question.marks) : 1,
    question: rawQuestionText,
    options: normalizedOptions,
    correctAnswer: correctAnswer || explicitAnswerFromLetter,
    explanation: cleanText(question?.explanation || ''),
    questionType: 'MCQ',
    reasons: []
  };
};

const validateQuestion = (question) => {
  const reasons = [];
  const options = Array.isArray(question.options) ? question.options.map(cleanText) : [];
  const correctAnswer = cleanText(question.correctAnswer);
  if (!cleanText(question.question)) reasons.push('Missing question text');
  if (options.length === 0) reasons.push('Missing options');
  else if (options.length !== 4) reasons.push('Invalid number of options');
  if (!correctAnswer) reasons.push('Missing correct answer');
  else if (!options.includes(correctAnswer)) reasons.push('Correct answer does not match any option');
  return {
    ...question,
    question: cleanText(question.question),
    options,
    correctAnswer,
    reasons,
    valid: reasons.length === 0,
  };
};

const parseQuestions = (text) => {
  const extracted = parseQuestionPaper(text) || {};
  const sourceQuestions = Array.isArray(extracted.questions) ? extracted.questions : [];

  return sourceQuestions.map((question, index) => validateQuestion({
    ...normalizeParsedQuestion(question, index),
    question: cleanText(question?.question || ''),
    options: Array.isArray(question?.options) ? question.options.map((option) => cleanText(option)) : [],
    correctAnswer: cleanText(question?.correctAnswer || question?.correctOptionText || ''),
    subject: cleanText(question?.subject || 'Imported Questions') || 'Imported Questions',
    topic: cleanText(question?.topic || 'General') || 'General',
    difficulty: ['Easy', 'Medium', 'Hard'].includes(question?.difficulty) ? question.difficulty : 'Medium',
    explanation: cleanText(question?.explanation || ''),
    questionType: 'MCQ',
    marks: Number(question?.marks) > 0 ? Number(question.marks) : 1,
  }));
};

const createPreview = async (file) => {
  try {
    const text = cleanText(await extractText(file));
    if (text.length < 10) throw new Error('No readable text was found in this document.');
    const questions = parseQuestions(text);
    if (!questions.length) throw new Error('No numbered questions were detected.');
    const token = crypto.randomUUID();
    previews.set(token, { questions, createdAt: Date.now() });
    return { token, questions, total: questions.length, valid: questions.filter((q) => q.valid).length };
  } finally { await fs.unlink(file.path).catch(() => {}); }
};

const getPreview = (token) => {
  const preview = previews.get(token);
  if (!preview || Date.now() - preview.createdAt > previewLifetime) { previews.delete(token); return null; }
  return preview;
};

const deletePreview = (token) => previews.delete(token);

const validateForImport = (questions) => (Array.isArray(questions) ? questions : []).map((question) => validateQuestion({
  ...normalizeParsedQuestion(question),
  question: cleanText(question.question),
  options: Array.isArray(question.options) ? question.options.map((option) => cleanText(option)) : [],
  correctAnswer: cleanText(question.correctAnswer),
  subject: cleanText(question.subject || 'Imported Questions') || 'Imported Questions',
  topic: cleanText(question.topic || 'General') || 'General',
  difficulty: ['Easy', 'Medium', 'Hard'].includes(question.difficulty) ? question.difficulty : 'Medium',
  explanation: cleanText(question.explanation || ''),
  questionType: 'MCQ',
  marks: Number(question.marks) > 0 ? Number(question.marks) : 1,
}));

module.exports = { createPreview, getPreview, deletePreview, validateForImport, parseQuestions };
