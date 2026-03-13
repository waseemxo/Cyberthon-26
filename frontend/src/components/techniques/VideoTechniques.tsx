import { Sparkles } from 'lucide-react';
import type { AnalysisTechnique } from '../../types';
import { isGeminiTechnique } from './constants';
import HeroCard from './HeroCard';
import TechniqueAccordion from './TechniqueAccordion';

interface Props {
  techniques: AnalysisTechnique[];
}

export default function VideoTechniques({ techniques }: Props) {
  const gemini = techniques.find((t) => isGeminiTechnique(t.technique));
  const others = techniques.filter((t) => !isGeminiTechnique(t.technique));

  return (
    <>
      {gemini && (
        <HeroCard
          technique={gemini}
          icon={Sparkles}
          accent="accent"
          title={gemini.technique}
          subtitle="Multimodal Detection Engine — Weight: 4.0x"
        />
      )}
      {others.length > 0 && (
        <TechniqueAccordion techniques={others} label="Video Forensic Techniques" />
      )}
    </>
  );
}
