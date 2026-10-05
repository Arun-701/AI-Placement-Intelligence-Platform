const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

const filePath = 'D:/sem7/Mini_Project/current_app/sample_question_paper.pdf';
const base = 'http://127.0.0.1:5000';

(async () => {
  try {
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      console.error('FILE_NOT_FOUND:', filePath);
      process.exit(1);
    }
    
    const fileBuf = fs.readFileSync(filePath);
    console.log('FILE_BYTES:', fileBuf.length);
    
    // Read JWT
    const jwt = fs.readFileSync('/tmp/student_jwt.txt', 'utf8').trim();
    console.log('JWT_LENGTH:', jwt.length);
    
    // Create form
    const form = new FormData();
    form.append('file', fileBuf, {
      filename: 'sample_question_paper.pdf',
      contentType: 'application/pdf'
    });
    
    // Make request
    console.log('REQUEST_TO:', base + '/api/ai/question-paper/analyze');
    const res = await fetch(base + '/api/ai/question-paper/analyze', {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: 'Bearer ' + jwt
      },
      body: form
    });
    
    const text = await res.text();
    console.log('STATUS:', res.status);
    console.log('CONTENT_TYPE:', res.headers.get('content-type'));
    console.log('BODY_LENGTH:', text.length);
    console.log('BODY:', text);
    
    // Try parsing as JSON if content-type is JSON
    if (text.trim().startsWith('{')) {
      try {
        const json = JSON.parse(text);
        console.log('\nPARSED_JSON:');
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON:', e.message);
      }
    }
    
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('STACK:', err.stack);
    process.exit(1);
  }
})();
