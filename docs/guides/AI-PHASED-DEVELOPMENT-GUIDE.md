# AI-Phased Development Guide

> A methodology for breaking complex projects into AI-implementable phases that can be tested incrementally and potentially parallelized across multiple AI agents.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Document Structure](#document-structure)
3. [Writing the Main Plan](#writing-the-main-plan)
4. [Writing Implementation Phases](#writing-implementation-phases)
5. [Phase Design Principles](#phase-design-principles)
6. [Parallel Execution](#parallel-execution)
7. [Prompting AI Agents](#prompting-ai-agents)
8. [Testing Between Phases](#testing-between-phases)
9. [Context Management](#context-management)
10. [Example Workflow](#example-workflow)

---

## Philosophy

### Why Phased Development?

Traditional development often leads to:
- Massive PRs that are hard to review
- Features that don't work because too much was built at once
- Wasted AI tokens on context that isn't needed
- Difficulty identifying where bugs originated

**Phased development solves this by:**
- Breaking work into testable increments
- Keeping AI context focused and minimal
- Allowing parallel work on independent features
- Making debugging easier (you know which phase broke things)

### Core Principles

1. **Each phase = One AI conversation** - A phase should be completable in a single Claude/Gemini session without running out of context
2. **Testable in isolation** - After each phase, you can manually verify it works
3. **Minimal dependencies** - Phases should have clear, minimal dependencies on other phases
4. **No YOLO deployments** - Never implement 20 features and hope they work together

---

## Document Structure

For any significant project, create TWO documents:

```
plans/
├── N_project-name.md              # Main Plan (overview, architecture, decisions)
└── N_project-name-implementation.md  # Implementation Phases (step-by-step)
```

### Main Plan (`N_project-name.md`)

High-level document containing:
- Project overview and goals
- Tech stack decisions
- Architecture diagrams
- Database schema
- API design
- Key decisions and trade-offs
- Future considerations

**Purpose**: Understanding WHAT we're building and WHY

### Implementation Plan (`N_project-name-implementation.md`)

Detailed phases containing:
- Sequential/parallel phase breakdown
- Exact steps per phase
- Files to create/modify
- Manual testing checklist per phase
- Dependencies between phases
- AI prompts for each phase

**Purpose**: Understanding HOW to build it, step by step

---

## Writing the Main Plan

### Required Sections

```markdown
# Project Name - Main Plan

## Overview
- What is this project?
- Who is it for?
- What problem does it solve?

## Tech Stack
| Component | Technology | Justification |
|-----------|------------|---------------|
| Frontend  | Next.js    | SSR, API routes |
| Database  | Supabase   | Free tier, realtime |
| ...       | ...        | ...           |

## Architecture
- System diagram (ASCII or linked image)
- Data flow explanation
- Key components and their responsibilities

## Database Schema
- All tables with columns
- Relationships
- Indexes
- RLS policies (if applicable)

## API Design
- Endpoints list
- Request/response formats
- Authentication method

## Key Decisions
- Trade-offs made and why
- Alternatives considered
- Future migration paths

## Out of Scope (v1)
- Features explicitly NOT included
- Future enhancement ideas
```

### Tips for Main Plan

1. **Be decisive** - Don't leave options open. Pick a direction.
2. **Include diagrams** - ASCII diagrams work great in markdown
3. **Document the "why"** - Future you (or AI) needs to understand decisions
4. **Keep it updated** - If plans change, update the document

---

## Writing Implementation Phases

### Phase Template

```markdown
## Phase N: [Descriptive Name]

**Goal:** One sentence describing what this phase achieves

**Prerequisites:**
- Phase X completed
- [External dependency, e.g., "API key obtained"]

**Estimated AI Complexity:** [Simple | Medium | Complex]
- Simple: 1-2 files, straightforward logic
- Medium: 3-5 files, some complexity
- Complex: 6+ files or intricate logic (consider splitting)

**Dependencies:**
- Creates: [files/features this phase creates]
- Requires: [files/features from previous phases]

### Steps

1. **Step name**
   - Detailed instructions
   - Code snippets if helpful
   - Expected outcome

2. **Another step**
   - ...

### Files Created/Modified
- `path/to/file.ts` - Description
- `path/to/another.ts` - Description

### Manual Testing Checklist
- [ ] Test case 1 - Expected result
- [ ] Test case 2 - Expected result
- [ ] Edge case - Expected result

### AI Prompt for This Phase

```
[Ready-to-use prompt for AI agent - see Prompting section]
```
```

### Phase Sizing Guidelines

| Size | Files | Context Tokens | Duration |
|------|-------|----------------|----------|
| Small | 1-2 | ~5k | 15-30 min |
| Medium | 3-5 | ~15k | 30-60 min |
| Large | 6-10 | ~30k | 1-2 hours |
| Too Large | 10+ | 50k+ | **Split it!** |

**Rule of thumb**: If a phase feels too big, it probably is. Split it.

---

## Phase Design Principles

### 1. Single Responsibility
Each phase should do ONE thing well:
- ✅ "Set up authentication"
- ✅ "Create message list component"
- ❌ "Set up auth, create components, and add API routes"

### 2. Testable Outcome
Every phase must have a verifiable outcome:
- ✅ "Login page loads and accepts credentials"
- ✅ "API returns list of scores"
- ❌ "Database schema is correct" (how do you test this?)

### 3. Clear Boundaries
Define exactly what's in and out of scope:
```markdown
**In Scope:**
- Create the login form UI
- Connect to Supabase auth
- Redirect on success

**Out of Scope (handled in other phases):**
- Password reset flow
- Remember me functionality
- OAuth providers
```

### 4. Minimal Context Required
The AI should only need to know:
- What was built in prerequisite phases
- What this phase needs to accomplish
- Relevant code patterns from the project

**Don't include:**
- Full codebase history
- Unrelated feature details
- Future phase information

---

## Parallel Execution

### Identifying Parallel Opportunities

Phases can run in parallel when they:
1. Don't modify the same files
2. Don't depend on each other's output
3. Can be tested independently

### Parallel Execution Map

Create a visual dependency graph:

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Database)
    │
    ├─────────────┬─────────────┐
    ▼             ▼             ▼
Phase 3       Phase 4       Phase 5
(Auth)        (UI)          (API)
    │             │             │
    └──────┬──────┴──────┬──────┘
           │             │
           ▼             ▼
       Phase 6       Phase 7
       (Feature A)   (Feature B)
           │             │
           └──────┬──────┘
                  │
                  ▼
              Phase 8
              (Integration)
```

### Running Parallel Phases

**Option A: Multiple Claude Code sessions**
- Open separate terminal windows
- Run different phases simultaneously
- Merge carefully at integration points

**Option B: Different AI providers**
- Phase 3 → Claude
- Phase 4 → Gemini
- Phase 5 → Claude
- Compare outputs for quality

**Option C: Sequential but fast**
- If phases are small enough, sequential might be faster
- Less merge conflict risk

---

## Prompting AI Agents

### Phase Prompt Template

```markdown
# Task: [Phase Name]

## Context
You are working on [Project Name], a [brief description].

**Tech Stack:** [list key technologies]

**Current State:**
- Phase X is complete: [what exists]
- Phase Y is complete: [what exists]

## Your Task
Implement Phase N: [Phase Name]

**Goal:** [One sentence goal]

## Requirements

### Must Create:
1. `path/to/file.ts` - [what it should do]
2. `path/to/component.tsx` - [what it should do]

### Must Integrate With:
- [Existing file/system] - [how]

### Constraints:
- Use [specific patterns/libraries]
- Follow existing code style in [reference file]
- Do NOT modify [protected files]

## Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

## Reference Code
[Include ONLY relevant snippets from existing codebase, not entire files]

## Notes
- [Any gotchas or special considerations]
- [Links to relevant docs if needed]
```

### Prompt Best Practices

1. **Be specific about files** - Don't say "create the API", say "create `src/app/api/scores/route.ts`"

2. **Include acceptance criteria** - AI should know what "done" looks like

3. **Provide reference code** - Show patterns to follow, but only relevant ones

4. **Set constraints** - What should they NOT do is as important as what they should do

5. **Keep context minimal** - Only include what's needed for THIS phase

### Anti-Patterns

❌ **Too vague:**
```
Create the authentication system
```

✅ **Specific:**
```
Create login page at src/app/login/page.tsx that:
- Has email and password inputs
- Calls Supabase signInWithPassword
- Redirects to / on success
- Shows error message on failure
```

❌ **Too much context:**
```
Here's our entire codebase... now add a button
```

✅ **Minimal context:**
```
The Button component is at src/components/ui/Button.tsx.
Add a "Submit" button to the form at src/components/ScoreForm.tsx.
```

---

## Testing Between Phases

### Why Manual Testing Matters

- Catches issues before they compound
- Verifies AI understood the requirements
- Creates checkpoint for rollback
- Builds confidence for next phase

### Testing Checklist Template

```markdown
## Phase N Testing

### Setup
- [ ] Start dev server: `npm run dev`
- [ ] Clear browser cache/localStorage if needed
- [ ] Reset test database if needed

### Functional Tests
- [ ] [Action] → [Expected Result]
- [ ] [Action] → [Expected Result]
- [ ] [Edge case] → [Expected Result]

### Integration Tests
- [ ] Previous feature still works
- [ ] New feature integrates correctly

### Error Cases
- [ ] [Invalid input] → [Error handling works]
- [ ] [Network failure] → [Graceful degradation]

### Visual/UX
- [ ] UI matches expectations
- [ ] No console errors
- [ ] Responsive on mobile (if applicable)

### Sign-off
- [ ] All tests pass
- [ ] Ready for next phase
```

### What If Tests Fail?

1. **Don't proceed to next phase** - Fix issues first
2. **Document the fix** - Update phase instructions if needed
3. **Consider phase design** - Was the phase too complex?
4. **Rollback if needed** - Git is your friend

---

## Context Management

### Token Budget Awareness

Different AI models have different context limits:
- Claude 3.5 Sonnet: ~200k tokens
- Claude Opus: ~200k tokens
- GPT-4: ~128k tokens
- Gemini 1.5: ~1M tokens (but quality degrades)

**Rule of thumb**: Stay under 50% of context limit for best quality

### Strategies for Large Projects

1. **Summarize previous phases** - Don't include full code, summarize what exists

2. **Reference files, don't include** - Say "follow patterns in X" instead of pasting X

3. **Split complex phases** - Better two small phases than one massive one

4. **Use .md files as context** - Point AI to documentation instead of explaining everything

### Context Refresh Points

At certain milestones, start fresh:
- After major integration points
- When switching to unrelated feature area
- If AI seems confused or inconsistent
- After merging parallel work

---

## Example Workflow

### Project: Leaderboard Service

**Day 1: Planning**
1. Create main plan document
2. Create implementation phases document
3. Review and refine phase boundaries
4. Identify parallel opportunities

**Day 2: Foundation (Sequential)**
- Phase 1: Project setup ✓
- Phase 2: Database schema ✓
- Test: Tables exist, can query them

**Day 3: Core Features (Parallel)**
- Agent A: Phase 3 (Auth)
- Agent B: Phase 4 (API routes)
- Agent C: Phase 5 (Unity client)
- Test each independently

**Day 4: Integration**
- Phase 6: Connect auth to API
- Phase 7: Test Unity client with API
- Test: Full flow works

**Day 5: Polish**
- Phase 8: Error handling
- Phase 9: UI polish
- Final testing

---

## Quick Reference

### Phase Sizing
- 1-2 files = Small (15-30 min)
- 3-5 files = Medium (30-60 min)
- 6+ files = Consider splitting

### Prompt Structure
1. Context (minimal)
2. Task (specific)
3. Requirements (detailed)
4. Acceptance criteria (testable)

### Testing Cadence
- After EVERY phase
- No exceptions
- Don't batch testing

### Parallel Safety
- Different files = Safe
- Same file = Sequential
- Integration = After parallel completes

---

## Templates

### Quick Phase Template
```markdown
## Phase N: [Name]
**Goal:** [One sentence]
**Prerequisites:** Phase X
**Creates:** file1.ts, file2.ts
**Tests:**
- [ ] Test 1
- [ ] Test 2
```

### Quick Prompt Template
```markdown
Implement [feature] for [project].
Create: [files]
Integrate with: [existing]
Test by: [criteria]
Follow patterns in: [reference]
```

---

*This guide is a living document. Update it as you discover what works best for your workflow.*
