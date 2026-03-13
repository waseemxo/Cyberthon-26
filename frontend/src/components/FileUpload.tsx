import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Image,
  Music,
  Video,
  X,
  Loader2,
  Type,
} from 'lucide-react';
import { detectFileType, formatFileSize, getFileTypeLabel } from '../utils/helpers';
import type { FileType } from '../types';

const FILE_TYPE_ICONS: Record<FileType, typeof FileText> = {
  text: FileText,
  image: Image,
  audio: Music,
  video: Video,
};

const FILE_TYPE_COLORS: Record<FileType, string> = {
  text: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  image: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  audio: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  video: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

type InputMode = 'text' | 'file';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onTextSubmit: (text: string) => void;
  isAnalyzing: boolean;
  uploadProgress: number;
}

export default function FileUpload({
  onFileSelect,
  onTextSubmit,
  isAnalyzing,
  uploadProgress,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<InputMode>('text');
  const [textInput, setTextInput] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: isAnalyzing,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
  };

  const handleTextSubmit = () => {
    if (textInput.trim().length > 0 && !isAnalyzing) {
      onTextSubmit(textInput.trim());
    }
  };

  const fileType = selectedFile ? detectFileType(selectedFile) : null;
  const FileIcon = fileType ? FILE_TYPE_ICONS[fileType] : Upload;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Sliding Mode Toggle */}
      <div className="flex items-center justify-center">
        <div className="relative inline-flex items-center bg-surface-light border border-border rounded-xl p-1">
          <button
            onClick={() => setMode('text')}
            className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-mono font-medium transition-all ${
              mode === 'text'
                ? 'text-surface bg-primary shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Type className="w-4 h-4" />
            Text Input
          </button>
          <button
            onClick={() => setMode('file')}
            className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-mono font-medium transition-all ${
              mode === 'file'
                ? 'text-surface bg-primary shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Upload className="w-4 h-4" />
            File Upload
          </button>
        </div>
      </div>

      {/* Analyzing State */}
      {isAnalyzing ? (
        <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center bg-surface-light">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-lg font-mono font-medium text-primary mb-2">
            Analyzing content<span className="animate-blink">_</span>
          </p>
          <div className="w-full max-w-xs mx-auto bg-surface-lighter rounded-full h-2 overflow-hidden border border-border">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                boxShadow: '0 0 8px rgba(0, 255, 136, 0.4)',
              }}
            />
          </div>
          <p className="text-sm text-text-muted mt-2 font-mono">
            {uploadProgress < 100
              ? `> uploading... ${uploadProgress}%`
              : '> running forensic analysis...'}
          </p>
        </div>
      ) : mode === 'text' ? (
        /* ── Text Input Mode ── */
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste or type text to analyze for AI generation..."
              className="w-full h-48 bg-surface border-2 border-border rounded-2xl p-5 text-sm text-text-primary font-mono resize-none focus:outline-none focus:border-primary/50 focus:shadow-[0_0_16px_rgba(0,255,136,0.1)] transition-all placeholder:text-text-muted/50"
            />
            <span className="absolute bottom-3 right-4 text-[10px] font-mono text-text-muted">
              {textInput.length} chars
            </span>
          </div>
          <button
            onClick={handleTextSubmit}
            disabled={textInput.trim().length === 0}
            className="w-full py-3.5 rounded-xl font-mono font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 hover:shadow-[0_0_16px_rgba(0,255,136,0.15)]"
          >
            <span className="text-primary/60">&gt; </span>
            Analyze Text
          </button>
        </div>
      ) : (
        /* ── File Upload Mode ── */
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${
            isDragActive
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary/50 hover:bg-surface-light'
          }`}
        >
          <input {...getInputProps()} />

          {selectedFile && fileType ? (
            <div className="animate-fade-in">
              <div
                className={`w-16 h-16 rounded-2xl border ${FILE_TYPE_COLORS[fileType]} flex items-center justify-center mx-auto mb-4`}
              >
                <FileIcon className="w-8 h-8" />
              </div>
              <p className="text-lg font-medium text-text-primary mb-1 font-mono">
                {selectedFile.name}
              </p>
              <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
                <span className="px-2 py-0.5 rounded-md bg-surface-lighter border border-border font-mono text-xs">
                  {getFileTypeLabel(fileType)}
                </span>
                <span className="font-mono text-xs">{formatFileSize(selectedFile.size)}</span>
              </div>
              <button
                onClick={removeFile}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-surface-lighter border border-border flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                <Upload className="w-8 h-8 text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <p className="text-lg font-medium text-text-primary mb-2 font-mono">
                {isDragActive ? (
                  <><span className="text-primary">{'>'}</span> Drop file here</>
                ) : (
                  <><span className="text-primary">{'>'}</span> Drop a file or click to upload</>
                )}
              </p>
              <p className="text-sm text-text-muted">
                Supports images, audio, and video files
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                {(['image', 'audio', 'video'] as FileType[]).map((type) => {
                  const Icon = FILE_TYPE_ICONS[type];
                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${FILE_TYPE_COLORS[type]} text-xs font-mono`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {getFileTypeLabel(type)}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
