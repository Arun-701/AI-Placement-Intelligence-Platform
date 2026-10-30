const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Helper to make authenticated requests
const api = async (method, path, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { ok: true, status: response.status, data: response.data };
  } catch (error) {
    if (error.response) {
      return {
        ok: false,
        status: error.response.status,
        data: error.response.data,
      };
    }
    throw error;
  }
};

async function testLegacyAssignment() {
  console.log('🧪 Testing Legacy Assessment Assignment...\n');

  try {
    // Step 1: Get the assessment
    console.log('Step 1: Fetching assessment (6abaa5cca74c289ee8a3f1b3)...');
    const assessmentRes = await api('GET', '/api/admin/assessments');
    
    if (!assessmentRes.ok) {
      console.error('❌ Failed to fetch assessments');
      return;
    }

    const assessment = assessmentRes.data?.data?.find((a) => a._id === '6abaa5cca74c289ee8a3f1b3');
    if (!assessment) {
      console.error('❌ Assessment not found');
      return;
    }

    console.log(`✅ Assessment found: "${assessment.title}"`);
    console.log(`   - Questions: ${assessment.questions?.length || 0}`);
    console.log(`   - QuestionSets: ${assessment.questionSets?.length || 0}`);
    console.log(`   - Status: ${assessment.status}\n`);

    // Step 2: Get departments
    console.log('Step 2: Fetching departments...');
    const deptsRes = await api('GET', '/api/admin/assessments/departments');
    
    if (!deptsRes.ok) {
      console.error('❌ Failed to fetch departments');
      return;
    }

    const departments = deptsRes.data?.data || [];
    console.log(`✅ Found ${departments.length} departments: ${departments.join(', ')}\n`);

    // Step 3: Test assignment with one set
    console.log('Step 3: Attempting to assign Set 1 only (IT department)...');
    
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const futureDateEnd = new Date(futureDate.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    const assignmentPayload = {
      sets: [
        {
          setIndex: 0,
          departments: ['IT'],
          startDate: futureDate.toISOString(),
          endDate: futureDateEnd.toISOString(),
        },
      ],
    };

    console.log(`   Payload: ${JSON.stringify(assignmentPayload, null, 2)}\n`);

    const assignRes = await api(
      'POST',
      '/api/admin/assessments/6abaa5cca74c289ee8a3f1b3/assign-sets',
      assignmentPayload
    );

    if (assignRes.ok) {
      console.log('✅ Assignment successful!\n');
      console.log('Response:');
      console.log(`   - Message: ${assignRes.data?.message}`);
      console.log(`   - Assessment Status: ${assignRes.data?.data?.status}`);
      console.log(`   - Set Assignments: ${assignRes.data?.data?.setAssignments?.length || 0}`);
      
      if (assignRes.data?.data?.questionSets) {
        console.log(`   - QuestionSets generated: ${assignRes.data.data.questionSets.length}`);
        assignRes.data.data.questionSets.forEach((set, idx) => {
          console.log(`     Set ${idx + 1}: ${set.questions?.length || 0} questions`);
        });
      }
      
      if (assignRes.data?.data?.setAssignments) {
        console.log(`   - Set Assignments:`);
        assignRes.data.data.setAssignments.forEach((assignment, idx) => {
          console.log(`     Set ${assignment.setIndex}: ${assignment.departments?.join(', ')} - ${assignment.assignedStudents?.length || 0} students`);
        });
      }
    } else {
      console.error('❌ Assignment failed!');
      console.error(`   Status: ${assignRes.status}`);
      console.error(`   Message: ${assignRes.data?.message || 'Unknown error'}`);
      console.error(`   Details: ${JSON.stringify(assignRes.data, null, 2)}`);
    }

    // Step 4: Verify in database
    console.log('\nStep 4: Verifying assignment in database...');
    const verifyRes = await api('GET', '/api/admin/assessments');
    
    if (verifyRes.ok) {
      const updatedAssessment = verifyRes.data?.data?.find((a) => a._id === '6abaa5cca74c289ee8a3f1b3');
      if (updatedAssessment) {
        console.log(`✅ Assessment verified:`);
        console.log(`   - QuestionSets: ${updatedAssessment.questionSets?.length || 0}`);
        console.log(`   - Set Assignments: ${updatedAssessment.setAssignments?.length || 0}`);
        console.log(`   - Total Assigned Students: ${updatedAssessment.assignedStudents?.length || 0}`);
      }
    }

    console.log('\n✅ Test completed successfully!\n');
  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
  }

  process.exit(0);
}

testLegacyAssignment();
