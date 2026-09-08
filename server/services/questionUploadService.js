const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const { PDFParse } = require('pdf-parse');
const { parseQuestionPaper } = require('./questionPaperParser');

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

const validateQuestion = (question) => {
  const reasons = [];
  const options = Array.isArray(question.options) ? question.options.map(cleanText) : [];
  const correctAnswer = cleanText(question.correctAnswer);
  if (!cleanText(question.question)) reasons.push('Missing question text');
  if (options.length === 0) reasons.push('Missing options');
  else if (options.length !== 4) reasons.push('Invalid number of options');
  if (!correctAnswer) reasons.push('Missing correct answer');
  else if (!options.includes(correctAnswer)) reasons.push('Correct answer does not match any option');
  return { ...question, question: cleanText(question.question), options, correctAnswer, reasons, valid: reasons.length === 0 };
};

const parseQuestions = (text) => parseQuestionPaper(text).map((question) => validateQuestion({
  id: crypto.randomUUID(),
  question: question.question,
  options: question.options,
  correctAnswer: question.correctAnswer || '',
  subject: '',
  topic: question.topic || '',
  difficulty: '',
  explanation: '',
  questionType: 'MCQ',
  marks: 1,
}));

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

const validateForImport = (questions) => (Array.isArray(questions) ? questions : []).map((question) => validateQuestion({ ...question, question: cleanText(question.question), options: Array.isArray(question.options) ? question.options.map(cleanText) : [] }));

module.exports = { createPreview, getPreview, deletePreview, validateForImport, parseQuestions };
