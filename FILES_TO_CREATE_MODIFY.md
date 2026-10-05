# Integration Plan - Files Summary

## INSPECTION COMPLETE ✅

All project components have been analyzed. Below is the **exact list of files to create/modify** when approval is granted.

---

## FILES TO CREATE (3 files)

### 1. `server/controllers/questionPaperAnalysisController.js`

**Purpose**: Handle incoming student requests for question paper analysis
**Size**: ~50-70 lines
**Responsibilities**:
- Validate file was uploaded
- Call analysis service
- Return response with standard format
- Handle errors (no file, service error, etc.)

**Will use**:
- `successResponse()` from `server/utils/response.js`
- `errorResponse()` from `server/utils/response.js`
- `questionPaperAnalysisService.analyzeQuestionPaperFile()`

---

### 2. `server/services/questionPaperAnalysisService.js`

**Purpose**: Communicate with Python FastAPI service
**Size**: ~100-150 lines
**Responsibilities**:
- Take file buffer and mimetype from controller
- Forward to Python service at `http://127.0.0.1:8000/api/analyze/file`
- Use multipart/form-data encoding
- Handle Python service errors (timeout, connection refused, invalid response)
- Parse and return JSON response
- Validate response structure

**Will use**:
- Node native `fetch()` API
- Environment variable: `QUESTION_ANALYSIS_SERVICE_URL`
- Timeout: 30 seconds (or configurable)

---

### 3. `server/routes/questionPaperAnalysisRoutes.js`

**Purpose**: Define the API route for question paper analysis
**Size**: ~20-30 lines
**Route**: `POST /api/ai/question-paper/analyze`
**Middleware chain**:
1. `verifyToken` - authenticate user
2. `authorizeRoles("student")` - student-only authorization
3. `questionUploadMiddleware.single("file")` - handle file upload
4. `analyzeQuestionPaper` - controller

**Will use**:
- `express.Router()`
- `verifyToken` from `server/middleware/authMiddleware.js`
- `authorizeRoles` from `server/middleware/roleMiddleware.js`
- `questionUploadMiddleware` from `server/middleware/uploadMiddleware.js`
- `analyzeQuestionPaper` controller

---

## FILES TO MODIFY (3 files)

### 1. `server/server.js`

**Line**: After existing AI routes (around line 60-70)
**Change**: Add route registration for question paper analysis

**Before** (around line 59-60):
```javascript
app.use("/api/ai", aiLimiter, careerRecommendationRoutes);
console.log("[INIT] Registered careerRecommendationRoutes");
```

**After** (add):
```javascript
const questionPaperAnalysisRoutes = require("./routes/questionPaperAnalysisRoutes");
app.use("/api/ai", questionPaperAnalysisRoutes);
console.log("[INIT] Registered questionPaperAnalysisRoutes");
```

**Impact**: Minimal, just adds one more route registration
**Testing**: Verify `/api/ai/question-paper/analyze` route exists

---

### 2. `client/src/pages/student/AIChat.jsx`

**Current state**: Generic AI chat UI (~65 lines)
**Change**: Replace entire content with Question Paper Analysis UI
**New features**:
- File input (accepts PDF/image)
- Analyze button
- Results display (topics, difficulty, priority, study order)
- Error messages
- Loading state
- Use `api.upload()` to send file to `/api/ai/question-paper/analyze`

**Estimated new size**: ~200-250 lines
**Keep**: Route path `/student/ai-chat` stays the same (for sidebar)
**Remove**: Generic chat UI, history display

**Will use**:
- `useState` hook
- `api.upload()` from `client/src/api.js`
- Existing CSS classes from project
- Layout: card-based sections

---

### 3. `server/.env` (create or update)

**Variable to add**:
```
QUESTION_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000
```

**Location**: Top-level `server/` directory
**If file exists**: Add this line
**If file doesn't exist**: Create with this line and other required vars

**Note**: This variable is read by `questionPaperAnalysisService.js`

---

## FILES TO NOT MODIFY (PRESERVED)

