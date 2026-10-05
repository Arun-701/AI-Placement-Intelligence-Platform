const fs = require("fs");
const path = require("path");
const { PDFParse } = require("pdf-parse");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/test-question-paper-pdf.js <pdf-path>");
  process.exit(1);
}

(async () => {
  const buffer = fs.readFileSync(path.resolve(filePath));
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = result?.text || "";
    console.log(`PDF file: ${filePath}`);
    console.log(`PDF text length: ${text.length}`);
    console.log("PDF text preview:");
    console.log(text.slice(0, 1000));
  } finally {
    await parser.destroy();
  }
})().catch((error) => {
  console.error("PDF extraction failed:", error);
  process.exitCode = 1;
});
