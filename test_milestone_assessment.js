#!/usr/bin/env node
/**
 * Test script to verify milestone-specific adaptive assessment flow
 * Tests the complete flow: request → controller → generation → validation → response
 */

const http = require("http");

// Configuration
const BASE_URL = "http://localhost:5000";
const API_ENDPOINT = "/api/adaptive-assessment/generate";
const TEST_JWT = process.env.TEST_JWT || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzdhYTMxOTY4YzYyNjY2ZmZkNzQ1OWMiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTczNTc4MjMyN30.VpQ6Dkxj9rQe7D8Q4q8wXqXj1Rvs3rPl2mLx5N9K4m8";

// Test cases - milestone IDs from a sample roadmap
const TEST_MILESTONES = [
    { 
        name: "OOP in Java", 
        roadmapId: "676c35e2e2d5f8c8b8e2d3a0",
        milestoneId: "676c35e2e2d5f8c8b8e2d3a1"
    },
    {
        name: "Collections & Generics",
        roadmapId: "676c35e2e2d5f8c8b8e2d3a0",
        milestoneId: "676c35e2e2d5f8c8b8e2d3a2"
    }
];

function makeRequest(method, endpoint, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + endpoint);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TEST_JWT}`,
            },
        };

        const request = http.request(options, (response) => {
            let data = "";
            response.on("data", (chunk) => (data += chunk));
            response.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: response.statusCode, body: parsed });
                } catch {
                    resolve({ status: response.statusCode, body: data });
                }
            });
        });

        request.on("error", reject);
        if (body) request.write(JSON.stringify(body));
        request.end();
    });
}

async function testMilestoneAssessment() {
    console.log("\n========================================");
    console.log("MILESTONE ASSESSMENT TEST");
    console.log("========================================\n");

    try {
        // Test 1: Overall Assessment (should work)
        console.log("TEST 1: Overall Assessment (baseline - should work)");
        console.log("─────────────────────────────────────────");
        const overallResp = await makeRequest("POST", API_ENDPOINT, {
            mode: "overall",
            roadmapId: "676c35e2e2d5f8c8b8e2d3a0",
        });

        console.log(`Status: ${overallResp.status}`);
        if (overallResp.body.success) {
            console.log(`✓ Overall assessment generated successfully`);
            console.log(`  - Total questions: ${overallResp.body.assessment.questions.length}`);
            console.log(`  - Assessment mode: ${overallResp.body.assessment.assessmentMode}`);
            console.log(`  - Sample question 1:`);
            if (overallResp.body.assessment.questions[0]) {
                console.log(`    - Milestone: ${overallResp.body.assessment.questions[0].milestone}`);
                console.log(`    - Topic: ${overallResp.body.assessment.questions[0].topic}`);
                console.log(`    - Question: ${overallResp.body.assessment.questions[0].question.substring(0, 60)}...`);
            }
        } else {
            console.log(`✗ Overall assessment failed: ${overallResp.body.message}`);
        }

        // Test 2: Milestone Assessment
        console.log("\n\nTEST 2: Milestone Assessment (OOP in Java)");
        console.log("─────────────────────────────────────────");
        const milestoneResp = await makeRequest("POST", API_ENDPOINT, {
            mode: "milestone",
            roadmapId: "676c35e2e2d5f8c8b8e2d3a0",
            milestoneId: "676c35e2e2d5f8c8b8e2d3a1",
        });

        console.log(`Status: ${milestoneResp.status}`);
        if (milestoneResp.body.success) {
            console.log(`✓ Milestone assessment generated successfully`);
            console.log(`  - Total questions: ${milestoneResp.body.assessment.questions.length}`);
            console.log(`  - Assessment mode: ${milestoneResp.body.assessment.assessmentMode}`);
            console.log(`  - Milestone ID: ${milestoneResp.body.assessment.milestoneId}`);
            console.log(`  - Milestone: ${milestoneResp.body.assessment.milestone}`);
            
            // Verify all questions belong to OOP in Java
            const allOOPQuestions = milestoneResp.body.assessment.questions.every(q => 
                q.topic && q.topic.toLowerCase().includes("oop") || q.milestone.toLowerCase().includes("oop")
            );
            console.log(`  - All questions belong to OOP: ${allOOPQuestions ? "✓ YES" : "✗ NO"}`);
            
            if (milestoneResp.body.assessment.questions[0]) {
                console.log(`  - Sample question 1:`);
                console.log(`    - Milestone: ${milestoneResp.body.assessment.questions[0].milestone}`);
                console.log(`    - Topic: ${milestoneResp.body.assessment.questions[0].topic}`);
                console.log(`    - Question: ${milestoneResp.body.assessment.questions[0].question.substring(0, 60)}...`);
                console.log(`    - Correct Answer: ${milestoneResp.body.assessment.questions[0].correctAnswer}`);
            }
        } else {
            console.log(`✗ Milestone assessment failed: ${milestoneResp.body.message}`);
        }

        // Test 3: Invalid milestoneId
        console.log("\n\nTEST 3: Invalid Milestone ID (should return 400)");
        console.log("─────────────────────────────────────────");
        const invalidResp = await makeRequest("POST", API_ENDPOINT, {
            mode: "milestone",
            roadmapId: "676c35e2e2d5f8c8b8e2d3a0",
            milestoneId: "invalid-milestone-id-12345",
        });

        console.log(`Status: ${invalidResp.status}`);
        if (invalidResp.status === 400) {
            console.log(`✓ Correctly returned 400 for invalid milestone`);
            console.log(`  Message: ${invalidResp.body.message}`);
        } else {
            console.log(`✗ Expected 400, got ${invalidResp.status}`);
        }

        // Test 4: Missing milestoneId for milestone mode
        console.log("\n\nTEST 4: Missing milestoneId in milestone mode (should return 400)");
        console.log("─────────────────────────────────────────");
        const missingResp = await makeRequest("POST", API_ENDPOINT, {
            mode: "milestone",
            roadmapId: "676c35e2e2d5f8c8b8e2d3a0",
        });

        console.log(`Status: ${missingResp.status}`);
        if (missingResp.status === 400) {
            console.log(`✓ Correctly returned 400 for missing milestoneId`);
            console.log(`  Message: ${missingResp.body.message}`);
        } else {
            console.log(`✗ Expected 400, got ${missingResp.status}`);
        }

        console.log("\n========================================");
        console.log("TEST SUMMARY");
        console.log("========================================");
        console.log(`Overall Assessment: ${overallResp.status === 201 ? "✓ PASS" : "✗ FAIL"}`);
        console.log(`Milestone Assessment: ${milestoneResp.status === 201 ? "✓ PASS" : "✗ FAIL"}`);
        console.log(`Invalid Milestone: ${invalidResp.status === 400 ? "✓ PASS" : "✗ FAIL"}`);
        console.log(`Missing milestoneId: ${missingResp.status === 400 ? "✓ PASS" : "✗ FAIL"}`);

    } catch (error) {
        console.error("ERROR:", error.message);
    }
}

// Run tests
testMilestoneAssessment().then(() => process.exit(0)).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
