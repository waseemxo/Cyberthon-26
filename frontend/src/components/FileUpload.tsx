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

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  uploadProgress: number;
}

export default function FileUpload({
  onFileSelect,
  isAnalyzing,
  uploadProgress,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const fileType = selectedFile ? detectFileType(selectedFile) : null;
  const FileIcon = fileType ? FILE_TYPE_ICONS[fileType] : Upload;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer group ${
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : isAnalyzing
            ? 'border-border bg-surface-light cursor-not-allowed'
            : 'border-border hover:border-primary/50 hover:bg-surface-light'
        }`}
      >
        <input {...getInputProps()} />

        {isAnalyzing ? (
          <div className="animate-fade-in">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-lg font-mono font-medium text-primary mb-2">
              Analyzing content<span className="animate-blink">_</span>
            </p>
            {/* Progress bar */}
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
        ) : selectedFile && fileType ? (
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
              Supports text, images, audio, and video files
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              {(['text', 'image', 'audio', 'video'] as FileType[]).map((type) => {
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
    </div>
  );
}
