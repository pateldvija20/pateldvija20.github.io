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

const TOKEN = process.env.NOTION_TOKEN!
const DB_ID = process.env.NOTION_DB_ID!
const NOTION_VERSION = "2022-06-28"

function richText(rich: Array<{ plain_text: string }> = []): string {
  return rich.map(r => r.plain_text).join("")
}

async function notionFetch(path: string, body?: object) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    next: { revalidate: 3600 },
  })
  return res.json()
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  try {
    const data = await notionFetch(`/databases/${DB_ID}/query`, {})
    return (data.results ?? []).map((page: any) => {
      const p = page.properties ?? {}
      return {
        id:          page.id,
        name:        richText(p["Title"]?.title),
        description: richText(p["Description"]?.rich_text),
        year:        String(p["Year"]?.number ?? ""),
        tags:        (p["Type of project"]?.multi_select ?? []).map((t: any) => t.name).join(" / "),
        type:        p["Location"]?.select?.name ?? "",
        location:    p["Location"]?.select?.name ?? "",
        slug:        richText(p["Slug"]?.rich_text),
      }
    })
  } catch (err) {
    console.error("getCaseStudies error:", err)
    return []
  }
}

export async function getPageBlocks(pageId: string): Promise<any[]> {
  try {
    const data = await notionFetch(`/blocks/${pageId}/children`)
    return data.results ?? []
  } catch (err) {
    console.error("getPageBlocks error:", err)
    return []
  }
}
