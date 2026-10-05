# Question Paper Analysis Integration Plan

## Project Context

**Existing Application:**
- React + Vite frontend (`client/`)
- Node.js Express backend (`server/`)
- MongoDB database
- JWT authentication with roles: student, faculty, admin
- Current Student AI Mentor at `/student/ai-chat` displays generic AI chat (gemini-based)

**Python Module Being Integrated:**
- FastAPI backend running on port 8000
- Question paper analysis with ML pipeline
- PDF/OCR support
- Supervised domain + topic classification
- Confidence, difficulty, priority, study order calculation

---

## Architecture Decision

```
React Frontend (/student/ai-chat)
        ↓
Node/Express Backend (/api/ai/question-paper/analyze)
        ↓
Python FastAPI Service (http://127.0.0.1:8000)
        ↓
ML Models + OCR
```

The Node backend **proxies** file uploads to Python and returns results to frontend.
The Python service remains independently runnable and self-contained.

---

## Feature Scope

**STUDENT ONLY** - Question Paper Analysis feature
- Replace generic AI Chat UI with Question Paper Analysis UI
- File upload (PDF/image)
- Analysis results display
- Role-protected with `verifyToken` + `authorizeRoles("student")`

**NO CHANGES to:**
- Faculty features
- Admin features
- Existing Question Bank functionality
- Existing AI services (Resume AI, Career Recommendation, Roadmap AI)
- Gemini configuration (other modules may depend on it)

---

## Files to Create

### Backend (Node.js)

1. **`server/controllers/questionPaperAnalysisController.js`**
   - Controller: `analyzeQuestionPaper(req, res)`
   - Responsibilities:
     - Validate uploaded file existence and size
     - Call questionPaperAnalysisService
     - Return JSON response with proper error handling
     - Use existing response utilities: `successResponse()`, `errorResponse()`
   - Errors handled:
     - No file uploaded
     - Invalid file type
     - File too large
     - Python service unavailable
     - Analysis failure

2. **`server/services/questionPaperAnalysisService.js`**
   - Service: `analyzeQuestionPaperFile(fileBuffer, mimeType)`
   - Responsibilities:
     - Forward file to Python FastAPI (`POST /api/analyze/file`)
     - Use multipart/form-data
     - Parse JSON response
     - Handle Python service errors/timeouts
     - Return structured result or throw error
   - Does NOT implement ML logic in Node

3. **`server/routes/questionPaperAnalysisRoutes.js`**
   - Route: `POST /api/ai/question-paper/analyze`
   - Middleware chain:
     - `verifyToken` (authenticate)
     - `authorizeRoles("student")` (student-only)
     - `questionUploadMiddleware.single("file")` (file handling - reuse existing)
   - Controller: `analyzeQuestionPaper`

### Frontend (React)

4. **Update `client/src/pages/student/AIChat.jsx`**
   - Replace generic AI chat UI with Question Paper Analysis UI
   - Keep route as `/student/ai-chat` for minimal disruption
   - New UI sections:
     - Title: "AI Mentor - Question Paper Analysis"
     - File upload input (accept PDF/image)
     - Upload & Analyze button
     - Loading state during analysis
     - Error messages
     - Results display (if analysis succeeds):
       - Questions Analyzed
       - Topics Identified
       - Top Priority Score
       - Domain
       - Topic breakdown
       - Question frequency
       - Difficulty distribution
       - Priority scores
       - Recommended Study Order
   - Use FormData API for file upload
   - Call `/api/ai/question-paper/analyze`

### Environment & Config

5. **Update `.env` in both server and question-analysis-service**
   - Add to `server/` (if needed):
     - `QUESTION_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000`
   - Ensure Python service has required env vars (already in place)

---

## Files to Modify

### Backend Routes

1. **`server/routes/aiRoutes.js`**
   - Add import: `const { analyzeQuestionPaper } = require("../controllers/questionPaperAnalysisController");`
   - DO NOT remove existing `/chat` route (other modules may depend on it)
   - Add new route using `questionPaperAnalysisRoutes`
   - Option: Import questionPaperAnalysisRoutes in `server.js` instead if cleaner

2. **`server/server.js`**
   - Add new route registration:
     ```javascript
     const questionPaperAnalysisRoutes = require("./routes/questionPaperAnalysisRoutes");
     app.use("/api/ai", questionPaperAnalysisRoutes);
     ```
   - Place after existing AI routes

### Frontend API

3. **`client/src/api.js`**
   - No changes needed - existing `api.upload()` method handles FormData
   - Will call `/api/ai/question-paper/analyze` via `api.upload()`

