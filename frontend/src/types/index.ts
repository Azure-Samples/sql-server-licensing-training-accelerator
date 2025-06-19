export interface Topic {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  difficulty: string;
  estimated_time: number;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  customer_profile: string;
  requirements: string[];
  recommended_solution: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  topic_id: string;
  questions: QuizQuestion[];
}

export interface QuizSubmission {
  quiz_id: string;
  answers: number[];
}

export interface QuizResult {
  score: number;
  correct_answers: number;
  total_questions: number;
  detailed_feedback: string[];
}

export interface CostModelRequest {
  workload_type: 'OnPrem' | 'AzureVM' | 'AzureSQLMI';
  edition: 'Standard' | 'Enterprise';
  license_model: 'PerCore' | 'ServerCAL';
  core_count: number;
  user_count?: number;
  include_sa: boolean;
  term_years: number;
}

export interface CostModelResponse {
  total_cost: number;
  annual_breakdown: number[];
  cost_per_user?: number;
  notes: string;
}

export interface TopicsResponse {
  topics: Topic[];
  total: number;
  page: number;
  page_size: number;
}

export interface ScenariosResponse {
  scenarios: Scenario[];
}
