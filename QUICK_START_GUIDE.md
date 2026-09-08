# Resume-JD Analysis Feature - Quick Start Guide

## 🚀 For Students

### How to Use Resume-JD Analysis

#### Step 1: Upload Your Resume
1. Go to the **"Resume AI Analysis"** page
2. Click **"Upload Resume"** or drag & drop a PDF/DOCX file
3. Click **"Upload & Analyze"** button
4. Wait for analysis to complete

#### Step 2: Add Job Description
1. In the **"Analyze Resume Against Job Description"** section
2. Choose **"Paste JD"** or **"Upload JD File"**
   - **Paste**: Paste job description text into the text area
   - **Upload**: Upload JD as PDF/DOCX/TXT file
3. Click **"Analyze Resume vs JD"**

#### Step 3: Review Results
The system provides:
- **ATS Score** (0-100): How well formatted for ATS systems
- **Job Match Score** (0-100): Semantic match with job description
- **Match Level**: Quick classification (Excellent/Strong/Moderate/Weak)
- **Matched Skills**: Your skills matching the job
- **Missing Skills**: Required and preferred skills you don't have
- **Keywords Analysis**: Which JD keywords are in your resume
- **Improvement Actions**: Specific recommendations to improve match

#### Step 4: Implement Recommendations
Review the **"Improvement Actions"** section:
- Each recommendation has:
  - **Problem**: What's missing or weak
  - **Why it matters**: Why this is important for the job
  - **Suggested action**: Specific way to improve

---

## 🔧 For Developers / Administrators

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  - Resume Upload                                        │
│  - JD Input (Text/File)                                 │
│  - Analysis Results Dashboard                           │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP POST/GET
                 ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend API (Express)                  │
│  - POST /api/ai/analyze-resume-jd                       │
│  - GET /api/ai/resume-jd-analysis                       │
│  - Authentication & Authorization                       │
│  - Input Validation                                     │
└────────────────┬────────────────────────────────────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
      ↓          ↓          ↓
   Text       Analysis    Database
  Extraction   Service   (MongoDB)
   Service
   ├─ PDF      ├─ AI      └─ Student
   ├─ DOCX       (Gemini)   Model
   └─ TXT      └─ Fallback
                  (Keywords)
```

### API Endpoints

#### 1. Analyze Resume Against JD
```
POST /api/ai/analyze-resume-jd

Headers:
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json

Request Body:
{
  "jobDescription": "Required skills: JavaScript, React, Node.js..."
}

Response (200 OK):
{
  "success": true,
  "message": "Resume analysis completed successfully",
  "data": {
    "atsScore": 78,
    "jobMatchScore": 82,
    "matchLevel": "Strong Match",
    "matchedSkills": ["JavaScript", "React", ...],
    "missingSkills": { "required": [...], "preferred": [...] },
    "recommendations": [...]
  }
}
```

#### 2. Get Recent Analysis
```
GET /api/ai/resume-jd-analysis

Headers:
  Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "success": true,
  "message": "Recent analysis retrieved successfully",
  "data": {
    "atsScore": 78,
    "jobMatchScore": 82,
    ...
    "timestamp": "2026-09-01T12:00:00Z"
  }
}
```

### Environment Variables Required

```bash
# In .env file on server:
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
MONGO_URI=your_mongodb_connection_string
```

### File Uploads

**Supported Formats**:
- Resume: PDF, DOCX
- Job Description: PDF, DOCX, TXT, or plain text

**Size Limits**:
- Resume: Max 5MB (configurable in middleware)
- JD File: Max 5MB (configurable in middleware)

**Storage**:
- Files uploaded to: `uploads/resumes/` directory
- Old files can be deleted (analysis is stored in DB)
- Security: Path validation prevents directory traversal

### Database

**Student Model Changes**:
```javascript
{
  // ... existing fields
  
  resumeJDAnalysis: {
    type: Mixed,
    default: null
  },
  
  lastResumeAnalysisDate: {
    type: Date,
    default: null
  }
}
```

### Monitoring & Troubleshooting

#### Check Logs
```bash
# Terminal 1: Start backend
npm start

