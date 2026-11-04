# M4 scope and trade-off

## Current semester scope

DinoFocus focuses on individual productivity: accounts, countdown and stopwatch
sessions, pause/resume and reload recovery, custom tags, account-backed session
history, personal time analytics, fossil collection, and the museum.

## Cut from scope

Groups, invitations, membership management, and shared weekly goals are removed
from the semester release. They are not promised for a later milestone. The site
contains no Groups navigation or placeholder page.

The [M1 proposal](M1-proposal.md) and [M2 design](M2-design.md) describe the earlier plan.
The [current design](design.md) records the integrated implementation. This decision supersedes
their group-related requirements, user stories US-4 and US-5, delivery dates,
ownership assignments, API plans, and proposed group data models.

## Presentation trade-off

We cut group accountability to focus implementation and verification on the complete
individual workflow: start a tagged session, save account-owned focus time, reveal
fossils, and review personal analytics. Groups would also require membership,
permission, invitation, and shared-contribution behavior. We retained account
ownership and server-validated session timing as foundations of the personal workflow.

## Remaining release work

The app changes were committed and pushed to `main` and `jason-branch` as `036591b`.
The user rehearsed the one-minute T. rex unlock and the presentation account was
restored to its 149-minute baseline afterward. Before presenting, check the live
environment and baseline again and rehearse the complete sequence. Deployment,
broad accessibility, responsive/cross-browser review, and full regression checks
remain release work.

Other original proposal requirements are not implemented as written: tag
renaming/deletion, history editing, a separate failed-session status, monthly
analytics, repeated fossil copies, and a reward configuration UI. Account-scoped
museum favorites and analytics goals remain browser-local. These limitations
should be disclosed; cutting Groups does not make every remaining M1 promise complete.
