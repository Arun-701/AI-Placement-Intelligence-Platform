/**
 * Question Extraction Service
 * Extracts questions from PDF/DOCX/TXT files with optional OCR fallback
 * Used by faculty and admin assessment upload workflows
 */

const { extractDocument, detectScannedPDF, extractWithTesseract } = require("./adapters/pdfExtractor");
const { parseQuestionPaper, validateQuestion, classifyQuestion, classifyDifficulty } = require("./adapters/questionParser");
const path = require("path");

/**
 * Extract questions from file with validation
 * Returns: array of questions with extracted data
 */
const extractQuestionsFromFile = async (filePath, fileName, options = {}) => {
  try {
    // Step 1: Extract document text with Poppler (primary method)
    console.log(`[QuestionExtraction] Extracting: ${fileName}`);
    const document = await extractDocument(filePath, fileName);
    
    console.log(`[QuestionExtraction] Extracted mode: ${document.extractionMode}, pages: ${document.pageCount}`);
    
    // Step 2: Parse questions from extracted text
    const parsed = parseQuestionPaper(document.text, {
      fileName: document.fileName,
      extractionMode: document.extractionMode,
      pageCount: document.pageCount,
      layoutLines: document.layoutLines
    });

    // Step 3: Validate and classify each question
    const validatedQuestions = parsed.questions.map((q, idx) => ({
      ...q,
      displayNumber: idx + 1,
      isValid: validateQuestion(q),
      topic: classifyQuestion(q.question),
      difficulty: classifyDifficulty(q)
    }));

    return {
      success: true,
      fileName: document.fileName,
      extractionMode: document.extractionMode, // "native" or "ocr"
      pageCount: document.pageCount,
      questionsCount: validatedQuestions.length,
      validQuestions: validatedQuestions.filter(q => q.isValid),
      allQuestions: validatedQuestions,
      summary: {
        totalExtracted: validatedQuestions.length,
        validCount: validatedQuestions.filter(q => q.isValid).length,
        invalidCount: validatedQuestions.filter(q => !q.isValid).length
      }
    };
  } catch (error) {
    console.error(`[QuestionExtraction] Error extracting ${fileName}:`, error.message);
    throw error;
  }
};

/**
 * Extract questions with explicit validation report
 * Used for faculty/admin review before saving to database
 */
const extractAndReportQuestionsFromFile = async (filePath, fileName, options = {}) => {
  try {
    const result = await extractQuestionsFromFile(filePath, fileName, options);
    
    // Group questions by validation status for reporting
    const report = {
      ...result,
      byStatus: {
        valid: result.validQuestions,
        invalid: result.allQuestions.filter(q => !q.isValid)
      },
      byTopic: groupByField(result.allQuestions, "topic"),
      byDifficulty: groupByField(result.allQuestions, "difficulty")
    };

    return report;
  } catch (error) {
    console.error("Question extraction report error:", error);
    throw error;
  }
};

/**
 * Helper: group questions by a field
 */
const groupByField = (questions, field) => {
  return questions.reduce((acc, q) => {
    const key = q[field] || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});
};

module.exports = {
  extractQuestionsFromFile,
  extractAndReportQuestionsFromFile
};
