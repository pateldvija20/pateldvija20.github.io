import type { CaseStudySection } from "./CaseStudy";
import { BILLY_AND_BUDDY_SECTIONS } from "./billyAndBuddy";
import { GREENERA_SECTIONS } from "./greenera";
import { HACKSVIT_SECTIONS } from "./hacksvit";
import { THE_FAMILY_TABLE_SECTIONS } from "./theFamilyTable";

/**
 * Which authored case study a slug maps to, or `undefined` for the ones still
 * running on `CaseStudy`'s default section rail.
 *
 * Extracted so the folder (Scattered) and the Work grid (Organised) open the
 * same content from one table — two copies of this mapping would drift the
 * moment a seventh project lands.
 */
export function sectionsFor(slug: string): CaseStudySection[] | undefined {
  switch (slug) {
    case "hacksvit":
      return HACKSVIT_SECTIONS;
    case "greenera":
      return GREENERA_SECTIONS;
    case "the-family-table":
      return THE_FAMILY_TABLE_SECTIONS;
    case "billy-and-buddy":
      return BILLY_AND_BUDDY_SECTIONS;
    default:
      return undefined;
  }
}
