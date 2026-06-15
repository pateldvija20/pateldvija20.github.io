import { NextRequest, NextResponse } from "next/server"
import { getPageBlocks } from "@/lib/notion"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params
  try {
    const blocks = await getPageBlocks(pageId)
    return NextResponse.json(blocks, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
    })
  } catch (err) {
    console.error("notion-blocks error", err)
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: 500 })
  }
}
