-- Adds an 'ai' value to interview_type and skill_axis to cover the
-- AI-assisted-engineering and LLM/AI-feature-building question batches
-- (AI coding tool usage, RAG, prompt engineering, LLM integration, AI
-- governance/risk) that the original schema's enums had no slot for.
alter type interview_type add value if not exists 'ai';
alter type skill_axis add value if not exists 'ai';