### Backend Services (DO NOT TOUCH)
- ❌ `server/services/questionPaperOcrService.js`
- ❌ `server/services/questionPaperParser.js`
- ❌ `server/services/questionUploadService.js`
- ❌ `server/services/resumeAnalysisService.js`
- ❌ `server/services/resumeJDAnalysisService.js`
- ❌ `server/services/careerRecommendationService.js`
- ❌ `server/services/geminiService.js`
- ❌ `server/services/aiResumeService.js`
- ❌ `server/services/roadmapService.js`

### Backend Routes (DO NOT TOUCH)
- ❌ `server/routes/questionBankRoutes.js`
- ❌ `server/routes/aiRoutes.js` (leave `/chat` route for other features)
- ❌ `server/routes/resumeAIRoutes.js`
- ❌ `server/routes/careerRecommendationRoutes.js`
- ❌ `server/routes/roadmapRoutes.js`
- ❌ `server/routes/facultyAssessmentRoutes.js`
- ❌ `server/routes/adminAssessmentRoutes.js`

### Backend Middleware (DO NOT TOUCH)
- ❌ `server/middleware/uploadMiddleware.js` (will reuse)
- ❌ `server/middleware/authMiddleware.js` (will reuse)
- ❌ `server/middleware/roleMiddleware.js` (will reuse)
- ❌ `server/middleware/errorHandler.js`
- ❌ `server/middleware/questionUploadMiddleware.js`

### Backend Controllers (DO NOT TOUCH)
- ❌ `server/controllers/aiController.js`
- ❌ `server/controllers/resumeAIController.js`
- ❌ `server/controllers/careerRecommendationController.js`
- ❌ `server/controllers/roadmapController.js`
- ❌ All faculty controllers
- ❌ All admin controllers

### Frontend Components (DO NOT TOUCH)
- ❌ `client/src/pages/Layout.jsx` (sidebar links already correct)
- ❌ `client/src/pages/student/Dashboard.jsx`
- ❌ `client/src/pages/student/AssessmentList.jsx`
- ❌ `client/src/pages/student/ResumeAnalysis.jsx`
- ❌ `client/src/pages/student/CodingProfile.jsx`
- ❌ `client/src/pages/student/Roadmap.jsx`
- ❌ `client/src/api.js` (will reuse existing methods)
- ❌ `client/src/AuthContext.jsx`
- ❌ `client/src/App.jsx`
- ❌ All faculty pages
- ❌ All admin pages

### Python Service (DO NOT TOUCH)
- ❌ `question-analysis-service/` (entire directory)
- ❌ `question-analysis-service/app/main.py`
- ❌ `question-analysis-service/app/routes/`
- ❌ `question-analysis-service/app/services/`
- ❌ `question-analysis-service/models/` (trained models)
- ❌ `question-analysis-service/requirements.txt`

### Configuration (DO NOT TOUCH)
- ❌ `server/config/aiProviders.js` (Gemini used by other services)
- ❌ `server/config/database.js`
- ❌ `server/config/validateEnv.js` (preserve, may add to checked vars)
- ❌ `server/config/gemini.js`

---

## SUMMARY TABLE

| Category | Action | Count | Files |
|----------|--------|-------|-------|
| **Create** | New files | 3 | Controller, Service, Routes |
| **Modify** | Update existing | 3 | server.js, AIChat.jsx, .env |
| **Preserve** | Keep unchanged | 30+ | All other services, routes, controllers, Python service |
| **Total** | | **6** | 3 create + 3 modify |

---

## DETAILED IMPLEMENTATION CHECKLIST

### Phase 1: Create Backend Files ✓ (Pending Approval)

- [ ] Create `server/controllers/questionPaperAnalysisController.js`
  - [ ] Import dependencies
  - [ ] Define `analyzeQuestionPaper()` function
  - [ ] Validate request
  - [ ] Call service
  - [ ] Return success/error response

- [ ] Create `server/services/questionPaperAnalysisService.js`
  - [ ] Import dependencies
  - [ ] Read `QUESTION_ANALYSIS_SERVICE_URL` from env
  - [ ] Define `analyzeQuestionPaperFile()` function
  - [ ] Build FormData with file
  - [ ] Send POST to Python service
  - [ ] Handle errors (timeout, connection, response)
  - [ ] Parse response
  - [ ] Return result

- [ ] Create `server/routes/questionPaperAnalysisRoutes.js`
  - [ ] Import dependencies
  - [ ] Create Express router
  - [ ] Define POST `/question-paper/analyze` route
  - [ ] Add middleware chain
  - [ ] Add controller
  - [ ] Export router

