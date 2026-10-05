const fs = require('fs');
const http = require('http');
const querystring = require('querystring');

const filePath = 'D:/sem7/Mini_Project/current_app/sample_question_paper.pdf';

// Verify file
if (!fs.existsSync(filePath)) {
  console.error('FILE_NOT_FOUND:', filePath);
  process.exit(1);
}

const fileBuf = fs.readFileSync(filePath);
console.log('FILE_BYTES:', fileBuf.length);

// Read JWT
const jwt = fs.readFileSync('/tmp/student_jwt.txt', 'utf8').trim();
console.log('JWT_RETRIEVED: ' + jwt.substring(0, 30) + '...');

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
  timeout: 10000
};

console.log('REQUEST:', options.method, options.path);

const req = http.request(options, (res) => {
  let respBody = '';
  
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
  
  res.on('data', (chunk) => {
    respBody += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE_BYTES:', respBody.length);
    console.log('RESPONSE_BODY:', respBody);
    
    try {
      const json = JSON.parse(respBody);
      console.log('\nPARSED_RESPONSE:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Not JSON, showing raw:', respBody.substring(0, 500));
    }
    
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('REQUEST_ERROR:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('REQUEST_TIMEOUT after 10s');
  req.destroy();
  process.exit(1);
});

req.write(bodyBuf);
req.end();
