import mongoose from 'mongoose';
import { LearningResource } from '../models/learningResourceModel.js';
import { ApiError } from '../utils/apiError.js';

// Predefined trusted domains for official documentation & non-profit learning platforms
const TRUSTED_EDUCATIONAL_DOMAINS = new Set([
  'developer.mozilla.org',
  'react.dev',
  'nodejs.org',
  'expressjs.com',
  'www.typescriptlang.org',
  'typescriptlang.org',
  'docs.python.org',
  'python.org',
  'docs.docker.com',
  'kubernetes.io',
  'www.postgresql.org',
  'postgresql.org',
  'www.mongodb.com',
  'mongodb.com',
  'git-scm.com',
  'docs.github.com',
  'github.com',
  'web.dev',
  'www.freecodecamp.org',
  'freecodecamp.org',
  'www.khanacademy.org',
  'khanacademy.org',
  'javascript.info',
  'sqlbolt.com',
]);

/**
 * Validate URL to prevent SSRF and unsafe schemes
 */
export const isValidExternalUrl = (urlString) => {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }

  try {
    const parsed = new URL(urlString.trim());

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are permitted' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check loopback / localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost')
    ) {
      return { valid: false, error: 'Localhost and loopback addresses are blocked' };
    }

    // Check private IPv4 addresses (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x link-local / AWS metadata)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const b1 = parseInt(ipv4Match[1], 10);
      const b2 = parseInt(ipv4Match[2], 10);

      if (
        b1 === 10 ||
        (b1 === 172 && b2 >= 16 && b2 <= 31) ||
        (b1 === 192 && b2 === 168) ||
        (b1 === 169 && b2 === 254) ||
        b1 === 127 ||
        b1 === 0
      ) {
        return { valid: false, error: 'Private and internal IP ranges are blocked for security' };
      }
    }

    // Check common internal hostnames
    if (
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.corp') ||
      hostname.endsWith('.lan')
    ) {
      return { valid: false, error: 'Internal domain names are blocked' };
    }

    return { valid: true, parsed };
  } catch (err) {
    return { valid: false, error: 'Malformed URL structure' };
  }
};

/**
 * Check if domain is a recognized, reputable documentation or education provider
 */
export const isTrustedDomain = (urlString) => {
  try {
    const { hostname } = new URL(urlString);
    return TRUSTED_EDUCATIONAL_DOMAINS.has(hostname.toLowerCase());
  } catch {
    return false;
  }
};

/**
 * Built-in canonical educational resource library
 */
