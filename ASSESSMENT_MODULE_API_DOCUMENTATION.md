# Assessment Module - Complete API Documentation

## Overview
Complete implementation of the Student Assessment Attempt Module with auto-evaluation, result storage, and placement readiness scoring. All endpoints are production-ready with proper error handling and validation.

---

## Architecture Overview

### Service Layer
- **assessmentAttemptService.js** - Manages assessment workflow (view, start, auto-save, submit)
- **assessmentEvaluationService.js** - Handles auto-evaluation, scoring, and analysis
- **readinessService.js** - Calculates placement readiness score
- **assessmentValidator.js** - Validates assessment and submission data

### Controllers
- **studentAssessmentController.js** - Student assessment attempt endpoints
- **facultyResultController.js** - Faculty result viewing and analytics endpoints

### Routes
- **studentAssessmentRoutes.js** - Student assessment attempt routes
- **facultyResultRoutes.js** - Faculty result viewing routes

---

## Student Assessment Attempt APIs

### 1. Get All Assigned Assessments

**Endpoint**
```
GET /api/assessment/my
Authorization: Bearer <student_token>
```

**Response**
```json
{
    "success": true,
    "message": "Assessments fetched successfully",
    "data": {
        "count": 3,
        "assessments": [
            {
                "_id": "assessment_id_1",
                "title": "JavaScript Fundamentals",
                "description": "Basic JavaScript concepts assessment",
                "assessmentType": "Practice",
                "totalMarks": 100,
                "duration": 60,
                "startDate": "2024-08-01T10:00:00Z",
                "endDate": "2024-08-15T23:59:59Z",
                "isInitialAssessment": false,
                "attemptStatus": "Pending",
                "attempted": false,
                "score": null,
                "percentage": null,
                "submittedAt": null
            },
            {
                "_id": "assessment_id_2",
                "title": "Python Basics",
                "description": "Python fundamentals",
                "assessmentType": "Practice",
                "totalMarks": 100,
                "duration": 45,
                "startDate": "2024-08-01T10:00:00Z",
                "endDate": "2024-08-15T23:59:59Z",
                "isInitialAssessment": false,
                "attemptStatus": "Completed",
                "attempted": true,
                "score": 75,
                "percentage": 75,
                "submittedAt": "2024-08-05T14:30:00Z"
            }
        ]
    }
}
```

**Error Responses**
- `500` - Server error

---

### 2. Start Assessment

**Endpoint**
```
POST /api/assessment/:assessmentId/start
Authorization: Bearer <student_token>
```

**Response (200)**
```json
{
    "success": true,
    "message": "Assessment started successfully",
    "data": {
        "assessment": {
            "_id": "assessment_id_1",
            "title": "JavaScript Fundamentals",
            "description": "Learn JavaScript basics",
            "totalMarks": 100,
            "duration": 60,
            "startDate": "2024-08-01T10:00:00Z",
            "endDate": "2024-08-15T23:59:59Z"
        },
        "questions": [
            {
                "_id": "question_id_1",
                "title": "Variables in JavaScript",
                "question": "What is the difference between var, let, and const?",
                "questionType": "MCQ",
                "marks": 5,
                "options": ["A) No difference", "B) Different scoping rules", "C) var is best", "D) None"],
                "difficulty": "Medium",
                "topic": "JavaScript Basics"
            },
            {
                "_id": "question_id_2",
                "title": "Arrow Functions",
                "question": "How to write arrow functions in JavaScript?",
                "questionType": "MCQ",
                "marks": 5,
                "options": ["A) => {}", "B) -> {}", "C) function => {}", "D) func =>"],
                "difficulty": "Easy",
                "topic": "JavaScript Functions"
            }
        ],
        "startedAt": "2024-08-05T10:00:00Z",
        "timeLimit": 60
    }
}
```

