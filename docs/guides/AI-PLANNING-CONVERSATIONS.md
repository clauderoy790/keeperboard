# AI Planning Conversations Guide

> How to have productive planning conversations with AI before diving into implementation.

---

## Why Plan Before Implementing?

Jumping straight into code often leads to:
- Rework when requirements weren't clear
- Over-engineering or under-engineering
- Missing edge cases discovered too late
- Wasted tokens on wrong approaches

**A good planning conversation:**
- Surfaces requirements and constraints
- Explores alternatives
- Makes decisions explicit
- Creates documentation as a byproduct

---

## The Planning Conversation Flow

### Phase 1: Problem Statement

**You provide:**
- What you're trying to accomplish
- Why the current solution doesn't work (if replacing something)
- Key constraints (budget, timeline, tech stack)

**AI should:**
- Ask clarifying questions
- Confirm understanding
- Identify potential challenges

**Example:**
```
You: "We need to replace our UGS leaderboard because of CSP issues
     with Unity Play. Need to maintain dev/prod separation and
     keep it free."

AI: "Let me check your current implementation... [reads files]
     Questions: How many existing scores? Need to migrate them?
     What's your acceptable complexity level?"
```

### Phase 2: Options Exploration

**AI presents:**
- Multiple viable approaches
- Pros/cons of each
- Complexity estimates
- Cost implications

**You evaluate:**
- Which aligns with your constraints
- Which feels right for your use case
- Ask deeper questions about unclear options

**Example:**
```
AI: "Three options: LootLocker (simple, 10k MAU), Supabase (flexible,
     more setup), PlayFab (complex, enterprise-grade)"

You: "What's MAU? Is 10k enough?"

AI: [Explains, gives context]

You: "I'm leaning toward Supabase because..."
```

### Phase 3: Deep Dive on Chosen Approach

**Discuss:**
- Architecture decisions
- Schema design
- Integration points
- Migration strategy
- Edge cases

**AI should:**
- Present detailed technical approach
- Identify potential issues proactively
- Suggest patterns from similar projects

**Example:**
```
You: "Can one Supabase project handle multiple games?"

AI: "Yes, here's the schema... [explains multi-tenancy]"

You: "What about migrating existing scores?"

AI: "Three approaches: manual export, dual-write, local-first..."
```

### Phase 4: Scope Definition

**Clarify:**
- What's in v1 vs future
- Must-haves vs nice-to-haves
- Technical boundaries

**Document:**
- Decisions made
- Alternatives rejected (and why)
- Open questions for later

**Example:**
```
You: "Let's include UGS migration as a feature"

AI: "That adds complexity but good selling point.
     Suggesting: Phase 1 manual import, Phase 2 UGS direct import"
```

### Phase 5: Plan Creation

**AI creates:**
- Main plan document (architecture, decisions)
- Implementation phases (step-by-step)
- Testing checklists

**You review:**
- Does this match your understanding?
- Are phases sized appropriately?
- Any missing pieces?

---

## Effective Prompting During Planning

### Starting the Conversation

**Good opener:**
```
"I need to implement [feature]. Here are the key files: [paths].
Current situation: [context].
Constraints: [list].
Before we implement, let's plan the approach."
```

**Why it works:**
- Gives AI specific starting points
- Sets expectation for planning first
- Provides constraints upfront

### Asking for Options

**Explicit request:**
```
"Before we decide, what are the alternatives?
Give me 3 options with pros/cons."
```

**Why it works:**
- AI tends to jump to a solution
- Forces exploration of alternatives
- You might learn about options you didn't know

### Drilling Down

**Good follow-up:**
```
"Let's dive deeper on option 2. What would the schema look like?
How would migration work? What's the Unity integration story?"
```

**Why it works:**
- Tests if option holds up under scrutiny
- Surfaces implementation details early
- Reveals hidden complexity

### Challenging Assumptions

**Good challenge:**
```
"You said X, but what about Y scenario?"
"Does this work if Z happens?"
"What if we need to support W later?"
```

**Why it works:**
- AI can miss edge cases
- Your domain knowledge matters
- Better to find issues in planning than implementation

### Expressing Preferences

**Be direct:**
```
"I'm leaning toward option 2 but I don't want to bias you.
Does that make sense given our constraints?"
```

**Why it works:**
- AI can validate or push back
- You might have good instincts worth following
- Opens discussion rather than forcing direction

