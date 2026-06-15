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
        slug
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
