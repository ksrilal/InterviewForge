"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuestionCard } from "@/components/interview/question-card";
import { AnswerInput } from "@/components/interview/answer-input";
import { EvaluationPanel } from "@/components/interview/evaluation-panel";
import { ThreadProgress } from "@/components/interview/thread-progress";
import { SessionTimer } from "@/components/interview/session-timer";
import { useInterviewSessionStore } from "@/store/interview-session.store";
import { submitAnswer } from "@/actions/answer.actions";
import { endSession } from "@/actions/session.actions";
import type { InterviewLevel, SessionMode } from "@/types/domain";

interface InterviewScreenProps {
  sessionId: string;
  startedAt: string;
  timeLimitSeconds: number | null;
  initialQuestion: { sessionQuestionId: string; prompt: string; followUpDepth: number };
  initialCategory: string | null;
  initialDifficulty: number | null;
  initialRootCount: number;
  rootTotal: number;
  level: InterviewLevel;
  mode: SessionMode;
}

export function InterviewScreen({
  sessionId,
  startedAt,
  timeLimitSeconds,
  initialQuestion,
  initialCategory,
  initialDifficulty,
  initialRootCount,
  rootTotal,
}: InterviewScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rootCount, setRootCount] = useState(initialRootCount);

  const {
    sessionId: storedSessionId,
    currentQuestion,
    draftAnswer,
    status,
    lastEvaluation,
    evaluationError,
    initSession,
    setDraftAnswer,
    startEvaluating,
    receiveEvaluation,
    setEvaluationError,
    advanceToQuestion,
    completeSession,
  } = useInterviewSessionStore();

  useEffect(() => {
    if (storedSessionId !== sessionId) {
      initSession(sessionId, initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  function handleSubmit() {
    if (!currentQuestion) return;
    startEvaluating();
    startTransition(async () => {
      const result = await submitAnswer(currentQuestion.sessionQuestionId, draftAnswer);
      if (!result.ok || !result.data) {
        setEvaluationError(result.error ?? "Evaluation failed. Your answer was saved.");
        return;
      }
      receiveEvaluation(result.data.evaluation);

      if (result.data.nextStep.type === "FOLLOW_UP") {
        setPendingNext({
          sessionQuestionId: result.data.nextStep.sessionQuestionId,
          prompt: result.data.nextStep.prompt,
          followUpDepth: result.data.nextStep.depth,
        });
      } else if (result.data.nextStep.type === "NEW_TOPIC") {
        setRootCount((c) => c + 1);
        setPendingNext({
          sessionQuestionId: result.data.nextStep.sessionQuestionId,
          prompt: result.data.nextStep.prompt,
          followUpDepth: 0,
        });
      } else {
        setPendingNext(null);
        setSessionComplete(true);
      }
    });
  }

  const [pendingNext, setPendingNext] = useState<typeof currentQuestion>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  function handleContinue() {
    if (sessionComplete) {
      handleEnd();
      return;
    }
    if (pendingNext) {
      advanceToQuestion(pendingNext);
      setPendingNext(null);
    }
  }

  function handleEnd() {
    completeSession();
    startTransition(async () => {
      await endSession(sessionId);
      router.push(`/interview/${sessionId}/summary`);
    });
  }

  function handleTimerExpire() {
    handleEnd();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <ThreadProgress
          rootCount={rootCount}
          rootTotal={rootTotal}
          followUpDepth={currentQuestion?.followUpDepth ?? 0}
        />
        {timeLimitSeconds && (
          <SessionTimer startedAt={startedAt} timeLimitSeconds={timeLimitSeconds} onExpire={handleTimerExpire} />
        )}
      </div>

      {currentQuestion && (
        <QuestionCard
          prompt={currentQuestion.prompt}
          category={currentQuestion.followUpDepth === 0 ? initialCategory ?? undefined : undefined}
          difficulty={currentQuestion.followUpDepth === 0 ? initialDifficulty ?? undefined : undefined}
        />
      )}

      {(status === "answering" || status === "evaluating") && (
        <AnswerInput
          value={draftAnswer}
          onChange={setDraftAnswer}
          onSubmit={handleSubmit}
          disabled={status === "evaluating"}
          isPending={isPending || status === "evaluating"}
        />
      )}

      {evaluationError && <p className="text-sm text-destructive">{evaluationError}</p>}

      {status === "showing_result" && lastEvaluation && (
        <div className="flex flex-col gap-4">
          <EvaluationPanel evaluation={lastEvaluation} />
          <div className="flex flex-col gap-2">
            <Button onClick={handleContinue} size="lg" disabled={isPending}>
              {sessionComplete ? "View Summary" : "Continue"}
            </Button>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" size="lg" />}>
                End Session
              </DialogTrigger>
              <DialogContent closeButtonDisabled={isPending}>
                <DialogHeader>
                  <DialogTitle>End this session?</DialogTitle>
                  <DialogDescription>
                    You&apos;ll see your full summary and scores after ending.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" disabled={isPending} />}>
                    Cancel
                  </DialogClose>
                  <Button onClick={handleEnd} disabled={isPending}>
                    End Session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}
