"use server"

import { sanityClient, type CaseStudySection } from "./sanity"

// Called directly from a client component (FolderCard, on sticker click).
// File-level "use server" compiles this into a server-only RPC endpoint, so
// it always runs on the server — no browser-side CORS allow-list needed for
// every dev/preview/prod origin, unlike calling the Sanity client straight
// from the browser.
export async function getCaseStudySections(slug: string): Promise<CaseStudySection[]> {
  try {
    const result = await sanityClient.fetch<{ sections: CaseStudySection[] } | null>(
      `*[_type == "caseStudy" && slug.current == $slug][0]{
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
    return result?.sections ?? []
  } catch (err) {
    console.error("getCaseStudySections error:", err)
    return []
  }
}
