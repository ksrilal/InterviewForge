"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startSessionFromQuestion } from "@/actions/session.actions";
import { useInterviewSessionStore } from "@/store/interview-session.store";

interface StartInterviewButtonProps {
  questionId: string;
}

export function StartInterviewButton({ questionId }: StartInterviewButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initSession = useInterviewSessionStore((s) => s.initSession);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startSessionFromQuestion(questionId);
      if (!result.ok || !result.data) {
        setError(result.error ?? "Failed to start interview.");
        return;
      }
      initSession(result.data.sessionId, {
        sessionQuestionId: result.data.firstSessionQuestionId,
        prompt: result.data.firstQuestionPrompt,
        followUpDepth: 0,
        questionType: result.data.firstQuestionType,
        language: result.data.firstQuestionLanguage,
      });
      router.push(`/interview/${result.data.sessionId}`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleClick} disabled={isPending} className="w-fit">
        {isPending ? "Starting..." : "Start Interview"}
      </Button>
    </div>
  );
}
