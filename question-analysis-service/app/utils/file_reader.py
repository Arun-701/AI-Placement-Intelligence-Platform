"""File extraction with an automatic OCR fallback for scanned PDFs."""
from dataclasses import dataclass
from io import BytesIO
import os
from pathlib import Path
import fitz
from dotenv import load_dotenv

TEXT_PER_PAGE_THRESHOLD = 25
OCR_DPI = 250

# Also load here so direct utility tests and worker processes behave like FastAPI.
load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=True)

@dataclass
class ExtractedFile:
    text: str
    extraction_method: str
    pages_processed: int

def _preprocess(image_bytes: bytes):
    from PIL import Image, ImageFilter, ImageOps
    image = Image.open(BytesIO(image_bytes)).convert("L")
    image = ImageOps.autocontrast(image)
    image = image.resize((image.width * 2, image.height * 2), Image.Resampling.LANCZOS)
    image = image.filter(ImageFilter.MedianFilter(size=3))
    return image.point(lambda value: 255 if value > 165 else 0)

def _configure_tesseract():
    """Configure pytesseract from backend/.env before *any* OCR call."""
    import pytesseract

    configured = os.getenv("TESSERACT_CMD", "").strip().strip('"')
    windows_default = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    executable = configured or (windows_default if os.name == "nt" else "tesseract")
    if os.name == "nt" and not Path(executable).is_file():
        raise FileNotFoundError(
            f"Configured Tesseract executable does not exist: {executable}"
        )
    pytesseract.pytesseract.tesseract_cmd = str(executable)
    tessdata = os.getenv("TESSDATA_PREFIX", "").strip().strip('"')
    if not tessdata and os.name == "nt":
        tessdata = str(Path(executable).parent / "tessdata")
    if tessdata:
        os.environ["TESSDATA_PREFIX"] = tessdata
    return pytesseract, tessdata


def _ocr_pdf(document: fitz.Document) -> str:
    try:
        pytesseract, tessdata = _configure_tesseract()
        pytesseract.get_tesseract_version()
    except Exception as exc:
        raise ValueError(f"Tesseract OCR health check failed: {exc}") from exc
    scale = OCR_DPI / 72
    pages = []
    for page in document:
        pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), colorspace=fitz.csGRAY, alpha=False)
        # TESSDATA_PREFIX is configured in the process environment above. Passing
        # a quoted Windows path through pytesseract's config parser can make the
        # quote part of the path, so do not duplicate it as --tessdata-dir.
        config = "--oem 3 --psm 6"
        try:
            pages.append(pytesseract.image_to_string(_preprocess(pixmap.tobytes("png")), config=config))
        except Exception as exc:
            raise ValueError(f"Tesseract OCR failed while reading page {page.number + 1}: {exc}") from exc
    return "\n".join(pages)

def read_upload(filename: str, content: bytes) -> ExtractedFile:
    suffix = filename.lower().rsplit('.', 1)[-1] if '.' in filename else ''
    if suffix == 'txt': return ExtractedFile(content.decode('utf-8', errors='replace'), "TEXT", 0)
    if suffix != 'pdf': raise ValueError('Only PDF and TXT files are supported.')
    document = fitz.open(stream=content, filetype='pdf')
    pages = len(document)
    text = '\n'.join(page.get_text() for page in document).strip()
    if len(text) >= max(20, pages * TEXT_PER_PAGE_THRESHOLD):
        document.close(); return ExtractedFile(text, "PyMuPDF", pages)
    try: ocr_text = _ocr_pdf(document).strip()
    finally: document.close()
    if not ocr_text: raise ValueError("OCR completed but no readable text was found in this PDF.")
    return ExtractedFile(ocr_text, "OCR", pages)