### Environment Validation (Optional)

4. **`server/config/validateEnv.js`**
   - Consider adding `QUESTION_ANALYSIS_SERVICE_URL` to optional/checked vars
   - Or add simple check in service initialization

---

## Files to NOT Modify (Preserved)

- `server/services/questionPaperOcrService.js` (used by admin/faculty question-bank)
- `server/services/questionPaperParser.js` (used by admin/faculty question-bank)
- `server/services/questionUploadService.js` (used by admin/faculty question-bank)
- `server/routes/questionBankRoutes.js` (admin/faculty feature)
- `server/config/aiProviders.js` (other AI services depend on it)
- `server/services/geminiService.js` (other AI services depend on it)
- All Faculty and Admin routes/controllers
- Python service (independently runnable)

---

## Python Service Integration Details

### Endpoint Used
```
POST http://127.0.0.1:8000/api/analyze/file
```

### Request Format
```
Content-Type: multipart/form-data
Body:
  file: <binary file content>
```

### Response Format (from Python)
```json
{
  "totalQuestions": 15,
  "extractionMethod": "PDF|OCR|TEXT",
  "pagesProcessed": 3,
  "topics": [
    {
      "subject": "Computer Science",
      "domain": "Computer Networks",
      "topic": "TCP/IP",
      "questionCount": 4,
      "difficulty": "Medium",
      "priorityScore": 75,
      "priority": "High",
      "confidence": 0.92,
      "subtopics": ["routing", "protocol"],
      "source": "ml"
    }
  ],
  "subjectDistribution": {
    "Computer Science": 15
  },
  "difficultyDistribution": {
    "Easy": 3,
    "Medium": 8,
    "Hard": 4
  },
  "recommendedStudyOrder": ["TCP/IP", "DNS", "HTTP", ...],
  "mlQuestions": 15,
  "geminiQuestions": 0,
  "geminiUsed": false
}
```

### Error Handling
- Python service returns HTTP status codes
- 422: Validation error (invalid file, no questions found, file too large)
- 400: File reading error
- 200: Success

Node service should:
- Catch network errors (service unavailable)
- Catch timeout errors
- Pass through HTTP status and error message
- Never expose stack traces to frontend

---

## Frontend Display (UI Structure)

```
AI Mentor - Question Paper Analysis

[Upload Section]
Choose PDF/Image: [Choose File Button]
[Analyze Paper] button

[Results Section - shown after successful analysis]

📊 Analysis Summary
- Total Questions Analyzed: 15
- Extraction Method: PDF
- Pages Processed: 3

📚 Topics Identified
[Topic Cards - sorted by priority]:
  Topic: TCP/IP
  Domain: Computer Networks
  Questions: 4
  Difficulty: Medium
  Confidence: 92%
  Priority Score: 75 (High)
  Subtopics: routing, protocol

🎯 Recommended Study Order
1. TCP/IP (Priority: 75, Difficulty: Medium)
2. DNS (Priority: 70, Difficulty: Medium)
3. HTTP (Priority: 65, Difficulty: Easy)
...

📊 Difficulty Distribution
Easy: 3 | Medium: 8 | Hard: 4

[Error Message - shown if analysis fails]
```

---

## Middleware & Authentication

### Existing Middleware to Reuse
- `verifyToken` (from `authMiddleware.js`) - authenticates JWT
- `authorizeRoles("student")` (from `roleMiddleware.js`) - student-only
- `questionUploadMiddleware.single("file")` (from `uploadMiddleware.js`) - file handling

### New Middleware
- None required - reuse existing upload middleware

### Authorization
- Faculty attempting access → 403 Forbidden
- Admin attempting access → 403 Forbidden
- Unauthenticated user → 401 Unauthorized

---

## Dependencies & Packages

### Node Backend (already present)
- `express` - routing
- `multer` - file upload
- `cors`, `helmet` - middleware
- `dotenv` - environment variables
- `axios` or `node-fetch` - HTTP calls to Python (may need to add if not present)

### Python Service (already present)
- `fastapi`, `uvicorn` - API framework
- `pymupdf` - PDF extraction
- `pytesseract`, `pillow` - OCR
- `scikit-learn` - ML models
- `sentence-transformers` - embeddings
- `pandas`, `numpy` - data processing

### Check for missing:
- Node backend may need `axios` or `node-fetch` for HTTP calls to Python

---

## Startup Commands

