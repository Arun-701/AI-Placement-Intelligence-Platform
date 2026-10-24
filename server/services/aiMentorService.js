/**
 * AI Mentor Service
 * Analyzes placement questions and provides topic-based study recommendations
 * Wraps the standalone mentor analyzer logic with main project integration
 */

const { extractDocument } = require("./adapters/pdfExtractor");
const { parseQuestionPaper, validateQuestion, classifyQuestion, classifyDifficulty } = require("./adapters/questionParser");
const { analyzeQuestions: mentorAnalyzeQuestions, splitQuestions, classifyTopic, classifyDifficulty: mentorDifficulty, getCanonicalTopics } = require("./adapters/mentorAnalyzer");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");

/**
 * Main endpoint: analyze questions from file or text input
 * Returns: topics, difficulty distribution, study order, etc.
 */
const analyzeQuestionsFromUpload = async (filePath, fileName) => {
  try {
    const document = await extractDocument(filePath, fileName);
    const parsed = parseQuestionPaper(document.text, {
      fileName: document.fileName,
      extractionMode: document.extractionMode,
      pageCount: document.pageCount,
      layoutLines: document.layoutLines
    });
    
    const questions = parsed.questions.map((q, idx) => ({
      ...q,
      displayNumber: idx + 1
    }));

    // Use mentor analyzer for analysis
    const analysis = mentorAnalyzeQuestions(
      questions.map(q => `${q.displayNumber}. ${q.question}`).join('\n')
    );

    return {
      source: document,
      questionsExtracted: questions.length,
      summary: analysis.summary,
      topicFrequency: analysis.topicFrequency,
      difficultyDistribution: analysis.difficultyDistribution,
      rankedTopics: analysis.rankedTopics,
      studyOrder: analysis.studyOrder,
      questions // Include extracted questions for review if needed
    };
  } catch (error) {
    console.error("AI Mentor analysis error:", error);
    throw error;
  }
};

/**
 * Analyze text questions pasted directly
 */
const analyzeQuestionsFromText = (questionText) => {
  try {
    if (!questionText || questionText.trim().length === 0) {
      throw new Error("No question text provided");
    }

    const analysis = mentorAnalyzeQuestions(questionText);
    return {
      source: { fileName: "Pasted text", extractionMode: "text" },
      ...analysis
    };
  } catch (error) {
    console.error("AI Mentor text analysis error:", error);
    throw error;
  }
};

/**
 * Get available topics taxonomy
 */
const getTopics = () => {
  return getCanonicalTopics();
};

module.exports = {
  analyzeQuestionsFromUpload,
  analyzeQuestionsFromText,
  getTopics
};
