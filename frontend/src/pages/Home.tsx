import {
  Scan,
  FileSearch,
  FileDigit,
  FileText,
  Image,
  Music,
  Video,
  Brain,
  Microscope,
  ShieldCheck,
  ArrowDown,
  Sparkles,
  Waves,
  Eye,
  Clock,
} from 'lucide-react';
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

const mediaTypes = [
  {
    icon: FileText,
    label: 'Text',
    color: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
    techniques: ['BERT AI Classifier', 'Stylometric Analysis', 'Perplexity & Burstiness', 'Watermark Detection'],
  },
  {
    icon: Image,
    label: 'Image',
    color: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5',
    techniques: ['EXIF Metadata Inspection', 'FFT Frequency Analysis', 'Error Level Analysis (ELA)', 'Gemini Multimodal'],
  },
  {
    icon: Music,
    label: 'Audio',
    color: 'text-amber-400 border-amber-400/20 bg-amber-400/5',
    techniques: ['TTS Marker Detection', 'Mel-Spectrogram Analysis', 'Pitch & Amplitude Jitter', 'Silence Patterns'],
  },
  {
    icon: Video,
    label: 'Video',
    color: 'text-purple-400 border-purple-400/20 bg-purple-400/5',
    techniques: ['Temporal Consistency', 'Face Landmark Analysis', 'Optical Flow Detection', 'Gemini Video Analysis'],
  },
];

const steps = [
  {
    icon: Sparkles,
    step: '01',
    title: 'Upload Content',
    description: 'Paste text or drop any file — image, audio, or video.',
  },
  {
    icon: Microscope,
    step: '02',
    title: 'Forensic Analysis',
    description: '20+ techniques run in parallel: ML classifiers, signal processing, and metadata inspection.',
  },
  {
    icon: Eye,
    step: '03',
    title: 'Weighted Scoring',
    description: 'Results are combined using confidence-weighted scoring with techniques prioritized by reliability.',
  },
  {
    icon: ShieldCheck,
    step: '04',
    title: 'Detailed Report',
    description: 'Get a verdict with per-technique breakdown, model fingerprint, provenance gaps, and PDF export.',
  },
];

export default function HomePage() {
  const { analyze, analyzeTextInput, isAnalyzing, uploadProgress, error } = useAnalysis();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-6">
          <span className="animate-blink">_</span>
          AI CONTENT FORENSICS PLATFORM
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 tracking-tight">
          <span className="font-mono text-primary glow-text">Expose</span> the Fabrication.
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Forensic-Grade Analysis.
          </span>
        </h1>
        <p className="text-text-secondary max-w-2xl mx-auto text-lg leading-relaxed">
          LUCID performs deep forensic analysis across text, images, audio, and video
          using <span className="text-primary font-medium">20+ detection techniques</span> — from
          BERT classifiers and FFT frequency analysis to Error Level Analysis and
          Gemini multimodal inspection.
        </p>
      </div>

      {/* Input Area */}
      <FileUpload
        onFileSelect={analyze}
        onTextSubmit={analyzeTextInput}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
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

      {/* How It Works */}
      <section className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary font-mono">
            <span className="text-primary">#</span> How It Works
          </h2>
          <p className="text-sm text-text-muted mt-2">From upload to forensic verdict in seconds</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map(({ icon: Icon, step, title, description }) => (
            <div key={step} className="cyber-card p-5 group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono text-primary/50 font-bold">{step}</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-4 h-4 text-primary-light" />
                </div>
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1 font-mono">{title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Media Types + Techniques */}
      <section className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text-primary font-mono">
            <span className="text-primary">#</span> Analysis Techniques
          </h2>
          <p className="text-sm text-text-muted mt-2">Specialized forensic pipelines for every media type</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mediaTypes.map(({ icon: Icon, label, color, techniques }) => (
            <div key={label} className="cyber-card p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${color}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-bold text-text-primary font-mono">{label} Analysis</h3>
              </div>
              <ul className="space-y-1.5">
                {techniques.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-xs text-text-secondary font-mono">
                    <span className="text-primary/50">~$</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI / ML Stack */}
      <section className="max-w-3xl mx-auto">
        <div className="cyber-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary font-mono">AI-Powered Detection Core</h3>
              <p className="text-xs text-text-muted">Deep learning models at the heart of analysis</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-lighter border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Waves className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-bold text-text-primary font-mono">BERT + LoRA Classifier</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Fine-tuned BERT model with Low-Rank Adaptation for binary AI text detection. Weighted 5x in final scoring.
              </p>
            </div>
            <div className="rounded-lg bg-surface-lighter border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-text-primary font-mono">Gemini 2.5 Flash</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Google's multimodal AI for image and video forensic analysis. Weighted 4x in final scoring.
              </p>
            </div>
            <div className="rounded-lg bg-surface-lighter border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Microscope className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-text-primary font-mono">Signal Processing</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                FFT frequency analysis, ELA, mel-spectrograms, and optical flow for artifact detection at the signal level.
              </p>
            </div>
            <div className="rounded-lg bg-surface-lighter border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-text-primary font-mono">Stylometric Analysis</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Perplexity, burstiness, vocabulary richness, repetition patterns, and watermark detection for text forensics.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
