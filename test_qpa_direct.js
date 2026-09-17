const formData = require('form-data');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create test PDF
const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test Question Paper) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000217 00000 n \n0000000290 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n383\n%%EOF');

const form = new formData();
form.append('file', pdfContent, { filename: 'test.pdf', contentType: 'application/pdf' });

// Use Authorization token (you'll need to provide a valid token)
const token = 'test_token';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/ai/question-paper/analyze',
  method: 'POST',
  headers: {
    ...form.getHeaders(),
    'Authorization': `Bearer ${token}`
  }
};

console.log('[NODE-TEST] Sending POST to http://localhost:5000/api/ai/question-paper/analyze');

const req = http.request(options, (res) => {
  console.log(`[NODE-TEST] Status: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('[NODE-TEST] Response:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('[NODE-TEST] Response (raw):', body.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error(`[NODE-TEST] Error: ${e.message}`);
});

form.pipe(req);
