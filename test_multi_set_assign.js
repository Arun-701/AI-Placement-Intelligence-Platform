#!/usr/bin/env node

const http = require('http');

const assessmentId = '6abaa5cca74c289ee8a3f1b3';

// Single set configuration: Set 1 with IT + dates
const payload = {
  sets: [
    {
      setIndex: 0,
      departments: ['IT'],
      startDate: '2026-10-10T10:00:00',
      endDate: '2026-10-12T10:00:00'
    }
  ]
};

console.log('🧪 Testing Multi-Set Assignment');
console.log('================================');
console.log('');
console.log('Assessment ID:', assessmentId);
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('');

const postData = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: `/api/admin/assessments/${assessmentId}/assign-sets`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    // Add auth token if needed
    'Authorization': `Bearer ${process.env.AUTH_TOKEN || ''}`
  }
};

console.log('Sending request to:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('');

const req = http.request(options, (res) => {
  console.log(`HTTP Status: ${res.statusCode}`);
  console.log('Response Headers:', res.headers);
  console.log('');

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    console.log(data);
    console.log('');

    try {
      const parsed = JSON.parse(data);
      console.log('Parsed Response:');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('');

      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ SUCCESS');
      } else {
        console.log('❌ FAILED');
        console.log('Error Message:', parsed.message);
      }
    } catch (e) {
      console.log('⚠️  Could not parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request Error:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();
