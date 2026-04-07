import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ SAFE interceptor (won’t break Vercel build)
api.interceptors.request.use(
  async (config) => {
    try {
      // Only run in browser
      if (typeof window !== 'undefined') {
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (session?.user?.backendToken) {
          config.headers.Authorization = `Bearer ${session.user.backendToken}`;
        }
      }
    } catch (error) {
      // Ignore errors (no session, etc.)
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Export function to manually set token
export function setAuthToken(token: string) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

// ---------------- TYPES ----------------

export interface Campaign {
  id: string;
  campaign_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  duration?: number;
  source_text: string;
  fact_sheet?: FactSheet;
  content?: ContentOutput;
  review?: Review;
  feedback_history?: FeedbackMessage[];
}

export interface FactSheet {
  product_name: string;
  core_features: string[];
  key_features?: string[];
  target_audience: string;
  value_proposition: string;
  tone: string;
}

export interface ContentOutput {
  blog_post: string;
  social_thread: string[];
  email_teaser: string;
}

export interface Review {
  status: 'approved' | 'needs_revision';
  feedback: string;
  corrections?: string[];
}

export interface FeedbackMessage {
  agent: 'researcher' | 'copywriter' | 'editor' | 'system';
  timestamp: string;
  message: string;
  details?: string;
}

export interface Analytics {
  total_campaigns: number;
  completed: number;
  completed_campaigns?: number;
  failed: number;
  success_rate: number;
  avg_completion_time: number;
  avg_completion_time_seconds?: number;
  regenerations: {
    blog: number;
    social: number;
    email: number;
    total: number;
  };
  avg_revisions: number;
}

export interface HealthCheck {
  status: string;
  message: string;
}

export interface CreateCampaignResponse {
  campaign_id: string;
  message: string;
  stream_url: string;
}

// ---------------- API FUNCTIONS ----------------

export async function checkHealth(): Promise<HealthCheck> {
  const response = await api.get<HealthCheck>('/api/health');
  return response.data;
}

export async function createCampaignAsync(text: string): Promise<CreateCampaignResponse> {
  const response = await api.post<CreateCampaignResponse>('/api/run-pipeline-async', { text });
  return response.data;
}

export async function uploadFileAndCreateCampaign(file: File): Promise<CreateCampaignResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<CreateCampaignResponse>(
    '/api/run-pipeline-async-file',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );

  return response.data;
}

export async function createCampaignFromUrl(url: string): Promise<CreateCampaignResponse> {
  const response = await api.post<CreateCampaignResponse>(
    '/api/run-pipeline-async-url',
    { url }
  );
  return response.data;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const response = await api.get<Campaign[]>('/api/campaigns');
  return response.data;
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  const response = await api.get<Campaign>(`/api/campaigns/${campaignId}`);
  return response.data;
}

export async function getFeedbackHistory(
  campaignId: string
): Promise<{ feedback_history: FeedbackMessage[] }> {
  const response = await api.get<{ feedback_history: FeedbackMessage[] }>(
    `/api/campaigns/${campaignId}/feedback-history`
  );
  return response.data;
}

export async function regenerateBlog(
  campaignId: string
): Promise<{ campaign_id: string; blog_post: string }> {
  const response = await api.post(
    `/api/campaigns/${campaignId}/regenerate-blog`
  );
  return response.data;
}

export async function regenerateSocial(
  campaignId: string
): Promise<{ campaign_id: string; social_thread: string[] }> {
  const response = await api.post(
    `/api/campaigns/${campaignId}/regenerate-social`
  );
  return response.data;
}

export async function regenerateEmail(
  campaignId: string
): Promise<{ campaign_id: string; email_teaser: string }> {
  const response = await api.post(
    `/api/campaigns/${campaignId}/regenerate-email`
  );
  return response.data;
}

export async function exportClipboard(
  campaignId: string
): Promise<{ formatted_html: string }> {
  const response = await api.get(
    `/api/campaigns/${campaignId}/export-clipboard`
  );
  return response.data;
}

export async function exportZip(campaignId: string): Promise<Blob> {
  const response = await api.get(
    `/api/campaigns/${campaignId}/export-zip`,
    {
      responseType: 'blob',
    }
  );
  return response.data;
}

export async function getAnalytics(): Promise<Analytics> {
  const response = await api.get<Analytics>('/api/analytics');
  return response.data;
}

// SSE Stream helper
export function createCampaignStream(campaignId: string): EventSource {
  return new EventSource(`${API_BASE_URL}/api/pipeline/stream/${campaignId}`);
}