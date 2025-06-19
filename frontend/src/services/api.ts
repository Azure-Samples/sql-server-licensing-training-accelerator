import axios from 'axios';
import type {
  Topic,
  Scenario,
  Quiz,
  QuizSubmission,
  QuizResult,
  CostModelRequest,
  CostModelResponse,
  TopicsResponse,
  ScenariosResponse,
} from '../types';

const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  healthCheck: () => api.get('/healthz'),

  getTopics: (search?: string, page = 1, pageSize = 20): Promise<TopicsResponse> =>
    api.get('/api/v1/content/topics', {
      params: { search, page, page_size: pageSize },
    }).then(res => res.data),

  getTopic: (id: string): Promise<Topic> =>
    api.get(`/api/v1/content/topics/${id}`).then(res => res.data),

  getScenarios: (): Promise<ScenariosResponse> =>
    api.get('/api/v1/scenarios').then(res => res.data),

  getScenario: (id: string): Promise<Scenario> =>
    api.get(`/api/v1/scenarios/${id}`).then(res => res.data),

  getQuiz: (id: string): Promise<Quiz> =>
    api.get(`/api/v1/quiz/${id}`).then(res => res.data),

  submitQuiz: (submission: QuizSubmission): Promise<QuizResult> =>
    api.post('/api/v1/quiz/submit', submission).then(res => res.data),

  calculateCost: (request: CostModelRequest): Promise<CostModelResponse> =>
    api.post('/api/v1/cost-model', request).then(res => res.data),

  logTelemetry: (eventData: Record<string, any>) =>
    api.post('/api/v1/telemetry', eventData),
};
