"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addKnowledgeToDomain } from "@/actions/domain.actions";

type InputMode = "text" | "file";

interface AddKnowledgeDialogProps {
  domainId: string;
}

export function AddKnowledgeDialog({ domainId }: AddKnowledgeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setText("");
    setFile(null);
    setMode("text");
    setError(null);
  }

  function handleSubmit() {
    setError(null);

    const formData = new FormData();
    if (mode === "text") {
      formData.set("text", text);
    } else if (file) {
      formData.set("file", file);
    }

    startTransition(async () => {
      const result = await addKnowledgeToDomain(domainId, formData);
      if (!result.ok || !result.data) {
        setError(result.error ?? "Failed to add questions.");
        return;
      }
      setOpen(false);
      reset();
      setSuccess(`Added ${result.data.questionsGenerated} new question(s).`);
      router.refresh();
    });
  }

  const canSubmit = mode === "text" ? text.trim().length > 0 : !!file;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          + Add more questions
        </DialogTrigger>
        <DialogContent closeButtonDisabled={isPending}>
          <DialogHeader>
            <DialogTitle>Add more questions to this domain</DialogTitle>
            <DialogDescription>
              Paste more text or upload another markdown/PDF file and the AI will generate
              additional categorized questions for this domain.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Tabs value={mode} onValueChange={(v) => setMode(v as InputMode)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="text">Paste text</TabsTrigger>
                <TabsTrigger value="file">Upload file</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "text" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="knowledge-text">Content</Label>
                <Textarea
                  id="knowledge-text"
                  placeholder="Paste a job description, resume text, notes, or a list of technologies..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-32"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="knowledge-file">Markdown or PDF file</Label>
                <Input
                  id="knowledge-file"
                  type="file"
                  accept=".md,.markdown,.txt,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !canSubmit}>
              {isPending ? "Generating questions..." : "Generate questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {success && <p className="text-sm text-muted-foreground">{success}</p>}
    </>
  );
}
