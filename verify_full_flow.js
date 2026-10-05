const fs = require('fs');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000';
const filePath = 'D:/sem7/Mini_Project/current_app/sample_question_paper.pdf';

(async () => {
  try {
    console.log('\n=== FULL FLOW TEST ===\n');
    
    // Step 1: Login
    console.log('Step 1: Student Login...');
    const loginRes = await fetch(BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student.test@example.com',
        password: 'TestPass123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.error('✗ Login failed:', loginData.message);
      process.exit(1);
    }
    const jwt = loginData.data.token;
    console.log('✓ Login successful');
    console.log('✓ JWT obtained:', jwt.substring(0, 30) + '...');
    
    // Step 2: Upload PDF
    console.log('\nStep 2: Upload PDF for Analysis...');
    if (!fs.existsSync(filePath)) {
      console.error('✗ PDF file not found:', filePath);
      process.exit(1);
    }
    
    const fileBuf = fs.readFileSync(filePath);
    console.log('✓ PDF loaded:', fileBuf.length, 'bytes');
    
    // Build multipart
    const boundary = '----boundary-' + Date.now();
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
    
    const uploadRes = await new Promise((resolve, reject) => {
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
        timeout: 60000
      };
      
      const req = http.request(options, resolve);
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TIMEOUT'));
      });
      req.write(bodyBuf);
      req.end();
    });
    
    let respBody = '';
    for await (const chunk of uploadRes) {
      respBody += chunk;
    }
    
    if (uploadRes.statusCode !== 200) {
      console.error('✗ Upload failed with status', uploadRes.statusCode);
      console.error('Response:', respBody.substring(0, 300));
      process.exit(1);
    }
    
    console.log('✓ Upload successful (200 OK)');
    
    // Step 3: Validate response
    console.log('\nStep 3: Validate Analysis Response...');
    const analysis = JSON.parse(respBody);
    
    if (!analysis.success) {
      console.error('✗ Analysis failed:', analysis.message);
      process.exit(1);
    }
    
    console.log('✓ Analysis succeeded');
    
    const data = analysis.data;
    console.log('\n=== ANALYSIS RESULTS ===');
    console.log('Total Questions:', data.totalQuestions);
    console.log('Extraction Method:', data.extractionMethod);
    console.log('Pages Processed:', data.pagesProcessed);
    console.log('ML Questions:', data.mlQuestions);
    console.log('Gemini Questions:', data.geminiQuestions);
    
    console.log('\n=== TOPIC BREAKDOWN ===');
    console.log('Topics Found:', data.topics.length);
    console.log('\nTopic Details:');
    data.topics.forEach((topic, idx) => {
      console.log(`\n  Topic ${idx + 1}:`);
      console.log(`    Domain: ${topic.domain}`);
      console.log(`    Topic: ${topic.topic}`);
      console.log(`    Subject: ${topic.subject}`);
      console.log(`    Questions: ${topic.questionCount}`);
      console.log(`    Difficulty: ${topic.difficulty}`);
      console.log(`    Confidence: ${(topic.confidence * 100).toFixed(1)}%`);
      console.log(`    Priority: ${topic.priority} (score: ${topic.priorityScore})`);
    });
    
    console.log('\n=== DISTRIBUTIONS ===');
    console.log('Subject Distribution:', data.subjectDistribution);
    console.log('Difficulty Distribution:', data.difficultyDistribution);
    
    console.log('\n=== RECOMMENDED STUDY ORDER ===');
    data.recommendedStudyOrder.forEach((topic, idx) => {
      console.log(`  ${idx + 1}. ${topic}`);
    });
    
    console.log('\n✓ ALL VALIDATIONS PASSED');
    console.log('\n=== FIELD VALIDATION ===');
    
    const requiredFields = [
      'totalQuestions',
      'extractionMethod',
      'pagesProcessed',
      'topics',
      'subjectDistribution',
      'difficultyDistribution',
      'recommendedStudyOrder',
      'mlQuestions',
      'geminiQuestions'
    ];
    
    const topicFields = [
      'subject',
      'domain',
      'topic',
      'questionCount',
      'difficulty',
      'priorityScore',
      'priority',
      'confidence'
    ];
    
    let allValid = true;
    
    requiredFields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        console.log(`✓ ${field}`);
      } else {
        console.log(`✗ MISSING: ${field}`);
        allValid = false;
      }
    });
    
    console.log('\nTopic Field Validation:');
    if (data.topics.length > 0) {
      const firstTopic = data.topics[0];
      topicFields.forEach(field => {
        if (firstTopic.hasOwnProperty(field)) {
          console.log(`✓ ${field}`);
        } else {
          console.log(`✗ MISSING: ${field}`);
          allValid = false;
        }
      });
    }
    
    if (allValid) {
      console.log('\n✓✓✓ END-TO-END VERIFICATION SUCCESSFUL ✓✓✓\n');
      process.exit(0);
    } else {
      console.log('\n✗ SOME FIELDS MISSING');
      process.exit(1);
    }
    
  } catch (err) {
    console.error('\n✗ ERROR:', err.message);
    process.exit(1);
  }
})();
