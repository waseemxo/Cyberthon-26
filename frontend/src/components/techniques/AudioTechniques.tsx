import type { AnalysisTechnique } from '../../types';
import TechniqueAccordion from './TechniqueAccordion';

interface Props {
  techniques: AnalysisTechnique[];
}

export default function AudioTechniques({ techniques }: Props) {
  return <TechniqueAccordion techniques={techniques} label="Audio Forensic Techniques" />;
}
