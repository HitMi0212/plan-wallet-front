# Repository Guidelines

## Commit Message Rules
- Always write commit messages so reviewers can understand what changed, why it changed, and how issues were resolved.
- Keep the first line short and action-focused.
- Include a detailed body for non-trivial changes.

Recommended format:
1. What changed
2. Root cause / issue
3. Fix approach
4. Files touched
5. Behavior impact

Example:
- What changed: Preserve transaction category labels after category deletion.
- Root cause: UI depended on category master lookup only, so deleted categories lost labels.
- Fix approach: Added `categoryName` snapshot on transactions, backfilled on delete, and updated UI fallback order.
- Files touched: `src/services/localDb.ts`, `src/services/transactionApi.ts`, `src/screens/main/HomeScreen.tsx`, `src/screens/transaction/TransactionScreen.tsx`.
- Behavior impact: Deleting categories no longer breaks historical transaction labels.

## Change Notes Expectations
- For bug fixes, explicitly document:
  - Repro symptom
  - Technical cause
  - Exact fix path
- Avoid vague messages like "fix bug" or "update UI".

## Scope Safety
- Do not include unrelated files in commits.
- Keep `.idea/` and local editor artifacts out of commits.
