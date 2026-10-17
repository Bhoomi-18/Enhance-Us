/**
 * Goal Analysis Provider Interface & Service Strategy
 */

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
  { keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'neural'], name: 'Machine Learning & AI', category: 'Data Science & AI', level: 'ADVANCED', importance: 'HIGH' },
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
  { keywords: ['deploy', 'deployment', 'aws', 'docker', 'cloud', 'devops', 'ci/cd', 'vercel'], name: 'DevOps & Cloud Deployment', category: 'Infrastructure', level: 'INTERMEDIATE', importance: 'HIGH' },
];

/**
 * Base Abstract Provider
 */
class BaseGoalAnalysisProvider {
  async analyze(description) {
    throw new Error('Method analyze() must be implemented by provider');
  }
}

/**
 * Local Rule-Based Goal Analysis Provider (Free, Standalone Fallback)
 */
class LocalGoalAnalysisProvider extends BaseGoalAnalysisProvider {
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

    return extractedSkills;
  }
}

/**
 * Goal Analysis Service Manager (Strategy Switcher)
 */
class GoalAnalysisService {
  constructor() {
    // Default to zero-cost Local Provider; can be swapped dynamically to LLM/Gemini provider
    this.provider = new LocalGoalAnalysisProvider();
  }

  setProvider(providerInstance) {
    this.provider = providerInstance;
  }

  async analyzeGoal(description) {
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new Error('Goal description is required for analysis');
    }
    return await this.provider.analyze(description);
  }
}

export const goalAnalysisService = new GoalAnalysisService();
export default goalAnalysisService;
