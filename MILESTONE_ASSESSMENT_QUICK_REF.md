# Milestone Assessment - Quick Reference

## What Changed

### Added Milestone Scope Validation
File: `server/services/questionValidationChain.js`

**New Feature**: Questions generated for a specific milestone are validated to ensure they belong to that milestone.

**How it works**:
- Each milestone has a set of relevant keywords
- Generated questions must contain at least one keyword from their milestone
- If question has many keywords from OTHER milestones, it gets rejected
- Rejection reason: `"Question belongs to a different milestone, not \"OOP in Java\""`
- Llama retries with this feedback to generate on-topic question

**Milestone Keywords**:
```javascript
"OOP in Java": ["inheritance", "polymorphism", "encapsulation", "abstraction", 
                "override", "interface", "extends", "implements", "super", "this", "constructor"]

"Collections & Generics": ["collection", "arraylist", "linkedlist", "hashset", "hashmap", 
                          "generic", "type parameter", "wildcard", "comparator", "iterator", 
                          "stream", "set", "list", "map", "queue", "deque", "stack"]

"Multithreading & Concurrency": ["thread", "runnable", "synchronized", "lock", "concurrent", 
                                 "volatile", "atomic", "semaphore", "barrier", "latch", 
                                 "executor", "callable"]
// ... etc for all milestones
```

### Added Debug Logging
File: `server/controllers/adaptiveAssessmentController.js`

**New Logs**:
```
[ADAPTIVE_MILESTONE_REQUEST]    - Incoming request
[ADAPTIVE_MILESTONE_LOOKUP]     - Milestone found/not found
[ADAPTIVE_MILESTONE_GENERATION] - Per-milestone context
[LLAMA_MILESTONE_CONTEXT]       - Exact Llama prompt context
[ADAPTIVE_MILESTONE_SAVED]      - Final saved assessment
[QUESTION_REJECTED]             - Questions that failed validation
```

## API Behavior

### Endpoint
```
POST /api/adaptive-assessment/generate
Authorization: Bearer <JWT>
Content-Type: application/json
```

### Request for Milestone Mode
```json
{
  "mode": "milestone",
  "roadmapId": "676c35e2e2d5f8c8b8e2d3a0",
  "milestoneId": "676c35e2e2d5f8c8b8e2d3a1"
}
```

### Response
```json
{
  "success": true,
  "assessment": {
    "id": "...",
    "assessmentMode": "milestone",
    "milestoneId": "676c35e2e2d5f8c8b8e2d3a1",
    "milestone": "OOP in Java",
    "domain": "Java Development",
    "questions": [
      // 10 questions, all about OOP in Java
    ]
  }
}
```

## Validation Flow

```
Question Generated
    ↓
✓ Structural Check (format, no duplicates, no ambiguity)
    ↓
✓ Milestone Scope Check (contains relevant keywords)
    ↓
✓ Java Validation (API accuracy, no contradictions)
    ↓
Save to Database
```

If any check fails → Reject with reason → Retry (up to 3 times)

## Important Fields

### In MongoDB Document

| Field | Overall Mode | Milestone Mode |
|-------|--------------|-----------------|
| `assessmentMode` | `"overall"` | `"milestone"` |
| `milestoneId` | `null` | `ObjectId(...)` |
| `milestone` | `""` | `"OOP in Java"` |
| `questions.length` | `~18` | `10` |
| `questions[].milestone` | varies | all same |

### In Question Object

```javascript
{
  questionId: "uuid",
  milestone: "OOP in Java",    // Which milestone this belongs to
  topic: "OOP in Java",        // Topic within milestone
  difficulty: "easy",          // easy/medium/hard
  domain: "Java Development",
  questionType: "MCQ",
  question: "...",
  options: ["A", "B", "C", "D"],
  correctAnswer: "A",
  explanation: "..."
}
```

## Error Cases

### Missing milestoneId
```json
{
  "success": false,
  "message": "Milestone not found in this roadmap."
}
```
Status: 400

