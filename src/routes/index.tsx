import { createFileRoute } from "@tanstack/react-router";
import { getBoard } from "@/lib/board";
import { StarBoard } from "@/components/star-board";
import { useTeacherMode } from "@/hooks/use-teacher-mode";

export const Route = createFileRoute("/")({
  loader: () => getBoard(),
  component: Home,
});

function Home() {
  const initialBoard = Route.useLoaderData();
  const { teacherMode } = useTeacherMode();
  return <StarBoard teacherMode={teacherMode} initialBoard={initialBoard} />;
}
