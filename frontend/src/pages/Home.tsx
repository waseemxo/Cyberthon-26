import { Shield, Scan, FileSearch, FileDigit } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { useAnalysis } from '../hooks/useAnalysis';

const features = [
  {
    icon: Scan,
    title: 'Multi-Modal Detection',
    description: 'Analyze text, images, audio, and video for AI generation traces.',
  },
  {
    icon: FileSearch,
    title: 'Forensic Depth',
    description:
      'Goes beyond surface-level detection with metadata, frequency, and stylometric analysis.',
  },
  {
    icon: FileDigit,
    title: 'Model Fingerprinting',
    description:
      'Identifies which AI model likely produced the content based on artifact signatures.',
  },
];

export default function HomePage() {
  const { analyze, isAnalyzing, uploadProgress, error } = useAnalysis();

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary-light text-xs font-medium mb-6">
          <Shield className="w-3.5 h-3.5" />
          AI Content Forensics Platform
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 tracking-tight">
          Beyond Detection.
          <br />
          <span className="bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent">
            Forensic-Grade Analysis.
          </span>
        </h1>
        <p className="text-text-secondary max-w-xl mx-auto text-lg">
          Upload any content — text, image, audio, or video — and get a detailed
          forensic report on AI generation probability, model fingerprints, and
          provenance gaps.
        </p>
      </div>

      {/* Upload Area */}
      <FileUpload
        onFileSelect={analyze}
        isAnalyzing={isAnalyzing}
        uploadProgress={uploadProgress}
      />

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center animate-fade-in">
          {error}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="p-5 rounded-xl bg-surface-light border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-primary-light" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              {title}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
