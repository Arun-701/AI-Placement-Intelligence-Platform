# AI Placement Intelligence Platform - Comprehensive Project Analysis

**Date:** September 10, 2026  
**Repository:** Arun-701/AI-Placement-Intelligence-Platform  
**Branch:** ak  
**Status:** Production Ready (Resume-JD Analysis Feature Complete)

---

## 1. PROJECT OVERVIEW

### Purpose
AI Placement Intelligence Platform is a comprehensive, **AI-powered campus placement readiness system** that helps students prepare for placements through:
- AI-based resume analysis
- Job description matching (Resume-JD analysis)
- Personalized learning roadmaps
- Placement assessments and mock tests
- Career recommendations
- Coding profile tracking
- AI-powered career assistant chat

### Main Features/Modules
1. **Resume AI Analysis** - Analyze resume structure, ATS compatibility, and skills
2. **Resume-JD Analysis** - Match resume against specific job descriptions with semantic analysis
3. **Assessments** - Create, assign, and take tests (Practice, Mock, Placement types)
4. **Roadmap Generation** - Personalized learning plans based on assessment performance
5. **Career Recommendations** - AI-powered career suggestions
6. **Coding Profile** - Track GitHub/LeetCode/HackerRank profiles
7. **AI Chat** - Career assistant chatbot for guidance
8. **Faculty Dashboard** - Monitor student progress and results
9. **Admin Portal** - Manage students, faculty, assessments, and question banks
10. **Announcements & Notifications** - Campus-wide communications

### Overall Architecture
- **Frontend:** React 19 + Vite + React Router (SPA)
- **Backend:** Node.js + Express 5
- **Database:** MongoDB with Mongoose ODM
- **AI Providers:** Multi-provider with automatic fallback (Gemini → Kimi/TokenRouter → NVIDIA)
- **Authentication:** JWT-based with role-based access control
- **File Processing:** PDF/DOCX text extraction with Tesseract OCR fallback
- **Real-time Features:** Notifications system

---

## 2. PROJECT STRUCTURE

### Root Directory
```
├── client/                          # React frontend (Vite)
├── server/                          # Express backend
├── docs/                            # Documentation
├── package.json                     # Root workspace config
├── README.md                        # Main readme
├── QUICK_START_GUIDE.md            # Setup instructions
└── [Documentation files]            # Various MD guides
```

### Important Folders & Files

#### **Client (Frontend)**
- **Location:** `client/`
- **Purpose:** React-based SPA with Vite bundler
- **Port:** 5173 (default), 5174 (fallback)

| Folder/File | Purpose |
|---|---|
| `src/App.jsx` | Main app router with role-based routes |
| `src/AuthContext.jsx` | Global authentication state management |
| `src/api.js` | HTTP client wrapper with token handling |
| `src/index.css` | Global styles |
| `src/pages/` | All page components (auth, student, faculty, admin) |
| `src/pages/student/` | Student dashboard, assessments, resume analysis, roadmap, AI chat |
| `src/pages/faculty/` | Faculty dashboard, student management, assessments, results |
| `src/pages/admin/` | Admin dashboard, user management, assessments, analytics |
| `vite.config.js` | Vite configuration with API proxy to `/api` |
| `package.json` | Frontend dependencies (React, React Router, etc.) |

#### **Server (Backend)**
- **Location:** `server/`
- **Purpose:** Express API server
- **Port:** 5000

| Folder/File | Purpose |
|---|---|
| `server.js` | Main entry point, Express app setup, route registration |
| `config/` | Configuration files (DB, environment, AI providers) |
| `config/database.js` | MongoDB connection and initialization |
| `config/aiProviders.js` | AI provider configuration (Gemini, Kimi, NVIDIA) |
| `config/validateEnv.js` | Environment variable validation |
| `controllers/` | Request handlers and business logic |
| `middleware/` | Auth, role-based access, uploads, rate limiting |
| `models/` | Mongoose schemas (Student, Faculty, Admin, Assessment, etc.) |
| `routes/` | Express route definitions (~20 route files) |
| `services/` | Business logic, AI integrations, analysis services |
| `utils/` | Utility functions (response formatter) |
| `middleware/uploadMiddleware.js` | File upload handling (multer) |
| `middleware/questionUploadMiddleware.js` | Question paper processing |
| `uploads/` | Uploaded files storage (resumes, documents) |

#### **Documentation**
- **Location:** `docs/`
- **Files:**
  - `API_DOCUMENTATION.md` - Complete API endpoint documentation
  - `postman_collection.json` - Postman API collection

---

## 3. TECHNOLOGY STACK

### Frontend Technologies
| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React | 19.2.7 |
| **Build Tool** | Vite | 8.1.1 |
| **Router** | React Router DOM | 7.18.2 |
| **Language** | JavaScript (ES6+) | - |
| **Styling** | CSS (plain, no CSS-in-JS) | - |
| **HTTP Client** | Fetch API (native) | - |
| **State Management** | React Context API | - |
| **Linting** | ESLint | 10.6.0 |

### Backend Technologies
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ (tested on 24) | JavaScript runtime |
| **Framework** | Express | 5.2.1 | HTTP server |
| **Language** | JavaScript (CommonJS) | - | Backend logic |
| **Package Manager** | npm | - | Dependency management |
| **Dev Tool** | nodemon | 3.1.14 | Auto-restart on changes |

### Database
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Database** | MongoDB | (Atlas or local) | NoSQL document store |
| **ODM** | Mongoose | 8.18.2 | Schema validation & ORM |

### APIs & External Services
| Service | Library | Purpose |
|---------|---------|---------|
| **AI Analysis** | @google/genai | Gemini API for resume/JD analysis |
| **Fallback AI** | OpenAI SDK | Fallback provider support |
| **PDF Processing** | pdf-parse | Extract text from PDF files |
| **DOCX Processing** | mammoth | Extract text from Word documents |
| **OCR** | tesseract.js | Optical character recognition fallback |
| **NLP Embeddings** | @huggingface/transformers | Semantic similarity calculations |
| **Email** | nodemailer | Send verification & reset emails |

### Authentication/Security
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **JWT** | jsonwebtoken | Token-based authentication |
| **Password Hashing** | bcryptjs | Secure password storage |
| **CORS** | cors | Cross-origin resource sharing |
| **Helmet** | helmet | HTTP security headers |
| **Rate Limiting** | express-rate-limit | API rate limiting |
| **Validation** | validator | Input validation |

### Build/Package Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **npm** | Latest | Package management |
| **dotenv** | 17.4.2 | Environment variable loading |
| **compression** | 1.8.1 | HTTP response compression |
| **multer** | 2.2.0 | File upload handling |

### Other Important Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| **winston** | 3.10.0 | Application logging |
| **word-extractor** | 1.0.4 | Word document parsing |

---

## 4. FRONTEND ANALYSIS

### Framework & Structure
- **Framework:** React 19 with Vite bundler
- **Module System:** ES6 modules
- **Routing:** React Router DOM v7
- **State Management:** React Context API (AuthContext)
- **Styling:** Plain CSS with class-based styling

### Entry Point
- **File:** `client/src/main.jsx`
- **Bootstrap:** Creates React root and renders `<App />`
- **HTML Template:** `client/index.html`

### Routing Structure
**File:** `client/src/App.jsx`

