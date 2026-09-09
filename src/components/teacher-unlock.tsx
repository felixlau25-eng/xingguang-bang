import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { unlockTeacher } from "@/lib/board";
import { setTeacherToken } from "@/lib/teacher-session";
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

export function TeacherUnlockDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [pin, setPin] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await unlockTeacher({ data: { pin } });
      setTeacherToken(result.token);
      queryClient.setQueryData(["teacher-session"], { ok: true });
      toast.success("已進入老師模式");
      setPin("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法解鎖");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>老師入口</DialogTitle>
          <DialogDescription>
            輸入導師密碼後，可以為同學加上小星星。同學看不到這個入口的操作。預設密碼是 2468，登入後請盡快更改。
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="teacher-pin">導師密碼</Label>
            <Input
              id="teacher-pin"
              inputMode="numeric"
              autoComplete="off"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4 至 8 位數字"
              required
            />
          </div>
          <Button type="submit" disabled={pending || pin.length < 4}>
            {pending ? "核對中…" : "解鎖老師模式"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
