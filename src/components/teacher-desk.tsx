import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { zhHK } from "date-fns/locale";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  changePin,
  getBoard,
  lockTeacher,
  updateClassName,
  type BoardPayload,
} from "@/lib/board";
import { categoryLabel, splitStars } from "@/lib/stars";
import {
  clearTeacherToken,
  getTeacherToken,
  setTeacherToken,
} from "@/lib/teacher-session";
import { AddStudentDialog } from "@/components/add-student-dialog";
import { TeacherUnlockDialog } from "@/components/teacher-unlock";
import { BigStarCount, SmallStarTrack, StarMark } from "@/components/star-mark";
import { StudentAvatar } from "@/components/student-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TeacherDesk({
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
    enabled: teacherMode,
  });
  const [unlockOpen, setUnlockOpen] = useState(!teacherMode);
  const [addOpen, setAddOpen] = useState(false);
  const [className, setClassName] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");

  const board = boardQuery.data;
  const nameValue = className || board?.className || "";

  const classMutation = useMutation({
    mutationFn: async () => {
      const token = getTeacherToken();
      if (!token) throw new Error("請先以導師身份解鎖");
      return updateClassName({ data: { token, className: nameValue } });
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["board"], next);
      toast.success("已更新班名");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "未能更新班名");
    },
  });

  async function onChangePin(event: FormEvent) {
    event.preventDefault();
    const token = getTeacherToken();
    if (!token) {
      toast.error("請先以導師身份解鎖");
      return;
    }
    try {
      const result = await changePin({
        data: { token, currentPin, nextPin },
      });
      setTeacherToken(result.token);
      queryClient.setQueryData(["teacher-session"], { ok: true });
      setCurrentPin("");
      setNextPin("");
      toast.success("密碼已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "未能更改密碼");
    }
  }

  async function onLock() {
    const token = getTeacherToken();
    if (token) {
      try {
        await lockTeacher({ data: { token } });
      } catch {
        /* still clear locally */
      }
    }
    clearTeacherToken();
    queryClient.setQueryData(["teacher-session"], { ok: false });
    toast.success("已離開老師模式");
  }

  if (!teacherMode) {
    return (
      <div className="min-h-dvh bg-bg text-fg">
        <DeskHeader onLock={onLock} locked />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h2 className="font-display text-2xl font-semibold">老師工作台已上鎖</h2>
          <p className="mt-2 text-sm text-muted">
            同學不能在這裡改星星。請輸入導師密碼後繼續。
          </p>
          <Button className="mt-6" onClick={() => setUnlockOpen(true)}>
            輸入導師密碼
          </Button>
        </main>
        <TeacherUnlockDialog open={unlockOpen} onOpenChange={setUnlockOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <DeskHeader onLock={onLock} />
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-xl bg-surface p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold">班別設定</h2>
          <p className="mt-1 text-sm text-muted">
            班名會顯示在積分榜頂部。預設密碼是 2468，請盡快改成只有老師知道的數字。
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              classMutation.mutate();
            }}
          >
            <Label htmlFor="class-name" className="sr-only">
              班名
            </Label>
            <Input
              id="class-name"
              value={nameValue}
              onChange={(e) => setClassName(e.target.value)}
              maxLength={20}
            />
            <Button type="submit" disabled={classMutation.isPending}>
              儲存班名
            </Button>
          </form>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={onChangePin}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-pin">現時密碼</Label>
              <Input
                id="current-pin"
                type="password"
                inputMode="numeric"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next-pin">新密碼</Label>
              <Input
                id="next-pin"
                type="password"
                inputMode="numeric"
                value={nextPin}
                onChange={(e) => setNextPin(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary">
                更改密碼
              </Button>
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">同學名單</h2>
            <Button onClick={() => setAddOpen(true)}>新增同學</Button>
          </div>
          <ul className="flex flex-col gap-2">
            {(board?.students ?? []).map((student, index) => {
              const { big, small } = splitStars(student.total);
              return (
                <li
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-card"
                >
                  <span className="w-6 text-center text-sm tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <StudentAvatar name={student.name} hue={student.hue} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{student.name}</p>
                    <SmallStarTrack filled={small} />
                  </div>
                  <BigStarCount count={big} />
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="font-display mb-3 text-xl font-semibold">加星紀錄</h2>
          <ul className="divide-y divide-line rounded-xl bg-surface shadow-card">
            {(board?.recent ?? []).map((award) => (
              <li
                key={award.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">
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
                  <StarMark size="sm" />+{award.stars}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function DeskHeader({
  onLock,
  locked = false,
}: {
  onLock: () => void;
  locked?: boolean;
}) {
  return (
    <header className="bg-board text-board-fg">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Button variant="board" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            返回星光榜
          </Link>
        </Button>
        {locked ? null : (
          <Button variant="board" onClick={onLock}>
            <LogOut className="size-4" />
            離開老師模式
          </Button>
        )}
      </div>
    </header>
  );
}
