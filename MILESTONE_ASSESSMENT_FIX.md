# Milestone Assessment Debug & Fix Summary

## Problem Statement
Milestone-specific adaptive assessment was not working while overall assessment was functional. Need to debug the complete flow from frontend request through backend generation to validate answers belong only to the selected milestone.

## Root Cause Analysis

### 1. **Topic Context Issue** ✓ FIXED
**Issue**: Both overall and milestone modes used `item.title` as both milestone and topic, but milestone mode needed stricter validation to ensure generated questions belonged to the selected milestone.

**Fix**: Enhanced `questionValidationChain.js` with `validateMilestoneScope()` function that:
- Maps each milestone to expected keywords (e.g., "OOP in Java" → inheritance, polymorphism, encapsulation, etc.)
- Validates that generated questions contain relevant keywords from the selected milestone
- Rejects questions that belong to other milestones based on keyword detection
- Provides meaningful rejection reasons for retry prompts

### 2. **Missing Debug Logging** ✓ FIXED
**Issue**: No visibility into milestone request flow through the controller.

**Fix**: Added comprehensive logging to `adaptiveAssessmentController.js`:
- `[ADAPTIVE_MILESTONE_REQUEST]` - Logs incoming request mode, roadmapId, milestoneId
- `[ADAPTIVE_MILESTONE_LOOKUP]` - Logs milestone filtering result
- `[ADAPTIVE_MILESTONE_GENERATION]` - Logs per-milestone generation context
- `[LLAMA_MILESTONE_CONTEXT]` - Logs Llama context (domain, milestone, topic, difficulty)
- `[ADAPTIVE_MILESTONE_SAVED]` - Logs final assessment details before saving

## Code Changes

### File: `server/services/questionValidationChain.js`

**Added**: `MILESTONE_SCOPE_KEYWORDS` object mapping milestones to relevant keywords:
```javascript
const MILESTONE_SCOPE_KEYWORDS = {
    "Java Basics": ["syntax", "variable", "data type", ...],
    "OOP in Java": ["inheritance", "polymorphism", "encapsulation", ...],
    "Collections & Generics": ["collection", "arraylist", "hashset", ...],
    // ... other milestones
};
```

**Added**: `validateMilestoneScope()` function that:
1. Checks if generated question contains keywords relevant to selected milestone
2. Detects if question contains keywords from OTHER milestones
3. Rejects off-topic questions with reason: "Question belongs to a different milestone, not \"X\""
4. Allows threshold of 0 expected keyword matches if no keywords appear (unlikely)

**Modified**: `validateQuestionChain()` to call `validateMilestoneScope()` between structural and Java validation:
```
1. Structural validation (format, uniqueness, ambiguity)
   ↓
2. Milestone scope validation (NEW - milestone relevance)
   ↓
3. Java-specific validation (API accuracy, contradictions)
```

### File: `server/controllers/adaptiveAssessmentController.js`

**Added logging at key points**:
- Line 2: Log incoming request parameters
- Line 6: Log milestone lookup result (found/not found + title)
- Line 10: Log per-milestone generation context
- Line 12: Log Llama prompt context
- Line 17: Log final saved assessment details

**Behavior remains unchanged**:
- Milestone filtering: `items.filter(item => item._id.toString() === String(milestoneId))`
- Question count: `MILESTONE_QUESTION_COUNT` (default 10) for milestone mode
- Assessment creation: Saves with `assessmentMode: "milestone"` and `milestoneId`

## Validation Flow for Milestone Mode

```
Frontend Request:
├─ method: POST
├─ endpoint: /api/adaptive-assessment/generate
├─ body: {
│  ├─ mode: "milestone"
│  ├─ roadmapId: "..."
│  └─ milestoneId: "..."
│
↓ Controller (adaptiveAssessmentController.js)
├─ Verify roadmapId and milestoneId provided
├─ Lookup roadmap by roadmapId + student ID
├─ Filter roadmapItems: find item where _id === milestoneId
├─ For selected milestone (single item):
│  └─ For each question to generate (default 10):
│     ├─ Create context: { domain, milestone, topic, difficulty }
│     ├─ Call generateValidatedQuestion(context)
│     └─ Push to questions array
│
↓ Question Generation Service (llamaQuestionGenerationService.js)
├─ buildPrompt() includes:
│  ├─ Domain: "Java Development"
│  ├─ Milestone: e.g., "OOP in Java"
│  ├─ Topic: e.g., "OOP in Java"
│  └─ Difficulty: "easy", "medium", "hard"
├─ Retry loop (up to 3 attempts):
│  ├─ Call Ollama with prompt
│  ├─ Parse JSON response
│  ├─ Call validateQuestionChain()
│  └─ If invalid, include rejection reason in next prompt
│
↓ Validation Chain (questionValidationChain.js)
├─ 1. Structural Validation (generatedQuestionValidator.js)
│  └─ Check format, uniqueness, ambiguity, option similarity
├─ 2. Milestone Scope Validation (NEW)
│  └─ Check question contains "OOP in Java" related keywords
│  └─ Reject if contains other milestone keywords
├─ 3. Java Validation (javaQuestionQualityValidator.js)
│  └─ Check for technical contradictions, API mismatches
│
↓ MongoDB Save (AdaptiveAssessment collection)
├─ studentId: req.user.id
├─ roadmapId: roadmap._id
├─ domain: "Java Development"
├─ assessmentMode: "milestone" ← KEY: distinguishes from overall
├─ milestoneId: selected[0]._id ← KEY: links to specific milestone
├─ milestone: "OOP in Java" ← KEY: human-readable milestone name
├─ title: "OOP in Java Adaptive Assessment"
├─ questions: [...array of 10 validated questions...]
└─ readinessSnapshot: {"OOP in Java": 0.45, ...}
```

