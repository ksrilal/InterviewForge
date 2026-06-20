-- skill_axis was a fixed Postgres enum (architecture/system_design/.../ai),
-- forced onto every domain's questions even though that vocabulary only
-- describes Software Engineering. Custom domains (e.g. "Interior Designer")
-- need their own AI-invented skill categories for the radar to mean
-- anything - loosen the column to free text so they can hold those, while
-- the Software Engineering domain keeps using the same canonical 10 values
-- as before (enforced in app code now, not the DB type).

alter table questions
  alter column skill_axes type text[] using skill_axes::text[];

alter table skill_score_events
  alter column skill_axis type text using skill_axis::text;

alter table skill_snapshots
  alter column skill_axis type text using skill_axis::text;
