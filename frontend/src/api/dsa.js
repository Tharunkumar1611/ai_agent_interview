import api from './client';

export async function startDsaAssessment() {
  const response = await api.post('/dsa/assessments/start');
  return response.data;
}

export async function runDsaCode(payload) {
  const response = await api.post('/dsa/execute', payload);
  return response.data;
}

export async function submitDsaAssessment(assessmentId, attempts) {
  const response = await api.post(`/dsa/assessments/${assessmentId}/submit`, {
    assessment_id: assessmentId,
    attempts,
  });
  return response.data;
}

export async function recordDsaViolation(assessmentId, payload) {
  const response = await api.post(`/dsa/assessments/${assessmentId}/violations`, {
    assessment_id: assessmentId,
    ...payload,
  });
  return response.data;
}

export async function loadDsaReport(assessmentId) {
  const response = await api.get(`/dsa/assessments/${assessmentId}/report`);
  return response.data;
}

export async function loadLatestDsaInsight() {
  const response = await api.get('/dsa/insights/latest');
  return response.data;
}
