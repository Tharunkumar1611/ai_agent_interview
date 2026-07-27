import api from './client';

export async function startAptitudeAssessment() {
  const response = await api.post('/aptitude/start-test');
  return response.data;
}

export async function submitAptitudeAssessment(assessmentId, attempts) {
  const response = await api.post('/aptitude/submit-test', {
    assessment_id: assessmentId,
    attempts,
  });
  return response.data;
}

export async function loadAptitudeReport(assessmentId) {
  const response = await api.get(`/aptitude/result/${assessmentId}`);
  return response.data;
}

export async function loadAptitudeRoadmap(assessmentId) {
  const response = await api.get(`/aptitude/roadmap/${assessmentId}`);
  return response.data;
}

export async function loadAptitudeDashboard(userId) {
  const response = await api.get(`/aptitude/dashboard/${userId}`);
  return response.data;
}

export async function loadLatestAptitudeInsight() {
  const response = await api.get('/aptitude/insights/latest');
  return response.data;
}