| Route | Component | Auth | Role | Purpose |
|-------|-----------|------|------|---------|
| `/` | Home | Required | Any | Redirect based on role & onboarding |
| `/login` | Login | Public | None | Student/Faculty login |
| `/register` | Register | Public | None | Student/Faculty registration |
| `/forgot-password` | ForgotPassword | Public | None | Password reset request |
| `/reset-password` | ResetPassword | Public | None | Password reset with token |
| `/verify-email` | VerifyEmail | Public | None | Email verification OTP |
| `/profile` | Profile | Required | Any | User profile management |
| `/notifications` | Notifications | Required | Any | User notifications |
| `/announcements` | Announcements | Required | Any | Campus announcements |
| **Student Routes** | | | | |
| `/student` | Dashboard | Required | Student | Main student dashboard |
| `/student/profile` | Dashboard | Required | Student | Profile completion (onboarding) |
| `/student/assessments` | AssessmentList | Required | Student | Browse available assessments |
| `/student/assessments/:id` | TakeAssessment | Required | Student | Take an assessment |
| `/student/results` | AssessmentResult | Required | Student | View assessment results |
| `/student/my-results` | MyResults | Required | Student | History of results |
| `/student/resume` | ResumeAnalysis | Required | Student | Resume AI analysis & JD matching |
| `/student/coding` | CodingProfile | Required | Student | GitHub/LeetCode profile tracking |
| `/student/roadmap` | Roadmap | Required | Student | Personalized learning roadmap |
| `/student/ai-chat` | AIChat | Required | Student | AI career assistant |
| **Faculty Routes** | | | | |
| `/faculty` | Dashboard | Required | Faculty | Faculty main dashboard |
| `/faculty/students` | Students | Required | Faculty | Assigned students list |
| `/faculty/assessments` | Assessments | Required | Faculty | Faculty assessments |
| `/faculty/assessments/:id/edit` | AssessmentEdit | Required | Faculty | Edit assessment |
| `/faculty/assessments/:id/assign` | AssessmentAssign | Required | Faculty | Assign to students |
| `/faculty/results` | Results | Required | Faculty | Student results |
| **Admin Routes** | | | | |
| `/admin` | Dashboard | Required | Admin | Admin dashboard |
| `/admin/students` | Students | Required | Admin | Student management |
| `/admin/faculties` | Faculties | Required | Admin | Faculty management |
| `/admin/assessments` | Assessments | Required | Admin | Assessment management |
| `/admin/assessments/:id/assign` | AssessmentAssign | Required | Admin | Batch assignment |
| `/admin/questions` | QuestionBank | Required | Admin | Question bank |
| `/admin/questions/upload` | QuestionUpload | Required | Admin | Upload questions |
| `/admin/reports` | Reports | Required | Admin | Analytics & reports |
| `/admin/announcements` | Announcements | Required | Admin | Create announcements |

### Main Pages/Components

#### Student Pages
- **Dashboard.jsx** - Student home, placement readiness score, quick links
- **AssessmentList.jsx** - Browse and filter assessments
- **TakeAssessment.jsx** - Assessment UI with timer, Q&A navigation
- **AssessmentResult.jsx** - Results display with score, feedback
- **ResumeAnalysis.jsx** - Resume upload, JD input, analysis results dashboard
- **CodingProfile.jsx** - LeetCode/HackerRank profile tracking
- **Roadmap.jsx** - Learning roadmap with milestones
- **AIChat.jsx** - AI career assistant chatbot
- **MyResults.jsx** - Assessment history

#### Faculty Pages
- **Dashboard.jsx** - Faculty overview, student progress
- **Students.jsx** - List of assigned students
- **Assessments.jsx** - Manage assessments
- **AssessmentEdit.jsx** - Edit assessment details
- **AssessmentAssign.jsx** - Assign to students
- **Results.jsx** - View student results
- **AssessmentResults.jsx** - Detailed results per assessment

#### Admin Pages
- **Dashboard.jsx** - System overview, statistics
- **Students.jsx** - Student management (CRUD)
- **Faculties.jsx** - Faculty management and approval
- **Assessments.jsx** - Assessment management
- **AssessmentDetails.jsx** - View assessment details
- **AssessmentAssign.jsx** - Batch assign assessments
- **QuestionBank.jsx** - Question management
- **QuestionUpload.jsx** - Bulk upload questions
- **Reports.jsx** - Analytics and reports
- **Announcements.jsx** - Create/edit announcements

#### Auth Pages
- **Login.jsx** - Login form (role selection)
- **Register.jsx** - Student/Faculty registration
- **ForgotPassword.jsx** - Password recovery
- **ResetPassword.jsx** - Reset with token
- **VerifyEmail.jsx** - Email OTP verification
- **Profile.jsx** - User profile (shared)
- **Notifications.jsx** - Notification center
- **Announcements.jsx** - View announcements

### API Service File
**File:** `client/src/api.js`

Purpose: Centralized HTTP client with automatic JWT handling

**Key Functions:**
- `getToken()` / `setToken()` - Token storage in localStorage
- `getUser()` / `setUser()` - User object storage in localStorage
- `request()` - Generic HTTP request wrapper
- `get()`, `post()`, `put()`, `delete()` - REST methods
- `upload()` - FormData file upload
- `putUpload()` - PUT with FormData

**API Base:** `/api` (proxied to `http://localhost:5000` in dev)

### State Management

#### Global Authentication State
**File:** `client/src/AuthContext.jsx`

**Context Structure:**
```javascript
{
  user: {
    _id,
    name,
    email,
    role: 'student' | 'faculty' | 'admin',
    profileCompleted: boolean,
    initialAssessmentCompleted: boolean,
    // ... other user fields
  },
  token: string | null,
  loading: boolean,
  login(kind, email, password): Promise<user>,
  logout(): void,
  refreshUser(): Promise<void>
}
```

**Auto-login:** On app load, checks localStorage for token and auto-refreshes user

#### Local Component State
- React `useState()` for individual component state
- Direct API calls using `api` module

### CSS/Styling Structure
- **Global Styles:** `client/src/index.css` - Base typography, colors, layout
- **Component Styles:** `client/src/App.css` - App-level styles
- **Inline Classes:** Components use class names from global CSS
- **No CSS Modules:** Uses plain CSS with semantic class names

**Key CSS Classes:**
- `.btn`, `.btn-primary`, `.btn-secondary` - Button styles
- `.card` - Card containers
- `.form-group`, `.form-control` - Form elements
- `.loading` - Loading spinner state
- `.error` - Error message styling
- `.dashboard` - Dashboard layout
- `.table` - Table styling

### Shared/Reusable Components

#### Layout Components
- **Layout.jsx** - Header/navigation wrapper (if exists)
- **Protected()** - Route protection wrapper (in App.jsx)
- **PublicOnly()** - Public route wrapper (in App.jsx)

#### Functional Patterns
- **Custom Hooks:** Uses React Context hook pattern
- **HTTP Wrapper:** `api` module for all API calls
- **Auth Pattern:** All protected routes check `useAuth()` hook

#### Reusable Functions (in `api.js`)
- `request()` - Generic HTTP handler with auth
- `getToken()` / `setToken()` - Token persistence
- `getUser()` / `setUser()` - User persistence

---

## 5. BACKEND ANALYSIS

### Framework
- **Framework:** Express 5.2.1
- **Type:** CommonJS modules (not ES6)
- **Port:** 5000 (configurable via `PORT` env var)
- **Entry Point:** `server/server.js`

### Main Packages
| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.2.1 | HTTP server framework |
| mongoose | 8.18.2 | MongoDB ODM |
| jsonwebtoken | 9.0.3 | JWT creation/verification |
| bcryptjs | 3.0.3 | Password hashing |
| cors | 2.8.6 | CORS middleware |
| helmet | 7.2.0 | Security headers |
| compression | 1.8.1 | Response compression |
| express-rate-limit | 6.7.0 | Rate limiting |
| multer | 2.2.0 | File uploads |
| nodemailer | 7.0.13 | Email sending |
| dotenv | 17.4.2 | Environment variables |
| winston | 3.10.0 | Logging |
| validator | 13.15.35 | Input validation |
| @google/genai | 2.13.0 | Gemini API client |
| pdf-parse | 2.4.5 | PDF text extraction |
| mammoth | 1.12.1 | DOCX text extraction |
| tesseract.js | 7.0.0 | OCR |

### Controllers (20 files)

