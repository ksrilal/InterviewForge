"use client";

import Editor from "@monaco-editor/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CodeLanguage } from "@/types/domain";

// Monaco's language ids don't all match our CodeLanguage values 1:1
// (e.g. "csharp" happens to match, but kept explicit so this doesn't
// silently break if either vocabulary changes).
const MONACO_LANGUAGE_ID: Record<CodeLanguage, string> = {
  csharp: "csharp",
  java: "java",
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  sql: "sql",
  go: "go",
  cpp: "cpp",
};

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  csharp: "C#",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sql: "SQL / PostgreSQL",
  go: "Go",
  cpp: "C++",
};

export const LANGUAGE_OPTIONS = Object.keys(LANGUAGE_LABELS) as CodeLanguage[];

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  onLanguageChange: (language: CodeLanguage) => void;
  disabled?: boolean;
  allowLanguageChange?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language,
  onLanguageChange,
  disabled,
  allowLanguageChange = true,
}: CodeEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      {allowLanguageChange && (
        <Select
          value={language}
          onValueChange={(v) => v && onLanguageChange(v as CodeLanguage)}
          disabled={disabled}
        >
          <SelectTrigger size="sm" className="w-full sm:w-48">
            <SelectValue placeholder="Language">
              {(value: string | null) => (value ? LANGUAGE_LABELS[value as CodeLanguage] : "Language")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <Editor
          height="min(50vh, 420px)"
          theme="vs-dark"
          language={MONACO_LANGUAGE_ID[language]}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          options={{
            readOnly: disabled,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
