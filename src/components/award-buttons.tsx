import { BookOpen, PenLine, Smile, Undo2 } from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/lib/stars";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CATEGORY_ICON = {
  exercise: BookOpen,
  dictation: PenLine,
  conduct: Smile,
} as const;

export function AwardButtons({
  onAward,
  disabled,
  compact = false,
}: {
  onAward: (category: CategoryId) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-1.5", compact && "w-full")}>
      {CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICON[category.id];
        return (
          <Button
            key={category.id}
            type="button"
            variant="secondary"
            size={compact ? "sm" : "default"}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onAward(category.id);
            }}
            className="px-2"
          >
            <Icon />
            <span className="truncate">{category.short}</span>
          </Button>
        );
      })}
    </div>
  );
}

export function UndoAwardHint({
  onUndo,
  disabled,
}: {
  onUndo: () => void;
  disabled?: boolean;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onUndo} disabled={disabled}>
      <Undo2 className="size-4" />
      撤回最近一次
    </Button>
  );
}
