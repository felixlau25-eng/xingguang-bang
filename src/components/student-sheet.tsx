import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, PenLine, Smile } from "lucide-react";
import { toast } from "sonner";
import {
  removeStudent,
  renameStudent,
  undoLastAward,
  type StudentRow,
} from "@/lib/board";
import { CATEGORIES, splitStars, type CategoryId } from "@/lib/stars";
import { getTeacherToken } from "@/lib/teacher-session";
import { AwardButtons, UndoAwardHint } from "@/components/award-buttons";
import { BigStarCount, SmallStarTrack, StarMark } from "@/components/star-mark";
import { StudentAvatar } from "@/components/student-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORY_ICON = {
  exercise: BookOpen,
  dictation: PenLine,
  conduct: Smile,
} as const;

export function StudentSheet({
  student,
  rank,
  teacherMode,
  open,
  onOpenChange,
  pending,
  onAward,
}: {
  student: StudentRow | null;
  rank: number;
  teacherMode: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onAward: (category: CategoryId, stars: number) => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(1);
  const [rename, setRename] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (student) setRename(student.name);
  }, [student]);

  const renameMutation = useMutation({
    mutationFn: async () => {
      const token = getTeacherToken();
      if (!token || !student) throw new Error("請先以導師身份解鎖");
      return renameStudent({ data: { token, id: student.id, name: rename } });
    },
    onSuccess: (board) => {
      queryClient.setQueryData(["board"], board);
      toast.success("已更新姓名");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "未能改名");
    },
  });

  const undoMutation = useMutation({
    mutationFn: async () => {
      const token = getTeacherToken();
      if (!token || !student) throw new Error("請先以導師身份解鎖");
      return undoLastAward({ data: { token, studentId: student.id } });
    },
    onSuccess: (board) => {
      queryClient.setQueryData(["board"], board);
      toast.success("已撤回最近一次加星");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "未能撤回");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = getTeacherToken();
      if (!token || !student) throw new Error("請先以導師身份解鎖");
      return removeStudent({ data: { token, id: student.id } });
    },
    onSuccess: (board) => {
      queryClient.setQueryData(["board"], board);
      toast.success("已移出榜單");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "未能移除");
    },
  });

  if (!student) return null;
  const { big, small, toNext, total } = splitStars(student.total);
  const maxCat = Math.max(student.exercise, student.dictation, student.conduct, 1);

  function onRename(event: FormEvent) {
    event.preventDefault();
    if (!rename.trim()) return;
    renameMutation.mutate();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next && student) setRename(student.name);
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">{student.name} 的進度</DialogTitle>
            <DialogDescription className="sr-only">
              查看星星數量與得分來源。同學不能更改紀錄。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-1">
            <StudentAvatar name={student.name} hue={student.hue} size="lg" />
            <div className="text-center">
              <p className="font-display text-2xl font-semibold">{student.name}</p>
              <p className="text-sm text-muted">
                第 {rank} 名 · 合共 {total} 顆小星星
              </p>
            </div>
            <div className="flex items-center gap-3">
              <BigStarCount count={big} />
              <span className="text-sm text-muted">大星星</span>
            </div>
            <SmallStarTrack filled={small} />
            <p className="text-sm text-muted">
              {small === 0 && total > 0
                ? "剛剛換到大星星，繼續累積下一顆。"
                : `再加 ${toNext} 顆小星星，就有新的大星星。`}
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICON[category.id];
              const value = student[category.id];
              return (
                <li
                  key={category.id}
                  className="rounded-lg bg-surface px-3 py-2.5 shadow-card"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-fg">
                      <Icon className="size-4 text-accent" />
                      {category.label}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums text-muted">
                      <StarMark size="sm" />
                      {value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round((value / maxCat) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {teacherMode ? (
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <p className="text-sm font-medium">為這位同學加星</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="award-amount" className="text-muted">
                  數量
                </Label>
                <Input
                  id="award-amount"
                  type="number"
                  min={1}
                  max={20}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 1)}
                  className="w-24"
                />
              </div>
              <AwardButtons
                disabled={pending}
                onAward={(category) =>
                  onAward(category, Math.min(20, Math.max(1, amount)))
                }
              />
              <UndoAwardHint
                disabled={undoMutation.isPending || total === 0}
                onUndo={() => undoMutation.mutate()}
              />
              <form className="flex gap-2" onSubmit={onRename}>
                <Input
                  value={rename}
                  onChange={(e) => setRename(e.target.value)}
                  maxLength={16}
                  aria-label="更改姓名"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={
                    renameMutation.isPending || rename.trim() === student.name
                  }
                >
                  改名
                </Button>
              </form>
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                移出榜單
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-subtle">
              這是只讀進度。星星由老師根據練習、默書同課堂表現加入。
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移出 {student.name}？</AlertDialogTitle>
            <AlertDialogDescription>
              這位同學的星星紀錄會一併刪除，而且不能還原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground"
              onClick={() => deleteMutation.mutate()}
            >
              確認移出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
