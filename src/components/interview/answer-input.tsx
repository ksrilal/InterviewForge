"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isPending?: boolean;
}

export function AnswerInput({ value, onChange, onSubmit, disabled, isPending }: AnswerInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer..."
        rows={8}
        disabled={disabled}
        className="resize-none text-base"
        autoFocus
      />
      <Button
        onClick={onSubmit}
        disabled={disabled || isPending || value.trim().length === 0}
        size="lg"
        className="sticky bottom-20 md:bottom-0 w-full"
      >
        {isPending ? "Evaluating..." : "Submit Answer"}
      </Button>
    </div>
  );
}
