const LEVEL_SCORE = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export const calculateSkillGaps = (userSkills = [], requiredSkills = []) => {
  const knownSkills = [];
  const missingSkills = [];
  const partiallyKnownSkills = [];

  // Normalize user skills map
  const userSkillMap = new Map();
  userSkills.forEach((skill) => {
    if (skill && skill.name) {
      const normalizedName = skill.name.toLowerCase().trim();
      const level = (skill.level || 'INTERMEDIATE').toUpperCase();
      userSkillMap.set(normalizedName, {
        name: skill.name,
        category: skill.category || 'General',
        level,
        numericLevel: LEVEL_SCORE[level] || 2,
      });
    }
  });

  requiredSkills.forEach((reqSkill) => {
    const reqName = reqSkill.name.toLowerCase().trim();
    const reqLevel = (reqSkill.level || 'INTERMEDIATE').toUpperCase();
    const reqLevelNum = LEVEL_SCORE[reqLevel] || 2;

    let matchedUserSkill = userSkillMap.get(reqName);
    if (!matchedUserSkill) {
      for (const [uName, uSkill] of userSkillMap.entries()) {
        if (reqName.includes(uName) || uName.includes(reqName)) {
          matchedUserSkill = uSkill;
          break;
        }
      }
    }

    if (matchedUserSkill) {
      if (matchedUserSkill.numericLevel >= reqLevelNum) {
        knownSkills.push({
          name: reqSkill.name,
          category: reqSkill.category || matchedUserSkill.category,
          level: reqLevel,
          matchedUserSkillLevel: matchedUserSkill.level,
        });
      } else {
        partiallyKnownSkills.push({
          name: reqSkill.name,
          category: reqSkill.category || matchedUserSkill.category,
          currentLevel: matchedUserSkill.level,
          requiredLevel: reqLevel,
        });
      }
    } else {
      missingSkills.push({
        name: reqSkill.name,
        category: reqSkill.category || 'General',
        recommendedLevel: reqLevel,
        importance: reqSkill.importance || 'HIGH',
      });
    }
  });

  const totalRequired = requiredSkills.length || 1;
  const knownCount = knownSkills.length;
  const partialCount = partiallyKnownSkills.length;

  const rawScore = (knownCount + partialCount * 0.5) / totalRequired;
  const progress = Math.min(100, Math.max(0, Math.round(rawScore * 100)));
  const gapPercentage = Math.max(0, 100 - progress);

  return {
    knownSkills,
    missingSkills,
    partiallyKnownSkills,
    progress,
    gapPercentage,
  };
};

export default calculateSkillGaps;
