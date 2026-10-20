import {
  isValidExternalUrl,
  CANONICAL_RESOURCES,
  seedCanonicalResources,
  getResourcesForSkill,
  getResourcesForMilestone,
  toggleBookmark,
  rateResource,
  getUserBookmarkedResources,
  _resetResourceStoreForTests,
} from '../services/curatedResourceService.js';

async function runResourceEngineTests() {
  console.log('====================================================');
  console.log('📚 RUNNING V2.4 CURATED RESOURCE ENGINE & SSRF TESTS');
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

  process.env.MOCK_DB = 'true';

  try {
    // ------------------------------------------------------------------
    // TEST SECTION 1: SSRF PROTECTION & URL VALIDATION
    // ------------------------------------------------------------------
    console.log('\n🔒 [1] SSRF & External URL Security:');

    // Reject localhost and loopbacks
    assert(isValidExternalUrl('http://localhost').valid === false, 'SSRF: Rejects http://localhost');
    assert(isValidExternalUrl('http://localhost:3000').valid === false, 'SSRF: Rejects http://localhost:3000');
    assert(isValidExternalUrl('http://127.0.0.1/admin').valid === false, 'SSRF: Rejects 127.0.0.1 loopback');
    assert(isValidExternalUrl('http://127.0.1.1').valid === false, 'SSRF: Rejects 127.x.x.x loopback range');
    assert(isValidExternalUrl('http://[::1]/secret').valid === false, 'SSRF: Rejects IPv6 loopback [::1]');

    // Reject private IP ranges
    assert(isValidExternalUrl('http://10.0.0.5/api').valid === false, 'SSRF: Rejects Class A private IP 10.0.0.5');
    assert(isValidExternalUrl('http://172.16.0.1/status').valid === false, 'SSRF: Rejects Class B private IP 172.16.0.1');
    assert(isValidExternalUrl('http://172.31.255.254').valid === false, 'SSRF: Rejects Class B private IP 172.31.255.254');
    assert(isValidExternalUrl('http://192.168.1.1/router').valid === false, 'SSRF: Rejects Class C private IP 192.168.1.1');
    assert(isValidExternalUrl('http://192.168.0.254').valid === false, 'SSRF: Rejects Class C private IP 192.168.0.254');

    // Reject AWS/Cloud metadata service IP
    assert(isValidExternalUrl('http://169.254.169.254/latest/meta-data').valid === false, 'SSRF: Rejects link-local metadata 169.254.169.254');

    // Reject dangerous/unsupported protocols
    assert(isValidExternalUrl('ftp://ftp.example.com/file.zip').valid === false, 'Protocol: Rejects ftp://');
    assert(isValidExternalUrl('file:///etc/passwd').valid === false, 'Protocol: Rejects file:///');
    assert(isValidExternalUrl('javascript:alert(1)').valid === false, 'Protocol: Rejects javascript: URI');
    assert(isValidExternalUrl('data:text/html,<html>').valid === false, 'Protocol: Rejects data: URI');
    assert(isValidExternalUrl('gopher://gopher.floodgap.com').valid === false, 'Protocol: Rejects gopher://');

    // Reject malformed or empty inputs
    assert(isValidExternalUrl('').valid === false, 'Input: Rejects empty string');
    assert(isValidExternalUrl(null).valid === false, 'Input: Rejects null');
    assert(isValidExternalUrl('not-a-valid-url').valid === false, 'Input: Rejects non-URL string');

    // Allow legitimate public HTTPS/HTTP educational URLs
    assert(isValidExternalUrl('https://developer.mozilla.org/en-US/docs/Web/JavaScript').valid === true, 'Valid: Allows MDN Web Docs HTTPS');
    assert(isValidExternalUrl('https://react.dev/learn').valid === true, 'Valid: Allows react.dev HTTPS');
    assert(isValidExternalUrl('https://nodejs.org/en/docs').valid === true, 'Valid: Allows nodejs.org HTTPS');
    assert(isValidExternalUrl('https://www.typescriptlang.org/docs').valid === true, 'Valid: Allows TypeScript docs');
    assert(isValidExternalUrl('https://docs.docker.com/get-started').valid === true, 'Valid: Allows Docker docs');

    // ------------------------------------------------------------------
    // TEST SECTION 2: CANONICAL RESOURCE CATALOG INTEGRITY
    // ------------------------------------------------------------------
    console.log('\n📖 [2] Canonical Resource Catalog Integrity:');

    assert(Array.isArray(CANONICAL_RESOURCES) && CANONICAL_RESOURCES.length >= 10, 'Catalog: Contains at least 10 foundational resources');

    // Validate that every canonical resource complies with SSRF and schema
    const allValidUrls = CANONICAL_RESOURCES.every((r) => isValidExternalUrl(r.url).valid);
    assert(allValidUrls, 'Catalog: Every canonical resource URL passes strict SSRF checks');

    const allHaveRequiredFields = CANONICAL_RESOURCES.every(
      (r) => r.resourceId && r.title && r.skillName && r.source && r.type
    );
    assert(allHaveRequiredFields, 'Catalog: Every resource contains resourceId, title, skillName, source, type');

    const verifiedResourcesHonest = CANONICAL_RESOURCES.filter((r) => r.isVerified);
    assert(
      verifiedResourcesHonest.length > 0 && verifiedResourcesHonest.every((r) => r.verificationNote),
      'Verification Honesty: All verified resources include an honest verificationNote'
    );

    // ------------------------------------------------------------------
    // TEST SECTION 3: SKILL & MILESTONE FILTERING
    // ------------------------------------------------------------------
    console.log('\n🔍 [3] Skill & Milestone Resource Discovery:');

    // Seed test resources in mock store
    _resetResourceStoreForTests();
    await seedCanonicalResources();

    // Query JavaScript
    const jsResources = await getResourcesForSkill('JavaScript');
    assert(jsResources.length > 0, 'Skill Query: Retrieves resources for JavaScript');
    assert(
      jsResources.every((r) => r.skillName.toLowerCase().includes('javascript')),
      'Skill Query: All returned resources match JavaScript skill'
    );

    // Query React with type filter
    const reactDocs = await getResourcesForSkill('React', 'documentation');
    assert(reactDocs.length > 0, 'Type Filter: Retrieves documentation resources for React');
    assert(
      reactDocs.every((r) => r.type === 'documentation'),
      'Type Filter: Strictly filters to documentation type'
    );

    // Query non-existent skill returns empty array safely
    const unknownRes = await getResourcesForSkill('QuantumKnittingNonExistent123');
    assert(Array.isArray(unknownRes) && unknownRes.length === 0, 'Safe Empty State: Returns empty array for unknown skill');

    // ------------------------------------------------------------------
    // TEST SECTION 4: BOOKMARKING PERSISTENCE & MULTI-TENANCY
    // ------------------------------------------------------------------
    console.log('\n🔖 [4] Bookmarks & User Isolation:');

    const testUserIdA = 'user_test_alpha_123';
    const testUserIdB = 'user_test_beta_456';
    const targetResource = CANONICAL_RESOURCES[0];

    // User A bookmarks resource
    const bookmarkedResA = await toggleBookmark(targetResource.resourceId, testUserIdA);
    assert(bookmarkedResA.isBookmarked === true, 'Bookmark Toggle: User A bookmarks resource successfully');

    // User B checks same resource -> isBookmarked must be false
    const userBBookmarks = await getUserBookmarkedResources(testUserIdB);
    assert(
      userBBookmarks.every((r) => r.resourceId !== targetResource.resourceId),
      'Isolation: User B does NOT see User A bookmark'
    );

    // User A checks bookmarked list
    const userABookmarks = await getUserBookmarkedResources(testUserIdA);
    assert(
      userABookmarks.some((r) => r.resourceId === targetResource.resourceId),
      'Bookmark Retrieval: User A retrieves their bookmarked resource'
    );

    // User A toggles bookmark off
    const unbookmarkedResA = await toggleBookmark(targetResource.resourceId, testUserIdA);
    assert(unbookmarkedResA.isBookmarked === false, 'Bookmark Toggle Off: User A removes bookmark successfully');

    const userABookmarksAfter = await getUserBookmarkedResources(testUserIdA);
    assert(
      userABookmarksAfter.every((r) => r.resourceId !== targetResource.resourceId),
      'Bookmark Removal: Resource removed from User A bookmarked list'
    );

    // ------------------------------------------------------------------
    // TEST SECTION 5: USEFULNESS RATINGS
    // ------------------------------------------------------------------
    console.log('\n👍 [5] Resource Usefulness Ratings:');

    // User A rates useful
    const ratedRes = await rateResource(targetResource.resourceId, testUserIdA, true);
    assert(ratedRes.usefulCount >= 1 && ratedRes.userRating === true, 'Rating: User A votes resource useful');

    // User A changes mind to not useful
    const reRatedRes = await rateResource(targetResource.resourceId, testUserIdA, false);
    assert(reRatedRes.userRating === false && reRatedRes.notUsefulCount >= 1, 'Rating Update: User A switches vote to not useful');

    // User B votes useful
    const userBRatedRes = await rateResource(targetResource.resourceId, testUserIdB, true);
    assert(userBRatedRes.usefulCount >= 1, 'Multi-User Rating: User B also records vote');

  } catch (err) {
    console.error('Fatal test error in resourceEngine:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`🏁 RESOURCE ENGINE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runResourceEngineTests();
