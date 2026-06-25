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

export const projects: CaseStudy[] = [
  {
    id:          "hacksvit-2022",
    name:        "Branding a 36-Hour Hackathon From Scratch",
    description: "HACKSVIT 2022 was a 36-hour in-person hackathon for college students and tech enthusiasts, built to restore the hands-on collaboration pandemic-era online events couldn't replicate.",
    year:        "2022",
    tags:        "Figma, Illustrator, Photoshop",
    type:        "Branding & Web Design",
    section:     "work",
    slug:        "branding-a-36-hour-hackathon-from-scratch",
    cardImage:   "/projects/hacksvit-card.svg",
    sticker:     "/projects/hacksvit-sticker.svg",
  },
]

export function getCaseStudies(): CaseStudy[] {
  return projects
}
