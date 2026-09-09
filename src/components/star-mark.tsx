import { cn } from "@/lib/utils";

type StarMarkProps = {
  filled?: boolean;
  size?: "sm" | "md" | "lg";
  kind?: "small" | "big";
  className?: string;
};

const SIZE = {
  sm: "size-3.5",
  md: "size-5",
  lg: "size-8",
};

export function StarMark({
  filled = true,
  size = "md",
  kind = "small",
  className,
}: StarMarkProps) {
  const tone = filled
    ? kind === "big"
      ? "text-star-bright"
      : "text-star"
    : "text-star-empty";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("shrink-0", SIZE[size], tone, className)}
    >
      <path
        d="M12 2.4l2.72 6.12 6.68.7-5.04 4.62 1.42 6.56L12 16.98 6.22 20.4l1.42-6.56-5.04-4.62 6.68-.7L12 2.4z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SmallStarTrack({ filled }: { filled: number }) {
  const count = Math.max(0, Math.min(10, filled));
  return (
    <div
      className="flex w-full max-w-40 items-center justify-start gap-px"
      aria-label={`小星星 ${count} / 10`}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <StarMark
          key={i}
          filled={i < count}
          size="sm"
          kind="small"
          className="size-3"
        />
      ))}
    </div>
  );
}

export function BigStarCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-elevated py-1 pr-2.5 pl-1.5 shadow-card">
      <StarMark kind="big" size="md" />
      <span className="text-sm font-medium tabular-nums text-fg">{count}</span>
    </span>
  );
}
