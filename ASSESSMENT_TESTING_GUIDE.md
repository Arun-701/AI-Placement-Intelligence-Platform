# Assessment Module - API Testing Guide

This guide provides complete curl commands and Postman-style testing for all assessment APIs.

**Base URL**: `http://localhost:5000`

---

## Prerequisites

### 1. Get Student Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "StrongPass@123"
  }'
```

Save the token from response as `$STUDENT_TOKEN`

### 2. Get Faculty Token
```bash
curl -X POST http://localhost:5000/api/auth/faculty/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "faculty@university.edu",
    "password": "StrongPass@123"
  }'
```

Save the token from response as `$FACULTY_TOKEN`

---

## Student Assessment Testing

### Test 1: Get My Assessments
```bash
curl -X GET http://localhost:5000/api/assessment/my \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - List of assigned assessments with attempt status

---

### Test 2: Start Assessment
```bash
# First, get assessment ID from Test 1 response
# Use the first assessment's _id

curl -X POST http://localhost:5000/api/assessment/{assessmentId}/start \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - Assessment details with questions (no answers)

**Save**: Assessment duration for timeout tracking

---

### Test 3: Auto-Save Assessment (Simulate Progress)
```bash
curl -X POST http://localhost:5000/api/assessment/{assessmentId}/auto-save \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
        {
            "question": "question_id_1",
            "selectedAnswer": "Option B"
        },
        {
            "question": "question_id_2",
            "selectedAnswer": ""
        }
    ],
    "timeSpent": 30
  }'
```

**Expected Response**: 200 - Save confirmation

**Note**: Call this multiple times to simulate student working on assessment

---

### Test 4: Submit Assessment
```bash
curl -X POST http://localhost:5000/api/assessment/{assessmentId}/submit \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
        {
            "question": "question_id_1",
            "selectedAnswer": "Option B"
        },
        {
            "question": "question_id_2",
            "selectedAnswer": "Option A"
        },
        {
            "question": "question_id_3",
            "selectedAnswer": "Option C"
        }
    ],
    "timeTaken": 58
  }'
```

**Expected Response**: 201 - Score and percentage

**Save**: Result ID for Test 6

---

### Test 5: Get Assessment History
```bash
curl -X GET http://localhost:5000/api/assessment/history \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - List of all past attempts sorted by date

---

### Test 6: Get Assessment Result Details
```bash
# Use result ID from Test 4
curl -X GET http://localhost:5000/api/assessment/result/{resultId} \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - Detailed result with:
- Score breakdown
- Strengths and weaknesses
- Recommendations
- Topic analysis
- Individual answer details with explanations

---

### Test 7: Get Placement Readiness Score
```bash
curl -X GET http://localhost:5000/api/assessment/readiness-score \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - Readiness score (0-100) with level and recommendations

---

## Faculty Result Testing

### Test 8: Get All Assessment Results
```bash
curl -X GET "http://localhost:5000/api/faculty/results?page=1&limit=10&sortBy=submittedAt&order=-1" \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - All results with pagination

**Optional Filters**:
- `assessmentId=id` - Filter by specific assessment
- `page=2` - Pagination (default 1)
- `limit=20` - Results per page (default 20)
- `sortBy=submittedAt` - Sort field (default submittedAt)
- `order=-1` - Sort order (1 for asc, -1 for desc)

---

### Test 9: Get Specific Student's Results
```bash
# studentId from student profile
curl -X GET "http://localhost:5000/api/faculty/results/{studentId}?page=1&limit=10" \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - All attempts by student with strengths/weaknesses

---

### Test 10: Get Detailed Student Result Analysis
```bash
# Get resultId from Test 8 or 9
curl -X GET http://localhost:5000/api/faculty/results/{studentId}/{resultId} \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - Complete analysis including:
- All student answers
- Correct answers and explanations
- Marks breakdown
- Topic performance
- Detailed feedback

---

### Test 11: Get Dashboard Statistics
```bash
curl -X GET "http://localhost:5000/api/faculty/dashboard/statistics" \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**: 200 - Statistics showing:
- Overall statistics (total results, averages, highest, lowest)
- Per-assessment statistics
- Top 10 performing students