| Controller | Responsibility |
|-----------|-----------------|
| `authController.js` | Register, login, password reset (Student & Faculty) |
| `studentController.js` | Resume upload, coding profile, profile management |
| `studentProfileController.js` | Profile completion, dashboard data |
| `studentAssessmentController.js` | Start, auto-save, submit assessments |
| `facultyController.js` | Faculty profile, dashboard, student list |
| `facultyAssessmentController.js` | Create/assign assessments for faculty |
| `facultyResultController.js` | Faculty view of student results |
| `adminController.js` | Student/Faculty/Announcements management |
| `adminAssessmentController.js` | Admin assessment management |
| `adminQuestionController.js` | Question upload/import |
| `assessmentController.js` | Assessment CRUD operations |
| `assessmentResultController.js` | Submit & retrieve assessment results |
| `questionBankController.js` | Question bank management |
| `resumeAIController.js` | Resume analysis (general) |
| `resumeJDController.js` | Resume-JD matching analysis |
| `careerRecommendationController.js` | Career suggestions |
| `aiController.js` | AI chat endpoint |
| `dashboardController.js` | Dashboard data (student/faculty/admin) |
| `notificationController.js` | Notification management |
| `announcementController.js` | Announcement CRUD |

### Services (19 files)

| Service | Purpose |
|---------|---------|
| `resumeAnalysisService.js` | Resume structure analysis, skills extraction |
| `resumeJDAnalysisService.js` | Semantic resume-JD matching, ATS scoring |
| `aiResumeService.js` | AI-powered resume profile building |
| `careerRecommendationService.js` | Career suggestions based on profile |
| `readinessService.js` | Placement readiness calculation |
| `readinessScoringService.js` | Readiness score computation |
| `assessmentAttemptService.js` | Assessment attempt logic |
| `assessmentEvaluationService.js` | Answer evaluation and grading |
| `geminiService.js` | Gemini API integration |
| `emailService.js` | Email sending (verification, reset) |
| `notificationService.js` | Notification creation/sending |
| `roadmapService.js` | Learning roadmap generation |
| `dashboardService.js` | Dashboard data aggregation |
| `studentProfileService.js` | Student profile operations |
| `codingProfileService.js` | GitHub/LeetCode profile fetching |
| `questionUploadService.js` | Question paper processing |
| `questionPaperParser.js` | Parse uploaded question papers |
| `questionPaperOcrService.js` | OCR for scanned question papers |
| `adminService.js` | Admin business logic |

### Models/Entities (9 Mongoose schemas)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Student.js** | Student user profile | email, password, name, phone, department, year, skills, resume, codingProfile, placementReadinessScore, resumeJDAnalysis, profileCompleted, initialAssessmentCompleted |
| **Faculty.js** | Faculty user profile | email, password, name, facultyId, department, designation, assignedStudents, approvalStatus, isVerified |
| **Admin.js** | Admin user profile | email, password, name, isActive, role |
| **Assessment.js** | Assessment/Test | title, description, assessmentType, questions, assignedStudents, totalMarks, passingMarks, status, isActive, deadline |
| **AssessmentResult.js** | Assessment submission | student, assessment, score, totalMarks, percentage, answers, completed, completedAt, feedback |
| **QuestionBank.js** | Question repository | title, subject, topic, difficulty, marks, question, options, correctAnswer, questionType, imageUrl |
| **Roadmap.js** | Learning plan | student, careerGoal, skillGaps, roadmapItems, progress, completedAt |
| **Notification.js** | User notification | recipient, title, message, type, read, createdAt |
| **Announcement.js** | Platform announcement | title, message, targetType, departments, createdBy |

### DTOs/Response Format
**Standard Response Wrapper** (defined in `server/utils/response.js`):
```javascript
{
  success: boolean,
  message: string,
  data: object | array | null
}
```

All API responses follow this format consistently.

### Exception/Error Handling

#### Middleware Error Handling
- **File:** `server/middleware/errorHandler.js`
- Catches all unhandled errors
- Returns consistent error response with status code

#### Error Response Pattern
```javascript
errorResponse(res, { message: string, status: number })
```

#### Validation Errors
- Input validation in controllers
- Returns 400 with clear message
- Mongoose schema validation

### Security/Authentication

#### Authentication Flow
1. **Login Endpoint** - `POST /api/auth/login` returns JWT token
2. **Token Storage** - Client stores in localStorage
3. **Token Verification** - `verifyToken` middleware in `authMiddleware.js`
4. **Token Refresh** - AuthContext refreshUser on app load
5. **Password Reset** - Email-based reset with tokens

#### JWT Details
- **Secret:** `process.env.JWT_SECRET`
- **Structure:** Includes user ID, role, email
- **Expiration:** Not explicitly set (long-lived)
- **Verification:** Check token, user existence, email verification status

#### Role-Based Access Control
- **Middleware:** `server/middleware/roleMiddleware.js`
- **Roles:** `student`, `faculty`, `admin`
- **Usage:** `authorizeRoles('student', 'faculty')` in routes
- **Faculty Approval:** Admin must approve faculty accounts before login

#### Onboarding Requirements
- **Profile Completion:** Students must complete profile before full access
- **Initial Assessment:** Students must complete initial assessment for many features
- **Middleware:** `server/middleware/onboardingMiddleware.js`
- **Protected Routes:** `requireProfileComplete()`, `requireAssignmentComplete()`

### Important Configuration Files

| File | Purpose |
|------|---------|
| `server/config/database.js` | MongoDB connection, initialization |
| `server/config/validateEnv.js` | Environment variable validation |
| `server/config/aiProviders.js` | AI provider configuration |
| `server/middleware/rateLimit.js` | Rate limiting configuration |
| `server/middleware/authMiddleware.js` | JWT verification |
| `server/middleware/roleMiddleware.js` | Role authorization |
| `.env` (root) | Environment variables |

---

## 6. DATABASE ANALYSIS

### Database Technology
- **Database:** MongoDB (Atlas or local)
- **ODM:** Mongoose 8.18.2
- **Connection:** Via `MONGO_URI` environment variable

### Main Collections/Entities

| Entity | Purpose | Related To |
|--------|---------|-----------|
| **students** | Student users | assessments, results, roadmap, notifications |
| **faculties** | Faculty users | assessments, results, students (assigned) |
| **admins** | Admin users | announcements |
| **assessments** | Tests/Quizzes | questionbanks, results, students (assigned) |
| **assessmentresults** | Test submissions | students, assessments, questionbanks |
| **questionbanks** | Question repository | assessments, results |
| **roadmaps** | Learning plans | students |
| **notifications** | User notifications | students, faculties, admins |
| **announcements** | Campus communications | admins, students, faculties |

### Entity Relationships

```
Student (1) ---> (M) Assessment (via assignedStudents)
Student (1) ---> (M) AssessmentResult
Student (1) ---> (1) Roadmap
Student (1) ---> (M) Notification
Student (1) ---> (M) CodingProfile (embedded)

Faculty (1) ---> (M) Assessment (via assignedFaculty)
Faculty (1) ---> (M) Student (assigned)
Faculty (1) ---> (M) Notification

Assessment (1) ---> (M) QuestionBank
Assessment (1) ---> (M) AssessmentResult
Assessment (1) ---> (M) Student (assigned)

AssessmentResult (M) ---> (1) Student
AssessmentResult (M) ---> (1) Assessment

Announcement (M) ---> (1) Admin (createdBy)
Announcement targets Students/Faculty via targetType & departments

Roadmap (1) ---> (1) Student (unique)

Notification recipients: Student | Faculty | Admin
```

### Important Fields

#### Student Model Key Fields
```
• _id: ObjectId
• email: String (unique)
• password: String (hashed with bcryptjs)
• name: String
• phone: String
• college: String
• department: String
• year: Number (1-8)
• gender: String (enum)
• dateOfBirth: Date
• skills: [String]
• cgpa: Number
• resume: String (file path)
• codingProfile: {
    codeChef, codeForces, hackerRank, leetCode: String
  }
• placementReadinessScore: Number (0-100)
• resumeJDAnalysis: Object (latest analysis)
• profileCompleted: Boolean
• initialAssessmentCompleted: Boolean
• isActive: Boolean
• isVerified: Boolean (email verified)
• createdAt, updatedAt: Date
```

#### Assessment Model Key Fields
```
• _id: ObjectId
• title: String
• description: String
• assessmentType: String (enum: Practice, Internal, Mock, Placement, Initial)
• questions: [ObjectId] (refs to QuestionBank)
• assignedStudents: [ObjectId] (refs to Student)
• assignedFaculty: ObjectId (ref to Faculty)
• createdByAdmin: ObjectId (ref to Admin)
• totalMarks: Number
• passingMarks: Number
• status: String (Draft, Published, Archived)
• isActive: Boolean
• deadline: Date
• isInitialAssessment: Boolean
• createdAt, updatedAt: Date
```

