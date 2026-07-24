"use server"

import { getCaseStudyBySlug } from "./sanity"

export async function getCaseStudySectionsAction(slug: string) {
  return await getCaseStudyBySlug(slug)
}
