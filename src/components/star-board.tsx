import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { zhHK } from "date-fns/locale";
import { BookOpen, Lock, PenLine, Plus, Search, Smile } from "lucide-react";
import { toast } from "sonner";
import { awardStars, getBoard, type BoardPayload, type StudentRow } from "@/lib/board";
import {
  categoryLabel,
  splitStars,
  type CategoryId,
} from "@/lib/stars";
import { getTeacherToken } from "@/lib/teacher-session";
import { cn } from "@/lib/utils";
import { AddStudentDialog } from "@/components/add-student-dialog";
import { AwardButtons } from "@/components/award-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BigStarCount, SmallStarTrack, StarMark } from "@/components/star-mark";
import { StudentAvatar } from "@/components/student-avatar";
import { StudentSheet } from "@/components/student-sheet";
import { TeacherUnlockDialog } from "@/components/teacher-unlock";

const CATEGORY_ICON = {
  exercise: BookOpen,
  dictation: PenLine,
  conduct: Smile,
} as const;

function rankLabel(rank: number) {
  return `第 ${rank} 名`;
}

export function StarBoard({
  teacherMode,
  initialBoard,
}: {
  teacherMode: boolean;
  initialBoard?: BoardPayload;
}) {
  const queryClient = useQueryClient();
  const boardQuery = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initialBoard,
  });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const awardMutation = useMutation({
    mutationFn: (input: {
      studentId: number;
      category: CategoryId;
      stars: number;
    }) => {
      const token = getTeacherToken();
      if (!token) throw new Error("請先以導師身份解鎖");
      return awardStars({ data: { token, ...input } });
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["board"], result.board);
      if (result.converted > 0) {
        toast.success(
          `${result.name} 集齊 10 顆小星星，換到 ${result.converted} 顆大星星`,
        );
      } else {
        toast.success(`已為 ${result.name} 加上小星星`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "暫時未能加星");
    },
  });

  const board = boardQuery.data;
  const students = board?.students ?? [];
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return students;
    return students.filter((s) => s.name.includes(q));
  }, [students, query]);

  const totals = useMemo(() => {
    const big = students.reduce((sum, s) => sum + Math.floor(s.total / 10), 0);
    return { people: students.length, big };
  }, [students]);

  const podium = filtered.slice(0, 3);
  const selected = students.find((s) => s.id === selectedId) ?? null;
  const selectedRank = selected
    ? students.findIndex((s) => s.id === selected.id) + 1
    : 0;

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg text-fg">
      <header className="bg-board text-board-fg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs tracking-wide text-board-muted">學生獎勵計劃</p>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">星光榜</h1>
          </div>
          {teacherMode ? (
            <Button variant="board" asChild>
              <Link to="/teacher">老師工作台</Link>
            </Button>
          ) : (
            <Button variant="board" onClick={() => setUnlockOpen(true)}>
              <Lock className="size-4" />
              老師入口
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rise-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted">本班</p>
            <h2 className="font-display text-3xl font-semibold">
              {board?.className ?? "載入中"}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {totals.people} 位同學 · {totals.big} 顆大星星 · 每 10 顆小星星換成 1 顆大星星
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-72">
            <label className="sr-only" htmlFor="search-name">
              搞自己的名字
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
              <Input
                id="search-name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搞自己的名字"
                className="pl-9"
              />
            </div>
            {teacherMode ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                新增同學
              </Button>
            ) : null}
          </div>
        </section>

        {boardQuery.isLoading ? (
          <BoardSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyBoard
            searching={query.trim().length > 0}
            teacherMode={teacherMode}
            onAdd={() => setAddOpen(true)}
          />
        ) : (
          <>
            {query.trim() ? null : (
              <div className="hidden md:block">
                <Podium
                  students={podium}
                  all={students}
                  teacherMode={teacherMode}
                  pending={awardMutation.isPending}
                  onSelect={setSelectedId}
                  onAward={(studentId, category) =>
                    awardMutation.mutate({ studentId, category, stars: 1 })
                  }
                />
              </div>
            )}

            <section className="rise-in rise-in-2 flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-semibold">
                  {query.trim() ? "搜尋結果" : "全班排名"}
                </h3>
                <p className="text-xs text-subtle">同學只可查看，不能更改星星</p>
              </div>
              <ul className="flex flex-col gap-2">
                {(query.trim() ? filtered : students).map((student) => {
                  const rank = students.findIndex((s) => s.id === student.id) + 1;
                  const hideOnDesktopPodium =
                    !query.trim() && rank <= 3 && students.length >= 3;
                  return (
                    <li
                      key={student.id}
                      className={hideOnDesktopPodium ? "md:hidden" : undefined}
                    >
                      <StudentRowCard
                        student={student}
                        rank={rank}
                        teacherMode={teacherMode}
                        pending={awardMutation.isPending}
                        onOpen={() => setSelectedId(student.id)}
                        onAward={(category) =>
                          awardMutation.mutate({
                            studentId: student.id,
                            category,
                            stars: 1,
                          })
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}

        {board?.recent.length ? (
          <section className="rise-in rise-in-3">
            <h3 className="font-display mb-3 text-lg font-semibold">最近加星</h3>
            <ul className="divide-y divide-line rounded-xl bg-surface shadow-card">
              {board.recent.slice(0, 8).map((award) => {
                const Icon = CATEGORY_ICON[award.category];
                return (
                  <li
                    key={award.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent/8 text-accent">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-fg">
                        {award.studentName}
                        <span className="text-muted">
                          {" "}
                          · {categoryLabel(award.category)}
                        </span>
                      </p>
                      <p className="text-xs text-subtle">
                        {formatDistanceToNow(new Date(award.createdAt), {
                          addSuffix: true,
                          locale: zhHK,
                        })}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 tabular-nums text-star">
                      <StarMark size="sm" />
                      +{award.stars}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>

      <StudentSheet
        student={selected}
        rank={selectedRank}
        teacherMode={teacherMode}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        pending={awardMutation.isPending}
        onAward={(category, stars) => {
          if (!selected) return;
          awardMutation.mutate({ studentId: selected.id, category, stars });
        }}
      />
      <TeacherUnlockDialog open={unlockOpen} onOpenChange={setUnlockOpen} />
      <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Podium({
  students,
  all,
  teacherMode,
  pending,
  onSelect,
  onAward,
}: {
  students: StudentRow[];
  all: StudentRow[];
  teacherMode: boolean;
  pending: boolean;
  onSelect: (id: number) => void;
  onAward: (studentId: number, category: CategoryId) => void;
}) {
  if (students.length === 0) return null;
  const usePodium = students.length >= 3;
  const order = usePodium ? [students[1], students[0], students[2]] : students;
  const heights = usePodium ? ["pt-7", "pt-4", "pt-8"] : ["pt-6", "pt-6", "pt-6"];
  const columns =
    order.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : order.length === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <section className="rise-in rise-in-1">
      <div className={cn("grid items-end gap-2 sm:gap-4", columns)}>
        {order.map((student, visualIndex) => {
          const rank = all.findIndex((s) => s.id === student.id) + 1;
          const { big, small } = splitStars(student.total);
          return (
            <div
              key={student.id}
              className={cn(
                "flex min-w-0 w-full flex-col items-center gap-3 overflow-hidden rounded-xl bg-surface px-2 pb-4 shadow-card sm:px-3",
                heights[visualIndex] ?? "pt-6",
                rank === 1 && "bg-elevated",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(student.id)}
                className="flex w-full min-w-0 flex-col items-center gap-3"
              >
                <span className="text-xs font-medium text-muted">{rankLabel(rank)}</span>
                <StudentAvatar name={student.name} hue={student.hue} size="lg" />
                <p className="font-display max-w-full truncate text-center text-base font-semibold sm:text-lg">
                  {student.name}
                </p>
                <div className="flex flex-col items-center gap-2">
                  <BigStarCount count={big} />
                  <SmallStarTrack filled={small} />
                </div>
              </button>
              {teacherMode ? (
                <AwardButtons
                  compact
                  disabled={pending}
                  onAward={(category) => onAward(student.id, category)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StudentRowCard({
  student,
  rank,
  teacherMode,
  pending,
  onOpen,
  onAward,
}: {
  student: StudentRow;
  rank: number;
  teacherMode: boolean;
  pending: boolean;
  onOpen: () => void;
  onAward: (category: CategoryId) => void;
}) {
  const { big, small } = splitStars(student.total);
  return (
    <article className="rounded-xl bg-surface p-3 shadow-card sm:p-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="w-8 text-center text-sm font-medium tabular-nums text-muted">
          {rank}
        </span>
        <StudentAvatar name={student.name} hue={student.hue} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate font-medium">{student.name}</p>
            <Badge variant="star" className="shrink-0">
              <StarMark kind="big" size="sm" />
              {big}
            </Badge>
          </div>
          <div className="mt-1.5">
            <SmallStarTrack filled={small} />
          </div>
        </div>
      </button>
      {teacherMode ? (
        <div className="mt-3 pl-11">
          <AwardButtons disabled={pending} onAward={onAward} />
        </div>
      ) : null}
    </article>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="h-40 rounded-xl bg-surface shadow-card" />
      <div className="h-24 rounded-xl bg-surface shadow-card" />
      <div className="h-24 rounded-xl bg-surface shadow-card" />
    </div>
  );
}

function EmptyBoard({
  searching,
  teacherMode,
  onAdd,
}: {
  searching: boolean;
  teacherMode: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-xl bg-surface px-6 py-16 text-center shadow-card">
      <p className="font-display text-xl font-semibold">
        {searching ? "找不到這位同學" : "榜上還沒有同學"}
      </p>
      <p className="mt-2 text-sm text-muted">
        {searching
          ? "試下用全名或其中一個字搜尋。"
          : teacherMode
            ? "先新增同學，再按表現加上小星星。"
            : "請老師先加入同學名字。"}
      </p>
      {teacherMode && !searching ? (
        <Button className="mt-5" onClick={onAdd}>
          <Plus className="size-4" />
          新增同學
        </Button>
      ) : null}
    </div>
  );
}