#### AssessmentResult Model Key Fields
```
• _id: ObjectId
• student: ObjectId (ref to Student)
• assessment: ObjectId (ref to Assessment)
• score: Number
• totalMarks: Number
• percentage: Number (0-100)
• answers: [{
    question: ObjectId,
    selectedAnswer: String,
    isCorrect: Boolean,
    marksObtained: Number
  }]
• completed: Boolean
• completedAt: Date
• feedback: String
• createdAt, updatedAt: Date
```

### How Frontend/Backend Communicate with Database

1. **Frontend → Backend (HTTP):**
   - Frontend makes API calls via `api.js` module
   - Sends JSON payloads or FormData (for files)
   - Includes JWT token in Authorization header

2. **Backend → Database (Mongoose):**
   - Controllers use Mongoose models
   - Services perform business logic queries
   - Responses wrapped in standard format

3. **Data Flow Example (Assessment):**
   ```
   Frontend: POST /api/assessment/:id/submit
      ↓
   Backend Controller: submitAssessmentAttempt()
      ↓
   Backend Service: evaluateAnswers()
      ↓
   Mongoose: AssessmentResult.create()
      ↓
   MongoDB: Insert document
      ↓
   Backend: Return result in standard response
      ↓
   Frontend: Display results to user
   ```

4. **Authentication Data Flow:**
   ```
   Frontend: POST /api/auth/login
      ↓
   Backend: Find user, verify password
      ↓
   Backend: Generate JWT token
      ↓
   Frontend: Store token + user in localStorage
      ↓
   Subsequent Requests: Include Bearer token in header
      ↓
   Backend Middleware: Verify token, populate req.user
   ```

---

## 7. API ANALYSIS

### Complete API Endpoints Reference

#### **Authentication Routes** (`/api/auth`)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/auth/register` | Public | Student registration |
| POST | `/auth/login` | Public | Student login |
| POST | `/auth/forgot-password` | Public | Request password reset |
| POST | `/auth/reset-password` | Public | Reset password with token |
| POST | `/auth/verify-email-otp` | Public | Verify email with OTP |
| POST | `/auth/resend-verification` | Public | Resend verification email |
| POST | `/auth/faculty/register` | Public | Faculty registration |
| POST | `/auth/faculty/login` | Public | Faculty login |
| POST | `/auth/faculty/forgot-password` | Public | Faculty password reset |
| POST | `/auth/faculty/reset-password` | Public | Faculty password reset confirm |
| GET | `/auth/profile` | Auth (Any) | Get logged-in user profile |
| POST | `/auth/change-password` | Auth (Any) | Change password |
| PATCH | `/auth/account-status` | Auth (Any) | Update account status |
| POST | `/auth/upload-resume` | Auth (Student) | Upload resume file |

#### **Student Routes** (`/api/student`)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/student/dashboard` | Student | Student dashboard data |
| GET | `/student/profile` | Student | Get student profile |
| PUT | `/student/profile` | Student | Update student profile |
| GET | `/student/profile-completion` | Student | Check onboarding status |
| GET | `/student/coding-profile` | Student | Get coding profiles |
| PUT | `/student/coding-profile` | Student | Update coding profiles |
| POST | `/student/coding-profile/refresh` | Student | Refresh from platforms |
| POST | `/student/resume` | Student | Upload resume |
| GET | `/student/resume` | Student | Get resume details |
| PUT | `/student/resume` | Student | Replace resume |
| DELETE | `/student/resume` | Student | Delete resume |

#### **Assessments** (`/api/assessment`, `/api/assessment-result`)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/assessment/initial` | Student | Get initial onboarding assessment |
| GET | `/assessment/my` | Student | Get assigned assessments |
| POST | `/assessment/:id/start` | Student | Start assessment attempt |
| POST | `/assessment/:id/auto-save` | Student | Auto-save answers |
| POST | `/assessment/:id/submit` | Student | Submit assessment |
| GET | `/assessment/history` | Student | Assessment history |
| GET | `/assessment/result/:resultId` | Student | Get specific result |
| GET | `/assessment/readiness-score` | Student | Placement readiness score |
| POST | `/assessment/` | Faculty/Admin | Create assessment |
| GET | `/assessment/` | Faculty/Admin | List assessments |
| GET | `/assessment/:id` | Faculty/Admin | Get assessment details |
| PUT | `/assessment/:id` | Faculty/Admin | Update assessment |
| DELETE | `/assessment/:id` | Faculty/Admin | Delete assessment |
| POST | `/assessment-result/` | Student | Submit result |
| GET | `/assessment-result/my` | Student | Get my results |
| GET | `/assessment-result/:id` | Student/Faculty | Get result details |
| PUT | `/assessment-result/:id/feedback` | Faculty | Add feedback |

#### **AI & Resume Analysis** (`/api/ai`)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/ai/chat` | Student | AI chat endpoint |
| GET | `/ai/resume-analysis` | Student | Get resume analysis |
| POST | `/ai/analyze-resume` | Student | Analyze resume |
| GET | `/ai/resume-analysis-update` | Student | Check analysis status |
| GET | `/ai/readiness-assessment` | Student | Get readiness assessment |
| POST | `/ai/analyze-resume-jd` | Student | Resume-JD analysis |
| GET | `/ai/resume-jd-analysis` | Student | Get JD analysis results |
| GET | `/ai/career-recommendation` | Student | Career recommendations |

#### **Faculty Routes** (`/api/faculty`)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/faculty/profile` | Faculty | Get faculty profile |
| GET | `/faculty/dashboard` | Faculty | Faculty dashboard |
| GET | `/faculty/students` | Faculty | List assigned students |
| GET | `/faculty/assessments/` | Faculty | List faculty assessments |
| GET | `/faculty/assessments/students` | Faculty | List students for assessment |
| POST | `/faculty/assessments/extract` | Faculty | Extract material from file |
| POST | `/faculty/assessments/` | Faculty | Create assessment |
| POST | `/faculty/assessments/:id/assign` | Faculty | Assign assessment |
| GET | `/faculty/assessments/:id/details` | Faculty | Get assessment details |
| PUT | `/faculty/assessments/:id/title` | Faculty | Update title |
| PATCH | `/faculty/assessments/:id/deadline` | Faculty | Update deadline |
| DELETE | `/faculty/assessments/:id` | Faculty | Delete assessment |
| GET | `/faculty/results/` | Faculty | All results |
| GET | `/faculty/results/dashboard/statistics` | Faculty | Results statistics |
| GET | `/faculty/results/:studentId` | Faculty | Student results |
| GET | `/faculty/results/:studentId/:resultId` | Faculty | Detailed result |

#### **Admin Routes** (`/api/admin`)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/admin/register` | Public | Admin registration |
| POST | `/admin/login` | Public | Admin login |
| POST | `/admin/forgot-password` | Public | Admin password reset |
| POST | `/admin/reset-password` | Public | Admin password confirm |
| GET | `/admin/profile` | Admin | Admin profile |
| POST | `/admin/questions/upload` | Admin | Upload questions |
| POST | `/admin/questions/import` | Admin | Import questions |
| GET | `/admin/students` | Admin | List students |
| GET | `/admin/students/:id` | Admin | Get student details |
| POST | `/admin/students` | Admin | Create student |
| PUT | `/admin/students/:id` | Admin | Update student |
| DELETE | `/admin/students/:id` | Admin | Delete student |
| GET | `/admin/faculties` | Admin | List faculty |
| GET | `/admin/faculties/:id` | Admin | Get faculty details |
| POST | `/admin/faculties` | Admin | Create faculty |
| PUT | `/admin/faculties/:id` | Admin | Update faculty |
| DELETE | `/admin/faculties/:id` | Admin | Delete faculty |
| PATCH | `/admin/faculties/:id/approve` | Admin | Approve faculty |
| PATCH | `/admin/faculties/:id/reject` | Admin | Reject faculty |
| GET | `/admin/announcements/departments` | Admin | Get departments list |
| GET | `/admin/announcements` | Admin | List announcements |
| POST | `/admin/announcements` | Admin | Create announcement |
| POST | `/admin/faculties/:facultyId/assign-students` | Admin | Assign students to faculty |
| POST | `/admin/faculties/:facultyId/remove-students` | Admin | Unassign students |
| GET | `/admin/dashboard` | Admin | Admin dashboard |
| GET | `/admin/statistics` | Admin | System statistics |
| GET | `/admin/reports/students` | Admin | Student report |
| GET | `/admin/reports/faculties` | Admin | Faculty report |
| GET | `/admin/reports/assessments` | Admin | Assessment report |

