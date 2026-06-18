# Wireframes (low-fidelity, mobile-first)

All wireframes show the mobile (phone) layout first since that's the harder constraint; desktop simply adds a left/top nav bar and may go to 2-column where noted.

## Dashboard (`/dashboard`)

```
┌─────────────────────────────┐
│ InterviewForge        ⚙     │
├─────────────────────────────┤
│  READINESS SCORE             │
│  ┌─────────────────────┐    │
│  │        78            │    │
│  │   Senior · Borderline │    │
│  └─────────────────────┘    │
│                               │
│  [ Start Interview → ]       │
│                               │
│  Skill Radar (mini)          │
│  ╱╲   ╱╲                     │
│  ‖  ⬡⬡⬡  ‖   (9-axis radar)  │
│  ╲╱   ╲╱                     │
│  [ View full radar → ]       │
│                               │
│  Recent Sessions              │
│  ─────────────────────       │
│  Senior · Backend  · 82  ✓   │
│  Mid · System Design· 61  ⚠  │
│  Senior · Behavioral· 74  ✓  │
│  [ View all → ]              │
├─────────────────────────────┤
│  [Home][Interview][Radar][Plan][≡] ← bottom tab bar
└─────────────────────────────┘
```

## New Interview Setup (`/interview/new`)

```
┌─────────────────────────────┐
│ ← New Interview              │
├─────────────────────────────┤
│ LEVEL                        │
│ ( ) Junior  ( ) Mid           │
│ (•) Senior  ( ) Staff         │
│ ( ) Tech Lead                 │
│                               │
│ TYPE                         │
│ ( ) Backend   (•) .NET        │
│ ( ) Architecture ( ) System Design │
│ ( ) Cloud  ( ) DevOps          │
│ ( ) Behavioral ( ) Full Stack │
│                               │
│ MODE                          │
│ [Practice] [15m] [30m] [60m]  │ ← Tabs
│                               │
│ [   Start Interview   ]      │
└─────────────────────────────┘
```

## Live Interview Screen (`/interview/[id]`) — the core surface

```
┌─────────────────────────────┐
│ ⏱ 12:41   Q3 · Follow-up 1   │ ← timer (mock only) + thread progress
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ .NET · Difficulty 3      │ │
│ │                           │ │
│ │ "How does ASP.NET Core    │ │
│ │  implement Dependency     │ │
│ │  Injection under the      │ │
│ │  hood, and what happens   │ │
│ │  if you resolve a scoped  │ │
│ │  service from a singleton?"│
│ └─────────────────────────┘ │
│                               │
│ Your answer:                 │
│ ┌─────────────────────────┐ │
│ │ [textarea, autosize]     │ │
│ │                           │ │
│ │                           │ │
│ └─────────────────────────┘ │
│                               │
│ [        Submit Answer      ]│ ← sticky above keyboard
└─────────────────────────────┘

  ↓ after submit:

┌─────────────────────────────┐
│ Score: 71 / 100              │
│ Accuracy ████████░░ 80       │
│ Depth    █████░░░░░ 55       │
│ Complete ██████░░░░ 60       │
│ Practical████████░░ 78       │
│ Comms    █████████░ 88       │
│ Senior   ██████░░░░ 62       │
│                               │
│ ▸ Strengths                  │
│ ▸ Weaknesses                 │
│ ▸ Missing Concepts            │
│ ▸ Suggested Answer (tap)      │
│                               │
│ "Solid grasp of the basics,   │
│  but you didn't mention       │
│  captive dependencies."       │
│                               │
│ [   Continue → Follow-up   ] │
│ [      End Session          ]│
└─────────────────────────────┘
```

## Session Summary (`/interview/[id]/summary`)

```
┌─────────────────────────────┐
│ ← Session Summary             │
├─────────────────────────────┤
│ Senior · .NET · Practice      │
│ Overall: 74          ✓ Pass  │
│                               │
│ Strengths                    │
│  • Clear DI lifecycle explan. │
│ Weaknesses                   │
│  • Missed captive dependency  │
│  • Shallow on EF perf topics  │
│                               │
│ Full Thread                  │
│ ┌───────────────────────┐   │
│ │ Q1 (root) — 82         │   │
│ │  ↳ Follow-up 1 — 71    │   │
│ │  ↳ Follow-up 2 — 65    │   │
│ │ Q2 (root) — 88         │   │
│ └───────────────────────┘   │
│ [ tap any row for detail ]   │
└─────────────────────────────┘
```

## Skill Radar (`/radar`) — desktop gets 2-column (chart | trend), mobile stacks

```
┌─────────────────────────────┐
│ Skill Radar                  │
├─────────────────────────────┤
│        Architecture           │
│   Leadership ╱╲ System Design │
│         ‖  ⬡⬡⬡  ‖             │
│   Comms      ╲╱      DBs      │
│        DevOps  Security       │
│            Backend  Cloud     │
│                               │
│ Tap an axis: [Architecture]▾  │
│ ┌───────────────────────┐   │
│ │  Trend (last 8 wks)    │   │
│ │     ╱‾‾╲___╱‾          │   │
│ └───────────────────────┘   │
│                               │
│ Axis        Avg   Samples    │
│ Architecture 81    14         │
│ System Design 68   9          │
│ Databases    74    22         │
│ ...                            │
└─────────────────────────────┘
```

## Training Plan (`/plan`)

```
┌─────────────────────────────┐
│ Training Plan                │
├─────────────────────────────┤
│ Target: Senior · by 2026-08-15│
│ Readiness: 74 → need 85       │
│                               │
│ Focus Areas                  │
│  🔴 System Design             │
│  🟠 Security                  │
│  🟡 Leadership                │
│                               │
│ This Week's Goal              │
│ "Complete 2 system design     │
│  mocks and review caching     │
│  strategies"                  │
│                               │
│ Today                         │
│ ☐ Answer 3 questions on Caching│
│ ☐ Review CAP theorem notes    │
│                               │
│ [   Regenerate Plan    ]     │
└─────────────────────────────┘
```

## Login (`/login`)

```
┌─────────────────────────────┐
│                               │
│        InterviewForge         │
│                               │
│   ┌─────────────────────┐   │
│   │ Username              │   │
│   └─────────────────────┘   │
│   ┌─────────────────────┐   │
│   │ Password               │   │
│   └─────────────────────┘   │
│   [        Log In          ] │
│                               │
└─────────────────────────────┘
```
