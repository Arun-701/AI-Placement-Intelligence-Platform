# AI Placement Intelligence Platform API Documentation

## Overview
This documentation covers all backend API endpoints for the AI Placement Intelligence Platform. Each endpoint includes method, URL, description, authentication requirements, request body, query params, URL params, success response, error responses, and examples.

All responses follow a standard wrapper format:
- `success`: boolean
- `message`: string
- `data`: object or array or null

---

## Authentication

### Register Student
- Method: POST
- URL: `/api/auth/register`
- Description: Register a new student account.
- Authentication Required: No
- Required Role: None
- Request Body:
  - `name` (string, required)
  - `email` (string, required)
  - `password` (string, required)
  - `department` (string, required)
  - `year` (integer 1-8, required)
  - `skills` (array of strings, optional)
  - `cgpa` (number, optional)
- URL Params: None
- Query Params: None
- Success Response:
  - `success: true`
  - `message: "Student Registered Successfully. Please verify your email."`
  - `data.student` with student summary
  - `data.verificationToken` when not in production
- Error Responses:
  - 400 invalid payload or already exists
  - 500 server error
- Example Request:
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "password": "P@ssw0rd!",
  "department": "CSE",
  "year": 3,
  "skills": ["JavaScript", "Node.js"],
  "cgpa": 8.2
}
```
- Example Response:
```json
{
  "success": true,
  "message": "Student Registered Successfully. Please verify your email.",
  "data": {
    "student": {
      "_id": "64fa...",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "isVerified": false
    },
    "verificationToken": "abc123..."
  }
}
```

### Login Student
- Method: POST
- URL: `/api/auth/login`
- Description: Authenticate a student and return a JWT token.
- Authentication Required: No
- Required Role: None
- Request Body:
  - `email` (string, required)
  - `password` (string, required)
- Success Response:
  - `success: true`
  - `message: "Login Successful"`
  - `data.token`
  - `data.student`
- Error Responses:
  - 400 invalid credentials or invalid payload
  - 403 account deactivated or email verification pending
  - 500 server error
- Example Request:
```json
{
  "email": "rahul@example.com",
  "password": "P@ssw0rd!"
}
```
- Example Response:
```json
{
  "success": true,
  "message": "Login Successful",
  "data": {
    "token": "eyJhbGci...",
    "student": {
      "_id": "64fa...",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "department": "CSE",
      "year": 3
    }
  }
}
```

### Forgot Password
- Method: POST
- URL: `/api/auth/forgot-password`
- Description: Send password reset instructions for a student.
- Authentication Required: No
- Required Role: None
- Request Body:
  - `email` (string, required)
- Success Response:
  - `success: true`
  - `message`: instructions sent message
  - `data.resetToken` when not in production
- Error Responses:
  - 400 invalid email
  - 500 server error
- Example Request:
```json
{ "email": "rahul@example.com" }
```

### Reset Password
- Method: POST
- URL: `/api/auth/reset-password`
- Description: Reset student password using a reset token.
- Authentication Required: No
- Required Role: None
- Request Body:
  - `token` (string, required)
  - `newPassword` (string, required)
- Success Response:
  - `success: true`
  - `message`: password reset successful
- Error Responses:
  - 400 invalid token, invalid payload
  - 500 server error
- Example Request:
```json
{
  "token": "resetToken123",
  "newPassword": "NewP@ssw0rd1"
}
```

### Verify Email
- Method: POST
- URL: `/api/auth/verify-email-otp`
- Description: Verify an account email using a six-digit one-time code sent by email.
- Authentication Required: No
- Required Role: None
- Request Body:
  - `email` (string, required)
  - `otp` (six-digit string, required)
- Success Response:
  - `success: true`
  - `message`: email verified successfully
- Error Responses:
  - 400 invalid, expired, or already-used verification code
  - 500 server error

### Resend Verification Code
- Method: POST
- URL: `/api/auth/resend-verification`
- Description: Send a new six-digit verification code to an unverified account. Requests are limited to one per minute.
- Authentication Required: No
- Request Body:
  - `email` (string, required)

### Student Profile - Authenticated
#### Get Profile
- Method: GET
- URL: `/api/auth/profile`
- Description: Fetch the authenticated user's profile (student or faculty when token role differs).
- Authentication Required: Yes
- Required Role: any authenticated role
- Success Response:
  - `success: true`
  - `data`: profile object
- Error Responses:
  - 401 missing token
  - 500 server error

### Change Password
- Method: POST
- URL: `/api/auth/change-password`
- Description: Change the authenticated user's password.
- Authentication Required: Yes
- Required Role: any authenticated role
- Request Body:
  - `currentPassword` (string, required)
  - `newPassword` (string, required)
- Success Response:
  - `success: true`
  - `message`: password changed successfully
- Error Responses:
  - 400 invalid payload or incorrect current password
  - 404 user not found
  - 500 server error

### Update Account Status
- Method: PATCH
- URL: `/api/auth/account-status`
- Description: Toggle the authenticated user's active state.
- Authentication Required: Yes
- Required Role: any authenticated role
- Request Body:
  - `isActive` (boolean, required)
- Success Response:
  - `success: true`
  - `data.isActive`
- Error Responses:
  - 400 invalid payload
  - 404 user not found
  - 500 server error

### Upload Resume (Auth Route)
- Method: POST
- URL: `/api/auth/upload-resume`
- Description: Upload a student resume for the authenticated student.
- Authentication Required: Yes
- Required Role: student
- Request Body: `multipart/form-data` with `resume` file
- Success Response:
  - `success: true`
  - `data.resume`
- Error Responses:
  - 400 invalid file or missing resume
  - 404 student not found
  - 500 server error

---

## Student

### Get Coding Profile
- Method: GET
- URL: `/api/student/coding-profile`
- Description: Retrieve student's coding profile and platform summary.
- Authentication Required: Yes
- Required Role: student
- Success Response: coding profile object
- Error Responses: 404 student not found, 500 server error

### Update Coding Profile
- Method: PUT
- URL: `/api/student/coding-profile`
- Description: Update coding profile fields and compute scoring.
- Authentication Required: Yes
- Required Role: student
- Request Body: subset of allowed fields
- Success Response: saved coding profile
- Error Responses: 400 invalid payload, 404 student not found, 500 server error

### Upload Resume
- Method: POST
- URL: `/api/student/resume`
- Description: Upload a new resume for a student.
- Authentication Required: Yes
- Required Role: student
- Request Body: `multipart/form-data` with `resume`
- Success Response: uploaded resume path
- Error Responses: 400 invalid file, 404 student not found, 409 resume exists, 500 server error

### Get Resume
- Method: GET
- URL: `/api/student/resume`
- Description: Retrieve the stored resume path for a student.
- Authentication Required: Yes
- Required Role: student
- Success Response: resume metadata
- Error Responses: 404 student or resume not found, 500 server error

### Replace Resume
- Method: PUT
- URL: `/api/student/resume`
- Description: Replace an existing student resume file.
- Authentication Required: Yes
- Required Role: student
- Request Body: `multipart/form-data` with `resume`
- Success Response: updated resume path
- Error Responses: 400 invalid file, 404 student or resume not found, 500 server error

### Delete Resume
- Method: DELETE
- URL: `/api/student/resume`
- Description: Delete a student resume.
- Authentication Required: Yes
- Required Role: student
- Success Response: deletion success message
- Error Responses: 404 student or resume not found, 500 server error

### Get Student Dashboard
- Method: GET
- URL: `/api/student/dashboard`
- Description: Fetch the student dashboard summary.
- Authentication Required: Yes
- Required Role: student
- Success Response: student dashboard details
- Error Responses: 500 server error

### Get Student Profile
- Method: GET
- URL: `/api/student/profile`
- Description: Fetch authenticated student profile.
- Authentication Required: Yes
- Required Role: student
- Success Response: student profile data
- Error Responses: 500 server error

### Update Student Profile
- Method: PUT
- URL: `/api/student/profile`
- Description: Update student profile fields.
- Authentication Required: Yes
- Required Role: student
- Request Body: allowed profile fields
- Success Response: profile update summary with completion status
- Error Responses: 400 invalid fields, 500 server error

### Get Profile Completion
- Method: GET
- URL: `/api/student/profile-completion`
- Description: Retrieve profile completion status.
- Authentication Required: Yes
- Required Role: student
- Success Response: completion status object
- Error Responses: 500 server error

---

## Faculty

### Get Faculty Profile
- Method: GET
- URL: `/api/faculty/profile`
- Description: Retrieve authenticated faculty profile.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: faculty profile object
- Error Responses: 404 faculty not found, 500 server error

### Get Faculty Dashboard
- Method: GET
- URL: `/api/faculty/dashboard`
- Description: Retrieve faculty dashboard summary.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: faculty dashboard data
- Error Responses: 404 faculty not found, 500 server error

### Get Assigned Students
- Method: GET
- URL: `/api/faculty/students`
- Description: List students assigned to the faculty.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: assigned student list
- Error Responses: 404 faculty not found, 500 server error

### Get Assigned Assessments
- Method: GET
- URL: `/api/faculty/assessments`
- Description: List assessments assigned to the faculty.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: assigned assessments list
- Error Responses: 404 faculty not found, 500 server error

---

## Question Bank

### Create Question
- Method: POST
- URL: `/api/question-bank`
- Description: Create a new question in the question bank.
- Authentication Required: Yes
- Required Role: faculty
- Request Body: question payload including subject, topic, difficulty, questionType, options, answer, marks, and any metadata.
- Success Response: created question object
- Error Responses: 400 invalid payload, 500 server error

### Get Questions
- Method: GET
- URL: `/api/question-bank`
- Description: List active questions with optional filters.
- Authentication Required: Yes
- Required Role: faculty
- Query Params:
  - `subject`
  - `topic`
  - `difficulty`
  - `questionType`
- Success Response: question list
- Error Responses: 500 server error

### Get Question by ID
- Method: GET
- URL: `/api/question-bank/:id`
- Description: Retrieve a specific question by ID.
- Authentication Required: Yes
- Required Role: faculty
- URL Params:
  - `id` (question ID)
- Success Response: question object
- Error Responses: 400 invalid ID, 404 not found, 500 server error

### Update Question
- Method: PUT
- URL: `/api/question-bank/:id`
- Description: Update an existing question.
- Authentication Required: Yes
- Required Role: faculty
- URL Params:
  - `id` (question ID)
- Request Body: updated question fields
- Success Response: updated question object
- Error Responses: 400 invalid ID or payload, 404 not found, 500 server error

### Delete Question
- Method: DELETE
- URL: `/api/question-bank/:id`
- Description: Soft-delete a question by marking it inactive.
- Authentication Required: Yes
- Required Role: faculty
- URL Params:
  - `id` (question ID)
- Success Response: deleted question data
- Error Responses: 400 invalid ID, 404 not found, 500 server error

---

## Assessment

### Create Assessment
- Method: POST
- URL: `/api/assessment`
- Description: Create a new assessment.
- Authentication Required: Yes
- Required Role: faculty
- Request Body: assessment details including title, description, assessmentType, status, assignedFaculty, assignedStudents, questions, dates, and grading metadata.
- Success Response: created assessment object
- Error Responses: 400 invalid payload, 409 duplicate initial assessment, 500 server error

### Get Assessments
- Method: GET
- URL: `/api/assessment`
- Description: Retrieve all active assessments with optional filters.
- Authentication Required: Yes
- Required Role: faculty
- Query Params:
  - `assessmentType`
  - `status`
- Success Response: list of assessments
- Error Responses: 500 server error

### Get Initial Assessment
- Method: GET
- URL: `/api/assessment/initial`
- Description: Retrieve the published initial assessment.
- Authentication Required: Yes
- Required Role: student
- Success Response: initial assessment details
- Error Responses: 404 not found, 500 server error

### Get Assessment by ID
- Method: GET
- URL: `/api/assessment/:id`
- Description: Retrieve a specific assessment.
- Authentication Required: Yes
- Required Role: faculty
- URL Params:
  - `id` (assessment ID)
- Success Response: assessment object
- Error Responses: 400 invalid ID, 404 not found, 500 server error

### Update Assessment
- Method: PUT
- URL: `/api/assessment/:id`
- Description: Update an existing assessment.
- Authentication Required: Yes
- Required Role: faculty
- URL Params:
  - `id` (assessment ID)
- Request Body: updated assessment payload
- Success Response: updated assessment object
- Error Responses: 400 invalid payload, 404 not found, 409 duplicate initial assessment, 500 server error

### Delete Assessment
- Method: DELETE
- URL: `/api/assessment/:id`
- Description: Soft delete an assessment.
- Authentication Required: Yes
- Required Role: faculty
- URL Params:
  - `id` (assessment ID)
- Success Response: deleted assessment data
- Error Responses: 400 invalid ID, 404 not found, 500 server error

---

## Assessment Result

### Submit Result
- Method: POST
- URL: `/api/assessment-result`
- Description: Submit completed assessment answers for evaluation.
- Authentication Required: Yes
- Required Role: student
- Request Body:
  - `assessment` (assessment ID, required)
  - `answers` (array, required) with question answer objects
- Success Response: created assessment result
- Error Responses: 400 invalid payload, 403 not assigned, 404 assessment or student not found, 409 already submitted, 500 server error

### Get My Results
- Method: GET
- URL: `/api/assessment-result/my`
- Description: Retrieve the logged-in student's assessment results.
- Authentication Required: Yes
- Required Role: student
- Success Response: result list and history summary
- Error Responses: 404 student not found, 500 server error

### Get Assessment Results for Faculty
- Method: GET
- URL: `/api/assessment-result/assessment/:assessmentId`
- Description: Retrieve results for a specific assessment.
- Authentication Required: Yes
- Required Role: faculty
- URL Params:
  - `assessmentId` (assessment ID)
- Success Response: assessment results list
- Error Responses: 400 invalid ID, 404 not found, 403 unauthorized, 500 server error

### Get Result by ID
- Method: GET
- URL: `/api/assessment-result/:id`
- Description: Retrieve one assessment result by result ID.
- Authentication Required: Yes
- Required Role: student or faculty
- URL Params:
  - `id` (result ID)
- Success Response: assessment result object
- Error Responses: 400 invalid ID, 404 not found, 403 unauthorized, 500 server error

### Update Feedback
- Method: PUT
- URL: `/api/assessment-result/:id/feedback`
- Description: Faculty updates feedback for an assessment result.
- Authentication Required: Yes
- Required Role: faculty
- Request Body: any of `feedback`, `strengths`, `weaknesses`, `recommendations`
- Success Response: updated result object
- Error Responses: 400 invalid payload or ID, 403 unauthorized, 404 not found, 500 server error

---

## Student Assessment

### Get My Assigned Assessments
- Method: GET
- URL: `/api/assessment/my`
- Description: List all assessments assigned to the signed-in student.
- Authentication Required: Yes
- Required Role: student
- Success Response: assigned assessment list
- Error Responses: 500 server error

### Start an Assessment
- Method: POST
- URL: `/api/assessment/:id/start`
- Description: Start an assessment attempt and receive questions.
- Authentication Required: Yes
- Required Role: student
- URL Params:
  - `id` assessment ID
- Success Response: assessment attempt data
- Error Responses: 400 invalid payload, 403 unauthorized, 404 assessment not found, 500 server error

### Auto-Save Assessment
- Method: POST
- URL: `/api/assessment/:id/auto-save`
- Description: Auto-save student answers during assessment.
- Authentication Required: Yes
- Required Role: student
- URL Params:
  - `id` assessment ID
- Request Body:
  - `answers` (array, required)
  - `timeSpent` (number, required)
- Success Response: auto-save metadata
- Error Responses: 400 invalid payload, 500 server error

### Submit Assessment Attempt
- Method: POST
- URL: `/api/assessment/:id/submit`
- Description: Submit an ongoing assessment attempt.
- Authentication Required: Yes
- Required Role: student
- URL Params:
  - `id` assessment ID
- Request Body:
  - `answers` (array, required)
  - `timeTaken` (number, optional)
- Success Response: submission result
- Error Responses: 400 invalid payload, 404 not found, 409 already attempted, 500 server error

### Get Assessment History
- Method: GET
- URL: `/api/assessment/history`
- Description: Retrieve student assessment attempt history.
- Authentication Required: Yes
- Required Role: student
- Success Response: history list and metadata
- Error Responses: 500 server error

### Get Assessment Result Detail
- Method: GET
- URL: `/api/assessment/result/:resultId`
- Description: Get a detailed student result by result ID.
- Authentication Required: Yes
- Required Role: student
- URL Params:
  - `resultId` assessment result ID
- Success Response: detailed result
- Error Responses: 400 invalid ID, 404 not found, 500 server error

### Get Readiness Score
- Method: GET
- URL: `/api/assessment/readiness-score`
- Description: Retrieve the student's placement readiness score.
- Authentication Required: Yes
- Required Role: student
- Success Response: readiness score data
- Error Responses: 500 server error

---

## AI

### AI Chat
- Method: POST
- URL: `/api/ai/chat`
- Description: Send a prompt to the AI chat service.
- Authentication Required: Yes
- Required Role: student, faculty
- Request Body:
  - `prompt` (string, required)
- Success Response: AI response text
- Error Responses: 400 missing prompt, 500 generation failure

---

## Resume AI

### Analyze Resume
- Method: GET
- URL: `/api/ai/resume-analysis`
- Description: Analyze the authenticated student's resume.
- Authentication Required: Yes
- Required Role: student
- Success Response: resume analysis and readiness profile
- Error Responses: 404 student or resume not found, 500 server error

### Refresh Resume Analysis
- Method: POST
- URL: `/api/ai/resume-analysis/refresh`
- Description: Refresh previously generated resume analysis.
- Authentication Required: Yes
- Required Role: student
- Success Response: refreshed analysis
- Error Responses: 404 student or resume not found, 500 server error

### Get Placement Recommendation
- Method: GET
- URL: `/api/ai/placement-recommendation`
- Description: Generate placement recommendation using resume data.
- Authentication Required: Yes
- Required Role: student
- Success Response: placement recommendation
- Error Responses: 404 student or resume not found, 500 server error

### Get Skill Gap Analysis
- Method: GET
- URL: `/api/ai/skill-gap`
- Description: Retrieve skill gap analysis for the student.
- Authentication Required: Yes
- Required Role: student
- Success Response: skill gap analysis
- Error Responses: 404 student or resume not found, 500 server error

### Get Learning Recommendations
- Method: GET
- URL: `/api/ai/recommendations`
- Description: Retrieve learning recommendations for the student.
- Authentication Required: Yes
- Required Role: student
- Success Response: recommendations list
- Error Responses: 404 student or resume not found, 500 server error

---

## Career Recommendation

### Get Career Recommendation
- Method: GET
- URL: `/api/ai/career-recommendation`
- Description: Get career recommendation for the authenticated student.
- Authentication Required: Yes
- Required Role: student
- Success Response: career recommendation data
- Error Responses: 404 resume not found, 500 server error

---

## Roadmap

### Get Roadmap
- Method: GET
- URL: `/api/roadmap`
- Description: Retrieve the student's roadmap.
- Authentication Required: Yes
- Required Role: student
- Success Response: roadmap object
- Error Responses: 500 server error

### Generate Roadmap
- Method: POST
- URL: `/api/roadmap/generate`
- Description: Generate a new roadmap for the student.
- Authentication Required: Yes
- Required Role: student
- Request Body: roadmap input data as needed by service
- Success Response: generated roadmap
- Error Responses: 500 server error

### Update Roadmap Milestone
- Method: PATCH
- URL: `/api/roadmap/milestone/:id`
- Description: Update a roadmap milestone.
- Authentication Required: Yes
- Required Role: student
- URL Params:
  - `id` milestone ID
- Request Body: milestone fields to update
- Success Response: updated milestone
- Error Responses: 400 invalid ID, 500 server error

### Get Roadmap Progress
- Method: GET
- URL: `/api/roadmap/progress`
- Description: Retrieve roadmap progress metrics.
- Authentication Required: Yes
- Required Role: student
- Success Response: progress summary
- Error Responses: 500 server error

### Get My Roadmap
- Method: GET
- URL: `/api/roadmap/me`
- Description: Retrieve the current student's roadmap details.
- Authentication Required: Yes
- Required Role: student
- Success Response: roadmap data
- Error Responses: 500 server error

### Update Roadmap Progress
- Method: PUT
- URL: `/api/roadmap/progress`
- Description: Update roadmap progress.
- Authentication Required: Yes
- Required Role: student
- Request Body: progress payload
- Success Response: updated progress
- Error Responses: 500 server error

---

## Dashboard

### Get Student Dashboard
- Method: GET
- URL: `/api/dashboard/student`
- Description: Retrieve dashboard for a student.
- Authentication Required: Yes
- Required Role: student
- Success Response: student dashboard payload
- Error Responses: 500 server error

### Get Faculty Dashboard
- Method: GET
- URL: `/api/dashboard/faculty`
- Description: Retrieve dashboard for a faculty user.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: faculty dashboard payload
- Error Responses: 500 server error

### Get Student Analytics
- Method: GET
- URL: `/api/dashboard/student/analytics`
- Description: Retrieve analytics for a student.
- Authentication Required: Yes
- Required Role: student
- Success Response: analytics object
- Error Responses: 500 server error

### Get Faculty Analytics
- Method: GET
- URL: `/api/dashboard/faculty/analytics`
- Description: Retrieve analytics for a faculty user.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: analytics object
- Error Responses: 500 server error

### Get Placement Analytics
- Method: GET
- URL: `/api/dashboard/placement-analytics`
- Description: Retrieve placement analytics available to students and faculty.
- Authentication Required: Yes
- Required Role: student, faculty
- Success Response: placement analytics object
- Error Responses: 500 server error

### Get Student Report
- Method: GET
- URL: `/api/dashboard/reports/student`
- Description: Retrieve student performance report.
- Authentication Required: Yes
- Required Role: student
- Success Response: report object
- Error Responses: 500 server error

### Get Faculty Report
- Method: GET
- URL: `/api/dashboard/reports/faculty`
- Description: Retrieve faculty performance report.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: report object
- Error Responses: 500 server error

### Get Assessment Report
- Method: GET
- URL: `/api/dashboard/reports/assessment`
- Description: Retrieve an assessment report for faculty.
- Authentication Required: Yes
- Required Role: faculty
- Success Response: report object
- Error Responses: 500 server error

---

## Admin

### Register Admin
- Method: POST
- URL: `/api/admin/register`
- Description: Register a new admin user.
- Authentication Required: No
- Required Role: None
- Request Body:
  - `name`, `email`, `password`
- Success Response: admin token and profile
- Error Responses: 400 invalid payload or already exists, 500 server error

### Login Admin
- Method: POST
- URL: `/api/admin/login`
- Description: Authenticate an admin.
- Authentication Required: No
- Required Role: None
- Request Body:
  - `email`, `password`
- Success Response: admin token and profile
- Error Responses: 400 invalid credentials, 403 deactivated, 500 server error

### Get Admin Profile
- Method: GET
- URL: `/api/admin/profile`
- Description: Fetch the admin profile.
- Authentication Required: Yes
- Required Role: admin
- Success Response: admin profile
- Error Responses: 401 unauthorized, 500 server error

### Manage Students
- Get all students: `GET /api/admin/students`
- Get student by ID: `GET /api/admin/students/:id`
- Create student: `POST /api/admin/students`
- Update student: `PUT /api/admin/students/:id`
- Delete student: `DELETE /api/admin/students/:id`
- Authentication Required: Yes
- Required Role: admin
- Success Response: student data or list
- Error Responses: 400 invalid payload or ID, 404 not found, 500 server error

### Manage Faculties
- Get all faculties: `GET /api/admin/faculties`
- Get faculty by ID: `GET /api/admin/faculties/:id`
- Create faculty: `POST /api/admin/faculties`
- Update faculty: `PUT /api/admin/faculties/:id`
- Delete faculty: `DELETE /api/admin/faculties/:id`
- Authentication Required: Yes
- Required Role: admin
- Success Response: faculty data or list
- Error Responses: 400 invalid payload or ID, 404 not found, 500 server error

### Assign Students to Faculty
- Method: POST
- URL: `/api/admin/faculties/:facultyId/assign-students`
- Description: Assign student IDs to a faculty member.
- Authentication Required: Yes
- Required Role: admin
- Request Body: `studentIds` array
- Error Responses: 400 invalid payload, 500 server error

### Remove Students from Faculty
- Method: POST
- URL: `/api/admin/faculties/:facultyId/remove-students`
- Description: Remove student IDs from a faculty member.
- Authentication Required: Yes
- Required Role: admin
- Request Body: `studentIds` array
- Error Responses: 400 invalid payload, 500 server error

### Admin Dashboard
- Method: GET
- URL: `/api/admin/dashboard`
- Description: Fetch admin dashboard summary.
- Authentication Required: Yes
- Required Role: admin
- Success Response: dashboard data
- Error Responses: 500 server error

### Admin Statistics
- Method: GET
- URL: `/api/admin/statistics`
- Description: Fetch admin statistics.
- Authentication Required: Yes
- Required Role: admin
- Success Response: statistics data
- Error Responses: 500 server error

### Admin Reports
- Students report: `GET /api/admin/reports/students`
- Faculties report: `GET /api/admin/reports/faculties`
- Assessments report: `GET /api/admin/reports/assessments`
- Authentication Required: Yes
- Required Role: admin
- Success Response: report objects
- Error Responses: 500 server error

---

## Notification

### Get Notifications
- Method: GET
- URL: `/api/notification`
- Description: Fetch notifications for the signed-in user.
- Authentication Required: Yes
- Required Role: student, faculty, admin
- Success Response: notification list
- Error Responses: 500 server error

### Get Unread Notifications
- Method: GET
- URL: `/api/notification/unread`
- Description: Fetch unread notifications.
- Authentication Required: Yes
- Required Role: student, faculty, admin
- Success Response: unread notification list
- Error Responses: 500 server error

### Mark Notification as Read
- Method: PATCH
- URL: `/api/notification/:id/read`
- Description: Mark one notification as read.
- Authentication Required: Yes
- Required Role: student, faculty, admin
- URL Params:
  - `id` notification ID
- Success Response: notification update
- Error Responses: 400 invalid ID, 403 unauthorized, 404 not found, 500 server error

### Mark All Notifications as Read
- Method: PATCH
- URL: `/api/notification/read-all`
- Description: Mark all notifications for the signed-in user as read.
- Authentication Required: Yes
- Required Role: student, faculty, admin
- Success Response: success message
- Error Responses: 500 server error

### Delete Notification
- Method: DELETE
- URL: `/api/notification/:id`
- Description: Delete a notification.
- Authentication Required: Yes
- Required Role: student, faculty, admin
- URL Params:
  - `id` notification ID
- Success Response: deleted notification data
- Error Responses: 400 invalid ID, 403 unauthorized, 404 not found, 500 server error

### Admin Get All Notifications
- Method: GET
- URL: `/api/notification/all`
- Description: Fetch all notifications across the system.
- Authentication Required: Yes
- Required Role: admin
- Success Response: all notifications list
- Error Responses: 500 server error

### Broadcast Notification
- Method: POST
- URL: `/api/notification/broadcast`
- Description: Send a broadcast notification to users.
- Authentication Required: Yes
- Required Role: admin
- Request Body: `title`, `message`, `type`, `priority`, and recipient configuration
- Success Response: broadcasted notifications
- Error Responses: 400 invalid payload, 500 server error

---

## Notes
- All protected routes require an `Authorization: Bearer <token>` header.
- The JWT secret is read from `process.env.JWT_SECRET`.
- Upload routes accept only `.pdf`, `.doc`, `.docx` files and enforce a 5MB limit.
- Rate limiting is configured per route group in the backend middleware.