**Optional Filter**:
- `assessmentId=id` - Stats for specific assessment

---

## Error Testing

### Test 12: Attempt Assessment Twice (Should Fail)
```bash
# First submission should succeed
curl -X POST http://localhost:5000/api/assessment/{assessmentId}/submit \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "answers": [...], "timeTaken": 60 }'

# Second submission should fail with 409
curl -X POST http://localhost:5000/api/assessment/{assessmentId}/submit \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "answers": [...], "timeTaken": 60 }'
```

**Expected Response**: 409 - "You have already attempted this assessment"

---

### Test 13: Access After Deadline (Should Fail)
```bash
# Create assessment with past end date
curl -X POST http://localhost:5000/api/assessment \
  -H "Authorization: Bearer $FACULTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Expired Assessment",
    "endDate": "2024-01-01T23:59:59Z",
    ...
  }'

# Try to submit (should fail)
curl -X POST http://localhost:5000/api/assessment/{expiredAssessmentId}/submit \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -d '{ "answers": [...], "timeTaken": 60 }'
```

**Expected Response**: 400 - "Assessment has expired"

---

### Test 14: Invalid Answer Format (Should Fail)
```bash
curl -X POST http://localhost:5000/api/assessment/{assessmentId}/submit \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": "not an array",
    "timeTaken": 60
  }'
```

**Expected Response**: 400 - "Answers array is required"

---

### Test 15: Unauthorized Faculty Access (Should Fail)
```bash
# Try to access results from different faculty's assessment
curl -X GET http://localhost:5000/api/faculty/results/{otherFacultyAssessmentId} \
  -H "Authorization: Bearer $FACULTY_TOKEN"
```

**Expected Response**: 403 - "Unauthorized access"

---

## Sample Test Data

### Sample Assessment (for creation)
```json
{
    "title": "Full Stack Development",
    "description": "Assessment for full stack web development concepts",
    "assessmentType": "Practice",
    "totalMarks": 100,
    "duration": 120,
    "passingMarks": 40,
    "startDate": "2024-08-01T10:00:00Z",
    "endDate": "2024-08-31T23:59:59Z",
    "questions": ["question_id_1", "question_id_2", "question_id_3"],
    "assignedStudents": ["student_id_1", "student_id_2"],
    "assignedFaculty": "faculty_id",
    "status": "Published",
    "isActive": true
}
```

### Sample Questions (MCQ)
```json
[
    {
        "title": "REST API",
        "question": "What does REST stand for?",
        "questionType": "MCQ",
        "marks": 5,
        "topic": "Web Development",
        "difficulty": "Easy",
        "options": ["Representational State Transfer", "Remote State Table", "Resource Server Transfer", "Remote Server Tool"],
        "correctAnswer": "Representational State Transfer"
    },
    {
        "title": "Database Concepts",
        "question": "What is normalization?",
        "questionType": "MCQ",
        "marks": 5,
        "topic": "Database",
        "difficulty": "Medium",
        "options": ["Data reduction", "Database organization", "Organizing data to reduce redundancy", "Data backup"],
        "correctAnswer": "Organizing data to reduce redundancy"
    }
]
```

---

## Performance Testing Scenarios

### Scenario 1: Multiple Students Taking Assessment
```bash
# Loop for 10 students
for i in {1..10}; do
  # Get token for student_$i
  # Call /start
  # Auto-save multiple times
  # Submit
done
```

---

### Scenario 2: Large Batch of Assessment Results
```bash
# Query results with pagination
curl -X GET "http://localhost:5000/api/faculty/results?page=1&limit=100" \
  -H "Authorization: Bearer $FACULTY_TOKEN"

# Then iterate through pages
curl -X GET "http://localhost:5000/api/faculty/results?page=2&limit=100" \
  -H "Authorization: Bearer $FACULTY_TOKEN"
```

---

## Postman Collection (JSON Format)