### Invalid milestoneId
Same response - 400 with "Milestone not found"

### Ollama unavailable
```json
{
  "success": false,
  "error": "LOCAL_AI_UNAVAILABLE",
  "message": "Local AI question generation service is unavailable. Please make sure Ollama is running."
}
```
Status: 503

## Testing Checklist

- [ ] Start Ollama: `ollama serve`
- [ ] Start backend: `npm start` (in server directory)
- [ ] Run test: `node test_milestone_assessment.js`
- [ ] Check logs for `[ADAPTIVE_MILESTONE_REQUEST]`
- [ ] Verify MongoDB document has `assessmentMode: "milestone"`
- [ ] Test frontend: Click "Assess Milestone" button
- [ ] Verify all questions about selected milestone
- [ ] Check MongoDB for milestone-specific document

## Debug Commands

### Check if Ollama is running
```bash
curl http://127.0.0.1:11434/api/show -d '{"name":"llama3.2:3b"}'
```

### Verify milestone ID exists
```javascript
// In MongoDB
db.roadmaps.findOne({_id: ObjectId("...")}, {roadmapItems: 1})
// Check roadmapItems array for desired milestone ID
```

### Watch for milestone rejections
```bash
grep "QUESTION_REJECTED" server_output.log
# Look for "Question belongs to a different milestone"
```

### Check saved assessment structure
```javascript
// In MongoDB
db.adaptiveassessments.findOne({ assessmentMode: "milestone" })
// Verify: assessmentMode, milestoneId, milestone fields
```

## Common Issues

### Issue: "Question belongs to a different milestone"
**Cause**: Llama generated question about wrong topic
**Fix**: Normal behavior on first attempt, Llama retries. Check logs for retry success.
**Log**: `[QUESTION_REJECTED] topic: OOP in Java, reason: Question belongs to a different milestone, not "OOP in Java", attempt: 1`

### Issue: Status 400 "Milestone not found"
**Cause**: milestoneId doesn't exist in this roadmap
**Fix**: Verify milestoneId is correct for the roadmapId being tested
**Check**: `db.roadmaps.findOne({...}, {roadmapItems: 1})`

### Issue: No questions generated (empty array)
**Cause**: Ollama rejected all attempts for every question
**Fix**: Check Ollama is running, check logs for repeated rejections
**Log**: `[ADAPTIVE_MILESTONE_SAVED] questionCount: 0`

### Issue: All questions have "overall" assessmentMode
**Cause**: Frontend sent `mode: "overall"` instead of `mode: "milestone"`
**Fix**: Check frontend code - ensure button sends correct mode
**Log**: `[ADAPTIVE_MILESTONE_REQUEST] mode: overall` (should be "milestone")

## Code Locations

| Component | File | Lines |
|-----------|------|-------|
| Milestone validation | `server/services/questionValidationChain.js` | 15-65 |
| Validation chain logic | `server/services/questionValidationChain.js` | 67-92 |
| Controller logic | `server/controllers/adaptiveAssessmentController.js` | 27-45 |
| Debug logging | `server/controllers/adaptiveAssessmentController.js` | All lines |
| Test script | `test_milestone_assessment.js` | Full file |

## Future Enhancements

1. **Dynamic keyword detection** - Use NLP to detect relevance instead of fixed keywords
2. **Multi-level topics** - Support sub-topics within milestones
3. **Skill prerequisites** - Check if student has completed prerequisite skills
4. **Question difficulty progression** - Adapt difficulty based on performance
5. **Cross-milestone relationships** - Detect if question relates to multiple milestones

---

**Quick Start**: 
1. `ollama serve` → Start Ollama
2. `npm start` → Start backend  
3. `node test_milestone_assessment.js` → Run tests
4. Check backend logs for `[ADAPTIVE_MILESTONE_*]` patterns
5. Verify MongoDB has `assessmentMode: "milestone"` documents
