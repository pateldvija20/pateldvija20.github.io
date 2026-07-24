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

// Single combined fetch (meta + sections) for the /projects/[slug] route —
// this runs server-side only (inside a Server Component), so there's no
// CORS concern the way there is for the client-invoked sections action below.
export async function getCaseStudyBySlug(
  slug: string
): Promise<(CaseStudy & { sections: CaseStudySection[] }) | null> {
  try {
    const result = await sanityClient.fetch<(CaseStudy & { sections: CaseStudySection[] }) | null>(
      `*[_type == "caseStudy" && slug.current == $slug][0]{
        "id":          _id,
        name,
        description,
        "year":        string(year),
        tags,
        type,
        location,
        "slug":        slug.current,
        sections[]{
          _key,
          title,
          content[]{
            ...,
            _type == "image" => { "asset": asset-> }
          }
        }
      }`,
      { slug }
    )
    return result ?? null
  } catch (err) {
    console.error("getCaseStudyBySlug error:", err)
    return null
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
