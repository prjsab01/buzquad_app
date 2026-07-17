
# AI_AGENT_WORKFLOW.md

# AI Development Workflow & Persistent Context Protocol

You are an AI coding assistant working on an existing long-term software project.

This repository follows a persistent-context engineering workflow designed to:
- preserve continuity across AI sessions,
- support switching between AI tools/accounts/vendors,
- reduce architectural drift,
- maintain implementation consistency,
- track project progress reliably,
- prevent duplicate or conflicting work.

You MUST follow this protocol strictly.

---

# PRIMARY OBJECTIVE

Your responsibility is NOT only to generate code.

Your responsibility is also to:
- maintain project continuity,
- preserve architecture consistency,
- update project state,
- document implementation progress,
- leave resumable context for future AI sessions and developers.

You are part of an ongoing engineering workflow.

---

# REQUIRED READING ORDER

Before making ANY code changes, ALWAYS read these files in order:

1. `.agent/PROJECT_OVERVIEW.md`
2. `.agent/CURRENT_STATE.md`
3. `.agent/ARCHITECTURE.md`
4. `.agent/CODING_RULES.md`
5. `.agent/TASKS.md`
6. `.agent/DECISIONS.md`
7. `.agent/HANDOFF.md`

Do NOT begin implementation until you understand:
- project goals,
- current progress,
- existing architecture,
- coding standards,
- known blockers,
- pending tasks.

---

# MANDATORY WORKFLOW

For EVERY task, follow this sequence:

## STEP 1 — CONTEXT ANALYSIS

Before coding:
- summarize understanding of current project state,
- identify relevant modules/files,
- identify dependencies,
- identify risks/conflicts,
- explain intended implementation approach.

Do NOT immediately start generating code.

---

## STEP 2 — IMPLEMENTATION PLANNING

Create a short implementation plan including:
- files to modify,
- components/services/functions affected,
- expected side effects,
- database/API/schema impacts,
- testing implications.

Prefer minimal, focused modifications.

Avoid unnecessary refactors.

---

## STEP 3 — IMPLEMENTATION

During coding:
- follow existing architecture patterns,
- preserve naming conventions,
- preserve folder structure,
- preserve code style consistency,
- avoid introducing unnecessary dependencies,
- avoid unrelated code modifications.

NEVER rewrite unrelated working code.

---

## STEP 4 — VALIDATION

Before completion:
- verify imports,
- verify type safety,
- verify build compatibility,
- verify API consistency,
- verify no duplicate logic introduced,
- verify backward compatibility where applicable.

Check for:
- edge cases,
- null handling,
- async issues,
- performance concerns,
- security concerns.

---

## STEP 5 — DOCUMENTATION UPDATE

After implementation, ALWAYS update relevant context files.

At minimum update:
- `.agent/CURRENT_STATE.md`
- `.agent/SESSION_LOG.md`

If applicable also update:
- `.agent/TASKS.md`
- `.agent/DECISIONS.md`
- `.agent/BUGS_AND_BLOCKERS.md`
- `.agent/ARCHITECTURE.md`

Documentation updates are MANDATORY.

Task completion is NOT considered complete without context updates.

---

# REQUIRED CONTEXT FILE STANDARDS

---

# `.agent/PROJECT_OVERVIEW.md`

Contains:
- project purpose,
- business goals,
- tech stack,
- major modules,
- constraints,
- scope boundaries.

This is relatively stable.

Do NOT modify unnecessarily.

---

# `.agent/CURRENT_STATE.md`

Tracks:
- completed work,
- work in progress,
- pending work,
- active blockers,
- current implementation focus,
- recent important changes.

This MUST always reflect current reality.

---

# `.agent/TASKS.md`

Tracks:
- backlog,
- priorities,
- task status,
- dependencies,
- implementation queue.

When completing tasks:
- mark completed items,
- add newly discovered tasks,
- reorganize priorities if needed.

---

# `.agent/ARCHITECTURE.md`

Tracks:
- project structure,
- design patterns,
- module boundaries,
- API conventions,
- database strategy,
- infrastructure decisions.

Do NOT violate architecture rules unless explicitly instructed.

If architecture changes:
- document them.

---

# `.agent/DECISIONS.md`

Tracks important technical decisions.

For every major decision include:
- decision,
- reasoning,
- alternatives considered,
- consequences.

Examples:
- framework changes,
- database strategy,
- queue systems,
- auth changes,
- caching strategy.

---

# `.agent/SESSION_LOG.md`

At the end of EVERY session append:

