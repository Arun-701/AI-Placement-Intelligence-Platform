const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

/**
 * Resolves the path to a Poppler or Tesseract executable.
 * Checks in order:
 * 1. If the command works directly (in PATH)
 * 2. POPPLER_PATH or TESSERACT_PATH environment variable
 * 3. Windows common installation locations
 */

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
    const versionArgs = {
      pdftotext: ["-v"],
      pdfinfo: ["-v"],
      pdftoppm: ["-v"],
      tesseract: ["--version"]
    };
    const args = versionArgs[path.basename(command).toLowerCase()] || ["--version"];
    const result = await run(command, args);
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
    if (await isExecutable(configured)) return configured;
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

module.exports = { getExecutable, run };