### Phase 2: Update Backend Server ✓ (Pending Approval)

- [ ] Update `server/server.js`
  - [ ] Add import for `questionPaperAnalysisRoutes`
  - [ ] Add route registration with console log

### Phase 3: Update Environment ✓ (Pending Approval)

- [ ] Create/Update `server/.env`
  - [ ] Add `QUESTION_ANALYSIS_SERVICE_URL=http://127.0.0.1:8000`

### Phase 4: Update Frontend ✓ (Pending Approval)

- [ ] Update `client/src/pages/student/AIChat.jsx`
  - [ ] Replace generic chat UI with question paper analysis UI
  - [ ] Add file input handling
  - [ ] Add upload button
  - [ ] Add loading state
  - [ ] Add results display
  - [ ] Add error handling
  - [ ] Call `/api/ai/question-paper/analyze`

### Phase 5: Testing ✓ (Pending Approval)

- [ ] Test Python service independently
  - [ ] `GET /api/health` returns OK
  - [ ] `POST /api/analyze/file` works with PDF

- [ ] Test Node → Python communication
  - [ ] Service correctly forwards file
  - [ ] Response parsed correctly
  - [ ] Errors handled

- [ ] Test Authorization
  - [ ] Student can access (200)
  - [ ] Faculty denied (403)
  - [ ] Admin denied (403)
  - [ ] No token denied (401)

- [ ] Test Frontend
  - [ ] File upload works
  - [ ] Analysis displays results
  - [ ] Errors display properly
  - [ ] Loading state shows

- [ ] Regression Testing
  - [ ] Resume AI still works
  - [ ] Career Recommendation still works
  - [ ] Roadmap still works
  - [ ] Faculty features unaffected
  - [ ] Admin features unaffected

---

## CRITICAL POINTS (DO NOT FORGET)

✅ **Authorization**: Use `authorizeRoles("student")` - STUDENT ONLY
✅ **File Upload**: Reuse existing `questionUploadMiddleware.single("file")`
✅ **Error Handling**: Use `errorResponse()` from utils
✅ **Python URL**: Read from environment variable, not hard-coded
✅ **Response Format**: Use standard `{success, message, data}` format
✅ **Timeout**: Implement timeout (30s) for Python service calls
✅ **Frontend Route**: Keep `/student/ai-chat` (no changes to sidebar)
✅ **No Changes to**: Question Bank, Faculty/Admin routes, other AI services
✅ **Python Service**: Remains independent on port 8000

---

## APPROVAL GATES

Before implementing each phase:

### Gate 1: Before Phase 1
- [ ] User approves overall architecture
- [ ] User confirms file structure is acceptable
- [ ] User confirms role authorization strategy

### Gate 2: Before Phase 2
- [ ] Backend implementation complete and tested
- [ ] Python ↔ Node communication verified

### Gate 3: Before Phase 3
- [ ] Frontend implementation complete
- [ ] UI layout approved

### Gate 4: Before Phase 5
- [ ] All code complete
- [ ] Ready for testing

---

## STARTUP COMMANDS (For Testing)

### Python Service
```bash
cd question-analysis-service
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Node Backend
```bash
cd server
npm install  # if new packages added
npm run dev
```

### React Frontend
```bash
cd client
npm run dev
```

### Expected URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Python: http://127.0.0.1:8000
- Student AI Mentor: http://localhost:5173/student/ai-chat

---

## FINAL NOTES

This integration is a **minimal change** approach:
- Creates only 3 new backend files
- Modifies only 3 existing files (server.js, AIChat.jsx, .env)
- Preserves all existing functionality
- Uses established patterns from existing code
- Leverages existing middleware and utilities
- Python service remains completely independent

The integration is **low-risk**:
- No changes to authorization system
- No changes to database schema
- No changes to other AI services
- No changes to question bank system
- No changes to faculty/admin features
- All existing tests should still pass

---

## ✅ READY FOR APPROVAL

**All files have been identified. Plan is complete.**

**Awaiting user approval to proceed with Phase 1 implementation.**

Please confirm by responding:
> Approval confirmed. Proceed with implementation.
