const { createCanvas } = require("@napi-rs/canvas");
const { createWorker } = require("tesseract.js");
const englishLanguageData = require("@tesseract.js-data/eng");

const OCR_SCALE = 2;
const MAX_OCR_PAGES = 40;

async function renderPdfPage(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toBuffer("image/png");
}

async function extractPdfTextWithOcr(buffer, onProgress = () => {}) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
  const worker = await createWorker("eng", 1, {
    langPath: englishLanguageData.langPath,
    gzip: englishLanguageData.gzip,
  });
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      onProgress({ page: pageNumber, pages: pageCount });
      const image = await renderPdfPage(pdf, pageNumber);
      const result = await worker.recognize(image);
      pages.push(result.data?.text || "");
    }
  } finally {
    await worker.terminate();
    await pdf.destroy();
  }

  return {
    text: pages.join("\n\n"),
    pages: pdf.numPages,
    processedPages: pageCount,
    truncated: pdf.numPages > MAX_OCR_PAGES,
  };
}

module.exports = { extractPdfTextWithOcr, MAX_OCR_PAGES };
