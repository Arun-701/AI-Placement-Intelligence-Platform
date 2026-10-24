const assert = require("assert");
const mongoose = require("mongoose");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const { getAllResults } = require("../controllers/facultyResultController");

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

const originalFindOne = Assessment.findOne;
const originalCountDocuments = AssessmentResult.countDocuments;
const originalFind = AssessmentResult.find;

const run = async () => {
    try {
        const invalidIdResponse = createResponse();
        await getAllResults({
            user: { id: "faculty-a" },
            query: { assessmentId: "not-an-object-id" }
        }, invalidIdResponse);
        assert.strictEqual(invalidIdResponse.statusCode, 400);
        assert.match(invalidIdResponse.body.message, /invalid assessment id/i);

        const unauthorizedAssessmentId = new mongoose.Types.ObjectId().toString();
        Assessment.findOne = (query) => {
            assert.deepStrictEqual(query, { _id: unauthorizedAssessmentId, assignedFaculty: "faculty-a" });
            return { select: async () => null };
        };
        let queriedForResults = false;
        AssessmentResult.countDocuments = async () => {
            queriedForResults = true;
            return 0;
        };
        const unauthorizedResponse = createResponse();
        await getAllResults({
            user: { id: "faculty-a" },
            query: { assessmentId: unauthorizedAssessmentId }
        }, unauthorizedResponse);
        assert.strictEqual(unauthorizedResponse.statusCode, 404);
        assert.strictEqual(queriedForResults, false);

        const ownedAssessmentId = new mongoose.Types.ObjectId().toString();
        Assessment.findOne = (query) => {
            assert.deepStrictEqual(query, { _id: ownedAssessmentId, assignedFaculty: "faculty-a" });
            return { select: async () => ({ _id: new mongoose.Types.ObjectId(ownedAssessmentId) }) };
        };
        let resultsQuery;
        AssessmentResult.countDocuments = async (query) => {
            assert.strictEqual(String(query.assessment), ownedAssessmentId);
            return 0;
        };
        AssessmentResult.find = (query) => {
            resultsQuery = query;
            const chain = {
                populate() { return this; },
                select() { return this; },
                sort() { return this; },
                limit() { return this; },
                skip() { return this; },
                lean: async () => []
            };
            return chain;
        };
        const ownedResponse = createResponse();
        await getAllResults({
            user: { id: "faculty-a" },
            query: { assessmentId: ownedAssessmentId }
        }, ownedResponse);
        assert.strictEqual(ownedResponse.statusCode, 200);
        assert.strictEqual(String(resultsQuery.assessment), ownedAssessmentId);

        console.log("Faculty leaderboard assessment scope tests passed.");
    } finally {
        Assessment.findOne = originalFindOne;
        AssessmentResult.countDocuments = originalCountDocuments;
        AssessmentResult.find = originalFind;
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