### Python Service (separate terminal)
```bash
cd question-analysis-service
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Node Backend
```bash
cd server
npm install  # if dependencies added
npm run dev  # or npm start
```

### React Frontend
```bash
cd client
npm run dev
```

---

## Environment Variables

### `question-analysis-service/.env` (ALREADY SET)
```
QUESTION_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000
ML_CONFIDENCE_THRESHOLD=0.60
LLM_CONFIDENCE_THRESHOLD=0.60
MONGODB_URL=...
GEMINI_API_KEY=...
TESSERACT_CMD=...
```

### `server/.env` (ADD IF NEEDED)
```
QUESTION_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000
# ... existing vars
```

---

## Testing Plan

### Unit/Integration Tests
1. ✅ Python FastAPI service independently
   - Health check: `GET /api/health`
   - Analyze text: `POST /api/analyze` with questions_text
   - Analyze file: `POST /api/analyze/file` with PDF/image
   - Error cases: invalid file, empty file, too large, etc.

2. ✅ Node ↔ Python communication
   - Forward file to Python
   - Parse response correctly
   - Handle timeout
   - Handle Python service down

3. ✅ Backend Authorization
   - Student can call `/api/ai/question-paper/analyze` ✅
   - Faculty denied (403)
   - Admin denied (403)
   - No token (401)

4. ✅ Frontend Upload & Display
   - File selection
   - Upload button disabled when no file
   - Loading state during analysis
   - Display results correctly
   - Display errors clearly

5. ✅ End-to-End
   - Student uploads real PDF
   - Analysis completes
   - Results displayed
   - Can upload another paper

6. ✅ Regression Testing
   - Existing Resume AI works
   - Existing Career Recommendation works
   - Existing Roadmap works
   - Faculty question-bank unchanged
   - Admin assessments unchanged
   - Other AI Mentor for faculty still works (if applicable)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Python service down/timeout | Node service catches error, returns 503 "Service unavailable" |
| File too large | Multer validates size (5MB), Python validates (10MB), both reject |
| Invalid file type | Multer validates, Python validates; both reject with 422 |
| No file uploaded | Controller validates `req.file` existence |
| ML model not loaded | Python service loads models on startup; test health check |
| Python returns unexpected format | Node service validates response schema before passing to frontend |
| Faculty/Admin access | Route middleware enforces `authorizeRoles("student")` |
| Existing AI services break | No changes to Gemini provider, other AI routes untouched |

---

## Implementation Sequence

### Phase 1: Backend Setup
1. Create `questionPaperAnalysisController.js`
2. Create `questionPaperAnalysisService.js`
3. Create `questionPaperAnalysisRoutes.js`
4. Register routes in `server.js`
5. Test Node ↔ Python communication
6. Test authorization middleware

### Phase 2: Frontend Update
1. Update `AIChat.jsx` with new UI
2. Use `api.upload()` for file submission
3. Display results in new layout
4. Error handling

### Phase 3: Testing
1. Python service health check
2. Manual file upload test
3. Role authorization test
4. Error scenario tests
5. Regression tests on existing features

### Phase 4: Deployment
1. Set `QUESTION_ANALYSIS_SERVICE_URL` in production `.env`
2. Ensure Python service runs on separate port
3. Verify Node ↔ Python communication works
4. Monitor logs

---

## Summary

| Component | Status |
|-----------|--------|
| Python Service | ✅ Already working (port 8000) |
| Node Backend Routes | 🔄 To create |
| Node Backend Controller | 🔄 To create |
| Node Backend Service | 🔄 To create |
| Frontend UI | 🔄 To update |
| Authorization | ✅ Middleware exists |
| Error Handling | 🔄 To implement |
| Testing | 🔄 To perform |

**Total Files to Create: 3**
- `server/controllers/questionPaperAnalysisController.js`
- `server/services/questionPaperAnalysisService.js`
- `server/routes/questionPaperAnalysisRoutes.js`

**Total Files to Modify: 3**
- `server/server.js` (add route registration)
- `client/src/pages/student/AIChat.jsx` (replace UI)
- `server/.env` or create if needed (add QUESTION_ANALYSIS_SERVICE_URL)

**Total Files to Preserve: 20+**
- All existing routes, services, middleware
- Python service

---

## Approval Checkpoint

**Awaiting user approval to proceed with implementation.**

Please confirm:
1. ✅ Architecture and file structure acceptable?
2. ✅ Authorization strategy (student-only via middleware) acceptable?
3. ✅ File size limits (5MB frontend, 10MB Python) acceptable?
4. ✅ Ready to implement Phase 1?