---

## Questions to Ask During Planning

### Technical Questions
- "What's the database schema?"
- "How does authentication work?"
- "What happens when X fails?"
- "How do we handle Y edge case?"
- "What's the data flow for Z?"

### Integration Questions
- "How does this connect to our existing code?"
- "What changes in the current system?"
- "Can we do this incrementally?"
- "What's the migration path?"

### Scope Questions
- "Is this necessary for v1?"
- "What's the simplest version that works?"
- "What can we defer to later?"
- "What happens if we skip X?"

### Risk Questions
- "What could go wrong?"
- "What's our rollback plan?"
- "Are there vendor lock-in concerns?"
- "What if this grows beyond free tier?"

### Testing Questions
- "How do we verify this works?"
- "What's the testing strategy?"
- "How do we test without production data?"
- "What does success look like?"

---

## Red Flags in Planning Conversations

### AI Moving Too Fast
```
AI: "Let's implement the entire system. First..."
```
**Response:** "Hold on - let's understand the requirements first."

### Vague Answers
```
AI: "This should work fine."
You: "What specifically happens when the network fails?"
AI: "It handles errors gracefully."
```
**Response:** "Can you be more specific? What error handling exists?"

### Missing Trade-offs
```
AI: "Option A is clearly the best choice."
```
**Response:** "What are the downsides of Option A? Why might someone choose B?"

### Over-Engineering
```
AI: "We'll need a microservices architecture with..."
```
**Response:** "What's the simplest version that meets our needs?"

### Under-Engineering
```
AI: "Just hardcode it for now."
```
**Response:** "What are the implications? Will this cause problems later?"

---

## Documentation as Byproduct

A good planning conversation naturally produces:

### 1. Decision Log
```markdown
## Decisions Made

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Database | Supabase | Firebase, custom | Free tier, PostgreSQL |
| Auth | Supabase Auth | Auth0, custom | Same provider, simple |
```

### 2. Requirements Document
```markdown
## Requirements

### Must Have (v1)
- Submit scores from Unity
- View leaderboard top 10
- Dev/prod separation

### Nice to Have (v1.1)
- UGS migration
- Custom leaderboard names

### Future (v2+)
- Webhooks
- Analytics
```

### 3. Architecture Overview
```markdown
## Architecture

[Diagram from conversation]

Key components:
- Admin Dashboard: [description]
- Public API: [description]
- Unity Client: [description]
```

### 4. Open Questions
```markdown
## Open Questions

- [ ] What name for the service?
- [ ] Multi-user from day 1 or add later?
- [ ] Free tier limits?
```

---

## Template: Planning Session Opener

```markdown
# Planning Session: [Feature Name]

## Context
I need to [accomplish X].

Current state: [what exists now]
Problem: [why current state doesn't work]

## Constraints
- Budget: [free / $X per month / etc]
- Timeline: [flexible / need by X date]
- Tech stack: [must use / prefer / avoid]
- Complexity: [simple preferred / enterprise ok]

## Key Files to Review
- [path/to/relevant/file1]
- [path/to/relevant/file2]

## Initial Questions
1. [Your question 1]
2. [Your question 2]

## Let's Plan Before Implementing
Please review the files, understand the current state, and let's discuss
options before writing any code.
```

---

## Example: Full Planning Conversation

**You:**
```
We need to replace our UGS leaderboard. CSP issues with Unity Play.

Current files:
- LeaderboardManager.cs
- LeaderboardUI.cs

Constraints:
- Must be free
- Need dev/prod separation
- Have 26 existing scores to migrate

Let's plan the approach before implementing.
```

**AI:** [Reads files, summarizes current implementation, asks clarifying questions]

**You:** "What are our options?"

**AI:** [Presents 3 options with pros/cons]

**You:** "I'm leaning toward Supabase. Can one project handle multiple games?"

**AI:** [Explains multi-tenancy, proposes schema]

**You:** "What about migration? I don't want duplicate players."

**AI:** [Explains claiming mechanism, addresses integrity]

**You:** "Let's make this reusable. Should it be a separate project?"

**AI:** [Proposes architecture, admin dashboard, Unity client]

**You:** "What about UGS import as a feature?"

**AI:** [Adds to scope, explains how it would work]

**You:** "Okay, let's create the plan."

**AI:** [Creates main plan + implementation phases]

---

*Good planning conversations take time but save much more time in implementation.*
