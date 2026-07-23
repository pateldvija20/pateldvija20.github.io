const RESUME_MD_URL =
  "https://raw.githubusercontent.com/pateldvija20/pateldvija20.github.io/main/content/resume.md"

export interface ContactLink {
  label: string
  href?: string
}

export interface ResumeEntry {
  title: string
  meta: string
  bullets: string[]
}

export interface SkillGroup {
  label: string
  items: string
}

export interface ResumeSection {
  heading: string
  entries: ResumeEntry[]
  skillGroups?: SkillGroup[]
}

export interface ResumeData {
  name: string
  contactLine: string
  contact: ContactLink[]
  sections: ResumeSection[]
}

const LINK_RE = /^\[(.+?)\]\((.+?)\)$/
const SKILL_RE = /^\*\*(.+?):\*\*\s*(.*)$/

export function parseResumeMarkdown(raw: string): ResumeData | null {
  const cleaned = raw.replace(/<!--[\s\S]*?-->/g, "")
  const lines = cleaned.split("\n").map((l) => l.trim())

  let i = 0
  while (i < lines.length && !lines[i]) i++
  if (i >= lines.length || !lines[i].startsWith("# ")) return null
  const name = lines[i].slice(2).trim()
  i++

  while (i < lines.length && !lines[i]) i++
  const contactLine = i < lines.length ? lines[i] : ""
  const contact: ContactLink[] = contactLine
    .split("|")
    .map((tok) => tok.trim())
    .filter(Boolean)
    .map((tok) => {
      const m = tok.match(LINK_RE)
      return m ? { label: m[1], href: m[2] } : { label: tok }
    })
  i++

  const sections: ResumeSection[] = []
  let currentSection: ResumeSection | null = null
  let currentEntry: ResumeEntry | null = null

  for (; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    if (line.startsWith("## ")) {
      currentSection = { heading: line.slice(3).trim(), entries: [] }
      if (currentSection.heading.toLowerCase() === "skill") currentSection.skillGroups = []
      sections.push(currentSection)
      currentEntry = null
      continue
    }

    if (line.startsWith("### ")) {
      currentEntry = { title: line.slice(4).trim(), meta: "", bullets: [] }
      currentSection?.entries.push(currentEntry)
      continue
    }

    if (currentSection?.skillGroups) {
      const m = line.match(SKILL_RE)
      if (m) {
        currentSection.skillGroups.push({ label: m[1].trim(), items: m[2].trim() })
        continue
      }
    }

    if (line.startsWith("- ")) {
      currentEntry?.bullets.push(line.slice(2).trim())
      continue
    }

    if (currentEntry && !currentEntry.meta && currentEntry.bullets.length === 0) {
      currentEntry.meta = line
    }
  }

  return { name, contactLine, contact, sections }
}

async function readLocalResumeFallback(): Promise<string | null> {
  try {
    const { readFile } = await import("node:fs/promises")
    const { join } = await import("node:path")
    return await readFile(join(process.cwd(), "content", "resume.md"), "utf8")
  } catch {
    return null
  }
}

export async function getResume(): Promise<ResumeData | null> {
  try {
    const res = await fetch(RESUME_MD_URL, { next: { revalidate: 60 } })
    if (res.ok) return parseResumeMarkdown(await res.text())
  } catch (err) {
    console.error("getResume error:", err)
  }

  // GitHub fetch failed or the file isn't pushed yet — fall back to the local
  // copy (dev preview, or resilience if the raw-GitHub endpoint is down).
  const local = await readLocalResumeFallback()
  return local ? parseResumeMarkdown(local) : null
}