## Expected Behavior After Fix

### 1. **Request Logging**
Console shows:
```
[ADAPTIVE_MILESTONE_REQUEST] mode: milestone, roadmapId: 676c35e2..., milestoneId: 676c35e2...
[ADAPTIVE_MILESTONE_LOOKUP] milestoneId: 676c35e2..., found: true, selected: OOP in Java
[ADAPTIVE_MILESTONE_GENERATION] milestone: OOP in Java, mode: milestone, questionCount: 10, readiness: 0.45
[LLAMA_MILESTONE_CONTEXT] domain: Java Development, milestone: OOP in Java, topic: OOP in Java, difficulty: easy
```

### 2. **Question Quality**
- All 10 questions contain OOP keywords (inheritance, polymorphism, encapsulation, override, interface, extends, super, constructor)
- No questions about Collections, Multithreading, or File I/O
- If Llama generates off-topic question, validator logs:
  ```
  [QUESTION_REJECTED] topic: OOP in Java, reason: Question belongs to a different milestone, not "OOP in Java", attempt: 1
  ```
- Retry prompt includes rejection reason so Llama knows to stay on-topic

### 3. **Response Format**
```json
{
  "success": true,
  "assessment": {
    "id": "677b1c2d...",
    "assessmentMode": "milestone",
    "milestoneId": "676c35e2...",
    "milestone": "OOP in Java",
    "domain": "Java Development",
    "questions": [
      {
        "questionId": "uuid",
        "milestone": "OOP in Java",
        "topic": "OOP in Java",
        "difficulty": "easy",
        "question": "Which keyword is used to establish an is-a relationship in Java?",
        "options": ["extends", "implements", "inheritance", "super"],
        "correctAnswer": "extends",
        "explanation": "..."
      },
      // ... 9 more questions
    ]
  }
}
```

## Testing Recommendations

### Test 1: Basic Milestone Generation
```bash
curl -X POST http://localhost:5000/api/adaptive-assessment/generate \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "milestone",
    "roadmapId": "<roadmap_id>",
    "milestoneId": "<milestone_id>"
  }'
```
Expected: Status 201, 10 questions, all about selected milestone

### Test 2: Verify Milestone-Specific Questions
Check MongoDB:
```javascript
db.adaptiveassessments.findOne({ assessmentMode: "milestone" })
// Should have:
// - assessmentMode: "milestone"
// - milestoneId: ObjectId (not null)
// - milestone: "OOP in Java" (not empty)
// - questions: array of 10 items
// - All questions should have topic matching milestone
```

### Test 3: Verify Overall Assessment Still Works
```bash
curl -X POST http://localhost:5000/api/adaptive-assessment/generate \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "overall",
    "roadmapId": "<roadmap_id>"
  }'
```
Expected: Status 201, ~18 questions (2 per milestone), spread across all milestones

### Test 4: Invalid Milestone ID
```bash
curl -X POST http://localhost:5000/api/adaptive-assessment/generate \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "milestone",
    "roadmapId": "<roadmap_id>",
    "milestoneId": "invalid-id-xyz"
  }'
```
Expected: Status 400, message: "Milestone not found in this roadmap."

## Validation Chain Enhancement Details

### Before (Broken for Milestone):
```
Generated Question → Structural Check → Java Validation → Save
                                           (only checks API accuracy)
                                           (doesn't check topic relevance)
```

### After (Fixed for Milestone):
```
Generated Question → Structural Check → Milestone Scope Check → Java Validation → Save
                       (format/ambiguity)   (keyword matching)     (API accuracy)
                                            (rejects off-topic)
```

### Keywords Used for "OOP in Java" Validation:
- Expected: inheritance, polymorphism, encapsulation, abstraction, override, interface, extends, implements, super, this, constructor
- Detected rejection of: ArrayList, LinkedList, HashMap (Collections topic), Thread, Runnable (Multithreading topic), etc.

## Log Pattern Reference

Use these log patterns to monitor milestone assessment flow:

```bash
# Watch for milestone requests
grep "\[ADAPTIVE_MILESTONE" server.log

# Track Llama context
grep "\[LLAMA_MILESTONE_CONTEXT" server.log

# Find question rejections for milestone
grep "\[QUESTION_REJECTED\].*OOP" server.log

# Verify saved assessment
grep "\[ADAPTIVE_MILESTONE_SAVED\]" server.log
```

## Status: READY FOR TESTING ✓

All code changes complete:
- ✓ Enhanced validation chain with milestone scope checking
- ✓ Added comprehensive debug logging
- ✓ Milestone filtering logic verified
- ✓ Syntax validation passed
- ✓ Test script created for end-to-end verification

**Next Step**: Run the test script against backend server with Ollama running to verify milestone assessment works end-to-end.