**Error Responses**
- `400` - Assessment not available, student not assigned, assessment expired
- `403` - Account deactivated
- `404` - Assessment not found
- `409` - Already attempted this assessment

---

### 3. Auto-Save Assessment Attempt

**Endpoint**
```
POST /api/assessment/:assessmentId/auto-save
Authorization: Bearer <student_token>
Content-Type: application/json
```

**Request Body**
```json
{
    "answers": [
        {
            "question": "question_id_1",
            "selectedAnswer": "B) Different scoping rules"
        },
        {
            "question": "question_id_2",
            "selectedAnswer": "A) => {}"
        }
    ],
    "timeSpent": 45
}
```

**Response (200)**
```json
{
    "success": true,
    "message": "Assessment auto-saved successfully",
    "data": {
        "saved": true,
        "timeSpent": 45,
        "answersCount": 2,
        "assessmentId": "assessment_id_1",
        "studentId": "student_id",
        "savedAt": "2024-08-05T10:45:00Z"
    }
}
```

**Error Responses**
- `400` - Invalid data format, assessment not available

---

### 4. Submit Assessment

**Endpoint**
```
POST /api/assessment/:assessmentId/submit
Authorization: Bearer <student_token>
Content-Type: application/json
```

**Request Body**
```json
{
    "answers": [
        {
            "question": "question_id_1",
            "selectedAnswer": "B) Different scoping rules"
        },
        {
            "question": "question_id_2",
            "selectedAnswer": "A) => {}"
        }
    ],
    "timeTaken": 58
}
```

**Response (201)**
```json
{
    "success": true,
    "message": "Assessment submitted! Your score: 85%",
    "data": {
        "_id": "result_id_1",
        "score": 85,
        "totalMarks": 100,
        "percentage": 85,
        "submittedAt": "2024-08-05T10:58:00Z"
    }
}
```

**Error Responses**
- `400` - Invalid answers, assessment expired, not assigned
- `403` - Account deactivated
- `404` - Assessment not found
- `409` - Already attempted this assessment

---

### 5. Get Assessment History

**Endpoint**
```
GET /api/assessment/history
Authorization: Bearer <student_token>
```

**Response**
```json
{
    "success": true,
    "message": "Assessment history fetched successfully",
    "data": {
        "count": 2,
        "assessments": [
            {
                "_id": "result_id_2",
                "assessment": {
                    "_id": "assessment_id_2",
                    "title": "Python Basics",
                    "assessmentType": "Practice",
                    "totalMarks": 100,
                    "duration": 45
                },
                "score": 75,
                "percentage": 75,
                "submittedAt": "2024-08-05T14:30:00Z"
            },
            {
                "_id": "result_id_1",
                "assessment": {
                    "_id": "assessment_id_1",
                    "title": "JavaScript Fundamentals",
                    "assessmentType": "Practice",
                    "totalMarks": 100,
                    "duration": 60
                },
                "score": 85,
                "percentage": 85,
                "submittedAt": "2024-08-05T10:58:00Z"
            }
        ]
    }
}
```

---

### 6. Get Assessment Result Details

**Endpoint**
```
GET /api/assessment/result/:resultId
Authorization: Bearer <student_token>
```

