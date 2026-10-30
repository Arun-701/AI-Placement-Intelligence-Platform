const assert = require("assert");
const {
    MAX_JOB_DESCRIPTION_LENGTH,
    validateJobDescription,
    buildAnalysisRecord,
    persistResumeJDAnalysis,
    analysisBelongsToId
} = require("../services/resumeJDRecordService");

assert.deepStrictEqual(validateJobDescription(undefined), { valid: false, message: "Job description is required" });
assert.deepStrictEqual(validateJobDescription({}), { valid: false, message: "Job description is required" });
assert.deepStrictEqual(validateJobDescription("   "), { valid: false, message: "Job description is required" });
assert.strictEqual(validateJobDescription("x".repeat(MAX_JOB_DESCRIPTION_LENGTH + 1)).valid, false);
assert.deepStrictEqual(validateJobDescription("  React and Node.js  "), { valid: true, value: "React and Node.js" });

const student = {
    resume: "uploads/resumes/resume.pdf",
    resumeOriginalName: "Asha-Resume.pdf",
    resumeMimeType: "application/pdf",
    resumeSize: 512,
};
const record = buildAnalysisRecord({
    analysis: { atsScore: 0, jobMatchScore: 0, matchedKeywords: [], missingKeywords: [] },
    student,
    jobDescription: "React and Node.js",
    jobDescriptionSource: "file",
    jobDescriptionFileName: "frontend-role.pdf"
});

assert.ok(record.analysisId);
assert.strictEqual(record.atsScore, 0);
assert.strictEqual(record.jobMatchScore, 0);
assert.strictEqual(record.resumeInfo.fileName, "Asha-Resume.pdf");
assert.strictEqual(record.jobDescriptionInfo.source, "file");
assert.strictEqual(record.jobDescriptionInfo.fileName, "frontend-role.pdf");
assert.strictEqual(analysisBelongsToId(record, record.analysisId), true);
assert.strictEqual(analysisBelongsToId(record, "another-student-analysis"), false);

const savedStudent = {
    saveCalls: 0,
    async save() { this.saveCalls += 1; }
};
persistResumeJDAnalysis(savedStudent, record).then(() => {
    assert.strictEqual(savedStudent.resumeJDAnalysis, record);
    assert.strictEqual(savedStudent.lastResumeAnalysisDate, record.timestamp);
    assert.strictEqual(savedStudent.saveCalls, 1);
    const previous = { analysisId: "previous" };
    const failingStudent = {
        resumeJDAnalysis: previous,
        lastResumeAnalysisDate: "previous-date",
        async save() { throw new Error("database unavailable"); }
    };
    return persistResumeJDAnalysis(failingStudent, record).then(() => {
        throw new Error("Expected persistence to fail");
    }).catch((error) => {
        assert.strictEqual(error.message, "database unavailable");
        assert.strictEqual(failingStudent.resumeJDAnalysis, previous);
        assert.strictEqual(failingStudent.lastResumeAnalysisDate, "previous-date");
        console.log("resume JD record tests passed");
    });
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
