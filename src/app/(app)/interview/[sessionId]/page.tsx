import { notFound } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "./session-data";
import { InterviewScreen } from "./interview-screen";
import { MOCK_MODE_CONFIG } from "@/lib/scoring/mock-templates";
import type { SessionQuestionRow } from "@/lib/supabase/types";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function InterviewSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  const context = await getSessionContext(sessionId);
  if (!context) notFound();

  const supabase = getSupabaseServerClient();
  const { data: latestSq } = await supabase
    .from("session_questions")
    .select("*")
    .eq("session_id", sessionId)
    .order("thread_position", { ascending: false })
    .limit(1)
    .single();

  if (!latestSq) notFound();
  const sq = latestSq as SessionQuestionRow;

  const config = MOCK_MODE_CONFIG[context.session.mode];

  return (
    <InterviewScreen
      sessionId={sessionId}
      startedAt={context.session.started_at}
      timeLimitSeconds={context.session.time_limit_seconds}
      initialQuestion={{
        sessionQuestionId: sq.id,
        prompt: sq.prompt_text,
        followUpDepth: sq.follow_up_depth,
      }}
      initialCategory={context.category}
      initialDifficulty={context.difficulty}
      initialRootCount={context.rootCount}
      rootTotal={config.rootQuestionCount}
      level={context.session.level}
      mode={context.session.mode}
    />
  );
}
