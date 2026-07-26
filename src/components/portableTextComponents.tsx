"use client"

import { useEffect, useRef } from "react"
import { PortableText, type PortableTextComponents } from "@portabletext/react"

// Injects a pasted HTML/CSS/JS snippet as-is. Set via innerHTML rather than
// dangerouslySetInnerHTML because <script> tags inserted that way don't
// execute — each one is swapped for a freshly created <script> element so
// the browser runs it. Caveat: if a snippet's own script queries the DOM
// by a global selector (as the journey-map ones do, e.g.
// `document.querySelector('.greenera-journey')`) rather than scoping to
// its own container, pasting the same snippet twice on one page will only
// wire up the first instance.
function EmbedHtmlBlock({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container || !html) return
    container.innerHTML = html
    
    // Ensure all child containers/tables/graphics fluidly scale to 100% width
    container.querySelectorAll("*").forEach((el) => {
      const htmlEl = el as HTMLElement
      if (htmlEl.style.width && htmlEl.style.width.endsWith("px")) {
        const px = parseFloat(htmlEl.style.width)
        if (px > 500) {
          htmlEl.style.width = "100%"
          htmlEl.style.maxWidth = "100%"
        }
      }
    })

    container.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script")
      Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value))
      newScript.textContent = oldScript.textContent
      oldScript.replaceWith(newScript)
    })
  }, [html])

  return <div className="my-6 w-full overflow-x-auto [&>div]:w-full [&_table]:w-full" ref={ref} />
}

function resolveVideoEmbed(url: string): { kind: "iframe" | "file"; src: string } {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) {
      return { kind: "iframe", src: `https://www.youtube.com/embed/${u.pathname.slice(1)}` }
    }
    if (u.hostname.includes("youtube.com")) {
      return { kind: "iframe", src: `https://www.youtube.com/embed/${u.searchParams.get("v") ?? ""}` }
    }
    if (u.hostname.includes("vimeo.com")) {
      return { kind: "iframe", src: `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}` }
    }
    if (u.hostname.includes("loom.com")) {
      return { kind: "iframe", src: `https://www.loom.com/embed/${u.pathname.split("/").filter(Boolean).pop()}` }
    }
  } catch {
    // Fall through to treating it as a direct file URL.
  }
  return { kind: "file", src: url }
}

function VideoEmbedBlock({ value }: { value: { url?: string; caption?: string } }) {
  if (!value?.url) return null
  const { kind, src } = resolveVideoEmbed(value.url)
  return (
    <figure className="my-6">
      {kind === "iframe" ? (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden">
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={src} controls className="w-full rounded-xl" />
      )}
      {value.caption && <figcaption className="text-[12px] text-[#888] text-center mt-2">{value.caption}</figcaption>}
    </figure>
  )
}

// Renders one item of a `sideBySide.media` array by its Portable Text _type.
function MediaItem({ item }: { item: any }) {
  switch (item?._type) {
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item?.asset?.url} alt={item?.alt ?? ""} className="w-full rounded-xl object-cover" />
      )
    case "videoEmbed":
      return <VideoEmbedBlock value={item} />
    case "embedHtml":
      return <EmbedHtmlBlock html={item?.html ?? ""} />
    default:
      return null
  }
}

export const portableTextComponents: PortableTextComponents = {
  block: {
    h1: ({ children }: any) => <h1 className="text-[24px] font-bold mt-6 mb-3 text-[#000912]">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-[21px] font-semibold mt-5 mb-2.5 text-[#000912]">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-[19px] font-semibold mt-4 mb-2 text-[#000912]">{children}</h3>,
    normal: ({ children }: any) => <p className="text-[19px] leading-8 text-[#333] mb-4.5">{children}</p>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-[#5BAEFF] pl-4.5 my-4.5 text-[#555] italic text-[19px] leading-8">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="ml-5 mb-4.5 list-disc">{children}</ul>,
    number: ({ children }: any) => <ol className="ml-5 mb-4.5 list-decimal">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }: any) => <li className="text-[19px] leading-8 text-[#333] mb-1.5">{children}</li>,
    number: ({ children }: any) => <li className="text-[19px] leading-8 text-[#333] mb-1.5">{children}</li>,
  },
  marks: {
    strong: ({ children }: any) => <strong>{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    code: ({ children }: any) => <code className="bg-black/5 px-1.5 py-0.5 rounded text-[17px]">{children}</code>,
    link: ({ value, children }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="underline text-[#3B82F6]">
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }: any) => (
      <figure className="my-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value?.asset?.url} alt={value?.alt ?? ""} className="w-full rounded-xl object-cover" />
        {value?.caption && (
          <figcaption className="text-[12px] text-[#888] text-center mt-2">{value.caption}</figcaption>
        )}
      </figure>
    ),
    code: ({ value }: any) => (
      <pre className="bg-[#F5F5F5] rounded-lg p-4 my-4 overflow-x-auto text-[13px] font-mono">
        <code>{value?.code}</code>
      </pre>
    ),
    videoEmbed: ({ value }: any) => <VideoEmbedBlock value={value} />,
    embedHtml: ({ value }: any) => <EmbedHtmlBlock html={value?.html ?? ""} />,
    sideBySide: ({ value }: any) => {
      const mediaItem = value?.media?.[0]
      const mediaOnRight = value?.mediaPosition === "right"
      return (
        <div className={`flex flex-col md:flex-row gap-8 my-8 ${mediaOnRight ? "md:flex-row-reverse" : ""}`}>
          <div className="flex-1 min-w-0">{mediaItem && <MediaItem item={mediaItem} />}</div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <PortableText value={value?.text ?? []} components={portableTextComponents} />
          </div>
        </div>
      )
    },
  },
}
