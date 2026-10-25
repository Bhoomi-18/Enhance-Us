/**
 * Skill Normalization and Alias Canonicalization Engine
 * Normalizes user-entered skill variations into standard canonical forms
 * and computes semantic/alias-aware compatibility.
 */

const ALIAS_MAP = {
  // Frontend
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',
  'react native': 'React Native',
  'reactnative': 'React Native',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'angular': 'Angular',
  'angular.js': 'Angular',
  'angularjs': 'Angular',
  'next': 'Next.js',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'html': 'HTML5',
  'html5': 'HTML5',
  'css': 'CSS3',
  'css3': 'CSS3',

  // Languages
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ecmascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'py': 'Python',
  'python': 'Python',
  'python3': 'Python',
  'go': 'Go',
  'golang': 'Go',
  'rust': 'Rust',
  'java': 'Java',
  'cpp': 'C++',
  'c++': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  'php': 'PHP',
  'ruby': 'Ruby',
  'rails': 'Ruby on Rails',
  'ruby on rails': 'Ruby on Rails',

  // Backend & Databases
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'expressjs': 'Express.js',
  'fastapi': 'FastAPI',
  'django': 'Django',
  'flask': 'Flask',
  'spring': 'Spring Boot',
  'springboot': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'sql': 'SQL',
  'mysql': 'MySQL',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'graphql': 'GraphQL',

  // Design
  'ui/ux': 'UI/UX Design',
  'ui/ux design': 'UI/UX Design',
  'ui design': 'UI/UX Design',
  'ux design': 'UI/UX Design',
  'user interface': 'UI/UX Design',
  'user experience': 'UI/UX Design',
  'product design': 'UI/UX Design',
  'figma': 'Figma & UI/UX',
  'prototyping': 'UI/UX Design',

  // Data Science, AI & ML
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'ai': 'Artificial Intelligence',
  'artificial intelligence': 'Artificial Intelligence',
  'deep learning': 'Deep Learning',
  'data science': 'Data Science',
  'datascience': 'Data Science',
  'pytorch': 'PyTorch',
  'torch': 'PyTorch',
  'tensorflow': 'TensorFlow',
  'tf': 'TensorFlow',
  'nlp': 'Natural Language Processing',

  // DevOps & Cloud
  'docker': 'Docker',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS Cloud',
  'amazon web services': 'AWS Cloud',
  'gcp': 'Google Cloud',
  'google cloud': 'Google Cloud',
  'azure': 'Microsoft Azure',
  'ci/cd': 'DevOps & CI/CD',
  'cicd': 'DevOps & CI/CD',
  'git': 'Git & GitHub',
  'github': 'Git & GitHub',

  // Soft Skills & Others
  'public speaking': 'Public Speaking',
  'presentation': 'Public Speaking',
  'communication': 'Communication & Soft Skills',
  'leadership': 'Leadership & Management',
  'management': 'Leadership & Management',
  'photography': 'Digital Photography',
  'digital photography': 'Digital Photography',
  'photo editing': 'Digital Photography & Editing',
};

export const LEVEL_NUMERIC = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

/**
 * Normalizes a raw skill name into its canonical form.
 * Trims whitespace, lowercases for lookup, and matches alias dictionary.
 */
export const normalizeSkillName = (rawName) => {
  if (!rawName || typeof rawName !== 'string') return '';
  const cleaned = rawName.trim();
  const lower = cleaned.toLowerCase();

  if (ALIAS_MAP[lower]) {
    return ALIAS_MAP[lower];
  }

  // Check punctuation-stripped match (e.g. "node-js" or "react_js")
  const stripped = lower.replace(/[-_.]/g, '');
  if (ALIAS_MAP[stripped]) {
    return ALIAS_MAP[stripped];
  }

  // Fallback: title-case first letter of each word
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Evaluates whether two skill names represent the same underlying domain.
 */
export const areSkillsCompatible = (skillA, skillB) => {
  if (!skillA || !skillB) return false;

  const normA = normalizeSkillName(skillA);
  const normB = normalizeSkillName(skillB);

  if (normA.toLowerCase() === normB.toLowerCase()) return true;

  // Substring containment on normalized names
  const lowA = normA.toLowerCase();
  const lowB = normB.toLowerCase();

  if (lowA.length >= 3 && lowB.length >= 3) {
    if (lowA.includes(lowB) || lowB.includes(lowA)) return true;
  }

  // Token intersection
  const tokensA = new Set(lowA.split(/[\s/&-]+/).filter((t) => t.length > 2));
  const tokensB = new Set(lowB.split(/[\s/&-]+/).filter((t) => t.length > 2));

  for (const t of tokensA) {
    if (tokensB.has(t)) return true;
  }

  return false;
};

/**
 * Calculates level compatibility between teacher level and learner level.
 * High score if teacher >= learner.
 */
export const calculateProficiencyCompatibility = (teacherLevel, learnerLevel) => {
  const tNum = LEVEL_NUMERIC[teacherLevel] || 2;
  const lNum = LEVEL_NUMERIC[learnerLevel] || 1;

  if (tNum > lNum) return 100; // Perfect teacher advantage
  if (tNum === lNum) return 85;  // Peer level collaboration
  if (tNum === lNum - 1) return 50; // Minor gap
  return 25; // Significant deficiency
};

export const INVALID_SKILL_PLACEHOLDERS = new Set([
  'skills',
  'skill',
  'general',
  'none',
  'n/a',
  'na',
  'placeholder',
  'undefined',
  'null',
  'unknown',
  'test',
  'teaching',
  'learning',
  'all',
]);

/**
 * Validates whether a skill record represents a genuine, non-placeholder teachable skill.
 */
export const isValidTeachableSkill = (skill) => {
  if (!skill) return false;
  const rawName = typeof skill === 'string' ? skill : skill.name;
  if (!rawName || typeof rawName !== 'string') return false;
  const cleaned = rawName.trim();
  if (cleaned.length < 2) return false;
  if (INVALID_SKILL_PLACEHOLDERS.has(cleaned.toLowerCase())) return false;

  // If skill is an object with a type, ensure it allows teaching
  if (typeof skill === 'object' && skill.type) {
    const typeUpper = String(skill.type).toUpperCase();
    if (typeUpper !== 'TEACH' && typeUpper !== 'BOTH') {
      return false;
    }
  }

  return true;
};

export default {
  normalizeSkillName,
  areSkillsCompatible,
  calculateProficiencyCompatibility,
  isValidTeachableSkill,
  INVALID_SKILL_PLACEHOLDERS,
  LEVEL_NUMERIC,
};
