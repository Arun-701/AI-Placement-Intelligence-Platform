#!/usr/bin/env node
/**
 * Test script to capture EXACT adaptive assessment generation trace
 */

const http = require("http");

// Use the same JWT from test file
const TEST_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzdhYTMxOTY4YzYyNjY2ZmZkNzQ1OWMiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTczNTc4MjMyN30.VpQ6Dkxj9rQe7D8Q4q8wXqXj1Rvs3rPl2mLx5N9K4m8";

// Real roadmapId from the system
const roadmapId = "676c35e2e2d5f8c8b8e2d3a0";

function makeRequest() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "localhost",
            port: 5000,
            path: "/api/adaptive-assessment/generate",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TEST_JWT}`,
            },
        };

        console.log("\n=== STARTING ADAPTIVE ASSESSMENT GENERATION TEST ===\n");
        console.log(`[TEST_INIT] URL: http://${options.hostname}:${options.port}${options.path}`);
        console.log(`[TEST_INIT] Method: ${options.method}`);
        console.log(`[TEST_INIT] JWT: ${TEST_JWT.substring(0, 30)}...`);
        console.log(`[TEST_INIT] Roadmap ID: ${roadmapId}\n`);

        const body = JSON.stringify({
            mode: "overall",
            roadmapId: roadmapId
        });

        console.log(`[TEST_INIT] Request Body:`, JSON.parse(body));
        console.log("\n--- WAITING FOR RESPONSE ---\n");

        const request = http.request(options, (response) => {
            let data = "";
            console.log(`[RESPONSE_START] Status: ${response.statusCode}`);
            console.log(`[RESPONSE_START] Headers:`, response.headers);

            response.on("data", (chunk) => {
                data += chunk;
                // Don't process streaming data, just accumulate
            });

            response.on("end", () => {
                console.log("\n--- RESPONSE RECEIVED ---\n");
                try {
                    const parsed = JSON.parse(data);
                    console.log(`[RESPONSE_END] Success: ${parsed.success}`);
                    console.log(`[RESPONSE_END] Assessment ID: ${parsed.assessment?.id}`);
                    console.log(`[RESPONSE_END] Question Count: ${parsed.assessment?.questionCount}`);
                    console.log(`[RESPONSE_END] Questions:`, parsed.assessment?.questions?.map(q => ({
                        topic: q.topic,
                        difficulty: q.difficulty,
                        question: q.question?.substring(0, 60) + "..."
                    })));
                    resolve({ status: response.statusCode, body: parsed });
                } catch (e) {
                    console.log(`[RESPONSE_ERROR] Failed to parse JSON:`, e.message);
                    console.log(`[RESPONSE_RAW]`, data.substring(0, 500));
                    resolve({ status: response.statusCode, body: data });
                }
            });
        });

        request.on("error", (error) => {
            console.error(`[REQUEST_ERROR]`, error);
            reject(error);
        });

        request.write(body);
        request.end();
    });
}

(async () => {
    try {
        const result = await makeRequest();
        console.log("\n=== TEST COMPLETE ===\n");
        console.log("Response Status:", result.status);
    } catch (error) {
        console.error("Test failed:", error);
    }
})();
