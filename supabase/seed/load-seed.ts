// One-time loader: reads a seed JSON file and inserts into the `questions`
// table. Run with: npm run seed -- <filename>
// Defaults to questions.seed.json if no filename given.
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY - loaded from
// .env.local since this script runs outside the Next.js runtime, which is
// the only thing that auto-loads .env.local for you.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import WebSocket from "ws";

config({ path: join(__dirname, "..", "..", ".env.local") });

interface SeedQuestion {
  category: string;
  topic: string;
  question_type: string;
  difficulty: number;
  level: string;
  interview_types: string[];
  skill_axes: string[];
  prompt: string;
  expected_answer_areas: string[];
  common_mistakes: string[];
  follow_up_seeds: string[];
  scoring_rubric: Record<string, string>;
  source: string;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  // supabase-js always constructs a Realtime client, even though this
  // one-shot script only needs REST calls. Node 20 has no native WebSocket,
  // so hand it the "ws" package as the transport to satisfy that constructor.
  const supabase = createClient(url, key, {
    realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket },
  });

  const fileName = process.argv[2] || "questions.seed.json";
  const seedPath = join(__dirname, fileName);
  const questions: SeedQuestion[] = JSON.parse(readFileSync(seedPath, "utf-8"));

  console.log(`Loading ${questions.length} questions from ${fileName}...`);

  const { error } = await supabase.from("questions").insert(questions);
  if (error) {
    console.error("Seed insert failed:", error.message || JSON.stringify(error));
    process.exit(1);
  }

  console.log(`Inserted ${questions.length} questions successfully.`);
}

main();
