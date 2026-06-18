import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { listQuestions, listCategories } from "@/actions/question.actions";
import { QuestionFiltersBar } from "./question-filters";
import type { InterviewLevel, InterviewType } from "@/types/domain";

export const dynamic = "force-dynamic";

interface QuestionsPageProps {
  searchParams: Promise<{
    level?: string;
    interviewType?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const params = await searchParams;
  const [questions, categories] = await Promise.all([
    listQuestions({
      level: params.level as InterviewLevel | undefined,
      interviewType: params.interviewType as InterviewType | undefined,
      category: params.category,
      search: params.search,
    }),
    listCategories(),
  ]);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Question Bank</h1>

      <QuestionFiltersBar categories={categories} />

      <p className="text-sm text-muted-foreground">{questions.length} questions</p>

      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <li key={q.id}>
            <Link
              href={`/questions/${q.id}`}
              className="flex flex-col gap-1.5 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-accent/40"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{q.category}</Badge>
                <Badge variant="outline" className="capitalize">
                  {q.level.replace("_", " ")}
                </Badge>
                <Badge variant="outline">Difficulty {q.difficulty}</Badge>
              </div>
              <p className="text-foreground">{q.prompt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
