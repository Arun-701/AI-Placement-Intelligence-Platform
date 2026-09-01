const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const mammoth = require("mammoth");
const WordExtractor = require("word-extractor");
const { PDFParse } = require("pdf-parse");

const previews = new Map();
const previewLifetime = 30 * 60 * 1000;

const cleanText = (value) => String(value || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();

const extractText = async (file) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const buffer = await fs.readFile(file.path);
    if (extension === ".pdf") {
        if (buffer.subarray(0, 4).toString() !== "%PDF") throw new Error("Uploaded file is not a valid PDF.");
        const parser = new PDFParse({ data: buffer });
        try { return (await parser.getText())?.text || ""; } finally { await parser.destroy(); }
    }
    if (extension === ".docx") return (await mammoth.extractRawText({ buffer })).value || "";
    if (extension === ".doc") return (await new WordExtractor().extract(buffer)).getBody() || "";
    throw new Error("Unsupported question file type.");
};

const parseAnswer = (answer, options) => {
    const value = cleanText(answer).replace(/^[=: -]+/, "");
    if (!value) return "";
    const letter = value.match(/^([A-D])(?:[.)]|$)/i)?.[1]?.toUpperCase();
    if (letter) return options[letter.charCodeAt(0) - 65] || "";
    return options.find((option) => option.toLowerCase() === value.toLowerCase()) || "";
};

const validateQuestion = (question) => {
    const reasons = [];
    if (!cleanText(question.question)) reasons.push("Missing question text");
    if (!Array.isArray(question.options) || question.options.length === 0) reasons.push("Missing options");
    else if (question.options.length !== 4) reasons.push("Invalid number of options");
    if (!cleanText(question.correctAnswer)) reasons.push("Missing correct answer");
    else if (!question.options?.includes(question.correctAnswer)) reasons.push("Correct answer does not match any option");
    return { ...question, question: cleanText(question.question), options: (question.options || []).map(cleanText), correctAnswer: cleanText(question.correctAnswer), reasons, valid: reasons.length === 0 };
};

const parseQuestions = (text) => {
    const normalized = String(text || "").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n");
    const starts = [...normalized.matchAll(/(?:^|\n)\s*(?:Q(?:uestion)?\s*)?\d+[.)\-:]\s*/gi)];
    if (!starts.length) return [];
    return starts.map((match, index) => {
        const block = normalized.slice(match.index + match[0].length, starts[index + 1]?.index ?? normalized.length);
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const options = [];
        let questionLines = [];
        let answer = "";
        let explanation = "";
        let subject = "";
        let topic = "";
        let difficulty = "";
        let readingOptions = false;
        lines.forEach((line) => {
            const option = line.match(/^([A-D])\s*[.)\-:]\s*(.+)$/i);
            const answerMatch = line.match(/^(?:answer|correct answer)\s*[:\-]?\s*(.+)$/i);
            const metadata = line.match(/^(subject|category|topic|difficulty|explanation)\s*[:\-]\s*(.+)$/i);
            if (option) { options[option[1].toUpperCase().charCodeAt(0) - 65] = cleanText(option[2]); readingOptions = true; return; }
            if (answerMatch) { answer = answerMatch[1]; readingOptions = false; return; }
            if (metadata) {
                const key = metadata[1].toLowerCase();
                if (key === "subject" || key === "category") subject = cleanText(metadata[2]);
                if (key === "topic") topic = cleanText(metadata[2]);
                if (key === "difficulty") difficulty = cleanText(metadata[2]);
                if (key === "explanation") explanation = cleanText(metadata[2]);
                return;
            }
            if (readingOptions && !answer) return;
            questionLines.push(line);
        });
        return validateQuestion({ id: crypto.randomUUID(), question: cleanText(questionLines.join(" ")), options: options.filter(Boolean), correctAnswer: parseAnswer(answer, options), subject, topic, difficulty, explanation, questionType: "MCQ", marks: 1 });
    });
};

const createPreview = async (file) => {
    try {
        const text = cleanText(await extractText(file));
        if (text.length < 10) throw new Error("No readable text was found in this document.");
        const questions = parseQuestions(text);
        if (!questions.length) throw new Error("No numbered questions were detected.");
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

const validateForImport = (questions) => (Array.isArray(questions) ? questions : []).map((question) => validateQuestion({ ...question, question: cleanText(question.question), options: Array.isArray(question.options) ? question.options.map(cleanText) : [] }));

module.exports = { createPreview, getPreview, validateForImport, parseQuestions };