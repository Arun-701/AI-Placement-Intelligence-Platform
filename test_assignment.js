const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function test() {
  try {
    // First get the admin token
    const loginRes = await axios.post(`${API_BASE}/api/admin/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginRes.data?.data?.token;
    console.log('✓ Login successful, token:', token?.substring(0, 20) + '...');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Get assessments
    const assessmentsRes = await axios.get(`${API_BASE}/api/admin/assessments`, { headers });
    console.log(`✓ Found ${assessmentsRes.data?.data?.length} assessments`);
    
    // Find first assessment
    const assessment = assessmentsRes.data?.data?.[0];
    if (!assessment) {
      console.log('✗ No assessment found');
      return;
    }
    
    console.log(`\n📋 Assessment: ${assessment.title} (${assessment._id})`);
    console.log(`   Question Sets: ${assessment.questionSets?.length || 'N/A'}`);
    
    // Test assignment with single set
    const payload = {
      sets: [
        {
          setIndex: 0,
          departments: ['IT'],
          startDate: '2026-09-30T23:49',
          endDate: '2026-10-01T23:49'
        }
      ]
    };
    
    console.log(`\n📤 Sending assignment payload:`);
    console.log(JSON.stringify(payload, null, 2));
    
    const assignRes = await axios.post(
      `${API_BASE}/api/admin/assessments/${assessment._id}/assign-sets`,
      payload,
      { headers }
    );
    
    console.log(`\n✓ Assignment successful!`);
    console.log(`  Message: ${assignRes.data?.message}`);
    console.log(`  Status: ${assignRes.data?.data?.status}`);
    console.log(`  Assigned Students: ${assignRes.data?.data?.assignedStudents?.length || 0}`);
    
  } catch (error) {
    console.log('\n✗ Error:');
    console.log(`  Status: ${error.response?.status}`);
    console.log(`  Message: ${error.response?.data?.message}`);
    console.log(`  Error: ${error.message}`);
    
    if (error.response?.data) {
      console.log(`  Full response:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