#### **Admin Assessments** (`/api/admin/assessments`)

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| GET | `/admin/assessments/departments` | Admin | List departments |
| GET | `/admin/assessments/` | Admin | List assessments |
| POST | `/admin/assessments/` | Admin | Create assessment |
| POST | `/admin/assessments/:id/assign` | Admin | Assign assessment |
| PATCH | `/admin/assessments/:id/deadline` | Admin | Update deadline |
| POST | `/admin/assessments/:id/enable` | Admin | Enable assessment |
| GET | `/admin/assessments/:id/details` | Admin | Get details |
| PUT | `/admin/assessments/edit/:id` | Admin | Update assessment |
| DELETE | `/admin/assessments/:id` | Admin | Delete assessment |

#### **Other Routes**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/question-bank/` | GET | List questions (Faculty/Admin) |
| `/question-bank/` | POST | Create question (Faculty/Admin) |
| `/question-bank/:id` | GET | Get question (Faculty/Admin) |
| `/question-bank/:id` | PUT | Update question (Faculty/Admin) |
| `/question-bank/:id` | DELETE | Delete question (Faculty/Admin) |
| `/notification/` | GET | Get notifications (Auth) |
| `/notification/unread` | GET | Get unread (Auth) |
| `/notification/:id/read` | PATCH | Mark as read (Auth) |
| `/notification/read-all` | PATCH | Mark all as read (Auth) |
| `/notification/:id` | DELETE | Delete notification (Auth) |
| `/announcements/` | GET | List visible announcements (Auth) |
| `/roadmap` | GET | Get roadmap (Student) |
| `/roadmap/generate` | POST | Generate roadmap (Student) |
| `/roadmap/milestone/:id` | PATCH | Update milestone (Student) |
| `/roadmap/progress` | GET | Get progress (Student) |
| `/roadmap/me` | GET | Get my roadmap (Student) |
| `/roadmap/progress` | PUT | Update progress (Student) |
| `/dashboard/student` | GET | Student dashboard (Student) |
| `/dashboard/faculty` | GET | Faculty dashboard (Faculty) |
| `/dashboard/student/analytics` | GET | Student analytics (Student) |
| `/dashboard/faculty/analytics` | GET | Faculty analytics (Faculty) |
| `/dashboard/placement-analytics` | GET | Placement analytics (Student/Faculty) |

---

## 8. AUTHENTICATION AND ROLES

### Login Flow

#### Student Login
```
1. User enters email/password on /login page
2. POST /api/auth/login with credentials
3. Backend:
   a. Find student by email
   b. Verify password with bcryptjs
   c. Check email verification status
   d. Generate JWT token
   e. Return token + student object
4. Frontend:
   a. Store token in localStorage
   b. Store user object in localStorage
   c. Update AuthContext
   d. Redirect based on onboarding status
5. Subsequent requests: Include "Bearer {token}" in Authorization header
```

#### Faculty Login
```
1. Same as student but:
   - POST /api/auth/faculty/login
   - Verify approvalStatus === "APPROVED"
   - Only approved faculty can login
```

#### Admin Login
```
1. POST /api/admin/login
2. Same JWT process as student/faculty
```

### User Roles

| Role | Description | Key Features | Approval Required |
|------|-------------|--------------|-------------------|
| **Student** | Placement applicant | Take assessments, upload resume, view analysis, roadmap, chat | No |
| **Faculty** | Academic advisor/mentor | Create assessments, view assigned students, provide feedback | Yes (by Admin) |
| **Admin** | System administrator | Manage users, assessments, questions, reports | No |

### Role-Based Access Control

#### Implementation
- **Middleware:** `server/middleware/roleMiddleware.js`
- **Function:** `authorizeRoles(...roles)`
- **Usage:** `router.get('/path', verifyToken, authorizeRoles('student'), handler)`

#### Route Protection Examples
```javascript
// Student-only
router.get('/student/dashboard', verifyToken, authorizeRoles('student'), ...);

// Faculty or Admin
router.get('/assessments', verifyToken, authorizeRoles('faculty', 'admin'), ...);

// Any authenticated user
router.get('/profile', verifyToken, ...);
```

### Protected Routes/Endpoints

#### Student-Protected Routes
- All `/api/student/*` endpoints
- Resume upload/analysis
- Assessment taking
- Roadmap access
- AI chat
- Coding profile management

#### Faculty-Protected Routes
- `/api/faculty/assessments/*`
- `/api/faculty/results/*`
- Assessment creation/assignment
- Student feedback

#### Admin-Protected Routes
- `/api/admin/*`
- Student/Faculty CRUD
- Assessment management
- Question bank upload
- System reports

### Authentication Validation

#### JWT Verification Process (middleware)
1. Extract Authorization header
2. Check for "Bearer {token}" format
3. Verify token signature with `JWT_SECRET`
4. Extract payload (userId, role)
5. Fetch user from database
6. Check `isActive` status
7. Verify email if required
8. Check faculty `approvalStatus` === "APPROVED"
9. Verify token not issued before password change
10. Attach user object to `req.user`

#### Onboarding Enforcement

| Stage | Requirement | Blocked Routes |
|-------|-------------|-----------------|
| 1. Email Verified | Must verify email OTP | Login |
| 2. Profile Complete | Must fill profile info | Most student routes |
| 3. Initial Assessment | Must complete initial assessment | Advanced features (roadmap, etc.) |

**Middleware:** `server/middleware/onboardingMiddleware.js`
- `requireProfileComplete()` - Checks `student.profileCompleted`
- `requireAssignmentComplete()` - Checks `student.initialAssessmentCompleted`

---

## 9. EXISTING MODULES

### Module 1: Authentication & User Management

**Scope:** User registration, login, password reset, email verification

**Components:**
- **Routes:** `authRoutes.js`
- **Controllers:** `authController.js`
- **Models:** `Student.js`, `Faculty.js`, `Admin.js`
- **Services:** `emailService.js` (for OTP/reset emails)
- **Middleware:** `authMiddleware.js`, `roleMiddleware.js`

**Key Features:**
- JWT-based authentication
- Email verification with OTP
- Password hashing with bcryptjs
- Password reset via email token
- Role-based login (Student/Faculty/Admin)
- Faculty approval workflow

---

### Module 2: Assessment & Testing

**Scope:** Create, assign, take, and evaluate assessments

**Components:**
- **Routes:** `assessmentRoutes.js`, `assessmentResultRoutes.js`, `adminAssessmentRoutes.js`, `facultyAssessmentRoutes.js`
- **Controllers:** `assessmentController.js`, `assessmentResultController.js`, `adminAssessmentController.js`, `facultyAssessmentController.js`
- **Models:** `Assessment.js`, `AssessmentResult.js`, `QuestionBank.js`
- **Services:** `assessmentAttemptService.js`, `assessmentEvaluationService.js`

**Key Features:**
- Multiple assessment types (Practice, Mock, Placement, Internal, Initial)
- MCQ and written questions support
- Auto-save functionality during assessment
- Automatic answer evaluation
- Score calculation with passing marks
- Faculty feedback on results
- Initial onboarding assessment
- Assessment assignment to students/departments
- Question bank management
- Bulk question import/upload

---

### Module 3: Resume Analysis

**Scope:** AI-powered resume analysis and scoring

**Components:**
- **Routes:** `resumeAIRoutes.js`, `resumeJDRoutes.js`
- **Controllers:** `resumeAIController.js`, `resumeJDController.js`
- **Models:** `Student.js` (stores analysis)
- **Services:** `resumeAnalysisService.js`, `resumeJDAnalysisService.js`, `aiResumeService.js`
- **Middleware:** `uploadMiddleware.js`

