import { History } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import SessionHistory from '../components/SessionHistory';

export default function HistoryPage() {
  const { history } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <History className="w-5 h-5 text-primary-light" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Session History
          </h1>
          <p className="text-sm text-text-muted">
            {history.length} analysis{history.length !== 1 ? 'es' : ''} in this session
          </p>
        </div>
      </div>

      <SessionHistory items={history} />
    </div>
  );
}
