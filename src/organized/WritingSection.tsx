import { WRITING, WRITING_HEADING } from "./content";
import { GradientCard } from "./GradientCard";
import { Section } from "./Section";

/**
 * "How I See Things" (Figma 451:17513). Three across on desktop, two on
 * tablet, one on the phone.
 */
export function WritingSection() {
  return (
    <Section id="writing" title={WRITING_HEADING} centred>
      <div className="flex flex-col gap-[60px] xl:gap-[100px]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {WRITING.map((card, i) => (
            <GradientCard key={i} card={card} />
          ))}
        </div>
      </div>
    </Section>
  );
}
