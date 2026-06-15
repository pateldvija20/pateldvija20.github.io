"use client"

import { PortableText } from "@portabletext/react"

const components = {
  block: {
    h1: ({ children }: any) => <h1 className="text-[22px] font-bold mt-8 mb-3 text-[#000912]">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-[18px] font-semibold mt-6 mb-2 text-[#000912]">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-[15px] font-semibold mt-5 mb-2 text-[#000912]">{children}</h3>,
    normal: ({ children }: any) => <p className="text-[15px] leading-7 text-[#333] mb-4">{children}</p>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-[#5BAEFF] pl-4 my-4 text-[#555] italic text-[15px]">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="ml-5 mb-4 list-disc">{children}</ul>,
    number: ({ children }: any) => <ol className="ml-5 mb-4 list-decimal">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }: any) => <li className="text-[15px] leading-7 text-[#333]">{children}</li>,
    number: ({ children }: any) => <li className="text-[15px] leading-7 text-[#333]">{children}</li>,
  },
  marks: {
    strong: ({ children }: any) => <strong>{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    code: ({ children }: any) => <code className="bg-black/5 px-1 rounded text-[13px]">{children}</code>,
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
  },
}

export function SanityBlocks({ blocks }: { blocks: any[] }) {
  return (
    <div>
      <PortableText value={blocks} components={components} />
    </div>
  )
}
