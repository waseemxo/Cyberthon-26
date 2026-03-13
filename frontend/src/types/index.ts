export type FileType = 'text' | 'image' | 'audio' | 'video';

export type VerdictLevel = 'AI-Generated' | 'Likely AI-Generated' | 'Inconclusive' | 'Likely Human' | 'Human';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type TechniqueResult = 'SUSPICIOUS' | 'INCONCLUSIVE' | 'CLEAN';

export interface AnalysisTechnique {
  technique: string;
  result: TechniqueResult;
  score: number;
  explanation: string;
}

export interface ForensicReport {
  id: string;
  file_name: string;
  file_type: FileType;
  file_size: number;
  file_hash: string;
  overall_verdict: VerdictLevel;
  confidence_score: number;
  risk_level: RiskLevel;
  analysis_breakdown: AnalysisTechnique[];
  model_fingerprint: string | null;
  provenance_gaps: string[];
  forensic_summary: string;
  analyzed_at: string;
}

export interface AnalysisRequest {
  file: File;
}

export interface SessionHistoryItem {
  id: string;
  file_name: string;
  file_type: FileType;
  confidence_score: number;
  overall_verdict: VerdictLevel;
  risk_level: RiskLevel;
  analyzed_at: string;
}
