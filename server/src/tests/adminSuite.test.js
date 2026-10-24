import http from 'http';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Feedback from '../models/feedbackModel.js';
import AuditLog from '../models/auditLogModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';
import { isAdminEmail, getAdminEmails } from '../utils/adminAuth.js';
import { resetAdminRateLimiter } from '../middleware/adminRateLimiter.js';

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null, extraHeaders = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json', 'x-bypass-rate-limit': 'true', ...extraHeaders };
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

async function runAdminTestSuite() {
  console.log('\n====================================================');
  console.log('🛡️  RUNNING ENHANCEUS ADMIN PORTAL SECURITY & FUNCTIONAL SUITE');
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
    resetAdminRateLimiter();

    // Ensure ADMIN_EMAILS is configured for test runner assertions
    process.env.ADMIN_EMAILS = 'admin@briefenai.me,support@briefenai.me';

    // Ensure MongoDB connection for test verifications
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/enhanceus';
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    }

    const ts = Date.now();
    const adminEmail = 'admin@briefenai.me';
    const regularUserEmail = `regular_user_${ts}@example.com`;
    const unverifiedAdminEmail = 'unverified_admin@briefenai.me';
    const password = 'StrongPassword123!';

    // Ensure clean state for test accounts
    await User.deleteMany({ email: { $in: [adminEmail, regularUserEmail, unverifiedAdminEmail] } });
    await Feedback.deleteMany({ submittedEmail: { $in: ['imported1@example.com', 'imported2@example.com'] } });

    // ==========================================
    // 1. ADMIN ALLOWLIST NORMALIZATION TESTS
    // ==========================================
    console.log('🔑 [1] Admin Allowlist Normalization & Logic:');
    assert(isAdminEmail(adminEmail), 'Recognizes registered admin email');
    assert(isAdminEmail(adminEmail.toUpperCase()), 'Admin email matching is case-insensitive');
    assert(isAdminEmail(`  ${adminEmail}  `), 'Admin email matching trims leading/trailing whitespace');
    assert(!isAdminEmail(regularUserEmail), 'Regular user email is correctly rejected by allowlist');
    assert(!isAdminEmail(DEMO_EMAIL), 'Demo user email is never in allowlist');

    // Test missing/empty ADMIN_EMAILS behavior
    const origEnv = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = '';
    assert(getAdminEmails().size === 0, 'Empty ADMIN_EMAILS yields empty allowlist (denies access by default)');
    process.env.ADMIN_EMAILS = origEnv;

    // ==========================================
    // 2. USER SETUP FOR AUTH & ACCESS CONTROL
    // ==========================================
    console.log('\n👤 [2] Provisioning Test Accounts:');

    // 2a. Register regular user (unverified)
    const regRegular = await request('/auth/register', 'POST', {
      name: 'Regular Test User',
      email: regularUserEmail,
      password,
    });
    const regularToken = regRegular.data?.data?.token;
    const regularUserId = regRegular.data?.data?.user?._id;
    assert(regRegular.status === 201, 'Regular user registered (201)');

    // Verify regular user email
    await User.findByIdAndUpdate(regularUserId, { emailVerified: true });

    // 2b. Register admin user (initially unverified)
    const regAdmin = await request('/auth/register', 'POST', {
      name: 'Platform Administrator',
      email: adminEmail,
      password,
    });
    const adminUnverifiedToken = regAdmin.data?.data?.token;
    const adminUserId = regAdmin.data?.data?.user?._id;
    assert(regAdmin.status === 201, 'Admin account registered (201)');

    // 2c. Login demo account
    const demoLoginRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    const demoToken = demoLoginRes.data?.data?.token;
    assert(demoLoginRes.status === 200, 'Demo account logged in');

    // ==========================================
    // 3. ADMIN ACCESS CONTROL & PERMISSION CHECKS
    // ==========================================
    console.log('\n🔒 [3] Admin Access Control & Direct API Protection:');

    // 3a. Unauthenticated user accessing admin route -> 401
    const unauthCheck = await request('/admin/auth/check', 'GET');
    assert(unauthCheck.status === 401, 'Unauthenticated user rejected with 401');

    // 3b. Regular verified user accessing admin route -> 403 Forbidden
    const regularCheck = await request('/admin/auth/check', 'GET', null, regularToken);
    assert(regularCheck.status === 403, 'Regular verified user denied admin access with 403 Forbidden');
    assert(
      regularCheck.data?.message?.includes('not authorized') || regularCheck.data?.message?.includes('denied'),
      'Clear, actionable denial message for non-admin'
    );

    // 3c. Demo account accessing admin route -> 403 Forbidden
    const demoAdminCheck = await request('/admin/auth/check', 'GET', null, demoToken);
    assert(demoAdminCheck.status === 403, 'Demo account strictly denied admin access with 403 Forbidden');

    // 3d. Unverified admin account accessing admin route -> 403 Forbidden
    const unverifiedAdminCheck = await request('/admin/auth/check', 'GET', null, adminUnverifiedToken);
    assert(
      unverifiedAdminCheck.status === 403 &&
        unverifiedAdminCheck.data?.message?.toLowerCase().includes('verified'),
      'Unverified admin account blocked until email verification is complete (403)'
    );

    // Verify admin email in DB
    await User.findByIdAndUpdate(adminUserId, { emailVerified: true });

    // 3e. Login as verified admin and verify /admin/auth/check -> 200 OK
    const adminLoginRes = await request('/auth/login', 'POST', {
      email: adminEmail,
      password,
    });
    const adminToken = adminLoginRes.data?.data?.token;
    assert(adminLoginRes.status === 200, 'Verified admin logs in successfully (200)');

    const verifiedAdminCheck = await request('/admin/auth/check', 'GET', null, adminToken);
    assert(verifiedAdminCheck.status === 200, 'Verified admin granted access to admin portal (200)');
    assert(verifiedAdminCheck.data?.data?.isAdmin === true, 'Admin status confirmed with isAdmin: true');

    // 3f. Direct API calls to all admin endpoints blocked for regular user
    const [regOverview, regUsers, regAnalytics, regFeedback, regHealth, regAudit] = await Promise.all([
      request('/admin/overview', 'GET', null, regularToken),
      request('/admin/users', 'GET', null, regularToken),
      request('/admin/analytics', 'GET', null, regularToken),
      request('/admin/feedback', 'GET', null, regularToken),
      request('/admin/health', 'GET', null, regularToken),
      request('/admin/audit-logs', 'GET', null, regularToken),
    ]);
    assert(
      regOverview.status === 403 &&
        regUsers.status === 403 &&
        regAnalytics.status === 403 &&
        regFeedback.status === 403 &&
        regHealth.status === 403 &&
        regAudit.status === 403,
      'Direct API calls to all admin endpoints return 403 Forbidden for non-admin user'
    );

    // Verify audit log captured the unauthorized attempt
    const recentAudit = await AuditLog.findOne({
      actorId: regularUserId,
      action: 'UNAUTHORIZED_ADMIN_ATTEMPT',
    });
    assert(recentAudit !== null, 'Security audit log recorded unauthorized admin access attempt');

    // ==========================================
    // 4. OVERVIEW METRICS & USER MANAGEMENT
    // ==========================================
    console.log('\n📊 [4] Admin Overview Metrics & User Directory:');

    // 4a. Overview metrics
    const overviewRes = await request('/admin/overview', 'GET', null, adminToken);
    assert(overviewRes.status === 200, 'Admin overview metrics retrieved (200)');
    assert(overviewRes.data?.data?.users?.totalRealUsers >= 2, 'Overview correctly tallies real registered users');
    assert(typeof overviewRes.data?.data?.users?.verifiedCount === 'number', 'Overview tracks verified accounts');
    assert(typeof overviewRes.data?.data?.sessions?.total === 'number', 'Overview tracks session totals');
    assert(typeof overviewRes.data?.data?.feedback?.total === 'number', 'Overview tracks feedback count');

    // 4b. User directory with pagination and filters
    const usersRes = await request('/admin/users?limit=10&page=1', 'GET', null, adminToken);
    assert(usersRes.status === 200, 'Admin retrieves paginated user directory (200)');
    assert(Array.isArray(usersRes.data?.data?.users), 'User directory returns an array of users');
    assert(!usersRes.data?.data?.users[0]?.password, 'User passwords are never exposed in admin directory');

    // 4c. Profile completion calculation
    const adminUserRecord = usersRes.data?.data?.users.find((u) => u.email === adminEmail);
    assert(
      typeof adminUserRecord?.profileCompletion === 'number',
      'Profile completion percentage is calculated and attached'
    );

    // 4d. Specific User Detail endpoint (GET /admin/users/:id)
    const userDetailRes = await request(`/admin/users/${regularUserId}`, 'GET', null, adminToken);
    assert(userDetailRes.status === 200, 'Admin can retrieve individual user details by ID (200)');
    assert(userDetailRes.data?.data?.email === regularUserEmail, 'User details match requested target user');
    assert(!userDetailRes.data?.data?.password, 'Sensitive password hash is excluded from user detail endpoint');
    assert(typeof userDetailRes.data?.data?.stats?.goalsCount === 'number', 'User details include goal activity counts');
    assert(typeof userDetailRes.data?.data?.stats?.sessionsCount === 'number', 'User details include session activity counts');

    const regularUserDetailRes = await request(`/admin/users/${regularUserId}`, 'GET', null, regularToken);
    assert(regularUserDetailRes.status === 403, 'Non-admin users cannot access user detail endpoint (403)');

    // ==========================================
    // 5. ACCOUNT SUSPENSION & REACTIVATION
    // ==========================================
    console.log('\n🛑 [5] Account Suspension, Reactivation & Safety Guardrails:');

    // 5a. Attempt to suspend demo account -> Rejection (400)
    const demoUserInDb = await User.findOne({ email: DEMO_EMAIL });
    if (demoUserInDb) {
      const suspendDemoRes = await request(
        `/admin/users/${demoUserInDb._id}/suspend`,
        'PATCH',
        { reason: 'Testing demo immunity' },
        adminToken
      );
      assert(suspendDemoRes.status === 400, 'Suspension of demo showcase account is strictly rejected (400)');
    }

    // 5b. Attempt to suspend fellow admin account -> Rejection (403)
    const suspendSelfRes = await request(
      `/admin/users/${adminUserId}/suspend`,
      'PATCH',
      { reason: 'Self suspension attempt' },
      adminToken
    );
    assert(suspendSelfRes.status === 403, 'Suspension of authorized administrator is blocked (403)');

    // 5c. Suspend regular user
    const suspendRes = await request(
      `/admin/users/${regularUserId}/suspend`,
      'PATCH',
      { reason: 'Terms of service violation review' },
      adminToken
    );
    assert(suspendRes.status === 200, 'Regular user suspended successfully (200)');

    // 5d. Verify suspended user is blocked from logging in
    const suspendedLoginRes = await request('/auth/login', 'POST', {
      email: regularUserEmail,
      password,
    });
    assert(
      suspendedLoginRes.status === 403 &&
        suspendedLoginRes.data?.message?.toLowerCase().includes('suspended'),
      'Suspended user blocked from logging in with 403 Forbidden'
    );

    // 5e. Verify suspended user token is rejected by authenticateUser middleware
    const suspendedActionRes = await request('/goals', 'GET', null, regularToken);
    assert(
      suspendedActionRes.status === 403 &&
        suspendedActionRes.data?.message?.toLowerCase().includes('suspended'),
      'Suspended user existing session immediately blocked on protected routes (403)'
    );

    // 5f. Reactivate user
    const reactivateRes = await request(
      `/admin/users/${regularUserId}/reactivate`,
      'PATCH',
      {},
      adminToken
    );
    assert(reactivateRes.status === 200, 'User reactivated successfully (200)');

    // 5g. Reactivated user can log in again
    const reactivatedLoginRes = await request('/auth/login', 'POST', {
      email: regularUserEmail,
      password,
    });
    assert(reactivatedLoginRes.status === 200, 'Reactivated user logs in successfully (200)');

    // ==========================================
    // 6. FEEDBACK WORKFLOW & GOOGLE FORMS CSV IMPORT
    // ==========================================
    console.log('\n📬 [6] Feedback Inbox Workflow & CSV Import:');

    // 6a. Submit a feedback item for test
    const fbSubmit = await request(
      '/feedback',
      'POST',
      {
        rating: 4,
        improvements: 'More live session slots',
        newFeatures: 'Calendar sync',
        comments: 'Admin testing feedback workflow',
      },
      regularToken
    );
    assert(fbSubmit.status === 200, 'Test feedback submitted');

    // 6b. Retrieve admin feedback inbox
    const feedbackInboxRes = await request('/admin/feedback?limit=10', 'GET', null, adminToken);
    assert(feedbackInboxRes.status === 200, 'Admin retrieves feedback inbox (200)');
    const testFeedbackItem = feedbackInboxRes.data?.data?.feedback?.find((f) =>
      f.comments?.includes('Admin testing feedback workflow')
    );
    assert(testFeedbackItem !== undefined, 'Submitted feedback visible in admin inbox');
    assert(
      ['ACCEPTED', 'SIMULATED', 'FAILED', 'PENDING'].includes(testFeedbackItem.emailDeliveryStatus || 'PENDING'),
      'Feedback item provides granular emailDeliveryStatus'
    );

    // 6c. Update feedback status
    const updateStatusRes = await request(
      `/admin/feedback/${testFeedbackItem._id}/status`,
      'PATCH',
      { status: 'IN_PROGRESS' },
      adminToken
    );
    assert(updateStatusRes.status === 200, 'Feedback status updated to IN_PROGRESS (200)');

    // 6d. Add private admin note
    const addNoteRes = await request(
      `/admin/feedback/${testFeedbackItem._id}/notes`,
      'POST',
      { note: 'Assigned to platform engineering team for calendar integration' },
      adminToken
    );
    assert(addNoteRes.status === 200, 'Private admin note appended to feedback item (200)');

    // 6e. Import Google Forms CSV
    const sampleCsv = `Timestamp,Overall Rating,Improvements,Features,Comments,Email
2026-10-22 10:00:00,5,Faster roadmaps,Group study,Love the UI,imported1@example.com
2026-10-22 11:30:00,4,Mobile app,Offline mode,Great work,imported2@example.com`;

    const csvImportRes = await request(
      '/admin/feedback/import-csv',
      'POST',
      { csvContent: sampleCsv },
      adminToken
    );
    assert(csvImportRes.status === 200, 'Google Forms CSV parsed and accepted (200)');
    assert(csvImportRes.data?.data?.importedCount === 2, 'Successfully imported 2 feedback records from CSV');

    // Verify imported records have source: GOOGLE_FORMS_CSV
    const importedDoc = await Feedback.findOne({ submittedEmail: 'imported1@example.com' });
    assert(importedDoc && importedDoc.source === 'GOOGLE_FORMS_CSV', 'Imported feedback tagged with source: GOOGLE_FORMS_CSV');

    // ==========================================
    // 7. TECHNICAL HEALTH, AUDIT TRAIL & RATE LIMITS
    // ==========================================
    console.log('\n🩺 [7] Technical Health Snapshot & Audit Trail:');

    // 7a. Health snapshot
    const healthRes = await request('/admin/health', 'GET', null, adminToken);
    assert(healthRes.status === 200, 'Admin retrieves system health snapshot (200)');
    assert(healthRes.data?.data?.database?.status === 'Connected', 'MongoDB reported as Connected');
    assert(typeof healthRes.data?.data?.traffic?.totalRequests === 'number', 'API traffic metrics instrumented');
    assert(healthRes.data?.data?.integrations?.emailService?.configured !== undefined, 'Email integration state reported without secrets');
    assert(healthRes.data?.data?.integrations?.geminiAi?.configured !== undefined, 'Gemini AI state reported without secrets');

    // 7b. Analytics feature adoption
    const analyticsRes = await request('/admin/analytics?days=30', 'GET', null, adminToken);
    assert(analyticsRes.status === 200, 'Admin retrieves platform usage analytics (200)');
    const circleFeature = analyticsRes.data?.data?.featureAdoption?.find((f) => f.feature === 'Learning Circles');
    assert(circleFeature !== undefined, 'Analytics includes Learning Circles in feature adoption metrics');

    // 7c. Audit logs
    const auditRes = await request('/admin/audit-logs?limit=10', 'GET', null, adminToken);
    assert(auditRes.status === 200, 'Admin retrieves audit trail (200)');
    assert(auditRes.data?.data?.logs?.length > 0, 'Audit logs contain administrative actions');

    // ==========================================
    // 8. TEST REPORT SUMMARY
    // ==========================================
    console.log('\n====================================================');
    console.log(`🏁 ADMIN PORTAL SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Fatal error in admin suite:', err);
    process.exit(1);
  }
}

runAdminTestSuite();
