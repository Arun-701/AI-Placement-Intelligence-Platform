# Question Paper Analysis Integration - Detailed Inspection Report

## Inspection Complete ✅

I have thoroughly inspected:
- ✅ Entire existing team project structure
- ✅ Question Paper Analysis Python module (FastAPI)
- ✅ Express backend architecture (routes, controllers, middleware, services)
- ✅ React frontend structure (components, API layer, authentication)
- ✅ Authentication & authorization system
- ✅ Existing AI features (Resume AI, Career Recommendation)
- ✅ Existing Question Bank functionality (admin/faculty)
- ✅ Environment configuration
- ✅ Upload middleware patterns
- ✅ Error handling patterns

---

## Current State Summary

### Frontend
- **Route**: `/student/ai-chat`
- **Page**: `client/src/pages/student/AIChat.jsx`
- **Current UI**: Generic AI chat (send prompt → Gemini → display response)
- **Status**: Will be replaced with Question Paper Analysis UI

### Backend Architecture
- **Server**: Node.js + Express on port 5000 (default)
- **Auth**: JWT token in Authorization header
- **Middleware Stack**: verifyToken → authorizeRoles("student/faculty/admin")
- **File Upload**: Multer (existing middleware in `uploadMiddleware.js`)
- **Response Format**: Standard `{success: bool, message: string, data: object}`
- **Error Format**: Standard `{success: false, message: string, status: number}`

### Python Service
- **Framework**: FastAPI
- **Port**: 8000 (currently not integrated with Node backend)
- **Main Endpoint**: `POST /api/analyze/file` (accepts multipart/form-data with file)
- **Response**: Structured JSON with topics, difficulty distribution, study order, confidence scores
- **Models**: Pre-trained classifiers in `question-analysis-service/models/topic_classifier/`
- **Status**: Working independently, needs Node proxy layer

### Existing AI Services (DO NOT MODIFY)
1. **Gemini Integration**
   - Provider: Google GenAI SDK
   - Used by: AI Chat, Resume AI, Career Recommendation, Roadmap
   - Config: `server/config/aiProviders.js`

2. **Resume AI** (`/api/ai/resume-analysis`)
   - Analyzes uploaded resume
   - Calculates placement readiness
   - Student-only

3. **Career Recommendation** (`/api/ai/career-recommendation`)
   - Recommends careers based on skills
   - Student-only

4. **Roadmap AI** (`/api/ai/roadmap`)
   - Generates learning roadmap
   - Student-only

### Question Bank System (PRESERVE)
- **For**: Admin & Faculty to upload questions for assessments
- **Services**: 
  - `questionPaperOcrService.js` (OCR questions from images)
  - `questionPaperParser.js` (parse extracted text)
  - `questionUploadService.js` (manage uploads)
- **Routes**: `questionBankRoutes.js` (admin/faculty only)
- **Status**: Used by existing assessment/question management, do NOT touch

---

## Integration Requirements Met

✅ Python service already working on port 8000  
✅ Endpoint available: `POST /api/analyze/file`  
✅ Response schema well-defined  
✅ ML models trained and stored locally  
✅ No external ML training needed  
✅ Authorization middleware exists  
✅ File upload middleware exists  
✅ Response utilities exist  
✅ Error handling patterns established  

---

## Key Technical Details

### Python API Response Schema
```json
{
  "totalQuestions": 15,
  "extractionMethod": "PDF|OCR|TEXT",
  "pagesProcessed": 3,
  "topics": [
    {
      "subject": "Auto-Discovered",
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
  "subjectDistribution": {"Computer Science": 15},
  "difficultyDistribution": {"Easy": 3, "Medium": 8, "Hard": 4},
  "recommendedStudyOrder": ["TCP/IP", "DNS", "HTTP"],
  "mlQuestions": 15,
  "geminiQuestions": 0,
  "geminiUsed": false
}
```

### Node Response Wrapper (will follow existing pattern)
```json
{
  "success": true,
  "message": "Analysis completed successfully",
  "data": {
    ...Python response...
  }
}
```

### File Upload Flow
```
React FormData
  ↓ (fetch POST /api/ai/question-paper/analyze)
Node Multer Middleware
  ↓ (validates file type, size)
Node Controller
  ↓ (validates file exists)
Node Service
  ↓ (forwards to Python via HTTP multipart)
Python FastAPI
  ↓ (PDF extraction, OCR, ML classification)
Python API Response
  ↓ (JSON)
Node Service (parses response)
  ↓
Node Controller (wraps response)
  ↓
React Display
```

---

## Model Files Present

Located in: `question-analysis-service/models/topic_classifier/`