export const CANONICAL_RESOURCES = [
  // JavaScript
  {
    resourceId: 'res_mdn_js_guide',
    title: 'MDN Web Docs: JavaScript Complete Guide',
    description: 'Comprehensive, definitive reference and tutorials for modern ECMAScript, closures, asynchronous patterns, and objects.',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
    type: 'documentation',
    skillName: 'JavaScript',
    source: 'MDN Web Docs',
    difficulty: 'all-levels',
    isVerified: true,
    verificationNote: 'Official Mozilla Developer Network verified standard documentation.',
    tags: ['javascript', 'ecmascript', 'frontend', 'fundamentals'],
  },
  {
    resourceId: 'res_javascript_info',
    title: 'The Modern JavaScript Tutorial',
    description: 'From the basics to advanced topics with simple but detailed explanations, interactive tasks, and closure mental models.',
    url: 'https://javascript.info/',
    type: 'tutorial',
    skillName: 'JavaScript',
    source: 'JavaScript.info',
    difficulty: 'beginner',
    isVerified: true,
    verificationNote: 'Community-reviewed and industry-standard modern JavaScript tutorial.',
    tags: ['javascript', 'tutorial', 'async', 'dom'],
  },
  {
    resourceId: 'res_fcc_js_algo',
    title: 'freeCodeCamp: JavaScript Algorithms and Data Structures',
    description: 'Hands-on interactive curriculum covering fundamental programming concepts, OOP, and functional programming in JavaScript.',
    url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/',
    type: 'interactive',
    skillName: 'JavaScript',
    source: 'freeCodeCamp',
    difficulty: 'beginner',
    isVerified: true,
    verificationNote: 'Recognized open-source non-profit curriculum with interactive code validation.',
    tags: ['javascript', 'algorithms', 'exercises', 'interactive'],
  },

  // React
  {
    resourceId: 'res_react_official_docs',
    title: 'React Official Documentation & Guides',
    description: 'The official React documentation covering components, props, state, hooks (useState, useEffect), and thinking in React.',
    url: 'https://react.dev/learn',
    type: 'documentation',
    skillName: 'React',
    source: 'React.dev',
    difficulty: 'all-levels',
    isVerified: true,
    verificationNote: 'Official React core team documentation and modern mental models.',
    tags: ['react', 'components', 'hooks', 'frontend'],
  },
  {
    resourceId: 'res_react_hooks_deep_dive',
    title: 'React.dev: Built-in React Hooks Reference',
    description: 'In-depth reference explaining every React Hook with live sandbox examples and common pitfall solutions.',
    url: 'https://react.dev/reference/react/hooks',
    type: 'reference',
    skillName: 'React',
    source: 'React.dev',
    difficulty: 'intermediate',
    isVerified: true,
    verificationNote: 'Official React API reference for built-in hooks and custom hook composition.',
    tags: ['react', 'hooks', 'state-management', 'reference'],
  },

  // Node.js
  {
    resourceId: 'res_nodejs_official_docs',
    title: 'Node.js Official Documentation & Guides',
    description: 'Official Node.js runtime documentation covering the event loop, streams, buffers, file system, and HTTP modules.',
    url: 'https://nodejs.org/en/learn',
    type: 'documentation',
    skillName: 'Node.js',
    source: 'Nodejs.org',
    difficulty: 'all-levels',
    isVerified: true,
    verificationNote: 'Official OpenJS Foundation Node.js documentation.',
    tags: ['nodejs', 'backend', 'runtime', 'javascript'],
  },
  {
    resourceId: 'res_express_official_guide',
    title: 'Express.js Getting Started & Routing Guide',
    description: 'Fast, unopinionated, minimalist web framework for Node.js. Learn middleware chains, route parameters, and error handlers.',
    url: 'https://expressjs.com/en/starter/installing.html',
    type: 'tutorial',
    skillName: 'Node.js',
    source: 'Expressjs.com',
    difficulty: 'beginner',
    isVerified: true,
    verificationNote: 'Official documentation for the Express.js framework.',
    tags: ['express', 'nodejs', 'api', 'backend'],
  },

  // TypeScript
  {
    resourceId: 'res_typescript_handbook',
    title: 'The TypeScript Handbook (Official)',
    description: 'A comprehensive guide to TypeScript for programmers who want to learn type annotations, generics, unions, and interfaces.',
    url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
    type: 'documentation',
    skillName: 'TypeScript',
    source: 'TypeScriptlang.org',
    difficulty: 'intermediate',
    isVerified: true,
    verificationNote: 'Official Microsoft TypeScript documentation and handbook.',
    tags: ['typescript', 'types', 'generics', 'javascript'],
  },

  // Python
  {
    resourceId: 'res_python_official_tutorial',
    title: 'The Python Official Tutorial',
    description: 'Official Python 3 tutorial introducing the basic concepts and features of the Python language and system.',
    url: 'https://docs.python.org/3/tutorial/index.html',
    type: 'documentation',
    skillName: 'Python',
    source: 'Python.org',
    difficulty: 'beginner',
    isVerified: true,
    verificationNote: 'Official Python Software Foundation tutorial.',
    tags: ['python', 'programming', 'basics', 'backend'],
  },

  // Docker & Containers
  {
    resourceId: 'res_docker_official_get_started',
    title: 'Docker Official Get Started Guide',
    description: 'Step-by-step tutorial on container fundamentals, Dockerfile creation, image building, container networking, and volumes.',
    url: 'https://docs.docker.com/get-started/',
    type: 'documentation',
    skillName: 'Docker',
    source: 'Docker.com',
    difficulty: 'beginner',
    isVerified: true,
    verificationNote: 'Official Docker documentation and interactive container guide.',
    tags: ['docker', 'containers', 'devops', 'deployment'],
  },

  // Kubernetes
  {
    resourceId: 'res_k8s_official_basics',
    title: 'Kubernetes Official Documentation: Learn Basics',
    description: 'Walkthrough of Kubernetes cluster architecture, pods, deployments, services, scaling, and rolling updates.',
    url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/',
    type: 'tutorial',
    skillName: 'Kubernetes',
    source: 'Kubernetes.io',
    difficulty: 'intermediate',
    isVerified: true,
    verificationNote: 'Official Cloud Native Computing Foundation (CNCF) Kubernetes tutorials.',
    tags: ['kubernetes', 'orchestration', 'cloud', 'devops'],
  },

  // SQL & Databases
  {
    resourceId: 'res_sqlbolt_interactive',
    title: 'SQLBolt: Learn SQL with Simple, Interactive Exercises',
    description: 'Interactive lessons with real database queries directly in the browser covering SELECT, JOINs, aggregations, and subqueries.',
    url: 'https://sqlbolt.com/',
    type: 'interactive',
    skillName: 'SQL',
    source: 'SQLBolt.com',
    difficulty: 'beginner',
    isVerified: true,
    verificationNote: 'Widely praised interactive SQL tutorial with instant query feedback.',
    tags: ['sql', 'database', 'queries', 'interactive'],
  },
  {
    resourceId: 'res_postgres_official_tutorial',
    title: 'PostgreSQL Official Documentation Tutorial',
    description: 'Introduction to relational databases, transactions, foreign keys, window functions, and indexing in PostgreSQL.',
    url: 'https://www.postgresql.org/docs/current/tutorial.html',
    type: 'documentation',
    skillName: 'SQL',
    source: 'Postgresql.org',
    difficulty: 'intermediate',
    isVerified: true,
    verificationNote: 'Official PostgreSQL Global Development Group documentation.',
    tags: ['sql', 'postgresql', 'relational', 'database'],
  },

  // MongoDB
  {
    resourceId: 'res_mongodb_manual',
    title: 'MongoDB Manual & CRUD Operations Reference',
    description: 'Official guide to document databases, schemas, indexing, aggregation pipelines, and replica sets in MongoDB.',
    url: 'https://www.mongodb.com/docs/manual/',
    type: 'documentation',
    skillName: 'MongoDB',
    source: 'MongoDB.com',
    difficulty: 'intermediate',
    isVerified: true,
    verificationNote: 'Official MongoDB Inc. documentation and developer manual.',
    tags: ['mongodb', 'nosql', 'database', 'backend'],
  },

  // Git & Version Control
  {
    resourceId: 'res_git_scm_book',
    title: 'Pro Git Book (Official Free Edition)',
    description: 'The entire Pro Git book by Scott Chacon and Ben Straub, covering branching, remotes, rebasing, and internal plumbing.',
    url: 'https://git-scm.com/book/en/v2',
    type: 'documentation',
    skillName: 'Git',
    source: 'Git-scm.com',
    difficulty: 'all-levels',
    isVerified: true,
    verificationNote: 'Official open-source Git book hosted by Git-SCM.',
    tags: ['git', 'version-control', 'collaboration'],
  },

  // HTML & CSS
  {
    resourceId: 'res_web_dev_learn_css',
    title: 'web.dev: Learn CSS by Google Chrome Developers',
    description: 'An evergreen CSS course and reference to level up your styling expertise covering flexbox, grid, responsive design, and CSS variables.',
    url: 'https://web.dev/learn/css',
    type: 'tutorial',
    skillName: 'CSS',
    source: 'Web.dev',
    difficulty: 'beginner',
    isVerified: true,
    verificationNote: 'Curated and published by Google Web Developers team.',
    tags: ['css', 'styling', 'frontend', 'responsive'],
  },

  // System Design & Architecture
  {
    resourceId: 'res_system_design_primer',
    title: 'The System Design Primer (GitHub Open Source)',
    description: 'Learn how to design large-scale systems, caching patterns, load balancers, database sharding, CAP theorem, and CDN architecture.',
    url: 'https://github.com/donnemartin/system-design-primer',
    type: 'reference',
    skillName: 'System Design',
    source: 'GitHub Docs',
    difficulty: 'advanced',
    isVerified: true,
    verificationNote: 'Over 270,000 stars on GitHub, gold standard educational system design open resource.',
    tags: ['system-design', 'architecture', 'distributed-systems', 'scalability'],
  },
];