# Watch for errors in console
```

#### Common Issues

**"Job description is required"**
- Solution: Ensure JD text is provided and not empty

**"Resume not found"**
- Solution: Student must upload resume first
- Guide student to click "Upload Resume" button

**"Unsupported file type"**
- Solution: Only PDF, DOCX, TXT supported
- Ask student to convert file to supported format

**"Analysis failed (check Gemini API key/quota)"**
- Solution: Check Gemini API key in `.env`
- Check API quota at Google Cloud Console
- System will fall back to keyword-based analysis if AI unavailable

**"Uploaded file is not a valid PDF"**
- Solution: PDF file is corrupted or not a real PDF
- Ask student to re-download and try again

### Performance Optimization

```javascript
// Caching example (could be added):
const lastAnalysis = student.resumeJDAnalysis;
const lastAnalysisTime = student.lastResumeAnalysisDate;

// Don't re-analyze if same JD within 5 minutes
if (lastAnalysis && Date.now() - lastAnalysisTime < 5*60*1000) {
  return lastAnalysis; // Cached result
}
```

### Testing

Run integration test:
```bash
node server/integration-test.js
```

Run final verification:
```bash
node server/final-verification.js
```

### Deployment

1. **Build frontend**:
```bash
cd client
npm run build
```

2. **Start server**:
```bash
cd server
npm start
```

3. **Verify**:
- Check MongoDB connection
- Check Gemini API key
- Check no errors in console
- Test with student account

### Rollback

If issues found:
```bash
# Revert server.js
git checkout server/server.js

# Revert Student model
git checkout server/models/Student.js

# Revert frontend
git checkout client/src/pages/student/ResumeAnalysis.jsx

# Remove new files
rm server/services/resumeJDAnalysisService.js
rm server/controllers/resumeJDController.js
rm server/routes/resumeJDRoutes.js
```

---

## 📊 Metrics & Analytics

### What to Monitor

1. **Usage**: How many students use the feature
2. **Success Rate**: How many analyses complete without error
3. **Performance**: Average analysis time
4. **API Errors**: Any 4xx or 5xx responses
5. **AI Availability**: How often fallback is used

### Sample Monitoring Query (MongoDB)

```javascript
// Count analyses per day
db.students.aggregate([
  {
    $match: {
      lastResumeAnalysisDate: {
        $gte: new Date("2026-09-01")
      }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$lastResumeAnalysisDate" }
      },
      count: { $sum: 1 }
    }
  }
])
```

---

## 🔗 Related Files

- **Frontend**: `client/src/pages/student/ResumeAnalysis.jsx`
- **Backend Service**: `server/services/resumeJDAnalysisService.js`
- **Controller**: `server/controllers/resumeJDController.js`
- **Routes**: `server/routes/resumeJDRoutes.js`
- **Model**: `server/models/Student.js`
- **Server Config**: `server/server.js`

---

## 📚 Additional Resources

- [Full Implementation Documentation](./RESUME_JD_ANALYSIS_IMPLEMENTATION.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Change Log](./COMPLETE_CHANGE_LOG.md)
- [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md)

---

## ❓ FAQ

**Q: What if AI service is unavailable?**  
A: The system falls back to keyword-based analysis automatically.

**Q: Can students see other students' analyses?**  
A: No, analysis is stored per student and access requires authentication.

**Q: How accurate is the ATS score?**  
A: It's based on multiple factors (structure, keywords, content). It's not 100% accurate like actual ATS systems but provides good guidance.

**Q: Can students download their analysis?**  
A: Not currently, but can be added as future enhancement.

**Q: How long does analysis take?**  
A: Typically 5-10 seconds depending on AI service response time.

**Q: Is resume data stored permanently?**  
A: Only the analysis results are stored. Resume files can be deleted after analysis.

---

**For Questions or Issues**: Contact your system administrator

---

*Last Updated: September 1, 2026*  
*Status: Production Ready*