**Key Features:**
- Resume upload (PDF/DOCX)
- General resume analysis (structure, ATS compatibility, skills)
- **Resume-JD Matching:**
  - Semantic analysis (not just keywords)
  - ATS Score calculation (0-100)
  - Job Match Score (0-100)
  - Matched/Missing skills identification
  - Keywords analysis
  - Actionable recommendations
  - Fallback analysis if AI unavailable
- Text extraction from PDF/DOCX
- Semantic similarity using embeddings

---

### Module 4: Roadmap Generation

**Scope:** Personalized learning plan based on assessment performance

**Components:**
- **Routes:** `roadmapRoutes.js`
- **Controllers:** `roadmapController.js`
- **Models:** `Roadmap.js`
- **Services:** `roadmapService.js`

**Key Features:**
- Generate roadmap based on assessment gaps
- Skill gap identification
- Learning milestones with resources
- Progress tracking
- Milestone status updates (Pending/In Progress/Completed)
- Integration with assessment results

---

### Module 5: Career Recommendations

**Scope:** AI-powered career guidance and job recommendations

**Components:**
- **Routes:** `careerRecommendationRoutes.js`
- **Controllers:** `careerRecommendationController.js`
- **Services:** `careerRecommendationService.js`

**Key Features:**
- Career suggestions based on skills/interests
- Job role compatibility analysis
- Personalized recommendations
- Career path guidance

---

### Module 6: AI Chat Assistant

**Scope:** Interactive AI chatbot for career guidance

**Components:**
- **Routes:** `aiRoutes.js`
- **Controllers:** `aiController.js`
- **Services:** `geminiService.js` (AI provider integration)

**Key Features:**
- Real-time chat interface
- AI-powered responses using Gemini API
- Multi-provider fallback (Kimi, NVIDIA)
- Context-aware responses

---

### Module 7: Coding Profile Tracking

**Scope:** Track student's coding platform profiles and statistics

**Components:**
- **Routes:** `studentRoutes.js` (embedded)
- **Controllers:** `studentController.js`
- **Models:** `Student.js` (codingProfile field)
- **Services:** `codingProfileService.js`

**Key Features:**
- LeetCode profile integration
- HackerRank integration
- CodeChef integration
- Codeforces integration
- GitHub profile tracking
- Profile statistics display

---

### Module 8: Dashboard & Analytics

**Scope:** Summary views and analytics for all roles

**Components:**
- **Routes:** `dashboardRoutes.js`
- **Controllers:** `dashboardController.js`
- **Services:** `dashboardService.js`

**Key Features:**
- **Student Dashboard:**
  - Placement readiness score
  - Upcoming assessments
  - Recent results
  - Resume status
  - Roadmap progress
  
- **Faculty Dashboard:**
  - Assigned students overview
  - Assessment results summary
  - Class performance analytics
  
- **Admin Dashboard:**
  - System-wide statistics
  - User counts
  - Assessment metrics
  - Reports generation

---

### Module 9: Notifications & Announcements

**Scope:** User notifications and platform-wide announcements

**Components:**
- **Routes:** `notificationRoutes.js`, `announcementRoutes.js`
- **Controllers:** `notificationController.js`, `announcementController.js`
- **Models:** `Notification.js`, `Announcement.js`
- **Services:** `notificationService.js`

**Key Features:**
- Personal notifications (read/unread)
- Batch mark as read
- Notification deletion
- Campus announcements
- Targeted announcements (by department)
- Announcement management (Admin)

---

### Module 10: Student & Faculty Management

**Scope:** User CRUD operations and faculty approval

**Components:**
- **Routes:** `adminRoutes.js`
- **Controllers:** `adminController.js`
- **Models:** `Student.js`, `Faculty.js`
- **Services:** `adminService.js`

**Key Features:**
- Student creation/update/deletion
- Faculty registration and approval workflow
- Batch student-to-faculty assignment
- Student bulk operations
- Faculty account status management

---

## 10. INTEGRATION ANALYSIS

### Where New Frontend Module Should Be Placed

```
client/src/pages/
├── [new-module]/              # Create new folder
│   ├── Dashboard.jsx          # Main page
│   ├── DetailView.jsx         # Detail pages
│   ├── FormPage.jsx           # Input forms
│   ├── ResultsPage.jsx        # Results display
│   └── [other components].jsx # Feature components
```

**Naming Convention:** Use kebab-case folder names, PascalCase component names (e.g., `client/src/pages/my-feature/MyFeatureDashboard.jsx`)

**Integration Point in App.jsx:**
```jsx
// Add route
<Route path="/my-feature" element={<Protected role="student"><MyFeatureDashboard /></Protected>} />

// Add corresponding page import
import MyFeatureDashboard from './pages/my-feature/MyFeatureDashboard'
```

### Where Backend Code Should Be Placed

```
server/
├── controllers/myFeatureController.js      # Handlers
├── routes/myFeatureRoutes.js               # Route definitions
├── models/MyFeature.js                     # Database schema
├── services/myFeatureService.js            # Business logic
├── middleware/[if needed]/                 # Custom middleware
└── utils/[if shared]/                      # Utility functions
```

**Naming Convention:** Consistent camelCase for files, model names in PascalCase

### How Routing Should Be Integrated

#### Frontend Routing
1. **Add page component** in `client/src/pages/[module]/`
2. **Import in App.jsx**
3. **Add route definition:**
```jsx
<Route 
  path="/[module]" 
  element={<Protected role="[role]"><ModuleComponent /></Protected>} 
/>
```
4. **Update navigation links** (if sidebar/menu exists)

#### Backend Routing
1. **Create routes file:** `server/routes/[module]Routes.js`
2. **Export router** from file
3. **Import in server.js:** `const moduleRoutes = require('./routes/moduleRoutes');`
4. **Register with app:**
```javascript
app.use('/api/[module]', [rateLimiter], moduleRoutes);
```

**Standard Path Convention:** `/api/[module]/[resource]`

### How APIs Should Be Integrated

#### Frontend API Calls
Use the `api` module:
```jsx
import { api } from '../../api'

// GET
const response = await api.get('/module/resource')

// POST
const response = await api.post('/module/action', { data })

// PUT
const response = await api.put('/module/resource/:id', { data })

// DELETE
const response = await api.delete('/module/resource/:id')

// File Upload
const formData = new FormData()
formData.append('file', file)
const response = await api.upload('/module/upload', formData)
```

**Response Format:**
```javascript
{
  ok: boolean,
  data: {
    success: boolean,
    message: string,
    data: object
  }
}
```

#### Backend API Structure
```javascript
// In controller
const moduleFunction = async (req, res) => {
  try {
    // Validation
    if (!req.body.field) {
      return errorResponse(res, { message: "Field required", status: 400 });
    }
    
    // Business logic
    const result = await ModuleService.process(req.body);
    
    // Success response
    return successResponse(res, result, "Operation successful", 200);
  } catch (error) {
    return errorResponse(res, { message: error.message, status: 500 });
  }
};

// In routes file
router.post('/action', verifyToken, authorizeRoles('student'), moduleFunction);
```

### How Authentication/Roles Should Be Handled

#### Protect New Routes
```javascript
// Student-only
router.get('/my-data', verifyToken, authorizeRoles('student'), handler);

// Faculty or Admin
router.post('/manage', verifyToken, authorizeRoles('faculty', 'admin'), handler);

// Any authenticated user
router.get('/public-data', verifyToken, handler);
```

#### Enforce Onboarding (if needed)
```javascript
router.get(
  '/feature',
  verifyToken,
  authorizeRoles('student'),
  requireAssignmentComplete,  // Add this for student-only features
  handler
);
```

#### In Frontend Components
```jsx
import { useAuth } from '../AuthContext'

export default function MyComponent() {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'student') return <Navigate to="/" />
  
  // Component logic
}
```

### Files That Probably Need Modification

1. **`server/server.js`**
   - Import new routes
   - Register with `app.use()`
   - May need new middleware

