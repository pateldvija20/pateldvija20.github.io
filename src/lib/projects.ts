import { getCaseStudies as getSanityCaseStudies } from "./sanity"

export interface CaseStudy {
  id:          string
  name:        string
  description: string
  year:        string
  tags:        string
  type:        string
  section:     "work" | "notes"
  slug:        string
  cardImage?:  string   // path relative to /public
  sticker?:    string   // path relative to /public
}

// Bespoke desk-collage art (card background + draggable sticker) is still
// authored by hand as SVGs, not managed through Sanity's asset pipeline —
// this map layers that art onto whatever project list Sanity returns, keyed
// by slug. A project with no entry here still renders (Page/ProjectSticker
// both degrade gracefully), just without custom art.
const PROJECT_ASSETS: Record<string, { cardImage?: string; sticker?: string; description?: string }> = {
  "branding-a-36-hour-hackathon-from-scratch": {
    cardImage:   "/projects/hacksvit-card.svg",
    sticker:     "/projects/hacksvit-sticker.svg",
    description: "HACKSVIT 2022 was a 36-hour in-person hackathon for college students and tech enthusiasts, built to restore the hands-on collaboration pandemic-era online events couldn't replicate.",
  },
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  const studies = await getSanityCaseStudies()
  return studies.map((s) => {
    const assets = PROJECT_ASSETS[s.slug]
    return {
      id:          s.id,
      name:        s.name,
      description: s.description || assets?.description || "",
      year:        s.year,
      tags:        s.tags,
      type:        s.type,
      section:     s.location?.toLowerCase() === "notes" ? "notes" : "work",
      slug:        s.slug,
      cardImage:   assets?.cardImage,
      sticker:     assets?.sticker,
    }
  })
}