**Response**
```json
{
    "success": true,
    "message": "Assessment result fetched successfully",
    "data": {
        "_id": "result_id_1",
        "assessment": {
            "_id": "assessment_id_1",
            "title": "JavaScript Fundamentals",
            "description": "Learn JavaScript basics",
            "assessmentType": "Practice",
            "totalMarks": 100,
            "duration": 60
        },
        "score": 85,
        "totalMarks": 100,
        "percentage": 85,
        "submittedAt": "2024-08-05T10:58:00Z",
        "strengths": [
            "Strong in JavaScript Basics (100% accuracy)",
            "Strong in JavaScript Functions (80% accuracy)"
        ],
        "weaknesses": [
            "Needs improvement in JavaScript Advanced (40% accuracy)"
        ],
        "recommendations": [
            "Excellent performance! Keep practicing to maintain this level",
            "Try harder difficulty questions to further improve"
        ],
        "topicAnalysis": [
            {
                "topic": "JavaScript Basics",
                "correctAnswers": 5,
                "totalQuestions": 5,
                "score": 25,
                "totalMarks": 25,
                "accuracy": 100
            },
            {
                "topic": "JavaScript Functions",
                "correctAnswers": 4,
                "totalQuestions": 5,
                "score": 20,
                "totalMarks": 25,
                "accuracy": 80
            }
        ],
        "answers": {
            "totalQuestions": 10,
            "correct": 9,
            "wrong": 1,
            "skipped": 0,
            "details": [
                {
                    "questionId": "question_id_1",
                    "title": "Variables in JavaScript",
                    "question": "What is the difference between var, let, and const?",
                    "questionType": "MCQ",
                    "marks": 5,
                    "topic": "JavaScript Basics",
                    "studentAnswer": "B) Different scoping rules",
                    "correctAnswer": "B) Different scoping rules",
                    "isCorrect": true,
                    "marksObtained": 5,
                    "explanation": "var, let, and const have different scoping rules. var is function-scoped, while let and const are block-scoped.",
                    "options": ["A) No difference", "B) Different scoping rules", "C) var is best", "D) None"]
                }
            ]
        }
    }
}
```

---

### 7. Get Placement Readiness Score

**Endpoint**
```
GET /api/assessment/readiness-score
Authorization: Bearer <student_token>
```

**Response**
```json
{
    "success": true,
    "message": "Readiness score fetched successfully",
    "data": {
        "score": 72,
        "level": "High",
        "explanation": "Your placement readiness score is 72%. Profile: 85%, Assessments: 75%, Coding: 60%",
        "recommendations": [
            "Great! You are ready for placements. Keep preparing!",
            "Try harder difficulty questions to further improve"
        ],
        "lastCalculatedAt": "2024-08-05T15:00:00Z"
    }
}
```

**Readiness Score Calculation**
- Profile Completion: 20%
- Assessment Score: 40%
- Coding Profile: 20%
- Resume Uploaded: 10%
- Email Verified: 10%

**Readiness Levels**
- Low (0-39): Needs significant improvement
- Medium (40-69): On the right track
- High (70-100): Ready for placements

---

## Faculty Result APIs

### 1. Get All Assessment Results

**Endpoint**
```
GET /api/faculty/results?assessmentId=optional&page=1&limit=20&sortBy=submittedAt&order=-1
Authorization: Bearer <faculty_token>
```

**Response**
```json
{
    "success": true,
    "message": "Results fetched successfully",
    "data": {
        "total": 45,
        "page": 1,
        "limit": 20,
        "pages": 3,
        "results": [
            {
                "_id": "result_id_1",
                "student": {
                    "_id": "student_id_1",
                    "name": "John Doe",
                    "email": "john@university.edu",
                    "studentId": "STU001",
                    "department": "Computer Science",
                    "year": 3
                },
                "assessment": {
                    "_id": "assessment_id_1",
                    "title": "JavaScript Fundamentals",
                    "assessmentType": "Practice",
                    "totalMarks": 100,
                    "duration": 60
                },
                "score": 85,
                "percentage": 85,
                "submittedAt": "2024-08-05T10:58:00Z",
                "completed": true
            }
        ]
    }
}
```

---

### 2. Get Student's All Results

**Endpoint**
```
GET /api/faculty/results/:studentId?page=1&limit=20
Authorization: Bearer <faculty_token>
```

