import { createFileRoute } from "@tanstack/react-router";
import { getBoard } from "@/lib/board";
import { TeacherDesk } from "@/components/teacher-desk";
import { useTeacherMode } from "@/hooks/use-teacher-mode";

export const Route = createFileRoute("/teacher")({
  loader: () => getBoard(),
  component: TeacherPage,
});

function TeacherPage() {
  const initialBoard = Route.useLoaderData();
  const { teacherMode } = useTeacherMode();
  return <TeacherDesk teacherMode={teacherMode} initialBoard={initialBoard} />;
}
