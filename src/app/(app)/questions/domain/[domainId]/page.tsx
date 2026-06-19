import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { listQuestions, listCategories, listLevels } from "@/actions/question.actions";
import { listDomains } from "@/actions/domain.actions";
import { QuestionFiltersBar } from "./question-filters";
import { AddKnowledgeDialog } from "./add-knowledge-dialog";
import type { InterviewLevel, InterviewType } from "@/types/domain";

export const dynamic = "force-dynamic";

interface DomainQuestionsPageProps {
  params: Promise<{ domainId: string }>;
  searchParams: Promise<{
    level?: string;
    interviewType?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function DomainQuestionsPage({
  params,
  searchParams,
}: DomainQuestionsPageProps) {
  const { domainId } = await params;
  const sp = await searchParams;

  const domains = await listDomains();
  const domain = domains.find((d) => d.id === domainId);
  if (!domain) notFound();

  const [questions, categories, levels] = await Promise.all([
    listQuestions({
      level: sp.level as InterviewLevel | undefined,
      interviewType: sp.interviewType as InterviewType | undefined,
      category: sp.category,
      search: sp.search,
      domainId,
    }),
    listCategories(domainId),
    listLevels(domainId),
  ]);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 max-w-4xl mx-auto w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Link href="/questions" className="text-sm text-muted-foreground hover:text-foreground">
            ← Domains
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{domain.name}</h1>
          {domain.description && (
            <p className="text-sm text-muted-foreground">{domain.description}</p>
          )}
        </div>
        <AddKnowledgeDialog domainId={domainId} />
      </div>

      <QuestionFiltersBar
        domainId={domainId}
        categories={categories}
        levels={levels}
        isCustomDomain={domain.isCustom}
      />

      <p className="text-sm text-muted-foreground">{questions.length} questions</p>

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No questions yet in this domain{categories.length === 0 ? " - check back after the AI finishes generating them" : ""}.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {questions.map((q) => (
          <li key={q.id}>
            <Link
              href={`/questions/${q.id}`}
              className="flex flex-col gap-1.5 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-accent/40"
            >
              <div className="flex items-center gap-2 flex-wrap">
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
