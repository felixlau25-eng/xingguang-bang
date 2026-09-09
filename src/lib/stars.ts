export const STAR_THRESHOLD = 10;

export const CATEGORIES = [
  {
    id: "exercise",
    label: "補充練習",
    short: "練習",
    hint: "完成一頁補充練習",
  },
  {
    id: "dictation",
    label: "默書試默",
    short: "默書",
    hint: "完成一次默書或試默",
  },
  {
    id: "conduct",
    label: "上課表現",
    short: "表現",
    hint: "上課表現良好",
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const AVATAR_CLASS = [
  "bg-avatar-0 text-avatar-0-fg",
  "bg-avatar-1 text-avatar-1-fg",
  "bg-avatar-2 text-avatar-2-fg",
  "bg-avatar-3 text-avatar-3-fg",
  "bg-avatar-4 text-avatar-4-fg",
  "bg-avatar-5 text-avatar-5-fg",
] as const;

export function avatarClass(hue: number) {
  return AVATAR_CLASS[((hue % AVATAR_CLASS.length) + AVATAR_CLASS.length) % AVATAR_CLASS.length];
}

export function splitStars(total: number) {
  const safe = Math.max(0, Math.floor(total));
  const big = Math.floor(safe / STAR_THRESHOLD);
  const small = safe % STAR_THRESHOLD;
  return {
    big,
    small,
    total: safe,
    toNext: small === 0 && safe > 0 ? STAR_THRESHOLD : STAR_THRESHOLD - small,
  };
}

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function displayNameInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "同";
  return trimmed.slice(-1);
}
