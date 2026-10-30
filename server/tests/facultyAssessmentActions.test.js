const assert = require("assert");
const Assessment = require("../models/Assessment");
const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const {
    assignAssessment,
    assignAssessmentSets,
    updateAssessmentTitle,
    deleteAssessment
} = require("../controllers/facultyAssessmentController");

const createResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    }
});

const originals = {
    assessmentFindOne: Assessment.findOne,
    facultyFindById: Faculty.findById,
    studentFind: Student.find
};

const assessmentId = "507f1f77bcf86cd799439011";
const studentId = "507f1f77bcf86cd799439012";

const run = async () => {
    let saveCount = 0;
    const assessment = {
        _id: assessmentId,
        title: "Original title",
        assignedStudents: [],
        questionSets: [],
        setAssignments: [],
        isActive: true,
        async save() {
            saveCount += 1;
        }
    };

    try {
        Faculty.findById = () => ({
            select: async () => ({ department: "Computer Science", assignedStudents: [studentId] })
        });
        Student.find = () => ({
            select: () => ({
                lean: async () => [{ _id: studentId, department: "Computer Science" }]
            })
        });
        Assessment.findOne = async () => assessment;

        const assignResponse = createResponse();
        await assignAssessment({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: { studentIds: [studentId], deadline: new Date(Date.now() + 60_000).toISOString() }
        }, assignResponse);
        assert.strictEqual(assignResponse.statusCode, 200);
        assert.deepStrictEqual(assessment.assignedStudents, [studentId]);
        assert.strictEqual(saveCount, 1);

        const duplicateResponse = createResponse();
        await assignAssessment({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: { studentIds: [studentId], deadline: new Date(Date.now() + 60_000).toISOString() }
        }, duplicateResponse);
        assert.strictEqual(duplicateResponse.statusCode, 409);
        assert.strictEqual(saveCount, 1);

        Faculty.findById = () => ({
            select: async () => ({ department: "Computer Science", assignedStudents: [] })
        });
        const forbiddenResponse = createResponse();
        await assignAssessment({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: { studentIds: [studentId], deadline: new Date(Date.now() + 60_000).toISOString() }
        }, forbiddenResponse);
        assert.strictEqual(forbiddenResponse.statusCode, 403);

        Faculty.findById = () => ({
            select: async () => ({ department: "Computer Science", assignedStudents: [studentId] })
        });
        assessment.assignedStudents = [];
        assessment.questionSets = [{ questions: ["question-id"], departments: [] }];
        assessment.setAssignments = [];
        const setAssignmentBody = {
            sets: [{
                setIndex: 0,
                departments: ["Computer Science"],
                studentIds: [studentId],
                startDate: new Date(Date.now() + 60_000).toISOString(),
                endDate: new Date(Date.now() + 3_600_000).toISOString()
            }]
        };
        const missingDepartmentResponse = createResponse();
        await assignAssessmentSets({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: { sets: [{ ...setAssignmentBody.sets[0], departments: [] }] }
        }, missingDepartmentResponse);
        assert.strictEqual(missingDepartmentResponse.statusCode, 400);
        assert.strictEqual(saveCount, 1);

        const missingStudentResponse = createResponse();
        await assignAssessmentSets({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: { sets: [{ ...setAssignmentBody.sets[0], studentIds: [] }] }
        }, missingStudentResponse);
        assert.strictEqual(missingStudentResponse.statusCode, 400);
        assert.match(missingStudentResponse.body.message, /Select at least one valid student/);
        assert.strictEqual(saveCount, 1);

        const invalidDateResponse = createResponse();
        await assignAssessmentSets({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: { sets: [{ ...setAssignmentBody.sets[0], endDate: new Date(Date.now() + 30_000).toISOString() }] }
        }, invalidDateResponse);
        assert.strictEqual(invalidDateResponse.statusCode, 400);
        assert.strictEqual(saveCount, 1);

        const setAssignResponse = createResponse();
        await assignAssessmentSets({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: setAssignmentBody
        }, setAssignResponse);
        assert.strictEqual(setAssignResponse.statusCode, 200);
        assert.strictEqual(assessment.setAssignments.length, 1);
        assert.deepStrictEqual(assessment.setAssignments[0].assignedStudents, [studentId]);
        assert.deepStrictEqual(assessment.setAssignments[0].departments, ["Computer Science"]);
        assert.deepStrictEqual(assessment.assignedStudents, [studentId]);
        assert.strictEqual(assessment.status, "Published");
        assert.strictEqual(saveCount, 2);

        const duplicateSetResponse = createResponse();
        await assignAssessmentSets({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: setAssignmentBody
        }, duplicateSetResponse);
        assert.strictEqual(duplicateSetResponse.statusCode, 409);
        assert.strictEqual(saveCount, 2);

        const updatedStartDate = new Date(Date.now() + 120_000);
        const updatedEndDate = new Date(Date.now() + 7_200_000);
        const titleResponse = createResponse();
        await updateAssessmentTitle({
            params: { id: assessmentId },
            user: { id: "faculty-id" },
            body: {
                title: "Updated assessment",
                sets: [{
                    setIndex: 0,
                    startDate: updatedStartDate.toISOString(),
                    endDate: updatedEndDate.toISOString()
                }]
            }
        }, titleResponse);
        assert.strictEqual(titleResponse.statusCode, 200);
        assert.strictEqual(assessment.title, "Updated assessment");
        assert.strictEqual(new Date(assessment.setAssignments[0].startDate).getTime(), updatedStartDate.getTime());
        assert.strictEqual(new Date(assessment.setAssignments[0].endDate).getTime(), updatedEndDate.getTime());
        assert.strictEqual(saveCount, 3);

        const deleteResponse = createResponse();
        await deleteAssessment({
            params: { id: assessmentId },
            user: { id: "faculty-id" }
        }, deleteResponse);
        assert.strictEqual(deleteResponse.statusCode, 200);
        assert.strictEqual(assessment.isActive, false);
        assert.strictEqual(saveCount, 4);

        console.log("Faculty assessment assignment, duplicate, ownership, edit, and soft-delete tests passed.");
    } finally {
        Assessment.findOne = originals.assessmentFindOne;
        Faculty.findById = originals.facultyFindById;
        Student.find = originals.studentFind;
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
