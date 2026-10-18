/**
 * Goal Analysis Provider Interface & Service Strategy
 * Integrates Google Gemini AI with deterministic local rule-based fallback
 */

import GeminiGoalAnalysisProvider from './geminiGoalAnalysisProvider.js';

// Skill Taxonomy Dictionary for Local Rule-Based Extraction
const SKILL_TAXONOMY = [
  // Web & Full Stack Development
  { keywords: ['react', 'frontend', 'ui', 'component', 'next.js', 'nextjs', 'web app'], name: 'React', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH' },
  { keywords: ['node', 'backend', 'express', 'api', 'server', 'microservice'], name: 'Node.js', category: 'Backend', level: 'INTERMEDIATE', importance: 'HIGH' },
  { keywords: ['mongo', 'mongodb', 'database', 'nosql', 'mongoose'], name: 'MongoDB', category: 'Database', level: 'INTERMEDIATE', importance: 'MEDIUM' },
  { keywords: ['postgres', 'postgresql', 'sql', 'database', 'relational'], name: 'PostgreSQL', category: 'Database', level: 'INTERMEDIATE', importance: 'HIGH' },
  { keywords: ['javascript', 'js', 'es6', 'typescript', 'ts'], name: 'JavaScript / TypeScript', category: 'Programming Languages', level: 'ADVANCED', importance: 'HIGH' },
  { keywords: ['tailwind', 'css', 'style', 'styling', 'responsive'], name: 'Tailwind CSS', category: 'Frontend', level: 'INTERMEDIATE', importance: 'MEDIUM' },
  { keywords: ['python', 'django', 'flask', 'fastapi'], name: 'Python', category: 'Backend', level: 'INTERMEDIATE', importance: 'HIGH' },
  
  // Mobile Development
  { keywords: ['mobile', 'app', 'ios', 'android', 'react native', 'flutter'], name: 'React Native / Mobile Dev', category: 'Mobile Development', level: 'ADVANCED', importance: 'HIGH' },
  { keywords: ['swift', 'ios app', 'xcode'], name: 'Swift (iOS)', category: 'Mobile Development', level: 'INTERMEDIATE', importance: 'HIGH' },
  { keywords: ['kotlin', 'android app'], name: 'Kotlin (Android)', category: 'Mobile Development', level: 'INTERMEDIATE', importance: 'HIGH' },
  
  // AI, ML & Data Science
  { keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'neural', 'gemini'], name: 'Machine Learning & AI', category: 'Data Science & AI', level: 'ADVANCED', importance: 'HIGH' },
  { keywords: ['pytorch', 'tensorflow', 'model training'], name: 'PyTorch / Deep Learning', category: 'Data Science & AI', level: 'ADVANCED', importance: 'HIGH' },
  { keywords: ['data analysis', 'pandas', 'analytics'], name: 'Data Analytics', category: 'Data Science & AI', level: 'INTERMEDIATE', importance: 'MEDIUM' },

  // Design & Product
  { keywords: ['design', 'ui', 'ux', 'user experience', 'figma', 'prototype', 'interface'], name: 'UI/UX Design', category: 'Design', level: 'INTERMEDIATE', importance: 'HIGH' },
  { keywords: ['photography', 'photo', 'portfolio', 'camera', 'editing', 'lightroom'], name: 'Digital Photography & Editing', category: 'Creative & Media', level: 'INTERMEDIATE', importance: 'HIGH' },
  { keywords: ['video', 'editing', 'premiere', 'youtube'], name: 'Video Production', category: 'Creative & Media', level: 'INTERMEDIATE', importance: 'MEDIUM' },

  // Soft Skills & Leadership
  { keywords: ['speaking', 'public speaking', 'presentation', 'communication', 'pitch', 'oratory'], name: 'Public Speaking & Presentation', category: 'Soft Skills', level: 'ADVANCED', importance: 'HIGH' },
  { keywords: ['leadership', 'management', 'team', 'agile', 'scrum'], name: 'Agile Leadership', category: 'Management', level: 'INTERMEDIATE', importance: 'MEDIUM' },
  { keywords: ['seo', 'marketing', 'growth', 'traffic', 'copywriting'], name: 'Digital Marketing & SEO', category: 'Marketing', level: 'INTERMEDIATE', importance: 'MEDIUM' },

  // DevOps & Cloud
  { keywords: ['deploy', 'deployment', 'aws', 'docker', 'cloud', 'devops', 'ci/cd', 'vercel', 'render'], name: 'DevOps & Cloud Deployment', category: 'Infrastructure', level: 'INTERMEDIATE', importance: 'HIGH' },
];

/**
 * Base Abstract Provider
 */
export class BaseGoalAnalysisProvider {
  async analyze(description) {
    throw new Error('Method analyze() must be implemented by provider');
  }
}

