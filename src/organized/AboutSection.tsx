import { FadeImg } from "./FadeImg";
import { ABOUT, ABOUT_PHOTOS } from "./content";
import { Section } from "./Section";

/**
 * About, after rachelchen.tech/about: a short column of copy, then the photos
 * in a row, each headed "01 / Me". No work history here — that is the CV's
 * job, one section down.
 *
 * Four across from tablet up, two on the phone. The frames share one 4:5 crop
 * so the row reads as a set rather than a ragged edge.
 */
export function AboutSection() {
  return (
    <Section id="about" title="About">
      <div className="flex flex-col gap-[64px]">
        <div className="flex max-w-[480px] flex-col gap-[16px]">
          {ABOUT.paragraphs.map((p) => (
            <p key={p} className="text-[16px] leading-[1.6]" style={{ color: "var(--content)" }}>
              {p}
            </p>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-[16px] md:grid-cols-4">
          {ABOUT_PHOTOS.map((photo, i) => (
            <li key={photo.src} className="flex flex-col gap-[10px]">
              <p className="text-[14px] leading-none">
                <span style={{ color: "var(--quiet)" }}>{String(i + 1).padStart(2, "0")} / </span>
                <span style={{ color: "var(--content)" }}>{photo.caption}</span>
              </p>
              <div className="w-full overflow-hidden rounded-[4px]" style={{ aspectRatio: "4 / 5", background: "var(--rule)" }}>
                <FadeImg
                  src={photo.src}
                  alt={photo.caption}
                  loading="lazy"
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
