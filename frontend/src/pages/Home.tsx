import { Scan, FileSearch, FileDigit } from 'lucide-react';
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6">
          <span className="animate-blink">_</span>
          FORENSIC ANALYSIS SYSTEM
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 tracking-tight">
          <span className="font-mono text-primary glow-text">Expose</span> the Fabrication.
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center font-mono animate-fade-in">
          <span className="text-danger/70">[ERROR]</span> {error}
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-4">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="cyber-card p-5 hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <Icon className="w-5 h-5 text-primary-light" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary mb-1 font-mono">
              <span className="text-primary/60">&gt; </span>{title}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
