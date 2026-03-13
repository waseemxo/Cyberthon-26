import { create } from 'zustand';
import type { ForensicReport, SessionHistoryItem } from '../types';

interface AppState {
  currentReport: ForensicReport | null;
  history: SessionHistoryItem[];
  isAnalyzing: boolean;
  uploadProgress: number;
  error: string | null;

  setCurrentReport: (report: ForensicReport | null) => void;
  setHistory: (history: SessionHistoryItem[]) => void;
  addToHistory: (item: SessionHistoryItem) => void;
  setIsAnalyzing: (value: boolean) => void;
  setUploadProgress: (value: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentReport: null,
  history: [],
  isAnalyzing: false,
  uploadProgress: 0,
  error: null,

  setCurrentReport: (report) => set({ currentReport: report }),
  setHistory: (history) => set({ history }),
  addToHistory: (item) =>
    set((state) => ({ history: [item, ...state.history] })),
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  setUploadProgress: (value) => set({ uploadProgress: value }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      currentReport: null,
      isAnalyzing: false,
      uploadProgress: 0,
      error: null,
    }),
}));