Save this as `Assessment-Module.postman_collection.json`:

```json
{
    "info": {
        "name": "Assessment Module",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "Student - Get My Assessments",
            "request": {
                "method": "GET",
                "url": "http://localhost:5000/api/assessment/my",
                "header": {
                    "Authorization": "Bearer {{student_token}}",
                    "Content-Type": "application/json"
                }
            }
        },
        {
            "name": "Student - Start Assessment",
            "request": {
                "method": "POST",
                "url": "http://localhost:5000/api/assessment/{{assessmentId}}/start",
                "header": {
                    "Authorization": "Bearer {{student_token}}",
                    "Content-Type": "application/json"
                }
            }
        },
        {
            "name": "Student - Auto-Save",
            "request": {
                "method": "POST",
                "url": "http://localhost:5000/api/assessment/{{assessmentId}}/auto-save",
                "header": {
                    "Authorization": "Bearer {{student_token}}",
                    "Content-Type": "application/json"
                },
                "body": {
                    "mode": "raw",
                    "raw": "{\"answers\": [...], \"timeSpent\": 30}"
                }
            }
        },
        {
            "name": "Student - Submit Assessment",
            "request": {
                "method": "POST",
                "url": "http://localhost:5000/api/assessment/{{assessmentId}}/submit",
                "header": {
                    "Authorization": "Bearer {{student_token}}",
                    "Content-Type": "application/json"
                },
                "body": {
                    "mode": "raw",
                    "raw": "{\"answers\": [...], \"timeTaken\": 60}"
                }
            }
        }
    ]
}
```

---

## Database Queries (for manual verification)

### Check Assessment Attempts
```javascript
db.assessmentresults.find({ student: ObjectId("student_id") })
```

### Check Assessment Statistics
```javascript
db.assessmentresults.aggregate([
    { $match: { assessment: ObjectId("assessment_id"), completed: true } },
    {
        $group: {
            _id: null,
            avgScore: { $avg: "$score" },
            avgPercentage: { $avg: "$percentage" },
            maxScore: { $max: "$score" },
            minScore: { $min: "$score" },
            count: { $sum: 1 }
        }
    }
])
```

### Check Topic Performance
```javascript
db.assessmentresults.findOne(
    { _id: ObjectId("result_id") },
    { topicAnalysis: 1 }
)
```

---

## Troubleshooting

### 400 - "All assessment questions must be answered"
- Ensure every question in the assessment has an answer
- Check question count matches answers count

### 409 - "You have already attempted this assessment"
- Student can only attempt each assessment once
- Use different assessment ID for testing

### 403 - "Account is deactivated"
- Check student account status in database
- Activate account before retrying

### 404 - Assessment not found
- Verify assessment ID is correct
- Check assessment is published and active

### 500 - Server error
- Check server logs for detailed error
- Verify all referenced IDs exist (assessment, questions, student)

---

## Load Testing Script (Node.js)

```javascript
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testAssessmentSubmission() {
    try {
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'student@university.edu',
            password: 'StrongPass@123'
        });
        
        const token = loginRes.data.data.token;
        const assessmentsRes = await axios.get(`${BASE_URL}/api/assessment/my`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const assessmentId = assessmentsRes.data.data.assessments[0]._id;
        
        const startRes = await axios.post(
            `${BASE_URL}/api/assessment/${assessmentId}/start`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const questions = startRes.data.data.questions;
        const answers = questions.map(q => ({
            question: q._id,
            selectedAnswer: q.options[0]
        }));
        
        const submitRes = await axios.post(
            `${BASE_URL}/api/assessment/${assessmentId}/submit`,
            { answers, timeTaken: 60 },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Success:', submitRes.data.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testAssessmentSubmission();
```

---

## API Response Times (Benchmarks)

- Get My Assessments: < 200ms
- Start Assessment: < 300ms
- Auto-Save: < 100ms
- Submit Assessment: < 500ms (with evaluation)
- Get Result Details: < 400ms
- Faculty Dashboard Stats: < 800ms (with aggregation)

