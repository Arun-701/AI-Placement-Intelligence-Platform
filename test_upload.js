const fs = require('fs');
const http = require('http');

const filePath = 'D:/sem7/Mini_Project/current_app/sample_question_paper.pdf';
const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYTJkZjA0ODgxMmFiY2RhOTcyMjg2OCIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzg5MDU4OTgwLCJleHAiOjE3ODk2NjM3ODB9.pQ6WJSElH_g78CxapBPEtzSsLXiX1jdeQ6tRJIx15Ms';

// Verify file
if (!fs.existsSync(filePath)) {
  console.error('FILE_NOT_FOUND:', filePath);
  process.exit(1);
}

const fileBuf = fs.readFileSync(filePath);
console.log('FILE_BYTES:', fileBuf.length);
console.log('JWT_LENGTH:', jwt.length);

// Build multipart boundary and body
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

console.log('BODY_BYTES:', bodyBuf.length);

// Make HTTP request
const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/ai/question-paper/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Authorization': 'Bearer ' + jwt,
    'Content-Length': bodyBuf.length
  },
  timeout: 30000
};

console.log('\nEXECUTING REQUEST:');
console.log('METHOD:', options.method);
console.log('URL: http://' + options.hostname + ':' + options.port + options.path);
console.log('AUTH: Bearer ' + jwt.substring(0, 30) + '...');
console.log('---\n');

const req = http.request(options, (res) => {
  let respBody = '';
  
  console.log('RESPONSE STATUS:', res.statusCode);
  
  res.on('data', (chunk) => {
    respBody += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE_SIZE:', respBody.length, 'bytes');
    console.log('\n=== RESPONSE BODY ===');
    console.log(respBody);
    console.log('=== END RESPONSE ===\n');
    
    if (respBody.trim().startsWith('{')) {
      try {
        const json = JSON.parse(respBody);
        console.log('PARSED_JSON:');
        console.log(JSON.stringify(json, null, 2));
        
        if (json.success && json.data) {
          console.log('\n✓ ANALYSIS_SUCCEEDED');
          console.log('✓ Total Questions:', json.data.totalQuestions);
          if (json.data.topics) {
            console.log('✓ Topics analyzed:', json.data.topics.length);
          }
        }
      } catch (e) {
        console.log('ERROR parsing JSON:', e.message);
      }
    }
    
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('REQUEST_ERROR:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('REQUEST_TIMEOUT after 30s');
  req.destroy();
  process.exit(1);
});

console.log('Sending request...');
req.write(bodyBuf);
req.end();
