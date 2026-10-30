const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { parsePdfBBoxLayout } = require("./pdfLayout");

const VERSION_ARGS = {
  pdftotext: ["-v"],
  pdfinfo: ["-v"],
  pdftoppm: ["-v"],
  tesseract: ["--version"]
};

const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  child.on("error", (error) => reject(Object.assign(new Error(`${command} could not be started.`), { cause: error, code: error.code })));
  child.on("close", (code) => {
    const result = { code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr).toString("utf8") };
    if (code === 0) resolve(result);
    else reject(Object.assign(new Error(`${command} failed: ${result.stderr || `exit ${code}`}`), result));
  });
});

const commandAvailable = async (command) => {
  try {
    const result = await run(command, VERSION_ARGS[path.basename(command).toLowerCase()] || ["--version"]);
    return true;
  } catch (error) {
    // Some Poppler builds exit with non-zero even on success; accept stderr output as evidence
    if (error.stderr && (error.stderr.includes("version") || error.stderr.includes("Poppler"))) {
      return true;
    }
    return false;
  }
};

const isExecutable = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findExecutable = async (root, executableName, depth = 0) => {
  if (depth > 5) return "";
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return "";
  }
  for (const entry of entries) {
    const candidate = path.join(root, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === executableName.toLowerCase()) return candidate;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const found = await findExecutable(path.join(root, entry.name), executableName, depth + 1);
    if (found) return found;
  }
  return "";
};

const findWindowsPopplerExecutable = async (executableName) => {
  if (process.platform !== "win32") return "";
  const roots = [
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages"),
    path.join(process.env.ProgramFiles || "", "poppler"),
    path.join(process.env["ProgramFiles(x86)"] || "", "poppler"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "poppler")
  ];
  for (const root of roots) {
    const found = await findExecutable(root, executableName);
    if (found) return found;
  }
  return "";
};

