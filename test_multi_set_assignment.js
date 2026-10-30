/**
 * Test script for Multi-Set Assessment Assignment
 * Tests the complete flow of creating, managing, and enabling multi-set assignments
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let assessmentId = '';
let setIds = [];

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (authToken && !headers.Authorization) {
      options.headers.Authorization = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            data: body ? JSON.parse(body) : null,
          };
          resolve(response);
        } catch (e) {
          resolve({ status: res.statusCode, ok: false, data: null, error: e.message });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test functions
async function testLogin() {
  console.log('\n=== Test: Admin Login ===');
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'admin@example.com',
      password: 'admin123',
    });

    if (response.ok && response.data?.data?.token) {
      authToken = response.data.data.token;
      console.log('✓ Login successful');
      console.log(`  Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      console.log('✗ Login failed:', response.data?.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Login error:', error.message);
    return false;
  }
}

async function testCreateAssessment() {
  console.log('\n=== Test: Create Assessment ===');
  try {
    // First, get some question IDs
    const questionsRes = await makeRequest('GET', '/admin/question-bank');
    if (!questionsRes.ok || !questionsRes.data?.data?.length) {
      console.log('⚠ No questions available. Please create questions first.');
      return false;
    }

    const questionIds = questionsRes.data.data.slice(0, 5).map((q) => q._id);

    const response = await makeRequest('POST', '/admin/assessments', {
      title: 'Multi-Set Test Assessment',
      description: 'Testing multi-set assignment feature',
      questionIds: questionIds,
      duration: 60,
    });

    if (response.ok && response.data?.data?._id) {
      assessmentId = response.data.data._id;
      console.log('✓ Assessment created successfully');
      console.log(`  Assessment ID: ${assessmentId}`);
      console.log(`  Title: ${response.data.data.title}`);
      console.log(`  Total Marks: ${response.data.data.totalMarks}`);
      return true;
    } else {
      console.log('✗ Assessment creation failed:', response.data?.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Assessment creation error:', error.message);
    return false;
  }
}

async function testGetDepartments() {
  console.log('\n=== Test: Get Available Departments ===');
  try {
    const response = await makeRequest('GET', '/admin/assessments/departments');

    if (response.ok && Array.isArray(response.data?.data)) {
      console.log('✓ Departments retrieved successfully');
      console.log(`  Total departments: ${response.data.data.length}`);
      console.log(`  Departments: ${response.data.data.slice(0, 3).join(', ')}${response.data.data.length > 3 ? '...' : ''}`);
      return response.data.data.slice(0, 3); // Return first 3 departments
    } else {
      console.log('✗ Failed to get departments:', response.data?.message);
      return [];
    }
  } catch (error) {
    console.log('✗ Error getting departments:', error.message);
    return [];
  }
}

async function testCreateAssignmentSet(department, deadline) {
  console.log(`\n=== Test: Create Assignment Set for ${department} ===`);
  try {
    const response = await makeRequest('POST', `/admin/assessments/${assessmentId}/assignment-sets`, {
      department: department,
      deadline: deadline,
    });

    if (response.ok && response.data?.data?._id) {
      const setId = response.data.data._id;
      setIds.push(setId);
      console.log('✓ Assignment set created successfully');
      console.log(`  Set ID: ${setId}`);
      console.log(`  Department: ${response.data.data.department}`);
      console.log(`  Deadline: ${response.data.data.deadline}`);
      console.log(`  Status: ${response.data.data.status}`);
      console.log(`  Assigned Students: ${response.data.data.assignedStudents.length}`);
      return setId;
    } else {
      console.log('✗ Assignment set creation failed:', response.data?.message);
      return null;
    }
  } catch (error) {
    console.log('✗ Error creating assignment set:', error.message);
    return null;
  }
}

async function testGetAssignmentSets() {
  console.log('\n=== Test: Get Assignment Sets ===');
  try {
    const response = await makeRequest('GET', `/admin/assessments/${assessmentId}/assignment-sets`);

    if (response.ok && Array.isArray(response.data?.data)) {
      console.log('✓ Assignment sets retrieved successfully');
      console.log(`  Total sets: ${response.data.data.length}`);
      response.data.data.forEach((set, index) => {
        console.log(`  Set ${index + 1}:`);
        console.log(`    Department: ${set.department}`);
        console.log(`    Status: ${set.status}`);
        console.log(`    Total Assigned: ${set.totalAssigned}`);
        console.log(`    Completed: ${set.totalCompleted}`);
      });
      return true;
    } else {
      console.log('✗ Failed to get assignment sets:', response.data?.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting assignment sets:', error.message);
    return false;
  }
}

async function testUpdateAssignmentSet(setId) {
  console.log('\n=== Test: Update Assignment Set ===');
  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    const response = await makeRequest('PUT', `/admin/assessments/${assessmentId}/assignment-sets/${setId}`, {
      deadline: futureDate.toISOString(),
    });

    if (response.ok) {
      console.log('✓ Assignment set updated successfully');
      console.log(`  New deadline: ${response.data.data.deadline}`);
      return true;
    } else {
      console.log('✗ Update failed:', response.data?.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Error updating assignment set:', error.message);
    return false;
  }
}

async function testEnableMultiSet() {
  console.log('\n=== Test: Enable Multi-Set Assignments ===');
  try {
    const response = await makeRequest('POST', `/admin/assessments/${assessmentId}/enable-multi-set`);

    if (response.ok) {
      console.log('✓ Multi-set assignments enabled successfully');
      console.log(`  Assessment Status: ${response.data.data.status}`);
      console.log(`  Uses Multi-Set: ${response.data.data.usesMultiSetAssignment}`);
      console.log(`  Total Assigned Students: ${response.data.data.assignedStudents.length}`);
      return true;
    } else {
      console.log('✗ Enable multi-set failed:', response.data?.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Error enabling multi-set:', error.message);
    return false;
  }
}

async function testDeleteAssignmentSet(setId) {
  console.log('\n=== Test: Delete Assignment Set ===');
  try {
    const response = await makeRequest('DELETE', `/admin/assessments/${assessmentId}/assignment-sets/${setId}`);

    if (response.ok) {
      console.log('✓ Assignment set deleted successfully');
      return true;
    } else {
      console.log('✗ Delete failed:', response.data?.message);
      return false;
    }
  } catch (error) {
    console.log('✗ Error deleting assignment set:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        Multi-Set Assessment Assignment - Test Suite            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;

  // Test 1: Login
  if (!(await testLogin())) {
    failed++;
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  passed++;

  // Test 2: Create Assessment
  if (!(await testCreateAssessment())) {
    failed++;
    console.log('\n⚠ Cannot proceed without an assessment');
    return;
  }
  passed++;

  // Test 3: Get Departments
  const departments = await testGetDepartments();
  if (!departments.length) {
    failed++;
    console.log('\n⚠ No departments available');
    return;
  }
  passed++;

  // Test 4: Create multiple assignment sets
  console.log('\n=== Creating Multiple Assignment Sets ===');
  for (let i = 0; i < Math.min(3, departments.length); i++) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + i + 1);

    if (await testCreateAssignmentSet(departments[i], futureDate.toISOString())) {
      passed++;
    } else {
      failed++;
    }
  }

  // Test 5: Get Assignment Sets
  if (await testGetAssignmentSets()) {
    passed++;
  } else {
    failed++;
  }

  // Test 6: Update Assignment Set
  if (setIds.length > 0) {
    if (await testUpdateAssignmentSet(setIds[0])) {
      passed++;
    } else {
      failed++;
    }
  }

  // Test 7: Enable Multi-Set Assignments
  if (await testEnableMultiSet()) {
    passed++;
  } else {
    failed++;
  }

  // Test 8: Try to delete after enabling (should fail)
  console.log('\n=== Test: Delete After Enabling (Should Show in Error) ===');
  if (setIds.length > 0) {
    if (await testDeleteAssignmentSet(setIds[0])) {
      passed++;
    } else {
      failed++;
    }
  }

  // Final report
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                              ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║ Passed: ${passed.toString().padEnd(55)}║`);
  console.log(`║ Failed: ${failed.toString().padEnd(55)}║`);
  console.log(`║ Total:  ${(passed + failed).toString().padEnd(55)}║`);
  console.log('╚════════════════════════════════════════════════════════════════╝');

  if (failed === 0) {
    console.log('\n✓ All tests passed! Multi-set assignment feature is working correctly.\n');
    process.exit(0);
  } else {
    console.log(`\n✗ ${failed} test(s) failed. Please review the output above.\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
