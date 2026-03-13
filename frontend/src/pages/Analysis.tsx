import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getReport } from '../services/api';
import AnalysisResult from '../components/AnalysisResult';
import type { ForensicReport } from '../types';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { currentReport } = useAppStore();
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use the current report from store if it matches the ID
    if (currentReport && currentReport.id === id) {
      setReport(currentReport);
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    if (id) {
      setLoading(true);
      getReport(id)
        .then((data) => {
          setReport(data);
        })
        .catch(() => {
          setError('Failed to load analysis report.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, currentReport]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary-light animate-spin mb-4" />
        <p className="text-text-secondary">Loading report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-24">
        <p className="text-danger mb-4">{error || 'Report not found'}</p>
        <Link
          to="/"
          className="text-primary-light hover:underline text-sm"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors no-underline"
      >
        <ArrowLeft className="w-4 h-4" />
        New Analysis
      </Link>

      <AnalysisResult report={report} />
    </div>
  );
}
