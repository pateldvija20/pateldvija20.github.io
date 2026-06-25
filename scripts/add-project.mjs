import { createClient } from "@sanity/client"

const token = process.env.SANITY_TOKEN
if (!token) {
  console.error("Set SANITY_TOKEN env var before running this script.")
  process.exit(1)
}

const client = createClient({
  projectId: "7b0nphlp",
  dataset:   "production",
  apiVersion: "2024-01-01",
  token,
  useCdn:    false,
})

const doc = {
  _type:       "caseStudy",
  name:        "Branding a 36-Hour Hackathon From Scratch",
  description: "HACKSVIT 2022 was a 36-hour in-person hackathon for college students and tech enthusiasts, built to restore the hands-on collaboration pandemic-era online events couldn't replicate.",
  year:        2022,
  tags:        "Figma, Illustrator, Photoshop",
  type:        "Branding & Web Design",
  slug:        { _type: "slug", current: "branding-a-36-hour-hackathon-from-scratch" },
}

const result = await client.create(doc)
console.log("Created:", result._id)
