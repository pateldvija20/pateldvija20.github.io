"use client";

import Image from "next/image";

export default function BackgroundPapers() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <Image
        src="/paper-gray-blue.png"
        alt=""
        width={506}
        height={723}
        className="absolute bottom-0 left-0 h-[723px] w-[506px] -translate-x-[50px] translate-y-[180px]"
        priority
      />
      <Image
        src="/paper-olive-green.png"
        alt=""
        width={508}
        height={725}
        className="absolute top-0 right-0 h-[725px] w-[508px] translate-x-[50px] -translate-y-[280px]"
        priority
      />
    </div>
  );
}
