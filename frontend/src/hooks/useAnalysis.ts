import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { analyzeFile, analyzeText } from '../services/api';
import type { ForensicReport, SessionHistoryItem } from '../types';

export function useAnalysis() {
  const navigate = useNavigate();
  const {
    isAnalyzing,
    uploadProgress,
    error,
    setCurrentReport,
    addToHistory,
    setIsAnalyzing,
    setUploadProgress,
    setError,
    reset,
  } = useAppStore();

  const handleReport = useCallback(
    (report: ForensicReport) => {
      setCurrentReport(report);

      const historyItem: SessionHistoryItem = {
        id: report.id,
        file_name: report.file_name,
        file_type: report.file_type,
        confidence_score: report.confidence_score,
        overall_verdict: report.overall_verdict,
        risk_level: report.risk_level,
        analyzed_at: report.analyzed_at,
      };
      addToHistory(historyItem);
      navigate(`/analysis/${report.id}`);
    },
    [setCurrentReport, addToHistory, navigate]
  );

  const analyze = useCallback(
    async (file: File) => {
      reset();
      setIsAnalyzing(true);

      try {
        const report = await analyzeFile(file, (progress) => {
          setUploadProgress(progress);
        });
        handleReport(report);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Analysis failed. Please try again.';
        setError(message);
      } finally {
        setIsAnalyzing(false);
        setUploadProgress(0);
      }
    },
    [reset, setIsAnalyzing, setUploadProgress, handleReport, setError]
  );

  const analyzeTextInput = useCallback(
    async (text: string) => {
      reset();
      setIsAnalyzing(true);

      try {
        const report = await analyzeText(text, (progress) => {
          setUploadProgress(progress);
        });
        handleReport(report);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Analysis failed. Please try again.';
        setError(message);
      } finally {
        setIsAnalyzing(false);
        setUploadProgress(0);
      }
    },
    [reset, setIsAnalyzing, setUploadProgress, handleReport, setError]
  );

  return { analyze, analyzeTextInput, isAnalyzing, uploadProgress, error };
}