/**
 * Local Rule-Based Goal Analysis Provider (Free, Standalone Fallback)
 */
export class LocalGoalAnalysisProvider extends BaseGoalAnalysisProvider {
  async analyze(description) {
    const text = description.toLowerCase();
    const extractedSkills = [];
    const matchedNames = new Set();

    // Scan taxonomy keywords against description text
    SKILL_TAXONOMY.forEach((item) => {
      const isMatch = item.keywords.some((keyword) => text.includes(keyword));
      if (isMatch && !matchedNames.has(item.name)) {
        matchedNames.add(item.name);
        extractedSkills.push({
          name: item.name,
          category: item.category,
          level: item.level,
          importance: item.importance,
        });
      }
    });

    // Fallback if no taxonomy keywords directly matched
    if (extractedSkills.length === 0) {
      extractedSkills.push(
        { name: 'Core Domain Knowledge', category: 'General', level: 'INTERMEDIATE', importance: 'HIGH' },
        { name: 'Project Planning & Execution', category: 'Management', level: 'INTERMEDIATE', importance: 'HIGH' },
        { name: 'UI/UX Fundamentals', category: 'Design', level: 'BEGINNER', importance: 'MEDIUM' }
      );
    }

    const aiAnalysis = {
      goalInterpretation: `Goal Blueprint: ${description.slice(0, 140)}${description.length > 140 ? '...' : ''}`,
      skills: extractedSkills.map((s, idx) => ({
        name: s.name,
        category: s.category,
        level: s.level,
        importance: s.importance,
        explanation: `Target competency identified by rule-based taxonomy analysis for achieving this objective.`,
        learningOrder: idx + 1,
        prerequisites: idx > 0 ? [extractedSkills[0].name] : [],
      })),
      milestones: [
        {
          title: 'Foundational Setup & Research',
          description: 'Establish core workspace, toolchains, and basic principles.',
          targetTimeline: 'Weeks 1-2',
        },
        {
          title: 'Core Implementation & Skill Building',
          description: 'Build central components and apply key domain competencies.',
          targetTimeline: 'Weeks 3-5',
        },
        {
          title: 'Refinement & Peer Exchange Review',
          description: 'Validate deliverables and engage in peer-to-peer knowledge exchange.',
          targetTimeline: 'Weeks 6+',
        },
      ],
      estimatedEffort: {
        estimatedHours: '30-50 hours',
        timelineRecommendation: '4-6 weeks at 6-8 hrs/week',
        uncertaintyDisclaimer:
          'Estimates are advisory based on standard skill acquisition curves; actual progress depends on practice and prior foundation.',
      },
      assumptions: [
        'Dedicated self-paced study and collaborative exchange with peer mentors.',
      ],
      generatedBy: 'rule-based',
      generatedAt: new Date(),
    };

    return {
      requiredSkills: extractedSkills,
      aiAnalysis,
    };
  }
}

/**
 * Goal Analysis Service Manager (Strategy Switcher)
 */
class GoalAnalysisService {
  constructor() {
    this.geminiProvider = new GeminiGoalAnalysisProvider();
    this.localProvider = new LocalGoalAnalysisProvider();
    this.customProvider = null;
  }

  setProvider(providerInstance) {
    this.customProvider = providerInstance;
  }

  getProvider(forceLocal = false) {
    if (this.customProvider) {
      return this.customProvider;
    }
    if (!forceLocal && this.geminiProvider.isConfigured()) {
      return this.geminiProvider;
    }
    return this.localProvider;
  }

  async analyzeGoal(description, options = {}) {
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new Error('Goal description is required for analysis');
    }

    const provider = this.getProvider(options.forceLocal);
    const result = await provider.analyze(description);

    // Ensure backwards compatibility if any legacy provider returns an array
    if (Array.isArray(result)) {
      return {
        requiredSkills: result,
        aiAnalysis: {
          goalInterpretation: `Goal Analysis: ${description.slice(0, 100)}`,
          skills: result.map((r, i) => ({
            name: r.name,
            category: r.category || 'General',
            level: r.level || 'INTERMEDIATE',
            importance: r.importance || 'HIGH',
            explanation: 'Required competency for goal completion',
            learningOrder: i + 1,
            prerequisites: [],
          })),
          milestones: [],
          estimatedEffort: {
            estimatedHours: '30-50 hours',
            timelineRecommendation: '4-6 weeks',
            uncertaintyDisclaimer: 'Estimates are advisory.',
          },
          assumptions: [],
          generatedBy: 'rule-based',
          generatedAt: new Date(),
        },
      };
    }

    return result;
  }
}

export const goalAnalysisService = new GoalAnalysisService();
export default goalAnalysisService;