// In-memory store for MOCK_DB === 'true' or testing
export const mockResourcesStore = CANONICAL_RESOURCES.map((r) => ({
  ...r,
  _id: `mock_${r.resourceId}`,
  bookmarkedBy: [],
  ratings: [],
  usefulCount: 0,
  notUsefulCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

export const _resetResourceStoreForTests = () => {
  mockResourcesStore.length = 0;
  CANONICAL_RESOURCES.forEach((r) => {
    mockResourcesStore.push({
      ...r,
      _id: `mock_${r.resourceId}`,
      bookmarkedBy: [],
      ratings: [],
      usefulCount: 0,
      notUsefulCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
};

/**
 * Seed canonical resources to MongoDB if not already present
 */
export const seedCanonicalResources = async () => {
  if (process.env.MOCK_DB === 'true') {
    return mockResourcesStore.length;
  }

  try {
    for (const resData of CANONICAL_RESOURCES) {
      await LearningResource.findOneAndUpdate(
        { resourceId: resData.resourceId },
        { $setOnInsert: resData },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.warn('[CuratedResourceService] Could not auto-seed database:', err.message);
  }
};

/**
 * Retrieve curated resources matching a skill name with optional filters and bookmark status
 */
export const getResourcesForSkill = async (skillName = '', options = {}, userId = null) => {
  const normalizedSkill = (skillName || '').trim().toLowerCase();
  const opts = typeof options === 'string' ? { type: options } : options || {};
  const typeFilter = opts.type ? opts.type.toLowerCase() : null;

  if (process.env.MOCK_DB === 'true') {
    let matched = mockResourcesStore.filter((r) => {
      const sLower = r.skillName.toLowerCase();
      const matchSkill =
        !normalizedSkill ||
        sLower === normalizedSkill ||
        sLower.includes(normalizedSkill) ||
        normalizedSkill.includes(sLower);
      const matchType = !typeFilter || r.type === typeFilter;
      return matchSkill && matchType;
    });

    // Only provide fallback if explicitly requested
    if (matched.length === 0 && opts.includeFallback) {
      matched = mockResourcesStore.filter((r) => r.isVerified && (!typeFilter || r.type === typeFilter)).slice(0, 4);
    }

    return matched.map((r) => {
      const isBookmarked = userId ? r.bookmarkedBy.some((uid) => uid.toString() === userId.toString()) : false;
      const userRating = userId ? r.ratings?.find((rt) => rt.user.toString() === userId.toString())?.isUseful ?? null : null;
      return {
        ...r,
        isBookmarked,
        userRating,
      };
    });
  }

  // Live MongoDB query
  const query = {};
  if (normalizedSkill) {
    query.$or = [
      { skillName: { $regex: normalizedSkill, $options: 'i' } },
      { tags: { $in: [new RegExp(normalizedSkill, 'i')] } },
      { title: { $regex: normalizedSkill, $options: 'i' } },
    ];
  }

  if (typeFilter) {
    query.type = typeFilter;
  }

  let resources = await LearningResource.find(query)
    .sort({ isVerified: -1, usefulCount: -1, createdAt: -1 })
    .limit(20);

  if (resources.length === 0 && opts.includeFallback) {
    resources = await LearningResource.find({ isVerified: true })
      .sort({ usefulCount: -1 })
      .limit(4);
  }

  return resources.map((doc) => {
    const obj = doc.toObject();
    const isBookmarked = userId
      ? (obj.bookmarkedBy || []).some((uid) => uid.toString() === userId.toString())
      : false;
    const userRating = userId
      ? (obj.ratings || []).find((rt) => rt.user.toString() === userId.toString())?.isUseful ?? null
      : null;
    return {
      ...obj,
      isBookmarked,
      userRating,
    };
  });
};

/**
 * Retrieve curated resources connected to a specific milestone within a roadmap
 */
export const getResourcesForMilestone = async (roadmap, milestoneId, userId = null) => {
  if (!roadmap) {
    throw new ApiError(400, 'Roadmap context is required');
  }

  const milestone = (roadmap.milestones || []).find((m) => m.milestoneId === milestoneId);
  const targetSkill = milestone?.skillName || (roadmap.skills && roadmap.skills[0]?.name) || '';

  return await getResourcesForSkill(targetSkill, {}, userId);
};

/**
 * Toggle bookmark on a resource for the authenticated user
 */
export const toggleBookmark = async (resourceId, userId) => {
  if (!resourceId || !userId) {
    throw new ApiError(400, 'Resource identifier and authenticated user required');
  }

  if (process.env.MOCK_DB === 'true') {
    const resource = mockResourcesStore.find(
      (r) => r.resourceId === resourceId || r._id === resourceId
    );
    if (!resource) {
      throw new ApiError(404, 'Learning resource not found');
    }

    const uStr = userId.toString();
    const bIndex = resource.bookmarkedBy.findIndex((id) => id.toString() === uStr);
    let isBookmarked = false;

    if (bIndex === -1) {
      resource.bookmarkedBy.push(uStr);
      isBookmarked = true;
    } else {
      resource.bookmarkedBy.splice(bIndex, 1);
      isBookmarked = false;
    }

    return {
      resourceId: resource.resourceId,
      isBookmarked,
      title: resource.title,
    };
  }

  const resource = await LearningResource.findOne({
    $or: [{ resourceId }, ...(mongoose.Types.ObjectId.isValid(resourceId) ? [{ _id: resourceId }] : [])],
  });

  if (!resource) {
    throw new ApiError(404, 'Learning resource not found');
  }

  const uId = new mongoose.Types.ObjectId(userId);
  const isAlreadyBookmarked = resource.bookmarkedBy.some((id) => id.equals(uId));

  if (isAlreadyBookmarked) {
    resource.bookmarkedBy.pull(uId);
  } else {
    resource.bookmarkedBy.addToSet(uId);
  }

  await resource.save();

  return {
    resourceId: resource.resourceId,
    isBookmarked: !isAlreadyBookmarked,
    title: resource.title,
  };
};

/**
 * Rate the usefulness of a resource
 */
export const rateResource = async (resourceId, userId, isUseful) => {
  if (!resourceId || !userId || typeof isUseful !== 'boolean') {
    throw new ApiError(400, 'Valid resource identifier, user ID, and boolean rating required');
  }

  if (process.env.MOCK_DB === 'true') {
    const resource = mockResourcesStore.find(
      (r) => r.resourceId === resourceId || r._id === resourceId
    );
    if (!resource) {
      throw new ApiError(404, 'Learning resource not found');
    }

    const uStr = userId.toString();
    resource.ratings = resource.ratings || [];
    const existing = resource.ratings.find((rt) => rt.user.toString() === uStr);

    if (existing) {
      existing.isUseful = isUseful;
    } else {
      resource.ratings.push({ user: uStr, isUseful, ratedAt: new Date().toISOString() });
    }

    resource.usefulCount = resource.ratings.filter((r) => r.isUseful).length;
    resource.notUsefulCount = resource.ratings.filter((r) => !r.isUseful).length;

    return {
      resourceId: resource.resourceId,
      usefulCount: resource.usefulCount,
      notUsefulCount: resource.notUsefulCount,
      userRating: isUseful,
    };
  }

  const resource = await LearningResource.findOne({
    $or: [{ resourceId }, ...(mongoose.Types.ObjectId.isValid(resourceId) ? [{ _id: resourceId }] : [])],
  });

  if (!resource) {
    throw new ApiError(404, 'Learning resource not found');
  }

  const uId = new mongoose.Types.ObjectId(userId);
  const ratingIndex = resource.ratings.findIndex((r) => r.user.equals(uId));

  if (ratingIndex !== -1) {
    resource.ratings[ratingIndex].isUseful = isUseful;
    resource.ratings[ratingIndex].ratedAt = new Date();
  } else {
    resource.ratings.push({ user: uId, isUseful, ratedAt: new Date() });
  }

  resource.usefulCount = resource.ratings.filter((r) => r.isUseful).length;
  resource.notUsefulCount = resource.ratings.filter((r) => !r.isUseful).length;

  await resource.save();

  return {
    resourceId: resource.resourceId,
    usefulCount: resource.usefulCount,
    notUsefulCount: resource.notUsefulCount,
    userRating: isUseful,
  };
};

/**
 * Get all resources bookmarked by authenticated user
 */
export const getUserBookmarkedResources = async (userId) => {
  if (!userId) {
    throw new ApiError(401, 'Authentication required to retrieve bookmarked resources');
  }

  if (process.env.MOCK_DB === 'true') {
    const uStr = userId.toString();
    return mockResourcesStore
      .filter((r) => r.bookmarkedBy.some((id) => id.toString() === uStr))
      .map((r) => ({ ...r, isBookmarked: true }));
  }

  const uId = new mongoose.Types.ObjectId(userId);
  const resources = await LearningResource.find({ bookmarkedBy: uId }).sort({ updatedAt: -1 });

  return resources.map((doc) => ({
    ...doc.toObject(),
    isBookmarked: true,
  }));
};

export default {
  isValidExternalUrl,
  isTrustedDomain,
  CANONICAL_RESOURCES,
  seedCanonicalResources,
  getResourcesForSkill,
  getResourcesForMilestone,
  toggleBookmark,
  rateResource,
  getUserBookmarkedResources,
};