Files identified:
- `best_domain_classifier.joblib` - Trained domain classifier
- `topic_classifier_aptitude.joblib` - Aptitude topics
- `topic_classifier_artificial_intelligence.joblib` - AI topics
- `topic_classifier_cloud_computing.joblib` - Cloud topics
- `topic_classifier_coding.joblib` - Coding topics
- `topic_classifier_compiler_design.joblib` - Compiler topics
- `topic_classifier_computer_architecture.joblib` - Architecture topics
- `topic_classifier_computer_networks.joblib` - Networks topics
- `topic_classifier_data_structures.joblib` - Data structures topics
- `topic_classifier_dbms.joblib` - DBMS topics
- `topic_classifier_full_stack.joblib` - Full-stack topics
- `topic_classifier_machine_learning.joblib` - ML topics
- `topic_classifier_operating_systems.joblib` - OS topics
- `topic_classifier_software_engineering.joblib` - SE topics
- `classifier_metadata.json` - Metadata about models
- `training_evaluation_report.json` - Training metrics

**Status**: All models present, ready for use. No retraining needed.

---

## Environment Variables Audit

### Python Service (Already Set)
```
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=question_analysis
ML_CONFIDENCE_THRESHOLD=0.60
LLM_CONFIDENCE_THRESHOLD=0.60
GEMINI_API_KEY=AQ.Ab8RN6I0W1nQGxjvch4LCgsqIHAtOqJv_GCDQTJfSEZReUXdLg
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
SIMILARITY_THRESHOLD=0.28
TOPIC_SIMILARITY_THRESHOLD=0.45
CLUSTER_DISTANCE_THRESHOLD=0.45
TOPIC_MERGE_THRESHOLD=0.70
```

### Node Backend (Required)
```
MONGO_URI=<mongodb connection>
JWT_SECRET=<jwt secret>
GEMINI_API_KEY=<gemini api key>
PORT=5000
UPLOAD_DIR=<upload directory>
```

### New Variable Needed
```
QUESTION_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000
```
(Will be added to Node `.env` for Python service communication)

---

## Middleware Chain Analysis

### Existing Middleware Available

1. **`verifyToken`** (authMiddleware.js)
   - Extracts JWT from Authorization header
   - Verifies token validity
   - Fetches user from database (Student/Faculty/Admin)
   - Attaches `req.user` with user data and role
   - Returns 401 if token missing/invalid

2. **`authorizeRoles(...roles)`** (roleMiddleware.js)
   - Checks if user has one of the allowed roles
   - Returns 403 if role not authorized
   - Must be called AFTER verifyToken

3. **`questionUploadMiddleware.single("file")`** (uploadMiddleware.js)
   - Uses Multer for file upload handling
   - Validates file type (PDF, DOC, DOCX)
   - Validates file size (5MB max)
   - Saves file to `uploads/resumes/`
   - Returns 400 if file invalid/missing

### New Route Chain (will implement)
```javascript
router.post(
  '/question-paper/analyze',
  verifyToken,                           // 1. Authenticate
  authorizeRoles("student"),              // 2. Authorize student-only
  questionUploadMiddleware.single("file"), // 3. Upload handling
  analyzeQuestionPaper                    // 4. Analysis controller
);
```

---

## Authorization Matrix

| Route | Student | Faculty | Admin | Notes |
|-------|---------|---------|-------|-------|
| `/api/ai/question-paper/analyze` | ✅ **NEW** | ❌ 403 | ❌ 403 | Student-only feature |
| `/api/ai/chat` | ✅ Exists | ✅ Exists | ❌ 403 | Generic AI chat |
| `/api/ai/resume-analysis` | ✅ | ❌ | ❌ | Resume analysis |
| `/api/ai/career-recommendation` | ✅ | ❌ | ❌ | Career recommendation |
| `/api/ai/roadmap` | ✅ | ❌ | ❌ | Learning roadmap |
| `/api/question-bank/*` | ❌ | ✅ | ✅ | Admin/Faculty question management |

---

## Sidebar Navigation (Student)

Current items in `Layout.jsx`:
```
Dashboard
Assessments
Resume AI              ← Existing
Coding Profile
Learning Roadmap
AI Mentor             ← Will modify this route
Notifications
Announcements
Profile
```

The "AI Mentor" link already points to `/student/ai-chat` (no change needed).
We're just replacing the UI inside that page.

---

## Service Architecture Pattern (to follow)

Based on analysis of existing services like `resumeJDAnalysisService.js`:

