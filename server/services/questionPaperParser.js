const FOOTER_PATTERN = /^-+\s*\d+\s+of\s+\d+\s*-+$/i;
const ANSWER_KEY_PATTERN = /^\s*(?:answer\s*key|answers?)\s*:?\s*$/i;
const ANSWER_PAIR_PATTERN = /(?:question\s*)?(\d+)\s*[-:.)]\s*([a-z])\b/gi;
const QUESTION_HEADER_PATTERN = /^\s*(?:(?:question|ques|q)\s*#?\s*)?(\d+)\s*([.)\-:])(?:\s*(.*))?$/i;
const INLINE_OPTION_PATTERN = /(?:^|\s)(?:\(([a-d])\)|([a-d])\s*([.)\-:]))\s*/gi;

const cleanLine = (line) => String(line || '').replace(/[\u00a0\t ]+/g, ' ').trim();

const isAnswerPairOnly = (line) => {
  const compact = cleanLine(line);
  if (!compact || FOOTER_PATTERN.test(compact)) return false;
  const pairs = [...compact.matchAll(ANSWER_PAIR_PATTERN)];
  return pairs.length > 0 && pairs.map((pair) => pair[0]).join(' ').replace(/\s+/g, ' ').trim() === compact;
};

const getQuestionHeader = (line) => {
  if (isAnswerPairOnly(line)) return null;
  const match = cleanLine(line).match(QUESTION_HEADER_PATTERN);
  return match ? { number: Number(match[1]), text: (match[3] || '').trim() } : null;
};

const readAnswerKey = (lines) => {
  const answers = new Map();
  const answerKeyIndex = lines.findIndex((line) => ANSWER_KEY_PATTERN.test(line));
  if (answerKeyIndex < 0) return answers;
  for (const line of lines.slice(answerKeyIndex + 1)) {
    for (const pair of line.matchAll(ANSWER_PAIR_PATTERN)) answers.set(Number(pair[1]), pair[2].toUpperCase());
  }
  return answers;
};

const splitInlineOptions = (text) => {
  const value = String(text || '');
  const markers = [...value.matchAll(INLINE_OPTION_PATTERN)];
  if (!markers.length) return { question: value.trim(), options: [] };
  return {
    question: value.slice(0, markers[0].index).trim(),
    options: markers.map((marker, index) => ({
      letter: (marker[1] || marker[2]).toUpperCase(),
      text: value.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? value.length).trim(),
    })),
  };
};

const addContent = (current, text) => {
  const split = splitInlineOptions(text);
  if (split.options.length) {
    if (split.question) current.questionLines.push(split.question);
    else if (!current.questionLines.length && split.options[0]?.text) current.questionLines.push(split.options[0].text);
    current.options.push(...split.options);
    current.activeOption = split.options[split.options.length - 1];
  } else if (current.activeOption) {
    current.activeOption.text = `${current.activeOption.text} ${cleanLine(text)}`.trim();
  } else if (cleanLine(text)) {
    current.questionLines.push(cleanLine(text));
  }
};

const finalizeQuestion = (questions, current, answerKey) => {
  if (!current) return;
  const question = current.questionLines.join(' ').trim();
  const options = current.options.map((option) => option.text).filter(Boolean);
  if (!question || options.length < 2) return;
  const answerLetter = answerKey.get(current.number);
  const answerIndex = answerLetter ? current.options.findIndex((option) => option.letter === answerLetter) : -1;
  questions.push({
    sourceNumber: current.number,
    questionNumber: current.number,
    question,
    options,
    correctAnswer: answerIndex >= 0 ? options[answerIndex] : null,
    topic: 'Question Paper',
    difficulty: 'Medium',
    marks: 1,
    explanation: '',
  });
};

function parseQuestionPaper(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '\n').split('\n').map(cleanLine).filter(Boolean);
  const answerKey = readAnswerKey(lines);
  const questions = [];
  let current = null;

  for (const line of lines) {
    if (ANSWER_KEY_PATTERN.test(line) || FOOTER_PATTERN.test(line) || isAnswerPairOnly(line)) break;
    const header = getQuestionHeader(line);
    if (header) {
      finalizeQuestion(questions, current, answerKey);
      current = { number: header.number, questionLines: [], options: [], activeOption: null };
      addContent(current, header.text);
    } else if (current) {
      addContent(current, line);
    }
  }
  finalizeQuestion(questions, current, answerKey);
  return questions;
}

module.exports = { parseQuestionPaper };
