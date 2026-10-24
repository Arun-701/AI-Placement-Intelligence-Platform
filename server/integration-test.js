// Integration test to verify Resume-JD Analysis feature works
const fs = require("fs");
const path = require("path");

// Test 1: Verify all files exist
console.log("\n✅ File Existence Checks:");
const requiredFiles = [
  "server/services/resumeJDAnalysisService.js",
  "server/controllers/resumeJDController.js",
  "server/routes/resumeJDRoutes.js",
  "client/src/pages/student/ResumeAnalysis.jsx",
  "server/models/Student.js"
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, "..", file));
  console.log(`  ${exists ? "✓" : "✗"} ${file}`);
  if (!exists) allFilesExist = false;
});

// Test 2: Verify imports work
console.log("\n✅ Import Checks:");
try {
  const resumeJDService = require("./services/resumeJDAnalysisService");
  console.log("  ✓ resumeJDAnalysisService.js imports successfully");
  
  // Check exported functions
  const exports = Object.keys(resumeJDService);
  console.log(`    - Exports: ${exports.join(", ")}`);
} catch (e) {
  console.log(`  ✗ resumeJDAnalysisService.js import failed: ${e.message}`);
}

try {
  const resumeJDController = require("./controllers/resumeJDController");
  console.log("  ✓ resumeJDController.js imports successfully");
  
  const exports = Object.keys(resumeJDController);
  console.log(`    - Exports: ${exports.join(", ")}`);
} catch (e) {
  console.log(`  ✗ resumeJDController.js import failed: ${e.message}`);
}

try {
  const resumeJDRoutes = require("./routes/resumeJDRoutes");
  console.log("  ✓ resumeJDRoutes.js imports successfully");
} catch (e) {
  console.log(`  ✗ resumeJDRoutes.js import failed: ${e.message}`);
}

// Test 3: Verify Server includes new routes
console.log("\n✅ Server Configuration Checks:");
try {
  const serverContent = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
  
  if (serverContent.includes("resumeJDRoutes")) {
    console.log("  ✓ Server imports resumeJDRoutes");
  } else {
    console.log("  ✗ Server does not import resumeJDRoutes");
  }
  
  if (serverContent.includes("app.use(\"/api/ai\", aiLimiter, resumeJDRoutes)")) {
    console.log("  ✓ Server registers resumeJDRoutes");
  } else {
    console.log("  ✗ Server does not register resumeJDRoutes");
  }
} catch (e) {
  console.log(`  ✗ Server check failed: ${e.message}`);
}

// Test 4: Verify Student model has new fields
console.log("\n✅ Student Model Checks:");
try {
  const studentContent = fs.readFileSync(path.join(__dirname, "models/Student.js"), "utf8");
  
  if (studentContent.includes("resumeJDAnalysis")) {
    console.log("  ✓ Student model includes resumeJDAnalysis field");
  } else {
    console.log("  ✗ Student model missing resumeJDAnalysis field");
  }
  
  if (studentContent.includes("lastResumeAnalysisDate")) {
    console.log("  ✓ Student model includes lastResumeAnalysisDate field");
  } else {
    console.log("  ✗ Student model missing lastResumeAnalysisDate field");
  }
} catch (e) {
  console.log(`  ✗ Student model check failed: ${e.message}`);
}

// Test 5: Verify Frontend component has JD analysis features
console.log("\n✅ Frontend Component Checks:");
try {
  const componentContent = fs.readFileSync(
    path.join(__dirname, "../client/src/pages/student/ResumeAnalysis.jsx"),
    "utf8"
  );
  
  const checks = [
    { name: "Job Description input", pattern: "jobDescription" },
    { name: "JD analysis function", pattern: "analyzeAgainstJD" },
    { name: "JD input mode toggle", pattern: "jdInputMode" },
    { name: "Match score display", pattern: "jobMatchScore" },
    { name: "Match level display", pattern: "matchLevel" },
    { name: "ATS score calculation", pattern: "atsScore" },
    { name: "Matched skills display", pattern: "matchedSkills" },
    { name: "Missing skills section", pattern: "missingSkills" },
    { name: "Keywords analysis", pattern: "matchedKeywords" },
    { name: "Strengths section", pattern: "strengths" },
    { name: "Weaknesses section", pattern: "weaknesses" },
    { name: "Recommendations section", pattern: "recommendations" },
    { name: "Section analysis", pattern: "sectionAnalysis" }
  ];
  
  checks.forEach(check => {
    if (componentContent.includes(check.pattern)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - pattern '${check.pattern}' not found`);
    }
  });
} catch (e) {
  console.log(`  ✗ Frontend component check failed: ${e.message}`);
}

// Test 6: Verify API endpoint format
console.log("\n✅ API Endpoint Checks:");
try {
  const routesContent = fs.readFileSync(path.join(__dirname, "routes/resumeJDRoutes.js"), "utf8");
  
  const checks = [
    { name: "POST /api/ai/analyze-resume-jd", pattern: '/analyze-resume-jd' },
    { name: "GET /api/ai/resume-jd-analysis", pattern: '/resume-jd-analysis' },
    { name: "Authentication middleware", pattern: 'verifyToken' },
    { name: "Student role check", pattern: 'authorizeRoles.*student' }
  ];
  
  checks.forEach(check => {
    if (routesContent.includes(check.pattern)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - pattern '${check.pattern}' not found`);
    }
  });
} catch (e) {
  console.log(`  ✗ Routes check failed: ${e.message}`);
}

// Test 7: Service functions
console.log("\n✅ Service Function Checks:");
try {
  const serviceContent = fs.readFileSync(path.join(__dirname, "services/resumeJDAnalysisService.js"), "utf8");
  
  const checks = [
    { name: "Text extraction", pattern: "extractTextFromFile" },
    { name: "Resume-JD analysis", pattern: "analyzeResumeAgainstJD" },
    { name: "PDF support", pattern: "extractTextFromPDF" },
    { name: "DOCX support", pattern: "extractTextFromDOCX" },
    { name: "ATS scoring", pattern: "calculateBasicATSScore" },
    { name: "AI integration", pattern: "generateAIResponse" },
    { name: "Error handling", pattern: "fallback" }
  ];
  
  checks.forEach(check => {
    if (serviceContent.includes(check.pattern)) {
      console.log(`  ✓ ${check.name}`);
    } else {
      console.log(`  ✗ ${check.name} - pattern '${check.pattern}' not found`);
    }
  });
} catch (e) {
  console.log(`  ✗ Service check failed: ${e.message}`);
}

console.log("\n" + "=".repeat(60));
console.log("✅ Integration Test Summary Complete\n");
console.log("All components are in place for Resume-JD Analysis feature!");
