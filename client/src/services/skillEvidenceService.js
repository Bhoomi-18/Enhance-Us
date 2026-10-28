import api from './apiClient';

export const submitSkillEvidence = async (skillName, evidenceData) => {
  const response = await api.put(`/skills/evidence/${encodeURIComponent(skillName)}`, evidenceData);
  return response.data;
};

export const deleteSkillEvidence = async (skillName) => {
  const response = await api.delete(`/skills/evidence/${encodeURIComponent(skillName)}`);
  return response.data;
};

export const getAdminEvidenceQueue = async (filters = {}) => {
  const response = await api.get('/admin/evidence', { params: filters });
  return response.data;
};

export const moderateSkillEvidence = async (userId, skillName, decisionData) => {
  const response = await api.patch(
    `/admin/evidence/${userId}/${encodeURIComponent(skillName)}`,
    decisionData
  );
  return response.data;
};

export default {
  submitSkillEvidence,
  deleteSkillEvidence,
  getAdminEvidenceQueue,
  moderateSkillEvidence,
};
