import { useRef, type CSSProperties, type ReactNode } from "react";

/**
 * The site's one button: a pill, in two variants.
 *
 *   filled    the action colour with its text on top. On hover it shifts a
 *             little toward its text colour: a light fill goes a touch
 *             darker, a dark fill a touch lighter.
 *   outlined  a ring and no fill. On hover it fills up from where the
 *             pointer came in (a circle that grows until it covers the
 *             button) and the label inverts; it closes back into the pointer
 *             where it leaves.
 *
 * Colours are the `--color-action-*` and `--color-text-*` tokens (index.css),
 * so both variants follow light and dark. Pass `style` to override those
 * variables where a surface has its own palette (the contact modal does).
 * Renders a link when given an `href`, a button otherwise.
 */
type Common = {
  variant?: "filled" | "outlined";
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
};
type AsLink = Common & { href: string; download?: boolean; target?: string; rel?: string };
type AsButton = Common & { href?: undefined; onClick?: () => void; type?: "button" | "submit" };

export function Button(props: AsLink | AsButton) {
  const { variant = "filled", children, className = "", style, disabled } = props;
  const ref = useRef<HTMLElement>(null);

  // Where the pointer crossed the edge, for the outlined fill to open from.
  const mark = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--cx", `${e.clientX - r.left}px`);
    el.style.setProperty("--cy", `${e.clientY - r.top}px`);
  };

  const common = {
    ref: ref as never,
    onPointerEnter: mark,
    onPointerLeave: mark,
    className: `btn btn-${variant} ${className}`,
    style,
    "data-ui": `Button · ${variant}`,
    "data-src": "src/pieces/Button.tsx › Button",
  };

  if ("href" in props && props.href !== undefined) {
    return (
      <a {...common} href={props.href} download={props.download} target={props.target} rel={props.rel}>
        {children}
      </a>
    );
  }
  const b = props as AsButton;
  return (
    <button {...common} type={b.type ?? "button"} onClick={b.onClick} disabled={disabled}>
      {children}
    </button>
  );
}
