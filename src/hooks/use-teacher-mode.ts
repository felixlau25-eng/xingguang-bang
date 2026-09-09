import { useQuery } from "@tanstack/react-query";
import { verifyTeacher } from "@/lib/board";
import { clearTeacherToken, getTeacherToken } from "@/lib/teacher-session";

export function useTeacherMode() {
  const query = useQuery({
    queryKey: ["teacher-session"],
    queryFn: async () => {
      const token = getTeacherToken();
      if (!token) return { ok: false as const };
      const result = await verifyTeacher({ data: { token } });
      if (!result.ok) clearTeacherToken();
      return result;
    },
  });
  return {
    teacherMode: query.data?.ok === true,
    isChecking: query.isLoading,
  };
}
