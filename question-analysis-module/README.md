# AI Question Paper Analysis Module

A standalone, explainable placement-question analyzer. It uses local TF-IDF/cosine-similarity and keyword rules—no paid API or authentication.

## Project layout
`backend/` is the independent FastAPI REST service and `frontend/` is the React/Vite dashboard.

## Run it

### Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Swagger API docs: http://localhost:8000/docs

### Frontend
```powershell
cd frontend
npm install
npm run dev
```
Open the displayed Vite URL (normally http://localhost:5173).

### OCR for scanned PDFs (Windows)

Text PDFs work immediately. For scanned/image-only PDFs, install the free **Tesseract OCR** Windows installer from the [UB Mannheim Tesseract builds](https://github.com/UB-Mannheim/tesseract/wiki), then add `C:\Program Files\Tesseract-OCR` to Windows `PATH` and restart the terminal.

If PATH cannot be changed, set this before starting FastAPI:

```powershell
$env:TESSERACT_CMD = 'C:\Program Files\Tesseract-OCR\tesseract.exe'
uvicorn app.main:app --reload --port 8000
```

For scanned PDFs, PyMuPDF extraction is attempted first. When the text layer is too small, each page is rendered at 250 DPI, grayscale/contrast/resize/threshold preprocessed, and read by Tesseract. File-analysis responses include `extractionMethod` (`PyMuPDF` or `OCR`) and `pagesProcessed`.

## REST API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/analyze` | JSON `{ "questions_text": "..." }` |
| POST | `/api/analyze/file` | multipart `file` field for PDF/TXT |
| GET | `/api/topics` | Modular subject/topic keyword catalog |
| GET | `/api/health` | Health probe |

## How it works
Questions are split and normalised, embedded with Sentence Transformers, then grouped by Agglomerative Clustering using cosine distance. Each cluster is labelled from its own TF-IDF keywords and phrases—there is no predefined department or subject catalogue. Difficulty rules live separately in `difficulty_service.py`. Priority is `frequency × .5 + difficulty × .3 + importance × .2`, normalized to 0–100. Clusters that have no meaningful label remain `Other / Unclassified` and are excluded from ranked topic-frequency scoring.

Optional ontology normalization happens after semantic discovery. JSON files in `backend/ontology/` map aliases to reusable parent concepts and subtopics. They do not restrict which subjects can be discovered: an unmapped concept remains a semantic topic. Add new mappings by editing or adding JSON files—no classification-engine changes are required.

The first semantic-analysis run downloads the model configured by `EMBEDDING_MODEL` (default: `all-MiniLM-L6-v2`). Ensure the backend host can access Hugging Face once, or pre-download/cache the model for offline deployment.

MongoDB is included in the technology stack dependencies/config sample for later persistence, but this independent MVP intentionally returns analysis directly and does not require a running MongoDB instance.
