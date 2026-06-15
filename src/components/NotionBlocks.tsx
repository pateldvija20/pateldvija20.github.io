"use client"

function richText(rich: Array<{ plain_text: string; annotations?: Record<string, boolean>; href?: string | null }>) {
  return rich.map((r, i) => {
    let node: React.ReactNode = r.plain_text
    if (r.annotations?.bold)          node = <strong key={i}>{node}</strong>
    if (r.annotations?.italic)        node = <em key={i}>{node}</em>
    if (r.annotations?.code)          node = <code key={i} className="bg-black/5 px-1 rounded text-[13px]">{node}</code>
    if (r.href)                        node = <a key={i} href={r.href} target="_blank" rel="noopener noreferrer" className="underline text-[#3B82F6]">{node}</a>
    return <span key={i}>{node}</span>
  })
}

function Block({ block }: { block: any }) {
  const b = block as any

  switch (block.type) {
    case "heading_1":
      return <h1 className="text-[22px] font-bold mt-8 mb-3 text-[#000912]">{richText(b.heading_1.rich_text)}</h1>
    case "heading_2":
      return <h2 className="text-[18px] font-semibold mt-6 mb-2 text-[#000912]">{richText(b.heading_2.rich_text)}</h2>
    case "heading_3":
      return <h3 className="text-[15px] font-semibold mt-5 mb-2 text-[#000912]">{richText(b.heading_3.rich_text)}</h3>
    case "paragraph":
      return <p className="text-[15px] leading-7 text-[#333] mb-4">{richText(b.paragraph.rich_text)}</p>
    case "bulleted_list_item":
      return <li className="text-[15px] leading-7 text-[#333] ml-5 list-disc">{richText(b.bulleted_list_item.rich_text)}</li>
    case "numbered_list_item":
      return <li className="text-[15px] leading-7 text-[#333] ml-5 list-decimal">{richText(b.numbered_list_item.rich_text)}</li>
    case "quote":
      return <blockquote className="border-l-4 border-[#5BAEFF] pl-4 my-4 text-[#555] italic text-[15px]">{richText(b.quote.rich_text)}</blockquote>
    case "code":
      return (
        <pre className="bg-[#F5F5F5] rounded-lg p-4 my-4 overflow-x-auto text-[13px] font-mono">
          <code>{b.code.rich_text.map((r: any) => r.plain_text).join("")}</code>
        </pre>
      )
    case "divider":
      return <hr className="my-6 border-black/10" />
    case "image": {
      const url = b.image.type === "external" ? b.image.external.url : b.image.file.url
      const caption = b.image.caption?.map((r: any) => r.plain_text).join("") ?? ""
      return (
        <figure className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={caption} className="w-full rounded-xl object-cover" />
          {caption && <figcaption className="text-[12px] text-[#888] text-center mt-2">{caption}</figcaption>}
        </figure>
      )
    }
    case "toggle":
      return (
        <details className="my-3 border border-black/8 rounded-lg p-3">
          <summary className="cursor-pointer text-[15px] font-medium text-[#000912]">
            {richText(b.toggle.rich_text)}
          </summary>
        </details>
      )
    case "callout":
      return (
        <div className="flex gap-3 bg-[#F0F7FF] rounded-xl p-4 my-4">
          {b.callout.icon?.emoji && <span>{b.callout.icon.emoji}</span>}
          <p className="text-[15px] leading-7 text-[#333] m-0">{richText(b.callout.rich_text)}</p>
        </div>
      )
    default:
      return null
  }
}

export function NotionBlocks({ blocks }: { blocks: any[] }) {
  return (
    <div>
      {blocks.map(block => (
        <Block key={block.id} block={block} />
      ))}
    </div>
  )
}
