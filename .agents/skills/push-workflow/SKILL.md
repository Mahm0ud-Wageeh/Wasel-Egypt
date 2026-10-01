---
name: push-workflow
description: Quickly and safely commit and push BrightPath repository changes. Use when the user asks to push, commit and push, publish local changes, or avoid repeated push-time work in this repo. Reuses current-session verification, refreshes Graphify only when needed, stages deliberately, pushes the active branch, and reports any known check failures without rerunning unrelated work.
---

# Push Workflow

## Overview

Use this workflow for BrightPath push tasks. Default to the fast path: reuse fresh evidence from the current session and run only checks still missing after the latest edit. Do not turn a push request into a new audit.

## Fast Path

When the implementation was completed and verified in the current session:

1. Run the context checks in parallel: `git status --short`, `git branch --show-current`, and `git diff --stat`.
2. Do not rerun a successful build, lint, test, Docker check, or Graphify refresh performed after the latest relevant edit.
3. Run only the smallest missing check, plus `git diff --check`. Prefer targeted lint/tests over a full suite.
4. Do not investigate or fix unrelated known failures. Record them and continue unless they make the staged change unsafe.
5. Stage, inspect the cached stat, commit, confirm status, and push without additional discovery passes.

Use the full workflow only when checks are stale or absent, the diff is unfamiliar, the worktree contains unrelated changes, or the change is high risk and lacks targeted coverage.

## Workflow

1. Check context before touching git:
   - Run `git status --short`.
   - Run `git branch --show-current`.
   - If there are unstaged or staged changes, inspect enough diff to understand the scope before committing.
   - Never revert unrelated user changes.

2. Refresh the graph when code changed:
   - If `graphify-out/graph.json` exists and source code changed, run `graphify update .` after code edits and before staging.
   - If Graphify already completed after the latest source edit, reuse that result. Do not refresh it again just because the user asked to push.
   - Dirty `graphify-out/` files are expected after updates. Do not treat them as a reason to skip the push.
   - If `graphify update .` fails because of transient Windows file locks, retry once after checking no long-running command is still writing graph files.

3. Verify before commit:
   - Backend changes: run backend lint/tests when scripts exist.
   - When Prisma schema or migration work is in scope, run the package-local `prisma generate` before backend tests so a stale generated client does not create false failures.
   - Frontend changes: run frontend build and relevant lint/tests when scripts exist.
   - Reuse checks already run after the latest relevant edit. Do not rebuild Docker or rerun full suites during push when current-session evidence already covers the staged files.
   - Prefer file-targeted lint, syntax checks, or a focused test. Run the full suite only when no narrower check provides reasonable coverage or the user explicitly requests it.
   - Root scripts may be hook placeholders only. Prefer package-local scripts if root `package.json` lacks real checks.
   - Record warnings separately from failures. Do not block on known non-failing warnings unless they indicate a real regression.

4. Stage deliberately:
   - Use `git add -A` for a full requested push.
   - In this environment, `.git` writes may require `sandbox_permissions: require_escalated`; if staging fails with `Unable to create ... .git/index.lock: Permission denied`, rerun the same git command with escalation.
   - After staging, run `git status --short` and `git diff --cached --stat`.

5. Commit:
   - Use a concise, accurate commit message based on the staged scope.
   - Commit may also need escalation because it writes `.git`.
   - After committing, run `git status --short` to confirm the worktree is clean or to identify remaining unstaged user changes.

6. Push:
   - Push the current branch explicitly: `git push origin <branch>`.
   - Network access usually requires `sandbox_permissions: require_escalated`.
   - If auth fails, report the exact error and stop. Do not attempt credential changes unless the user explicitly asks.

7. After the PR merges, return to a clean main:
   - Trigger: the user states or confirms a PR has merged (e.g., "that merged", "#47 is in", "merged it"). Do not poll GitHub to check this yourself — take the user's word for it.
   - If more than one branch/PR is in play this session, confirm which one merged before acting.
   - Run `git status` first. If there are uncommitted changes, stop and ask rather than switching out from under active work.
   - `git switch main`, then `git pull origin main` so the merged commits are actually present locally — switching alone leaves main stale.
   - Delete the now-merged local branch with `git branch -d <branch>` (lowercase `-d`, not `-D`): git refuses this if the branch has commits main doesn't, which is a real signal to stop and look rather than force through.
   - Leave the remote branch alone unless asked — GitHub's merge UI already offers to delete it, and that's the user's call to make there.
   - Confirm the result briefly: now on `main`, up to date, local branch deleted (or not, and why).

8. Evolve this skill when useful:
   - Do not pause each push to ask about workflow improvements.
   - Update the skill only when an obvious repeatable blocker appeared during the push or the user asks for workflow changes.
   - Update this `SKILL.md` only for repeatable workflow lessons, not one-off noise.
   - Write each new lesson as a short rule in the relevant section: "If X happens, do Y."
   - If the skill was improved as part of the push task, include the skill change in the same commit when practical. If the commit already happened, leave the skill change unstaged and tell the user.
   - Keep the skill lean. Remove or merge stale rules when a better general rule replaces them.

## Final Response

Keep the final response short. Include:

- The commit hash and message.
- The pushed branch and remote.
- Any verification that was run or any verification that could not be run.
- Any `push-workflow` improvement made during the run, or why no skill update was needed.
- Required Codex directives, only for actions that actually succeeded:
  - `::git-stage{cwd="C:\g\git\BrightPath"}`
  - `::git-commit{cwd="C:\g\git\BrightPath"}`
  - `::git-push{cwd="C:\g\git\BrightPath" branch="<branch>"}`

## BrightPath Notes

- Current recurring branch pattern may include non-`codex/` names such as `namaaJourney`; do not create or switch branches unless requested.
- Existing ECC pre-push hooks may skip root checks when no root scripts exist. That does not replace package-local verification.
- Graphify output belongs to the repo workflow. If code changes were made and graphify refreshed successfully, include resulting `graphify-out/` changes in the commit unless the user asks otherwise.
