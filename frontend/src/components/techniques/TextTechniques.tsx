import { Brain } from 'lucide-react';
import type { AnalysisTechnique } from '../../types';
import { isBertTechnique } from './constants';
import HeroCard from './HeroCard';
import TechniqueAccordion from './TechniqueAccordion';

interface Props {
  techniques: AnalysisTechnique[];
}

export default function TextTechniques({ techniques }: Props) {
  const bert = techniques.find((t) => isBertTechnique(t.technique));
  const others = techniques.filter((t) => !isBertTechnique(t.technique));

  return (
    <>
      {bert && (
        <HeroCard
          technique={bert}
          icon={Brain}
          accent="primary"
          title="BERT Deep Learning Classifier"
          subtitle="Primary Detection Engine — Weight: 5.0x"
        />
      )}
      {others.length > 0 && (
        <TechniqueAccordion techniques={others} label="Stylometric Analysis Techniques" />
      )}
    </>
  );
}
