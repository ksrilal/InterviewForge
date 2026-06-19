import { getSupabaseServerClient } from "@/lib/supabase/server";
import { mapQuestionRow } from "@/lib/mappers";
import type { QuestionRow, SessionRow } from "@/lib/supabase/types";

export interface SessionContext {
  session: SessionRow;
  category: string | null;
  difficulty: number | null;
  rootCount: number;
}

export async function getSessionContext(sessionId: string): Promise<SessionContext | null> {
  const supabase = await getSupabaseServerClient();

  const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).single();
  if (!session) return null;
  const sessionRow = session as SessionRow;

  const { count: rootCount } = await supabase
    .from("session_questions")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("follow_up_depth", 0);

  const { data: latestSq } = await supabase
    .from("session_questions")
    .select("question_id")
    .eq("session_id", sessionId)
    .order("thread_position", { ascending: false })
    .limit(1)
    .maybeSingle();

  let category: string | null = null;
  let difficulty: number | null = null;

  const questionId = (latestSq as { question_id: string | null } | null)?.question_id;
  if (questionId) {
    const { data: question } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .single();
    if (question) {
      const q = mapQuestionRow(question as QuestionRow);
      category = q.category;
      difficulty = q.difficulty;
    }
  }

  return { session: sessionRow, category, difficulty, rootCount: rootCount ?? 0 };
}