2. **`client/src/App.jsx`**
   - Add route imports
   - Add route definitions
   - Possibly update navigation

3. **`server/models/*.js`** (if module needs new entities)
   - Create new model files
   - No modification to existing models needed

4. **`.env` (or environment template)**
   - Add any new environment variables
   - Document new config options

### Files That Should NOT Be Overwritten

**Critical Infrastructure Files:**
- `server/middleware/authMiddleware.js` - DO NOT modify
- `server/middleware/roleMiddleware.js` - DO NOT modify
- `server/config/database.js` - DO NOT modify
- `server/config/validateEnv.js` - DO NOT modify
- `client/src/AuthContext.jsx` - DO NOT modify
- `client/src/api.js` - DO NOT modify
- `client/src/App.jsx` - Only add routes, don't restructure
- `server/server.js` - Only add new route registrations

**Core Models (modify only if absolutely necessary):**
- `server/models/Student.js` - Only add fields if critical
- `server/models/Faculty.js` - Only add fields if critical
- `server/models/Admin.js` - Only add fields if critical

**Utility/Response Files:**
- `server/utils/response.js` - DO NOT modify

### Shared Components/Services/Configuration to Reuse

#### Frontend Reusable Items
1. **`AuthContext`** - Access user state with `useAuth()`
2. **`api` module** - HTTP client with automatic JWT handling
3. **CSS Classes** - `.btn`, `.card`, `.form-group`, `.loading`, `.error`
4. **Protected Route Pattern** - `<Protected role="...">` component
5. **Response Handling** - Consistent `{ok, data}` structure

#### Backend Reusable Items
1. **`verifyToken` Middleware** - JWT verification
2. **`authorizeRoles()` Middleware** - Role checking
3. **`requireProfileComplete/requireAssignmentComplete` Middleware** - Onboarding enforcement
4. **`successResponse()` / `errorResponse()` Functions** - Standard response format
5. **Rate Limiters** - `authLimiter`, `aiLimiter`, `adminLimiter`, `generalLimiter`
6. **Error Handler Middleware** - `server/middleware/errorHandler.js`
7. **Logger** - Winston logger for debugging
8. **Email Service** - `emailService.js` for notifications
9. **Notification Service** - Create notifications to users
10. **Multi-Provider AI Integration** - Use existing Gemini/Kimi/NVIDIA setup

#### Configuration to Reuse
1. **`aiProviders.js`** - Use existing AI provider setup
2. **JWT Secret** - Reuse existing `process.env.JWT_SECRET`
3. **Database Connection** - Via existing Mongoose connection
4. **Environment Variables** - Follow existing `.env` pattern

---

## 11. POSSIBLE CONFLICTS

### File/Folder Name Conflicts

**Potential Issues:**
- New module name conflicts with existing folder names
- Route file names that duplicate existing patterns
- Controller file names that clash with existing ones

**Prevention:**
- Check existing files in `server/controllers/`, `server/routes/`, `server/services/`, `client/src/pages/`
- Use unique, descriptive module names
- Follow naming convention: camelCase + descriptive suffix

**Existing Names to Avoid:**
```
Controllers: admin*, assessment*, auth*, faculty*, student*, resume*, 
           roadmap*, dashboard*, notification*, announcement*, ai*, 
           career*, question*

Routes: admin*, assessment*, auth*, faculty*, student*, resume*, 
        roadmap*, dashboard*, notification*, announcement*, ai*, 
        question*

Services: resume*, assessment*, readiness*, roadmap*, dashboard*, 
         email*, notification*, ai*, career*, coding*

Models: Student, Faculty, Admin, Assessment, AssessmentResult, 
        QuestionBank, Roadmap, Notification, Announcement

Pages: student/*, faculty/*, admin/*, auth pages
```

### Routes Conflicts

**Potential Issues:**
- New `/api/[module]/` path conflicts with existing routes
- Query parameter naming conflicts
- HTTP method conflicts on same endpoint

**Prevention:**
- Check `server.js` for all registered routes
- Check existing `server/routes/*.js` for method usage
- Use unique resource names

**Existing Routes Pattern:**
```
/api/auth/*          - Authentication
/api/student/*       - Student resources
/api/assessment/*    - Assessments
/api/assessment-result/* - Results
/api/ai/*            - AI services (resume, JD, chat, recommendations)
/api/faculty/*       - Faculty resources
/api/admin/*         - Admin resources
/api/notification/*  - Notifications
/api/announcements/* - Announcements
/api/question-bank/* - Questions
/api/roadmap/*       - Roadmap
/api/dashboard/*     - Dashboard data
```

### API Endpoint Conflicts

**Risk:** Duplicate endpoints serving different purposes

**Prevention:**
- Use unique resource names
- Keep HTTP methods consistent with REST conventions
- Document all endpoints in code

### Database Table/Entity Conflicts

**Risk:** MongoDB collection name conflicts

**Prevention:**
- Mongoose auto-pluralizes model names
- Check existing models before creating new ones
- New model names should be unique

**Existing Collections (auto-generated by Mongoose):**
- students
- faculties
- admins
- assessments
- assessmentresults
- questionbanks
- roadmaps
- notifications
- announcements

### Dependencies Conflicts

**Current Dependencies:**
- Check `server/package.json` for installed packages
- Check `client/package.json` for frontend packages

**Risk:** Installing conflicting versions

**Prevention:**
- Review `package.json` before adding new packages
- Use compatible versions
- Test after adding dependencies

### Authentication Conflicts

**Potential Issues:**
- Role name conflicts (stick to: student, faculty, admin)
- JWT payload conflicts
- Middleware chain conflicts

**Prevention:**
- Use only 3 existing roles
- Don't modify JWT payload structure
- Add custom middleware after auth checks, not instead of them

### CSS/Global Styles Conflicts

**Current Styling:**
- Global CSS in `client/src/index.css` and `client/src/App.css`
- No CSS modules used
- Class-based styling

**Risk:** CSS class name collisions

**Prevention:**
- Use scoped class names (e.g., `.my-feature-container`)
- Check existing class names in `index.css` and `App.css`
- Avoid generic names like `.container`, `.header` (likely already used)

### Configuration Conflicts

**Environment Variables Already Used:**
```
PORT, MONGO_URI, JWT_SECRET, UPLOAD_DIR
GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT_MS
TOKENROUTER_API_KEY, TOKENROUTER_BASE_URL, TOKENROUTER_MODEL
NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_MODEL
```

**Prevention:**
- Don't overwrite existing env vars
- Add new vars with unique prefixes
- Document in `.env` template

### Port Number Conflicts

**Reserved Ports:**
- **Frontend:** 5173 (Vite), fallback 5174
- **Backend:** 5000
- **Database:** MongoDB connection via URI

**Prevention:**
- Don't add new services that need separate ports
- Use existing backend port 5000 for all APIs

### Rate Limiting Conflicts

**Existing Limiters:**
- `authLimiter` - 80 requests/15 min
- `aiLimiter` - 40 requests/15 min
- `adminLimiter` - 60 requests/15 min
- `generalLimiter` - 120 requests/15 min

**If Adding AI Features:**
- Use `aiLimiter` for AI endpoints
- Document rate limits in code

---

## 12. IMPORTANT FILES FOR INTEGRATION

### Backend Files to Provide

When integrating a new backend module, provide these files:

```
server/
├── controllers/[moduleNameController].js
├── routes/[moduleNameRoutes].js
├── services/[moduleNameService].js
├── models/[ModuleName].js (if needed)
└── [middleware/] (if custom middleware needed)
```

### Frontend Files to Provide

When integrating a new frontend module, provide these files:

```
client/src/pages/
└── [module-name]/
    ├── Dashboard.jsx (main page)
    ├── [OtherPages].jsx
    └── [Components].jsx (if any internal components)
```

### Files to Reference/Modify

Always provide/reference these files:

1. **Backend Integration:**
   - Modified `server/server.js` (to show where to register routes)
   - `.env` or `.env.example` (for new env variables)
   - Modified model files (if adding fields)

2. **Frontend Integration:**
   - Modified `client/src/App.jsx` (to show route additions)
   - Modified `client/src/pages/Layout.jsx` or navigation file (if exists)

