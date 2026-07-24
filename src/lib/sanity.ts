import { createClient } from "@sanity/client"

export interface CaseStudy {
  id:          string
  name:        string
  description: string
  year:        string
  tags:        string
  type:        string
  location:    string
  slug:        string
}

// A case-study detail page is authored in Sanity as a repeatable array of
// named sections (Tl;dr, Solution, Overview, ...) rather than one long body —
// each section's `_key` doubles as a stable DOM/anchor id for the TOC sidebar.
export interface CaseStudySection {
  _key:    string
  title:   string
  content: any[] // Portable Text blocks
}

export const sanityClient = createClient({
  projectId: "7b0nphlp",
  dataset:   "production",
  apiVersion: "2024-01-01",
  useCdn:    true,
})

export async function getCaseStudies(): Promise<CaseStudy[]> {
  try {
    const results = await sanityClient.fetch<CaseStudy[]>(`
      *[_type == "caseStudy"] | order(order asc) {
        "id":          _id,
        name,
        description,
        "year":        string(year),
        tags,
        type,
        location,
        "slug":        slug.current
      }
    `)
    return results ?? []
  } catch (err) {
    console.error("getCaseStudies error:", err)
    return []
  }
}

export async function getPageBlocks(id: string): Promise<any[]> {
  try {
    const result = await sanityClient.fetch(`*[_id == $id][0]{ body }`, { id })
    return result?.body ?? []
  } catch (err) {
    console.error("getPageBlocks error:", err)
    return []
  }
}

// getCaseStudySections lives in ./sanity-actions.ts (a dedicated "use server"
// file) — it's called from a client component, and Next.js only allows
// inline "use server" exports from files that aren't also part of a client
// bundle. `sanity.ts` is imported by both server and client code, so it
// can't host the action itself.
