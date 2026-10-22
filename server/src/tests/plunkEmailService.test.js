import { escapeHtml, getFrontendBaseUrl, sendPlunkEmail } from '../services/plunkEmailService.js';
import { ApiError } from '../utils/apiError.js';

async function runPlunkServiceUnitTests() {
  console.log('\n====================================================');
  console.log('📧 RUNNING PLUNK EMAIL SERVICE UNIT & SECURITY TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      failed++;
    }
  };

  try {
    // 1. HTML Injection Prevention
    console.log('🛡️ [1] Template Escaping & HTML Injection Protection:');
    const rawMalicious = '<script>alert("XSS")</script>&foo="bar"\'test\'\nnewline';
    const escaped = escapeHtml(rawMalicious);
    assert(!escaped.includes('<script>'), 'Escapes raw <script> opening tags');
    assert(escaped.includes('&lt;script&gt;'), 'Encodes < and > into safe HTML entities');
    assert(escaped.includes('&amp;foo='), 'Encodes & into &amp;');
    assert(escaped.includes('&quot;bar&quot;'), 'Encodes double quotes into &quot;');
    assert(escaped.includes('&#039;test&#039;'), 'Encodes single quotes into &#039;');
    assert(escaped.includes('<br/>'), 'Converts newline characters into <br/> tags');

    // 2. Base URL Normalization
    console.log('\n🌐 [2] Frontend URL Resolution:');
    const defaultUrl = getFrontendBaseUrl();
    assert(defaultUrl === 'https://www.briefenai.me', 'Resolves canonical production domain https://www.briefenai.me');
    assert(!defaultUrl.endsWith('/'), 'Ensures no trailing slash on base URL');

    // 3. API Key Validation & Public Key Guard (sk_* vs pk_*)
    console.log('\n🔑 [3] Plunk API Key Validation & Guardrails:');
    
    // Save original env values
    const originalApiKey = process.env.PLUNK_API_KEY;
    const originalNodeEnv = process.env.NODE_ENV;
    const originalMockEmail = process.env.MOCK_EMAIL;

    try {
      // Force production mode to test secret key validation
      process.env.NODE_ENV = 'production';
      delete process.env.MOCK_EMAIL;

      // Test 3a: Rejection of Public Key (pk_*)
      process.env.PLUNK_API_KEY = 'pk_live_some_client_public_key_12345';
      let caughtPkError = null;
      try {
        await sendPlunkEmail({
          to: 'test@briefenai.me',
          subject: 'Test Subject',
          body: '<p>Test</p>',
        });
      } catch (err) {
        caughtPkError = err;
      }
      assert(
        caughtPkError instanceof ApiError &&
          caughtPkError.statusCode === 503 &&
          caughtPkError.message.includes('sk_*') &&
          caughtPkError.message.includes('public key'),
        'Rejects Plunk public key (pk_*) with actionable 503 instruction to use secret key (sk_*)'
      );

      // Test 3b: Rejection of missing/placeholder key
      process.env.PLUNK_API_KEY = 'placeholder';
      let caughtPlaceholderError = null;
      try {
        await sendPlunkEmail({
          to: 'test@briefenai.me',
          subject: 'Test Subject',
          body: '<p>Test</p>',
        });
      } catch (err) {
        caughtPlaceholderError = err;
      }
      assert(
        caughtPlaceholderError instanceof ApiError &&
          caughtPlaceholderError.statusCode === 503 &&
          caughtPlaceholderError.message.includes('unconfigured'),
        'Rejects placeholder API key with 503 configuration error'
      );
    } finally {
      // Restore original environment
      if (originalApiKey !== undefined) process.env.PLUNK_API_KEY = originalApiKey;
      else delete process.env.PLUNK_API_KEY;
      
      if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
      else delete process.env.NODE_ENV;

      if (originalMockEmail !== undefined) process.env.MOCK_EMAIL = originalMockEmail;
      else delete process.env.MOCK_EMAIL;
    }

    // 4. Safe Simulation in Test Environment
    console.log('\n🧪 [4] Test & Dev Email Simulation:');
    process.env.NODE_ENV = 'test';
    const simulatedRes = await sendPlunkEmail({
      to: 'recipient@briefenai.me',
      subject: 'Simulation Test',
      body: '<p>Simulated Content</p>',
    });
    assert(simulatedRes.success === true, 'Simulation returns success: true');
    assert(simulatedRes.simulated === true, 'Simulation flags simulated: true');
    assert(simulatedRes.to === 'recipient@briefenai.me', 'Simulation preserves recipient');

    console.log('\n====================================================');
    console.log(`🏁 PLUNK SERVICE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Fatal test error in plunk unit tests:', err);
    process.exit(1);
  }
}

runPlunkServiceUnitTests();
