const express = require('express');

// Load the router
const resumeJDRoutes = require('./routes/resumeJDRoutes');

console.log('\n=== TESTING ROUTE LOADING ===\n');

// Test 1: Check resumeJDRoutes directly
console.log('1. Checking resumeJDRoutes object:');
console.log('   Type:', typeof resumeJDRoutes);
console.log('   Has stack:', !!resumeJDRoutes.stack);
if (resumeJDRoutes.stack) {
  console.log('   Stack length:', resumeJDRoutes.stack.length);
  resumeJDRoutes.stack.forEach((item, idx) => {
    console.log(`   [${idx}]`, item.name);
  });
}

// Test 2: Mount and check
console.log('\n2. Mounting on Express app:');
const app = express();
app.use(express.json());
app.use('/api/ai', resumeJDRoutes);

console.log('   app._router:', app._router ? 'exists' : 'undefined');
if (!app._router) {
  console.log('   (No _router property - trying to access it via app)');
}
const stack = app._router?.stack || [];
console.log('   App stack length:', stack.length);
stack.forEach((layer, idx) => {
  if (layer.name === 'router') {
    console.log(`   [${idx}] Sub-router:`, layer.regexp);
    if (layer.handle && layer.handle.stack) {
      console.log(`       Routes in sub-router: ${layer.handle.stack.length}`);
      layer.handle.stack.forEach((subLayer, subIdx) => {
        if (subLayer.route) {
          const methods = Object.keys(subLayer.route.methods).map(m => m.toUpperCase()).join(',');
          console.log(`       [${subIdx}] ${methods} ${subLayer.route.path}`);
        } else if (subLayer.name === 'router') {
          console.log(`       [${subIdx}] (nested router)`);
        } else {
          console.log(`       [${subIdx}] ${subLayer.name}`);
        }
      });
    }
  }
});

// Test 3: Create a test server and try to request
console.log('\n3. Creating test server:');
const server = app.listen(5555, () => {
  console.log('   Server listening on port 5555');
  
  // Test the route
  setTimeout(async () => {
    try {
      const response = await fetch('http://localhost:5555/api/ai/analyze-resume-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: 'test' })
      });
      console.log('   Response status:', response.status);
      const data = await response.text();
      console.log('   Response:', data.slice(0, 200));
    } catch (e) {
      console.log('   Error:', e.message);
    } finally {
      server.close();
      process.exit(0);
    }
  }, 100);
});
