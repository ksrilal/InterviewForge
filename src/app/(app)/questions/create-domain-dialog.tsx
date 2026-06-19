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
import { createDomainFromUpload } from "@/actions/domain.actions";

type InputMode = "text" | "file";

export function CreateDomainDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<InputMode>("text");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setText("");
    setFile(null);
    setMode("text");
    setError(null);
  }

  function handleCreate() {
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    if (mode === "text") {
      formData.set("text", text);
    } else if (file) {
      formData.set("file", file);
    }

    startTransition(async () => {
      const result = await createDomainFromUpload(formData);
      if (!result.ok || !result.data) {
        setError(result.error ?? "Failed to create domain.");
        return;
      }
      setOpen(false);
      reset();
      router.push(`/questions/domain/${result.data.domainId}`);
    });
  }

  const canSubmit = name.trim() && (mode === "text" ? text.trim() : file);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>+ Add Domain</DialogTrigger>
      <DialogContent closeButtonDisabled={isPending}>
        <DialogHeader>
          <DialogTitle>Create a domain</DialogTitle>
          <DialogDescription>
            Paste text or upload a markdown/PDF file (resume, job description, notes) and the AI
            will generate a categorized question set for it. The domain and its questions are
            private to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="domain-name">Name</Label>
            <Input
              id="domain-name"
              placeholder="e.g. Senior .NET Engineer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="domain-description">Description (optional)</Label>
            <Input
              id="domain-description"
              placeholder="What this domain is for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as InputMode)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="text">Paste text</TabsTrigger>
              <TabsTrigger value="file">Upload file</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "text" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="domain-text">Content</Label>
              <Textarea
                id="domain-text"
                placeholder="Paste a job description, resume text, notes, or a list of technologies..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-32"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="domain-file">Markdown or PDF file</Label>
              <Input
                id="domain-file"
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
          <Button onClick={handleCreate} disabled={isPending || !canSubmit}>
            {isPending ? "Generating questions..." : "Create domain"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