**Response**
```json
{
    "success": true,
    "message": "Student results fetched successfully",
    "data": {
        "student": {
            "_id": "student_id_1",
            "name": "John Doe",
            "email": "john@university.edu",
            "studentId": "STU001",
            "department": "Computer Science",
            "year": 3
        },
        "total": 5,
        "page": 1,
        "limit": 20,
        "pages": 1,
        "results": [
            {
                "_id": "result_id_1",
                "assessment": {
                    "_id": "assessment_id_1",
                    "title": "JavaScript Fundamentals",
                    "assessmentType": "Practice",
                    "totalMarks": 100
                },
                "score": 85,
                "percentage": 85,
                "submittedAt": "2024-08-05T10:58:00Z",
                "completed": true,
                "strengths": ["Strong in JavaScript Basics"],
                "weaknesses": ["Needs improvement in Advanced Topics"],
                "recommendations": ["Keep practicing"]
            }
        ]
    }
}
```

---

### 3. Get Detailed Student Result Analysis

**Endpoint**
```
GET /api/faculty/results/:studentId/:resultId
Authorization: Bearer <faculty_token>
```

**Response**
```json
{
    "success": true,
    "message": "Result details fetched successfully",
    "data": {
        "assessment": {
            "_id": "assessment_id_1",
            "title": "JavaScript Fundamentals",
            "description": "Learn JavaScript basics",
            "assessmentType": "Practice",
            "totalMarks": 100,
            "duration": 60,
            "assignedFaculty": "faculty_id"
        },
        "student": {
            "_id": "student_id_1",
            "name": "John Doe",
            "email": "john@university.edu",
            "studentId": "STU001",
            "department": "Computer Science",
            "year": 3
        },
        "score": 85,
        "totalMarks": 100,
        "percentage": 85,
        "submittedAt": "2024-08-05T10:58:00Z",
        "completed": true,
        "strengths": [
            "Strong in JavaScript Basics (100% accuracy)",
            "Strong in JavaScript Functions (80% accuracy)"
        ],
        "weaknesses": [
            "Needs improvement in JavaScript Advanced (40% accuracy)"
        ],
        "recommendations": [
            "Excellent performance! Keep practicing to maintain this level",
            "Try harder difficulty questions to further improve"
        ],
        "topicAnalysis": [
            {
                "topic": "JavaScript Basics",
                "correctAnswers": 5,
                "totalQuestions": 5,
                "score": 25,
                "totalMarks": 25,
                "accuracy": 100
            }
        ],
        "answers": {
            "totalQuestions": 10,
            "correct": 9,
            "wrong": 1,
            "skipped": 0,
            "details": [
                {
                    "questionId": "question_id_1",
                    "title": "Variables in JavaScript",
                    "question": "What is the difference between var, let, and const?",
                    "questionType": "MCQ",
                    "marks": 5,
                    "topic": "JavaScript Basics",
                    "studentAnswer": "B) Different scoping rules",
                    "correctAnswer": "B) Different scoping rules",
                    "isCorrect": true,
                    "marksObtained": 5,
                    "explanation": "var, let, and const have different scoping rules..."
                }
            ]
        }
    }
}
```

---

### 4. Get Dashboard Statistics

**Endpoint**
```
GET /api/faculty/dashboard/statistics?assessmentId=optional
Authorization: Bearer <faculty_token>
```

**Response**
```json
{
    "success": true,
    "message": "Dashboard statistics fetched successfully",
    "data": {
        "overallStatistics": {
            "totalResults": 120,
            "averageScoreAllAssessments": 72.5,
            "averagePercentageAllAssessments": 73,
            "highestScoreAllAssessments": 100,
            "lowestScoreAllAssessments": 35
        },
        "assessmentStatistics": [
            {
                "assessmentId": "assessment_id_1",
                "assessmentTitle": "JavaScript Fundamentals",
                "totalMarks": 100,
                "totalAttempts": 45,
                "completionPercentage": 90,
                "averageScore": 75.6,
                "averagePercentage": 76,
                "highestScore": 100,
                "lowestScore": 40,
                "highestPercentage": 100,
                "lowestPercentage": 40
            }
        ],
        "topStudents": [
            {
                "_id": "student_id_1",
                "studentName": "John Doe",
                "studentId": "STU001",
                "averagePercentage": 92,
                "assessmentsAttempted": 5
            },
            {
                "_id": "student_id_2",
                "studentName": "Jane Smith",
                "studentId": "STU002",
                "averagePercentage": 88,
                "assessmentsAttempted": 4
            }
        ]
    }
}
```

