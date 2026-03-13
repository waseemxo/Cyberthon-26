import axios from 'axios';
import type { ForensicReport, SessionHistoryItem } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 120_000, // 2 minutes — analysis with Gemini can be slow
});

export async function analyzeFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<ForensicReport> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ForensicReport>('/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return response.data;
}

export async function analyzeText(
  text: string,
  onProgress?: (progress: number) => void
): Promise<ForensicReport> {
  const blob = new Blob([text], { type: 'text/plain' });
  const file = new File([blob], 'input.txt', { type: 'text/plain' });
  return analyzeFile(file, onProgress);
}

export async function getHistory(): Promise<SessionHistoryItem[]> {
  const response = await api.get<SessionHistoryItem[]>('/history');
  return response.data;
}

export async function getReport(id: string): Promise<ForensicReport> {
  const response = await api.get<ForensicReport>(`/report/${id}`);
  return response.data;
}

export function getReportPdfUrl(id: string): string {
  return `/api/report/${id}/pdf`;
}
