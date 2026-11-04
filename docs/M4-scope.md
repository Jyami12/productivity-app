# M4 scope and trade-off

## Current semester scope

DinoFocus focuses on individual productivity: accounts, countdown and stopwatch
sessions, pause/resume and reload recovery, custom tags, account-backed session
history, personal time analytics, fossil collection, and the museum.

## Cut from scope

Groups, invitations, membership management, and shared weekly goals are removed
from the semester release. They are not promised for a later milestone. The site
contains no Groups navigation or placeholder page.

The M1 proposal and M2 design describe the earlier plan. This decision supersedes
their group-related requirements, user stories US-4 and US-5, delivery dates,
ownership assignments, API plans, and proposed group data models.

## Presentation trade-off

We cut group accountability to focus implementation and verification on the complete
individual workflow: start a tagged session, save account-owned focus time, reveal
fossils, and review personal analytics. Groups would also require membership,
permission, invitation, and shared-contribution behavior. We retained account
ownership and server-validated session timing as foundations of the personal workflow.

## Remaining release work

Rehearse the integrated app in a browser, verify the presentation environment,
complete deployment and accessibility checks, and merge the implemented features
into the presentation branch. Scope reduction does not itself establish that every
remaining original requirement is complete.