```javascript
// Service Pattern
async function analyzeSomething(fileBuffer, mimeType) {
  // 1. Input validation
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("File is empty");
  }
  
  // 2. Call external service
  const externalResponse = await callExternalService(fileBuffer);
  
  // 3. Parse & validate response
  if (!externalResponse.ok) {
    throw new Error("External service error");
  }
  
  // 4. Return processed data
  return externalResponse.data;
}

// Controller Pattern
async function controller(req, res) {
  try {
    // 1. Validate request
    if (!req.file) {
      return errorResponse(res, { message: "No file uploaded", status: 400 });
    }
    
    // 2. Call service
    const result = await service(req.file.buffer, req.file.mimetype);
    
    // 3. Return success
    return successResponse(res, {
      message: "Analysis completed",
      data: result
    });
  } catch (error) {
    // 4. Handle errors
    return errorResponse(res, {
      message: error.message,
      status: error.status || 500
    });
  }
}

// Route Pattern
router.post(
  '/endpoint',
  verifyToken,
  authorizeRoles("student"),
  uploadMiddleware.single("file"),
  controller
);
```

---

## Python Service Dependencies

Required for Python service to run:
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
pymupdf==1.25.1
scikit-learn==1.6.0
pandas==2.2.3
numpy==2.2.1
pymongo==4.10.1
python-dotenv==1.0.1
pytesseract==0.3.13
Pillow>=11.1.0
sentence-transformers>=3.4.1
```

System requirement:
- Tesseract OCR installed (path in .env: `C:\Program Files\Tesseract-OCR\tesseract.exe`)

---

## HTTP Library Requirement

### Node Backend HTTP Communication

The Node backend will need to make HTTP requests to Python service.
Current analysis shows no explicit `axios` or `node-fetch` dependency.

Options:
1. Use native Node `fetch()` (Node 18+) - recommended, built-in
2. Add `axios` package - if needed
3. Use Node `http`/`https` modules - more verbose

**Decision**: Will implement using Node native `fetch()` (available in Node 18+)
If older Node version needed, will add `axios`.

---

## Test Data

Python service already has test data available:
- `question-analysis-service/sample_data/sample_questions.txt`
- `question-analysis-service/data/question_topic_dataset_1500.csv`
- `question-analysis-service/tests/` - existing test files

Can use these for testing Node ↔ Python integration.

---

## Production Readiness Checklist

- [x] Python models trained and stored
- [x] Python service health endpoint exists (`GET /api/health`)
- [x] Python response schema defined
- [x] Node middleware stack exists
- [x] File upload handling exists
- [x] Error response format standardized
- [x] Authorization middleware exists
- [ ] Node ↔ Python service proxy implemented **(TO DO)**
- [ ] Frontend UI updated **(TO DO)**
- [ ] Environment variables configured **(TO DO)**
- [ ] End-to-end testing performed **(TO DO)**

---

## Next Steps (Pending Approval)

### Files to Create (3)
1. `server/controllers/questionPaperAnalysisController.js`
2. `server/services/questionPaperAnalysisService.js`
3. `server/routes/questionPaperAnalysisRoutes.js`

### Files to Modify (3)
1. `server/server.js` - Add route registration
2. `client/src/pages/student/AIChat.jsx` - Replace UI
3. `server/.env` (create if missing) - Add Python service URL

### Files Preserved (20+)
- All existing routes, controllers, services, middleware
- Python service directory
- Question bank functionality
- Faculty/Admin features

---

## Estimated Implementation Time

- Phase 1 (Backend): 45-60 minutes
  - Create controller: 15 min
  - Create service: 15 min
  - Create routes: 10 min
  - Test Node ↔ Python: 15 min

- Phase 2 (Frontend): 30-45 minutes
  - Design UI layout: 15 min
  - Implement upload logic: 15 min
  - Implement results display: 15 min

- Phase 3 (Testing): 30-60 minutes
  - Unit tests for controller/service
  - Integration tests
  - End-to-end tests
  - Authorization tests

**Total**: 2-3 hours including testing

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Python service timeout | Medium | High | Add timeout handling (30s), retry logic |
| File upload fails | Low | Medium | Validate at multiple layers |
| ML model not loaded on startup | Low | High | Add health check before analysis |
| Authorization bypass | Low | Critical | Use tested middleware, no custom auth |
| Existing features break | Low | High | No changes to preserved files |
| Python service connection refused | Medium | High | Return 503 with helpful message |

---

## Approval Required For

✅ Proceed with Phase 1 (Backend) implementation?
✅ Proceed with Phase 2 (Frontend) implementation?
✅ Proceed with Phase 3 (Testing) implementation?
✅ Any changes to the plan?

**Please provide approval to proceed with implementation.**