---

## Testing Order & Flow

### 1. Student Assessment Workflow
```
1. GET /api/assessment/my
   - View all assigned assessments
   - Check attempt status

2. POST /api/assessment/:assessmentId/start
   - Start an assessment
   - Receive questions without answers

3. POST /api/assessment/:assessmentId/auto-save (Multiple times)
   - Auto-save answers while attempting
   - Track time spent

4. POST /api/assessment/:assessmentId/submit
   - Submit assessment for evaluation
   - Get immediate score and feedback

5. GET /api/assessment/history
   - View all past attempts

6. GET /api/assessment/result/:resultId
   - View detailed result analysis
   - See strengths, weaknesses, recommendations

7. GET /api/assessment/readiness-score
   - Check placement readiness
```

### 2. Faculty Result Viewing
```
1. GET /api/faculty/results
   - View all student results

2. GET /api/faculty/results/:studentId
   - View specific student's performance

3. GET /api/faculty/results/:studentId/:resultId
   - View detailed answer analysis

4. GET /api/faculty/dashboard/statistics
   - View assessment statistics
   - See top performers
```

---

## Data Models Used

### AssessmentResult Schema
- `student` - Reference to Student
- `assessment` - Reference to Assessment
- `score` - Numeric score
- `totalMarks` - Max marks
- `percentage` - Score percentage
- `answers` - Array of answer objects
- `strengths` - Array of strength strings
- `weaknesses` - Array of weakness strings
- `recommendations` - Array of recommendation strings
- `topicAnalysis` - Topic-wise performance
- `submittedAt` - Submission timestamp
- `completed` - Boolean flag

### Assessment Model Extensions
- `isInitialAssessment` - Flag for initial assessment
- `assignedStudents` - Array of student IDs
- `assignedFaculty` - Faculty ID

---

## Key Features Implemented

✅ **Student Assessment Attempt**
- View assigned assessments
- Start assessment with question details
- Auto-save progress while attempting
- Submit for evaluation
- View attempt history
- Detailed result analysis

✅ **Auto-Evaluation**
- MCQ automatic evaluation
- Correct/wrong/skipped tracking
- Topic-wise performance analysis
- Coding answer storage (placeholder for compiler)
- Subjective answer storage (placeholder for manual review)

✅ **Result Storage**
- Complete answer tracking
- Score and percentage calculation
- Strengths and weaknesses identification
- Topic analysis
- Recommendations generation

✅ **Placement Readiness Scoring**
- Multi-factor calculation (5 factors)
- Profile completion tracking
- Assessment score integration
- Coding profile consideration
- Resume and email verification status
- Automatic updates after each attempt

✅ **Faculty APIs**
- View all student results
- Student-specific performance analysis
- Detailed answer review
- Dashboard statistics
- Top performer identification

---

## Error Handling

All endpoints return proper HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (validation errors)
- `403` - Forbidden (insufficient permissions, deactivated account)
- `404` - Not found
- `409` - Conflict (duplicate attempt)
- `500` - Server error

---

## Security Features

✅ JWT Authentication required for all endpoints
✅ Role-based authorization (student/faculty)
✅ Student can only access own results
✅ Faculty can only access results for their assessments
✅ Assessment deadline enforcement
✅ Duplicate attempt prevention
✅ Account deactivation checks

---

## Production Notes

- All database queries use proper indexing
- Async/await error handling throughout
- Proper validation before database operations
- No sensitive data exposed in responses
- Pagination support for large result sets
- Sortable and filterable results
- Comprehensive logging for debugging