### Complete Paths for New Module Integration

#### Exact Backend Paths
```
d:\sem7\Mini_Project\current_app\server\controllers\[moduleName]Controller.js
d:\sem7\Mini_Project\current_app\server\routes\[moduleName]Routes.js
d:\sem7\Mini_Project\current_app\server\services\[moduleName]Service.js
d:\sem7\Mini_Project\current_app\server\models\[ModuleName].js (if needed)
d:\sem7\Mini_Project\current_app\server\server.js (to register routes)
```

#### Exact Frontend Paths
```
d:\sem7\Mini_Project\current_app\client\src\pages\[module-name]\[Page].jsx
d:\sem7\Mini_Project\current_app\client\src\App.jsx (to add routes)
```

#### Modification Reference Files
```
d:\sem7\Mini_Project\current_app\.env or .env.example (new variables)
d:\sem7\Mini_Project\current_app\package.json (if new dependencies)
d:\sem7\Mini_Project\current_app\server\package.json (if new backend dependencies)
```

---

## 13. RECOMMENDED INTEGRATION STRATEGY

### Phase 1: Planning & Preparation
1. **Review Existing Architecture**
   - Understand auth flow and onboarding
   - Review data models and relationships
   - Understand API conventions

2. **Identify Module Requirements**
   - What are the main entities?
   - Which roles need access?
   - Any new database tables needed?
   - Which existing features to integrate with?

3. **Design Database Schema**
   - Create Mongoose models
   - Define relationships with existing entities
   - Add indexes if needed
   - Validate against existing models

4. **Plan API Endpoints**
   - List all endpoints needed
   - Specify HTTP methods
   - Define request/response formats
   - Check for conflicts with existing routes

### Phase 2: Backend Implementation
1. **Create Database Models**
   - File: `server/models/[ModuleName].js`
   - Use existing Mongoose patterns
   - Add timestamps, validation
   - Reference existing models if needed

2. **Implement Services**
   - File: `server/services/[moduleNameService].js`
   - Business logic layer
   - No direct Express dependencies
   - Use existing services as reference

3. **Create Controllers**
   - File: `server/controllers/[moduleNameController].js`
   - Request handling
   - Input validation
   - Error handling with standard response format
   - Use `successResponse()` / `errorResponse()`

4. **Define Routes**
   - File: `server/routes/[moduleNameRoutes].js`
   - Import controller functions
   - Apply middleware (auth, roles, rate limiting)
   - Use consistent patterns

5. **Register Routes in Server**
   - Edit `server/server.js`
   - Import routes file
   - Register with `app.use()`
   - Apply appropriate rate limiter

6. **Test Backend**
   - Use Postman collection or similar
   - Test all endpoints
   - Verify auth/role enforcement
   - Test error handling

### Phase 3: Frontend Implementation
1. **Create React Components**
   - Folder: `client/src/pages/[module-name]/`
   - Main dashboard/page component
   - Feature-specific sub-components
   - Follow existing component patterns

2. **Implement API Integration**
   - Use `api` module for HTTP calls
   - Handle loading/error states
   - Display responses consistently
   - Use localStorage via `useAuth()` for user data

3. **Add Routing**
   - Edit `client/src/App.jsx`
   - Import new components
   - Add route definitions
   - Use `<Protected>` wrapper for auth
   - Specify role restrictions

4. **Implement Styling**
   - Use existing CSS classes
   - Reuse global style patterns
   - Keep responsive design
   - Avoid CSS conflicts

5. **Test Frontend**
   - Test all pages/flows
   - Verify auth redirects work
   - Test role-based access
   - Test API integration

### Phase 4: Integration Testing
1. **Full User Flow Testing**
   - Register user if needed
   - Login as appropriate role
   - Navigate through module
   - Submit data
   - Verify results

2. **Cross-Browser Testing**
   - Test on Chrome, Firefox, Safari, Edge
   - Test mobile responsiveness

3. **Error Scenario Testing**
   - Test with invalid inputs
   - Test network errors
   - Test permission denials
   - Test concurrent requests

4. **Performance Testing**
   - Check API response times
   - Check frontend load times
   - Monitor database queries

### Phase 5: Documentation & Deployment
1. **Update Documentation**
   - Document new APIs
   - Document new features
   - Update README if needed
   - Document environment variables

2. **Code Review**
   - Review for security issues
   - Check for code style consistency
   - Verify error handling
   - Ensure no hardcoded values

3. **Deployment**
   - Test in staging environment
   - Update `.env` with new variables
   - Run migration scripts if needed
   - Deploy to production
   - Monitor for errors

---

## 14. FINAL SUMMARY

### Project Organization Summary

**AI Placement Intelligence Platform** is a full-stack, production-ready application built with:
- **Frontend:** React 19 + Vite (SPA with client-side routing)
- **Backend:** Express 5 + Mongoose + MongoDB
- **Auth:** JWT with role-based access control (3 roles: student, faculty, admin)
- **AI:** Multi-provider setup with automatic fallback
- **Architecture:** MVC pattern with services layer, standard HTTP response format

### Key Architectural Principles

1. **Role-Based Access Control**
   - 3 roles: Student, Faculty, Admin
   - Middleware-enforced authorization
   - Faculty requires admin approval

2. **Onboarding Workflow**
   - Email verification
   - Profile completion
   - Initial assessment
   - Enforced at middleware level

3. **Standardized Responses**
   - All responses wrapped in `{success, message, data}` format
   - Consistent error handling
   - Clear HTTP status codes

4. **Service-Oriented Architecture**
   - Controllers handle HTTP
   - Services handle business logic
   - Models handle data
   - Clear separation of concerns

5. **Middleware Pipeline**
   - Authentication before authorization
   - Role checking before business logic
   - Onboarding enforcement for sensitive routes
   - Rate limiting on public endpoints

### Safest Integration Strategy

**Step-by-Step Approach:**

1. **Backend First**
   - Create models (reference existing patterns)
   - Create services (test with Node REPL)
   - Create controllers (use existing templates)
   - Create routes (register in server.js)
   - Test with Postman

2. **Frontend Second**
   - Create components (reuse existing patterns)
   - Integrate APIs (using api module)
   - Add routes (in App.jsx)
   - Test UI flows

3. **Integration**
   - Full end-to-end testing
   - Cross-role testing
   - Error scenario testing

4. **Deployment**
   - Environment variable configuration
   - Database migration if needed
   - Gradual rollout if possible
   - Monitor errors

### Critical Rules to Follow

✅ **DO:**
- Follow existing code patterns and conventions
- Use existing middleware and utilities
- Use role-based access control
- Test thoroughly before deployment
- Document all new endpoints
- Use standardized response format

❌ **DON'T:**
- Modify core middleware (auth, role, error handler)
- Skip authentication/authorization
- Use hardcoded values (use env vars)
- Break existing routing patterns
- Modify global CSS without care
- Skip error handling

### Common Integration Points

Most new modules will integrate with:
1. **Authentication** - Via `verifyToken` + `authorizeRoles`
2. **Database** - Via Mongoose models
3. **API Responses** - Via `successResponse()` / `errorResponse()`
4. **Notifications** - Via `notificationService.js`
5. **AI Services** - Via existing Gemini/Kimi/NVIDIA setup
6. **User Context** - Via `AuthContext` and `useAuth()` hook

### Ready for Integration

The project is well-structured and ready to accept new modules following the patterns established. Key benefits:
- Clear separation of concerns
- Reusable utilities and middleware
- Consistent conventions
- Robust error handling
- Production-grade security

---

## CONCLUSION

**AI Placement Intelligence Platform** demonstrates excellent software engineering practices with:
- Clean architecture (MVC + Services)
- Security-first design (JWT, role-based access, email verification)
- Scalability considerations (services layer, rate limiting, multi-provider AI)
- Maintainability (consistent patterns, clear conventions, good documentation)

The platform is ready for new feature integration following the established patterns and guidelines outlined in this analysis.

---

**Analysis Completed:** September 10, 2026  
**Analysis Type:** Comprehensive Full-Stack Review  
**Status:** Ready for Integration
