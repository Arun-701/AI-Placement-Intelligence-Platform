// Test file for Resume-JD Analysis feature
// Run with: node test-resume-jd.js

const http = require("http");

const BASE_URL = "http://localhost:5000";
const STUDENT_EMAIL = "student@example.com";
const STUDENT_PASSWORD = "password123";

let authToken = null;
let studentId = null;

// Helper function to make HTTP requests
const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` })
      }
    };

    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

// Test steps
const testLogin = async () => {
  console.log("\n📝 Testing: Student Login");
  try {
    const response = await makeRequest("POST", "/api/auth/login", {
      email: STUDENT_EMAIL,
      password: STUDENT_PASSWORD
    });

    if (response.status === 200 && response.data.data?.token) {
      authToken = response.data.data.token;
      studentId = response.data.data.student?.id || response.data.data._id;
      console.log("✅ Login successful");
      return true;
    } else {
      console.log("❌ Login failed:", response.data.message);
      return false;
    }
  } catch (error) {
    console.log("❌ Login error:", error.message);
    return false;
  }
};

const testResumeJDAnalysisEndpoint = async () => {
  console.log("\n📊 Testing: Resume-JD Analysis Endpoint");
  try {
    const testJD = `
      Required Skills:
      - JavaScript/Node.js
      - React
      - MongoDB
      - Express
      
      Preferred Skills:
      - Docker
      - AWS
      - GraphQL
      
      Qualifications:
      - 2+ years experience
      - B.Tech in Computer Science
      - Strong problem-solving skills
      
      Responsibilities:
      - Develop and maintain web applications
      - Write clean, maintainable code
      - Collaborate with team members
      - Participate in code reviews
    `;

    const response = await makeRequest("POST", "/api/ai/analyze-resume-jd", {
      jobDescription: testJD
    });

    if (response.status === 200) {
      const analysis = response.data.data;
      console.log("✅ Analysis endpoint working");
      console.log("\nAnalysis Results:");
      console.log("  ATS Score:", analysis.atsScore);
      console.log("  Job Match Score:", analysis.jobMatchScore);
      console.log("  Match Level:", analysis.matchLevel);
      console.log("  Matched Skills:", analysis.matchedSkills?.length || 0);
      console.log("  Missing Skills (Required):", analysis.missingSkills?.required?.length || 0);
      console.log("  Missing Keywords:", analysis.missingKeywords?.length || 0);
      console.log("  Strengths:", analysis.strengths?.length || 0);
      console.log("  Weaknesses:", analysis.weaknesses?.length || 0);
      console.log("  Recommendations:", analysis.recommendations?.length || 0);
      return true;
    } else if (response.status === 404) {
      console.log("ℹ️  Resume not found (expected if student has no resume uploaded)");
      return true;
    } else {
      console.log("❌ Analysis failed:", response.data.message);
      return false;
    }
  } catch (error) {
    console.log("❌ Analysis error:", error.message);
    return false;
  }
};

const testGetAnalysisEndpoint = async () => {
  console.log("\n📖 Testing: Get Recent Analysis Endpoint");
  try {
    const response = await makeRequest("GET", "/api/ai/resume-jd-analysis");

    if (response.status === 200) {
      console.log("✅ Get analysis endpoint working");
      const analysis = response.data.data;
      console.log("  Latest analysis timestamp:", analysis.timestamp);
      return true;
    } else if (response.status === 404) {
      console.log("ℹ️  No previous analysis found (expected)");
      return true;
    } else {
      console.log("❌ Get analysis failed:", response.data.message);
      return false;
    }
  } catch (error) {
    console.log("❌ Get analysis error:", error.message);
    return false;
  }
};

const testWithoutAuth = async () => {
  console.log("\n🔒 Testing: Authorization Check (should fail)");
  try {
    const savedToken = authToken;
    authToken = null; // Remove auth token

    const response = await makeRequest("POST", "/api/ai/analyze-resume-jd", {
      jobDescription: "Test JD"
    });

    authToken = savedToken; // Restore auth token

    if (response.status === 401 || response.status === 403) {
      console.log("✅ Authorization check working (correctly rejected)");
      return true;
    } else {
      console.log("❌ Authorization check failed (should have been rejected)");
      return false;
    }
  } catch (error) {
    console.log("❌ Authorization test error:", error.message);
    return false;
  }
};

const testEmptyJD = async () => {
  console.log("\n⚠️  Testing: Empty Job Description (should fail)");
  try {
    const response = await makeRequest("POST", "/api/ai/analyze-resume-jd", {
      jobDescription: ""
    });

    if (response.status === 400) {
      console.log("✅ Validation working (correctly rejected empty JD)");
      return true;
    } else {
      console.log("❌ Validation failed (should have rejected empty JD)");
      return false;
    }
  } catch (error) {
    console.log("❌ Validation test error:", error.message);
    return false;
  }
};

const runAllTests = async () => {
  console.log("🚀 Starting Resume-JD Analysis Feature Tests\n");
  console.log("=" .repeat(50));

  const tests = [
    { name: "Login", fn: testLogin },
    { name: "Resume-JD Analysis", fn: testResumeJDAnalysisEndpoint },
    { name: "Get Analysis", fn: testGetAnalysisEndpoint },
    { name: "Authorization", fn: testWithoutAuth },
    { name: "Validation", fn: testEmptyJD }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test "${test.name}" crashed:`, error.message);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log("✅ All tests passed!");
    process.exit(0);
  } else {
    console.log("❌ Some tests failed");
    process.exit(1);
  }
};

runAllTests();
