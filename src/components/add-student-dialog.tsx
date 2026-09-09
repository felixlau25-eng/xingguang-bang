import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addStudent } from "@/lib/board";
import { getTeacherToken } from "@/lib/teacher-session";
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

export function AddStudentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = getTeacherToken();
    if (!token) {
      toast.error("請先以導師身份解鎖");
      return;
    }
    setPending(true);
    try {
      const result = await addStudent({ data: { token, name } });
      queryClient.setQueryData(["board"], result.board);
      toast.success(`已加入 ${name.trim()}`);
      setName("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "未能新增同學");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增同學</DialogTitle>
          <DialogDescription>
            輸入課堂上使用的姓名或稱呼。同學之後只能查看，不能自己改星星。
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-4">
            <Label htmlFor="student-name">姓名</Label>
            <Input
              id="student-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如 陳嘉怡"
              maxLength={16}
              required
            />
          </div>
          <Button type="submit" disabled={pending || name.trim().length === 0}>
            {pending ? "加入中…" : "加入榜上"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
