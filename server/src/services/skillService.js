import Skill from '../models/skillModel.js';

const INITIAL_SEED_SKILLS = [
  { name: 'React', category: 'Frontend', description: 'Popular JavaScript library for building user interfaces.' },
  { name: 'Node.js', category: 'Backend', description: 'JavaScript runtime built on Chrome V8 engine.' },
  { name: 'MongoDB', category: 'Database', description: 'Document-oriented NoSQL database system.' },
  { name: 'TypeScript', category: 'Languages', description: 'Strongly typed programming language built on JavaScript.' },
  { name: 'Python', category: 'Backend & Data', description: 'Versatile language for web development, AI, and scripting.' },
  { name: 'UI/UX Design', category: 'Design', description: 'User interface and experience design principles & prototyping.' },
  { name: 'Public Speaking', category: 'Soft Skills', description: 'Effective oral communication and presentation delivery.' },
  { name: 'DevOps & Deployment', category: 'Infrastructure', description: 'CI/CD, cloud deployment, and containerization.' },
  { name: 'Machine Learning', category: 'Data Science & AI', description: 'Building predictive models and neural networks.' },
  { name: 'Digital Photography', category: 'Creative & Media', description: 'Camera operation, composition, and digital editing.' },
];

export const getAllSkills = async (search = '', category = '') => {
  if (process.env.MOCK_DB === 'true') {
    return INITIAL_SEED_SKILLS.filter(s => 
      (!search || s.name.toLowerCase().includes(search.toLowerCase())) &&
      (!category || s.category === category)
    );
  }

  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) {
    query.category = category;
  }

  let skills = await Skill.find(query).sort({ name: 1 });

  // Auto-seed initial skills if empty
  if (skills.length === 0 && !search && !category) {
    try {
      skills = await Skill.insertMany(INITIAL_SEED_SKILLS);
    } catch (e) {
      console.warn('[Skill Seed Warning]', e.message);
    }
  }

  return skills;
};

export const createSkill = async (skillData) => {
  const { name, category, description } = skillData;
  const existing = await Skill.findOne({ name: name.trim() });
  if (existing) {
    return existing;
  }
  return await Skill.create({ name, category: category || 'General', description: description || '' });
};
