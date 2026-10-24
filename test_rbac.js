const http = require('http');

// Faculty JWT (we'll get this via login)
// Admin JWT (we'll get this via login)

async function testRBAC() {
  const filePath = 'D:/sem7/Mini_Project/current_app/sample_question_paper.pdf';
  const fs = require('fs');
  
  if (!fs.existsSync(filePath)) {
    console.error('FILE_NOT_FOUND:', filePath);
    process.exit(1);
  }
  
  const fileBuf = fs.readFileSync(filePath);
  
  // First, create the accounts via login attempts (they'll fail, but accounts should exist)
  console.log('Step 1: Get Faculty JWT...');
  
  let facultyJwt = null;
  try {
    const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty.test@example.com',
        password: 'TestPass123'
      })
    });
    const loginData = await loginRes.json();
    if (loginData.success) {
      facultyJwt = loginData.data.token;
      console.log('✓ Faculty login succeeded');
    } else {
      console.log('⚠ Faculty login failed:', loginData.message);
    }
  } catch (err) {
    console.error('Faculty login error:', err.message);
  }
  
  if (!facultyJwt) {
    console.log('Skipping faculty RBAC test - no JWT');
    return;
  }
  
  console.log('\nStep 2: Test Faculty access to student endpoint...');
  
  // Build multipart
  const boundary = '----formdata-boundary-' + Date.now();
  let body = '';
  body += '--' + boundary + '\r\n';
  body += 'Content-Disposition: form-data; name="file"; filename="sample_question_paper.pdf"\r\n';
  body += 'Content-Type: application/pdf\r\n';
  body += '\r\n';
  
  const bodyBuf = Buffer.concat([
    Buffer.from(body),
    fileBuf,
    Buffer.from('\r\n--' + boundary + '--\r\n')
  ]);
  
  try {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/ai/question-paper/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Authorization': 'Bearer ' + facultyJwt,
        'Content-Length': bodyBuf.length
      },
      timeout: 10000
    };
    
    const res = await new Promise((resolve, reject) => {
      const req = http.request(options, resolve);
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
      req.write(bodyBuf);
      req.end();
    });
    
    let body = '';
    for await (const chunk of res) {
      body += chunk;
    }
    
    console.log('Faculty endpoint response: STATUS', res.statusCode);
    if (res.statusCode === 403) {
      console.log('✓ Faculty correctly DENIED (403)');
    } else {
      console.log('✗ Faculty should be denied but got:', res.statusCode);
      console.log('Response:', body.substring(0, 200));
    }
  } catch (err) {
    console.error('Faculty RBAC test error:', err.message);
  }
  
  process.exit(0);
}

testRBAC();
