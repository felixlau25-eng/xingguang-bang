import { avatarClass, displayNameInitial } from "@/lib/stars";
import { cn } from "@/lib/utils";

export function StudentAvatar({
  name,
  hue,
  size = "md",
}: {
  name: string;
  hue: number;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "size-16 text-xl" : size === "sm" ? "size-9 text-sm" : "size-11 text-base";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium",
        dim,
        avatarClass(hue),
      )}
      aria-hidden="true"
    >
      {displayNameInitial(name)}
    </span>
  );
}
