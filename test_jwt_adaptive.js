#!/usr/bin/env node
/**
 * Generate valid JWT and test adaptive assessment generation
 * with complete trace logging
 */

const jwt = require("./server/node_modules/jsonwebtoken");
const http = require("http");
const mongoose = require("./server/node_modules/mongoose");

const JWT_SECRET = "your_jwt_secret";
const MONGODB_URI = "mongodb://localhost:27017/adaptive_assessment_db";

// Create a valid test user ID (ObjectId format)
const testUserId = new mongoose.Types.ObjectId().toString();
console.log(`[SETUP] Generated test userId:`, testUserId);

// Generate a valid JWT
const validJWT = jwt.sign(
    {
        id: testUserId,
        role: "student"
    },
    JWT_SECRET,
    { expiresIn: "7d" }
);

console.log(`[SETUP] Generated valid JWT:`, validJWT);

async function makeRequest(method, path, body, jwt_token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "localhost",
            port: 5000,
            path: path,
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt_token}`,
            },
        };

        console.log(`\n[REQUEST] ${method} ${path}`);
        console.log(`[REQUEST] Auth header: Bearer ${jwt_token.substring(0, 30)}...`);

        const request = http.request(options, (response) => {
            let data = "";
            console.log(`[RESPONSE] Status: ${response.statusCode}`);
            
            response.on("data", (chunk) => (data += chunk));
            response.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: response.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: response.statusCode, body: data });
                }
            });
        });

        request.on("error", reject);
        if (body) {
            const bodyStr = JSON.stringify(body);
            console.log(`[REQUEST] Body:`, body);
            request.write(bodyStr);
        }
        request.end();
    });
}

(async () => {
    try {
        console.log("\n=== WAITING FOR SERVER ===\n");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1: Try WITHOUT roadmapId (should fail)
        console.log("\n=== TEST 1: NO ROADMAP ID (should return 400) ===");
        const noRoadmapResp = await makeRequest(
            "POST",
            "/api/adaptive-assessment/generate",
            { mode: "overall" },
            validJWT
        );
        console.log(`[RESULT] Status: ${noRoadmapResp.status}`);
        console.log(`[RESULT] Message:`, noRoadmapResp.body.message);

        // Test 2: Try with invalid roadmapId
        console.log("\n=== TEST 2: INVALID ROADMAP ID ===");
        const invalidResp = await makeRequest(
            "POST",
            "/api/adaptive-assessment/generate",
            {
                mode: "overall",
                roadmapId: new mongoose.Types.ObjectId().toString()
            },
            validJWT
        );
        console.log(`[RESULT] Status: ${invalidResp.status}`);
        console.log(`[RESULT] Message:`, invalidResp.body.message);

        // Test 3: Try with valid format but non-existent data
        // This will still return 404 but let's see if our logs show up
        console.log("\n=== TEST 3: VALID FORMAT, NON-EXISTENT ROADMAP ===");
        const validFormatResp = await makeRequest(
            "POST",
            "/api/adaptive-assessment/generate",
            {
                mode: "overall",
                roadmapId: "676c35e2e2d5f8c8b8e2d3a0"
            },
            validJWT
        );
        console.log(`[RESULT] Status: ${validFormatResp.status}`);
        console.log(`[RESULT] Success:`, validFormatResp.body.success);
        console.log(`[RESULT] Message:`, validFormatResp.body.message);
        console.log(`[RESULT] Full response:`, JSON.stringify(validFormatResp.body, null, 2));

        console.log("\n=== ALL TESTS COMPLETE ===\n");
        process.exit(0);

    } catch (error) {
        console.error(`[ERROR]`, error.message);
        console.error(`[ERROR_STACK]`, error.stack);
        process.exit(1);
    }
})();