const findWindowsTesseractExecutable = async () => {
  if (process.platform !== "win32") return "";
  const roots = [
    path.join(process.env.ProgramFiles || "", "Tesseract-OCR"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Tesseract-OCR"),
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Tesseract-OCR")
  ];
  for (const root of roots) {
    const found = await findExecutable(root, "tesseract.exe");
    if (found) return found;
  }
  return "";
};

const resolveExecutable = async (name) => {
  if (await commandAvailable(name)) return name;
  const configured = String(name === "tesseract" ? (process.env.TESSERACT_PATH || process.env.TESSERACT_BIN || "") : (process.env.POPPLER_PATH || process.env.POPPLER_BIN || "")).trim();
  if (configured) {
    // Try configured path as-is (if it's an absolute path to executable)
    if (await isExecutable(configured)) return configured;
    // Try configured path as directory containing the executable
    const executableName = process.platform === "win32" ? `${name}.exe` : name;
    const configuredExecutable = path.join(configured, executableName);
    if (await isExecutable(configuredExecutable)) return configuredExecutable;
  }
  if (name === "tesseract") {
    const discoveredTesseract = await findWindowsTesseractExecutable();
    if (discoveredTesseract) return discoveredTesseract;
  }
  const discovered = await findWindowsPopplerExecutable(`${name}.exe`);
  if (discovered) return discovered;
  const setting = name === "tesseract" ? "TESSERACT_PATH" : "POPPLER_PATH";
  const dependency = name === "tesseract" ? "Tesseract" : `Poppler (${name})`;
  throw new Error(`Scanned PDF processing requires ${dependency}. Please configure ${setting} or install it.`);
};

const executablePaths = new Map();
const getExecutable = async (name) => {
  if (!executablePaths.has(name)) executablePaths.set(name, resolveExecutable(name));
  return executablePaths.get(name);
};

const extractPdfText = async (filePath) => {
  const result = await run(await getExecutable("pdftotext"), ["-layout", "-enc", "UTF-8", filePath, "-"]);
  return result.stdout.toString("utf8");
};

const extractPdfLayout = async (filePath) => {
  try {
    const result = await run(await getExecutable("pdftotext"), ["-bbox-layout", "-enc", "UTF-8", filePath, "-"]);
    return parsePdfBBoxLayout(result.stdout.toString("utf8"));
  } catch {
    return [];
  }
};

const getPdfPageCount = async (filePath, text) => {
  try {
    const result = await run(await getExecutable("pdfinfo"), [filePath]);
    const match = result.stdout.toString("utf8").match(/^Pages:\s*(\d+)/mi);
    if (match) return Number(match[1]);
  } catch {
    // The form-feed count is a useful fallback for minimal PDF environments.
  }
  return Math.max(1, (String(text || "").match(/\f/g) || []).length + 1);
};

const extractDocxText = async (filePath) => {
  const result = await run("unzip", ["-p", filePath, "word/document.xml"]);
  return result.stdout.toString("utf8")
    .replace(/<w:tab\s*\/?>(?=.)/g, "\t")
    .replace(/<w:(?:br|cr)\s*\/?>(?=.)/g, "\n")
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
};

const thresholdPgm = async (inputPath, outputPath, threshold = 150) => {
  const input = await fs.readFile(inputPath);
  let cursor = 0;
  const token = () => {
    while (cursor < input.length) {
      const char = String.fromCharCode(input[cursor]);
      if (/\s/.test(char)) {
        cursor += 1;
        continue;
      }
      if (char === "#") {
        while (cursor < input.length && input[cursor] !== 10) cursor += 1;
        continue;
      }
      const start = cursor;
      while (cursor < input.length && !/\s/.test(String.fromCharCode(input[cursor]))) cursor += 1;
      return input.subarray(start, cursor).toString("ascii");
    }
    return "";
  };
  if (token() !== "P5") throw new Error("Poppler did not produce a grayscale image for OCR.");
  const width = Number(token());
  const height = Number(token());
  const maxValue = Number(token());
  if (!width || !height || maxValue > 255) throw new Error("The grayscale OCR image format is unsupported.");
  while (cursor < input.length && /\s/.test(String.fromCharCode(input[cursor]))) cursor += 1;
  const pixels = input.subarray(cursor, cursor + width * height);
  const outputPixels = Buffer.alloc(pixels.length);
  for (let index = 0; index < pixels.length; index += 1) outputPixels[index] = pixels[index] < threshold ? 0 : 255;
  await fs.writeFile(outputPath, Buffer.concat([Buffer.from(`P5\n${width} ${height}\n255\n`), outputPixels]));
};

const cleanOcrProcessError = (error) => {
  if (error?.code === "ENOENT") return "OCR could not start because a required executable is unavailable.";
  return "OCR could not complete. Check the Tesseract and Poppler configuration.";
};

const extractWithOptionalOcr = async (filePath, currentText) => {
  if (String(currentText || "").replace(/\s/g, "").length >= 20) return { text: currentText, extractionMode: "text", warning: "" };
  let tesseract;
  let pdftoppm;
  try {
    tesseract = await getExecutable("tesseract");
    pdftoppm = await getExecutable("pdftoppm");
  } catch (error) {
    return {
      text: currentText,
      extractionMode: "text-needs-review",
      warning: error.message
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "astra-issue-1-1-ocr-"));
  try {
    await run(pdftoppm, ["-gray", "-r", process.env.OCR_DPI || "300", filePath, path.join(tempDir, "page")]);
    const files = (await fs.readdir(tempDir)).filter((name) => name.endsWith(".pgm")).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    if (!files.length) throw new Error("No PDF pages were rendered for OCR.");
    const pages = [];
    for (const file of files) {
      const sourcePath = path.join(tempDir, file);
      const tesseractArgs = ["-l", process.env.OCR_LANGUAGE || "eng", "--psm", "3", "-c", "preserve_interword_spaces=1"];
      const grayscale = await run(tesseract, [sourcePath, "stdout", ...tesseractArgs]);
      let pageText = grayscale.stdout.toString("utf8");
      if (pageText.replace(/\s/g, "").length < Number(process.env.OCR_FALLBACK_MIN_CHARS || 20)) {
        const processedPath = path.join(tempDir, `threshold-${file}`);
        await thresholdPgm(sourcePath, processedPath, Number(process.env.OCR_THRESHOLD || 150));
        const thresholded = await run(tesseract, [processedPath, "stdout", "-l", process.env.OCR_LANGUAGE || "eng", "--psm", "11", "-c", "preserve_interword_spaces=1"]);
        pageText = thresholded.stdout.toString("utf8");
      }
      pages.push(pageText);
    }
    return { text: pages.join("\n\f\n"), extractionMode: "ocr", warning: "" };
  } catch (error) {
    return { text: currentText, extractionMode: "ocr-needs-review", warning: cleanOcrProcessError(error) };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const extractDocument = async (filePath, originalName) => {
  const extension = path.extname(originalName || filePath).toLowerCase();
  if (extension !== ".pdf" && extension !== ".docx") throw new Error("Only PDF and DOCX question papers are supported.");
  const initialText = extension === ".pdf" ? await extractPdfText(filePath) : await extractDocxText(filePath);
  const extracted = extension === ".pdf" ? await extractWithOptionalOcr(filePath, initialText) : { text: initialText, extractionMode: "docx", warning: "" };
  return {
    ...extracted,
    layoutLines: extension === ".pdf" && extracted.extractionMode === "text" ? await extractPdfLayout(filePath) : [],
    pageCount: extension === ".pdf" ? await getPdfPageCount(filePath, extracted.text) : 1,
    fileName: originalName || path.basename(filePath)
  };
};

module.exports = { extractDocument, run };