```md
## YYYY-MM-DD

### Completed
- item

### Modified Files
- path/file.ts

### Current Status
Short summary.

### Next Recommended Step
- next task

### Notes
- warnings / caveats / pending concerns
````

This file is CRITICAL for continuity.

---

# `.agent/HANDOFF.md`

Must always contain:

* current active task,
* immediate next steps,
* warnings,
* unfinished implementations,
* important reminders for next AI session.

Optimize this file for rapid onboarding.

---

# `.agent/CODING_RULES.md`

Always obey:

* formatting rules,
* naming conventions,
* architecture rules,
* typing rules,
* testing standards,
* linting requirements,
* documentation standards.

Never ignore these rules silently.

---

# IMPORTANT ENGINEERING RULES

## DO NOT:

* rewrite entire files unnecessarily,
* perform unrelated refactors,
* introduce inconsistent architecture,
* duplicate existing logic,
* add dependencies without justification,
* remove comments/documentation without reason,
* change public APIs carelessly,
* invent fake implementations,
* leave TODOs without documenting them.

---

# ALWAYS:

* prefer incremental changes,
* preserve stability,
* preserve readability,
* preserve maintainability,
* maintain deterministic behavior,
* document assumptions,
* explain tradeoffs,
* update project context files.

---

# CONTEXT PRESERVATION RULES

You are working in a multi-session AI workflow.

Assume:

* future AI agents will continue this project,
* context windows are limited,
* AI providers/tools may change,
* continuity depends on repository documentation.

Therefore:

* externalize reasoning,
* document implementation state,
* maintain accurate progress tracking,
* preserve engineering intent.

The repository itself must become the persistent memory system.

---

# IMPLEMENTATION PRIORITY ORDER

Prioritize:

1. correctness,
2. maintainability,
3. architectural consistency,
4. readability,
5. scalability,
6. optimization.

Avoid premature optimization.

---

# WHEN UNCERTAIN

If requirements are unclear:

* inspect surrounding code patterns,
* infer existing conventions,
* preserve consistency,
* ask for clarification ONLY if necessary.

Avoid speculative architectural changes.

---

# OUTPUT EXPECTATIONS

For every implementation task provide:

* concise analysis,
* implementation summary,
* modified files list,
* important caveats,
* remaining work,
* recommended next step.

---

# FINAL PRINCIPLE

Treat this repository as a long-lived production system.

Your role is not merely code generation.

Your role is:

* collaborative engineering,
* continuity preservation,
* structured implementation,
* maintainable system evolution.

---

# AGENTIC CODING BEST PRACTICES

---

## MINIMAL FOOTPRINT PRINCIPLE

Every change must be the smallest correct change.

* Write only the code that directly solves the stated requirement.
* Do not add helper utilities, abstractions, or wrappers unless they are immediately needed.
* Do not pre-build features that are not in the current task.
* Do not expand scope mid-task without explicit instruction.
* If a one-line fix works, do not write a ten-line solution.

---

## VERIFY BEFORE WRITING

Before writing any new code:

* Read the relevant existing files first.
* Confirm the function, component, or service does not already exist.
* Confirm the import path is correct before using it.
* Confirm the type or interface is not already defined elsewhere.
* Never assume — always verify from the actual file contents.

---

## ONE TASK AT A TIME

* Complete the current task fully before starting the next.
* Do not partially implement multiple features in one session.
* If a task reveals a dependency that is missing, document it in TASKS.md and HANDOFF.md before proceeding.
* Do not silently skip parts of a task.

---

## TOOL USE DISCIPLINE

* Read files before editing them.
* Prefer targeted edits (fsReplace) over full rewrites (fsWrite) unless the file is new or must be fully replaced.
* Batch independent file reads into a single call.
* Do not re-read a file you already have in context.
* Do not run commands speculatively — only run what is needed to complete the task.
* After running a command, use the output to decide the next step — do not assume success.

---

## SELF-VERIFICATION AFTER EVERY CHANGE

After every code change:

* Mentally trace the execution path of the changed code.
* Verify all imports resolve correctly.
* Verify all types are consistent.
* Verify no existing behavior is broken.
* If a build step is available, run it and confirm zero errors before marking the task done.

---

## NEVER INVENT FACTS

* Do not assume a file exists — check it.
* Do not assume a function signature — read it.
* Do not assume an API shape — verify it from the source.
* Do not assume a dependency is installed — check package.json.
* If something is unknown, say so and ask rather than guessing.

---

## HANDLING AMBIGUITY

* If a requirement is ambiguous, pick the interpretation most consistent with existing patterns.
* Document the interpretation in the session log.
* If two interpretations are equally valid and the choice has architectural consequences, ask before proceeding.
* Never silently pick the more complex interpretation.

---

## ROLLBACK AWARENESS

* Before modifying a file that is already working, note its current state.
* If a change breaks something, revert to the last known working state before trying again.
* Do not layer fixes on top of broken code — diagnose first.
* If a fix requires more than three attempts, stop and document the blocker in HANDOFF.md.

---

## CONTEXT FILE HYGIENE

* CURRENT_STATE.md must always reflect what is actually deployed and working — not what is planned.
* TASKS.md must never have a task marked complete unless it has been verified working.
* HANDOFF.md must be updated at the end of every session, even if nothing changed.
* SESSION_LOG.md entries must be factual — do not log intentions as completions.
* If a context file becomes stale or inaccurate, correct it immediately.

---


```
```
