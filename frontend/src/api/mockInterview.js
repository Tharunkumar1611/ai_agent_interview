import api from './client';

export const startMockInterview = async (selectedRole) => api.post('/mock-interview/start', { selected_role: selectedRole });

export const submitMockInterviewAnswer = async (payload) => api.post('/mock-interview/answer', payload);

export const moveMockInterviewToNext = async (interviewId) => api.post('/mock-interview/next', { interview_id: interviewId });

export const completeMockInterview = async (interviewId) => api.post('/mock-interview/complete', { interview_id: interviewId });

export const loadMockInterviewReport = async (interviewId) => api.get(`/mock-interview/report/${interviewId}`);

export const loadMockInterviewHistory = async () => api.get('/mock-interview/history');
