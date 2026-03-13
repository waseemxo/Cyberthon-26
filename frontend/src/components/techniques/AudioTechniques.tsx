import { Brain } from 'lucide-react';
import type { AnalysisTechnique } from '../../types';
import HeroCard from './HeroCard';
import TechniqueAccordion from './TechniqueAccordion';

interface Props {
  techniques: AnalysisTechnique[];
}

function isLstmTechnique(name: string): boolean {
  return name.toLowerCase().includes('lstm');
}

export default function AudioTechniques({ techniques }: Props) {
  const lstm = techniques.find((t) => isLstmTechnique(t.technique));
  const others = techniques.filter((t) => !isLstmTechnique(t.technique));

  return (
    <>
      {lstm && (
        <HeroCard
          technique={lstm}
          icon={Brain}
          accent="primary"
          title="LSTM Deep Learning Classifier"
          subtitle="Primary Detection Engine — Weight: 5.0x"
        />
      )}
      {others.length > 0 && (
        <TechniqueAccordion techniques={others} label="Audio Forensic Techniques" />
      )}
    </>
  );
}
