const http = require('http');

console.log('=== TESTING LOGIN ENDPOINT ===\n');

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  console.log('Response Status:', res.statusCode);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.success) {
        console.log('\n✓ LOGIN SUCCESSFUL');
      } else {
        console.log('\n✗ LOGIN FAILED');
        console.log('Message:', parsed.message);
      }
    } catch (e) {
      console.log(data);
    }
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
  process.exit(1);
});

// Send request with test credentials
// We'll send a test payload - the actual password will be tried by the user
const body = JSON.stringify({
  email: 'krishnanbaby777@gmail.com',
  password: 'TestPassword123!'  // This is a test - actual password should be provided by user
});

console.log('Endpoint:', options.method, `http://${options.hostname}:${options.port}${options.path}`);
console.log('Request Body:');
console.log(`  email: krishnanbaby777@gmail.com`);
console.log(`  password: [TEST PASSWORD - user should enter actual password]`);
console.log('');

req.write(body);
req.end();

setTimeout(() => {
  console.error('Timeout - server not responding');
  process.exit(1);
}, 10000);
