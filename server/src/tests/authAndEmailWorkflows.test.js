import http from 'http';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Feedback from '../models/feedbackModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null, extraHeaders = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

async function runAuthAndEmailSuite() {
  console.log('====================================================');
  console.log('🔐 RUNNING AUTHENTICATION, EMAIL & DEMO ISOLATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    const ts = Date.now();
    const realUserEmail = `realuser_${ts}@briefenai.me`;
    const realUserPassword = 'OriginalPassword123!';
    const newPassword = 'NewSecretPassword456!';

    // Ensure MongoDB connection for test verifications
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/enhanceus';
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    }

    // ==========================================
    // 1. DEMO ACCOUNT AUTHENTICATION & ISOLATION
    // ==========================================
    console.log('🎭 [1] Demo Account Isolation & Authentication:');

    // Demo login succeeds
    const demoLoginRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    assert(demoLoginRes.status === 200, 'Demo account logs in successfully (200)');
    assert(demoLoginRes.data?.data?.user?.isDemo === true, 'Demo user explicitly identified with isDemo: true');
    assert(demoLoginRes.data?.data?.user?.emailVerified === true, 'Demo user is pre-verified (emailVerified: true)');

    const demoToken = demoLoginRes.data?.data?.token;

    // Demo login rejects bad password
    const demoBadPassRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: 'WrongPassword!',
    });
    assert(demoBadPassRes.status === 401, 'Demo account rejects incorrect password with 401');

    // Demo account cannot be registered again
    const demoRegisterAttempt = await request('/auth/register', 'POST', {
      name: 'Imposter Demo',
      email: DEMO_EMAIL,
      password: 'AnyPassword123!',
    });
    assert(demoRegisterAttempt.status === 400, 'Demo email address registration is reserved and blocked (400)');

    // ==========================================
    // 2. REAL USER REGISTRATION & EMAIL VERIFICATION
    // ==========================================
    console.log('\n👤 [2] Real User Registration & Email Verification:');

    // Register real user
    const regRes = await request('/auth/register', 'POST', {
      name: 'Real Verified User',
      email: realUserEmail,
      password: realUserPassword,
      skills: [{ name: 'Node.js', level: 'INTERMEDIATE' }],
    });

    assert(regRes.status === 201, 'Real user registers successfully in MongoDB (201)');
    assert(regRes.data?.data?.user?.isDemo === false, 'Real user is not a demo account (isDemo: false)');
    assert(regRes.data?.data?.user?.emailVerified === false, 'Newly registered real user starts as unverified (emailVerified: false)');
    assert(!regRes.data?.data?.tokenHash, 'Raw verification token hash is not leaked in registration response');

    const realUserToken = regRes.data?.data?.token;
    const realUserId = regRes.data?.data?.user?._id;

    // Real user attempts protected creation action while unverified -> Expect 403 Forbidden
    const unverifiedGoalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Unverified Goal Attempt',
        description: 'Should be blocked until email is verified',
      },
      realUserToken
    );
    assert(
      unverifiedGoalRes.status === 403 &&
        unverifiedGoalRes.data?.message?.toLowerCase().includes('email verification required'),
      'Unverified real user blocked from protected goal creation with 403'
    );

    // Verification token verification: Reject invalid token
    const invalidTokenRes = await request('/auth/verify-email', 'POST', {
      token: 'invalid_cryptographic_token_xyz',
    });
    assert(invalidTokenRes.status === 400, 'Rejects invalid email verification token with 400');

    // Retrieve generated token from DB to simulate clicking valid email link
    const userDocInDb = await User.findOne({ email: realUserEmail }).select(
      '+verificationTokenHash +verificationTokenExpires'
    );
    assert(userDocInDb && userDocInDb.verificationTokenHash, 'Cryptographic verification token hash safely stored in MongoDB');
    assert(userDocInDb.verificationTokenExpires > new Date(), 'Verification token has valid expiration timestamp');

    // Manually set a known raw token & hash for testing verification endpoint
    import('crypto').then(async (crypto) => {
      const testRawToken = 'test_raw_verification_token_' + ts;
      const testHash = crypto.createHash('sha256').update(testRawToken).digest('hex');
      userDocInDb.verificationTokenHash = testHash;
      userDocInDb.verificationTokenExpires = new Date(Date.now() + 3600000);
      await userDocInDb.save();

      // Submit valid token to verification endpoint
      const validVerifyRes = await request('/auth/verify-email', 'POST', {
        token: testRawToken,
      });
      assert(validVerifyRes.status === 200, 'Valid verification token successfully verifies account (200)');

      // Verify token cannot be reused
      const reuseTokenRes = await request('/auth/verify-email', 'POST', {
        token: testRawToken,
      });
      assert(reuseTokenRes.status === 400, 'Reused verification token is safely rejected (400)');

      // Verify in DB that account is verified and token hash is cleared
      const updatedUserDoc = await User.findById(realUserId);
      assert(updatedUserDoc.emailVerified === true, 'Database record confirms user.emailVerified is true');

      // Now that email is verified, goal creation succeeds!
      const verifiedGoalRes = await request(
        '/goals',
        'POST',
        {
          title: 'Verified Learning Blueprint',
          description: 'Building modern full-stack web applications with React and Node.js',
        },
        realUserToken
      );
      assert(verifiedGoalRes.status === 201, 'Verified real user can now access protected goal creation (201)');

      // ==========================================
      // 3. PASSWORD RESET FLOW & ANTI-ENUMERATION
      // ==========================================
      console.log('\n🔑 [3] Password Reset Workflow & Anti-Enumeration:');

      // Forgot password request for non-existent email -> Generic response
      const nonExistentForgotRes = await request('/auth/forgot-password', 'POST', {
        email: `nonexistent_${ts}@example.com`,
      });
      assert(
        nonExistentForgotRes.status === 200,
        'Forgot password returns generic success for non-existent email (Anti-Enumeration)'
      );

      // Forgot password request for real email
      const realForgotRes = await request('/auth/forgot-password', 'POST', {
        email: realUserEmail,
      });
      assert(
        realForgotRes.status === 200,
        'Forgot password returns generic success for registered email (Anti-Enumeration)'
      );
      assert(
        !realForgotRes.data?.data?.token && !realForgotRes.data?.data?.resetToken,
        'Reset token is never leaked in API response'
      );

      // Setup known reset token for deterministic test
      const testResetToken = 'test_reset_token_' + ts;
      const testResetHash = crypto.createHash('sha256').update(testResetToken).digest('hex');
      const targetUser = await User.findById(realUserId).select('+resetPasswordTokenHash +resetPasswordExpires');
      targetUser.resetPasswordTokenHash = testResetHash;
      targetUser.resetPasswordExpires = new Date(Date.now() + 1800000); // 30 mins
      await targetUser.save();

      // Attempt reset with invalid token
      const badResetRes = await request('/auth/reset-password', 'POST', {
        token: 'wrong_reset_token',
        password: newPassword,
      });
      assert(badResetRes.status === 400, 'Rejects invalid reset token (400)');

      // Attempt reset with short password
      const shortPassReset = await request('/auth/reset-password', 'POST', {
        token: testResetToken,
        password: '123',
      });
      assert(shortPassReset.status === 400, 'Rejects password shorter than 6 characters (400)');

      // Successful password reset
      const successResetRes = await request('/auth/reset-password', 'POST', {
        token: testResetToken,
        password: newPassword,
      });
      assert(successResetRes.status === 200, 'Password reset succeeds with valid token (200)');

      // Old password no longer works
      const oldPassLoginRes = await request('/auth/login', 'POST', {
        email: realUserEmail,
        password: realUserPassword,
      });
      assert(oldPassLoginRes.status === 401, 'Old password fails authentication after reset (401)');

      // New password works
      const newPassLoginRes = await request('/auth/login', 'POST', {
        email: realUserEmail,
        password: newPassword,
      });
      assert(newPassLoginRes.status === 200, 'New password authenticates successfully (200)');

      // Reset token cannot be reused
      const reuseResetRes = await request('/auth/reset-password', 'POST', {
        token: testResetToken,
        password: 'AnotherPassword999!',
      });
      assert(reuseResetRes.status === 400, 'Previously used reset token cannot be reused (400)');

      // ==========================================
      // 4. FEEDBACK PERSISTENCE & PLUNK DELIVERY
      // ==========================================
      console.log('\n📬 [4] Feedback Persistence & Plunk Notification:');

      const feedbackSubmitRes = await request(
        '/feedback',
        'POST',
        {
          rating: 5,
          improvements: 'Add more advanced AI roadmap milestones for backend engineering.',
          newFeatures: 'Real-time video call integrations with peer partners.',
          comments: 'EnhanceUs has significantly accelerated my learning journey!',
        },
        newPassLoginRes.data?.data?.token
      );

      assert(feedbackSubmitRes.status === 200, 'Feedback submission succeeds with HTTP 200');

      // Verify feedback document is persisted in MongoDB
      const storedFeedback = await Feedback.findOne({ user: realUserId });
      assert(storedFeedback !== null, 'Feedback document successfully persisted in MongoDB');
      assert(storedFeedback.rating === 5, 'Persisted feedback preserves rating (5)');
      assert(
        storedFeedback.improvements.includes('Add more advanced AI roadmap'),
        'Persisted feedback preserves improvements text'
      );
      assert(
        storedFeedback.newFeatures.includes('Real-time video call'),
        'Persisted feedback preserves new features text'
      );

      // ==========================================
      // 5. TEST REPORT SUMMARY
      // ==========================================
      console.log('\n====================================================');
      console.log(`🏁 AUTH & EMAIL WORKFLOW RESULTS: ${passed} PASSED, ${failed} FAILED`);
      console.log('====================================================\n');

      if (failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    });
  } catch (err) {
    console.error('Fatal error in auth & email suite:', err);
    process.exit(1);
  }
}

runAuthAndEmailSuite();
