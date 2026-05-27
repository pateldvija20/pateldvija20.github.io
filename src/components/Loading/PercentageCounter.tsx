"use client";

type PercentageCounterProps = {
  value: number;
};

export default function PercentageCounter({ value }: PercentageCounterProps) {
  const label = `${String(value).padStart(2, "0")}%`;

  return (
    <div
      className="pointer-events-none fixed right-12 bottom-8 z-50 select-none tabular-nums"
      style={{
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        fontSize: "48px",
        color: "#000912",
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  );
}
