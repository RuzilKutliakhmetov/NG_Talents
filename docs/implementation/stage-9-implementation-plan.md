# Stage 9 Implementation Plan

Date: 24 November 2026

## 1. Goal

Implement the hiring pipeline, responsible assignments, internal notes, interviews, calendars, notifications and realtime behavior defined in:

- `stage-9-architecture.md`
- `stage-9-rbac-matrix.md`

Implementation begins only after separate approval of the product decisions listed in
`stage-9-architecture.md` Section 18. Do not begin Stage 9.1 while any required approval is pending.

## 2. Fixed implementation order

1. Stage 9.1: stabilization and baseline security.
2. Stage 9.2: pipeline, assignments and notes.
3. Stage 9.3: employer pipeline frontend.
4. Stage 9.4: interviews backend.
5. Stage 9.5: calendars and notifications backend.
6. Stage 9.6: interview and calendar frontend.
7. Stage 9.7: integration testing and acceptance.

Stage 9.2 precedes interviews because application ownership, status concurrency and assignment policies are foundational. Interview backend precedes frontend and calendar backend remains independent of frontend.

## 3. Stage 9.1 - Stabilization

### S9.1-001 Stabilize Argon2 tests

- Description: preserve real Argon2id verification and raise/test timeout explicitly only if needed.
- Backend: `src/auth/services/password.service.ts`, `password.service.spec.ts`, Vitest configuration if required.
- Frontend: none.
- Prisma: none.
- Dependencies: current Argon2 and Vitest.
- Checks: positive hash/verify, wrong-password rejection, repeated suite run.
- Acceptance: Argon2 tests pass under normal local/CI timeout; production parameters remain unchanged.

### S9.1-002 Centralize active-employer membership

- Description: replace broad application/employer membership logic with one service helper returning active membership and member role.
- Backend: application/employer/interview services.
- Frontend: none.
- Prisma: no initial schema change.
- Dependencies: `EmployerMember`, `User.status`.
- Checks: inactive member, foreign member, missing member.
- Acceptance: no hiring operation grants access based only on global `EMPLOYER`.

### S9.1-003 Remove MODERATOR/ADMIN bypass

- Description: deny global moderator/admin bypasses on Stage 9 hiring and member-lifecycle routes.
- Backend: application and employer controllers/services.
- Frontend: none.
- Prisma: none.
- Dependencies: S9.1-002.
- Checks: HTTP 403/404 for global moderator/admin.
- Acceptance: all Stage 9 controllers and EmployerMember lifecycle routes enforce company-role policy; global
  `ADMIN`/`MODERATOR` do not gain hiring-data access through current broad decorators.

### S9.1-004 Add status concurrency baseline

- Description: require `expectedStatus` and `expectedUpdatedAt` for every Application-record mutation.
- Backend: application DTO/service/controller.
- Frontend: existing status mutation client.
- Prisma: use existing `updatedAt`; no migration.
- Dependencies: S9.1-002.
- Checks: missing/stale status, missing/stale timestamp, repeated same-status request, concurrent writes.
- Acceptance: server-side conditional version check allows at most one concurrent write; only that transaction
  writes history/Outbox, and no-op repeated status returns current application.

Cover all existing Application mutations:

- employer status, first-open `markViewed`, employer comment, and candidate withdrawal;
- require `expectedStatus` and `expectedUpdatedAt`; use conditional database updates and atomic history/Outbox
  where required by the operation;
- preserve repeated VIEWED opens as a no-op and keep `VIEWED -> IN_REVIEW` as a separate status action;
- comment-only updates do not create an Application status-history row or notification.

### S9.1-005 Add isolated PostgreSQL test setup

- Description: create an explicitly isolated real-PostgreSQL test configuration.
- Backend: Vitest e2e/integration configuration.
- Frontend: none.
- Prisma: migrations only later stages.
- Dependencies: Docker/PostgreSQL and test database URL.
- Checks: database isolation, migrations and rollback.
- Acceptance: tests never execute against working local/production database.

### S9.1-006 Add reversible membership lifecycle

- Description: replace physical employer-member removal with a reversible active/deactivated lifecycle.
- Backend: existing `src/employer/employer.service.ts` and shared membership authorization.
- Frontend: member management UI reflects deactivation and prevents inactive members from being selected.
- Prisma: add `EmployerMember.isActive Boolean @default(true)` and `deactivatedAt DateTime?`; change
  `EmployerMember.user` and `EmployerMember.employer` relations from `onDelete: Cascade` to `Restrict`, with an
  additive migration that backfills existing memberships as active.
- Dependencies: S9.1-002/S9.1-005.
- Checks: separate `User.status` and membership activity; require member `expectedUpdatedAt`; reactivate only for
  `User.status = ACTIVE`; stale reactivation fails; reactivation restores no assignments/participants; physical
  deletion is rejected; active owner protections remain. Tests cover deactivation/reactivation, stale versions,
  blocked/deleted User rejection, and no restoration of assignments or participants.
- Acceptance: `removeMember` deactivates and retains the member row; reactivation is explicit and does not restore
  assignments/participants. S9.2 adds assignment-history cleanup; S9.4 adds the blocking-interview organizer guard.

## 4. Stage 9.2 - Backend pipeline

### S9.2-001 Add strict application transition matrix

- Description: implement only final NEW-to-HIRED and rejection sequence.
- Backend: `application.service.ts`, update status DTO.
- Frontend: existing types and status UI.
- Prisma: none.
- Dependencies: S9.1-004.
- Checks: reverse transitions, terminal states, rejection, required application version.
- Acceptance: invalid transitions return `400`; stale transitions return `409`. Interview-dependent terminal
  status gating is added in S9.4-007 after Interview exists.

### S9.2-002 Implement pipeline API

- Description: add server pagination/filter/search pipeline.
- Backend: employer application controller/service/DTO.
- Frontend: not yet.
- Prisma: new indexes if query analysis confirms.
- Dependencies: S9.1-002/S9.1-006.
- Checks: company isolation, privacy, pagination, responsible filter.
- Acceptance: pipeline cards expose only allowed candidate fields.

### S9.2-003 Implement summary API

- Description: aggregate application counts server-side.
- Backend: application controller/service/DTO.
- Frontend: future.
- Prisma: status/appliedAt indexes.
- Dependencies: S9.2-002.
- Checks: all statuses, date/vacancy scope.
- Acceptance: summary matches database counts and never uses pagination truncation.

### S9.2-004 Add responsible assignment

- Description: add nullable `assignedMemberId` relation to `Application` with `onDelete: Restrict`.
- Backend: application service/controller/DTO.
- Frontend: later.
- Prisma: schema/migration.
- Dependencies: S9.1-002/S9.1-006.
- Checks: active same-company target, RECRUITER denied, missing/stale `expectedStatus` and `expectedUpdatedAt`,
  membership deactivation cleanup is gated on S9.2-007 completion.
- Acceptance: assignment/change/removal atomically checks both `expectedStatus` and `expectedUpdatedAt`, and
  returns `409 APPLICATION_STATUS_CONFLICT` when stale. The endpoint is not released until history and deactivation
  cleanup are integrated in S9.2-005/S9.2-007.

### S9.2-005 Add assignment history

- Description: create immutable `ApplicationAssignmentHistory`.
- Backend: application service/controller.
- Frontend: later.
- Prisma: model/index/migration.
- Dependencies: S9.2-004.
- Checks: previous/new member, actor, date.
- Acceptance: history remains after member removal/deactivation; assignment change, history, and required Outbox
  records commit or roll back together.
- Preserve previous/new member IDs and historical names/roles; reference the application with `onDelete: Restrict`,
  and do not use cascading foreign keys to historical members or for history deletion.

### S9.2-006 Implement application notes

- Description: add soft-deleted `ApplicationNote`.
- Backend: application note module/service/controller/DTO.
- Frontend: later.
- Prisma: model/index/migration.
- Dependencies: S9.1-002/S9.1-006.
- Checks: candidate leak, cross-company, edit/delete matrix, missing/stale note `expectedUpdatedAt`.
- Acceptance: soft-deleted notes excluded by every employer/candidate API.

### S9.2-007 Integrate assignment cleanup with deactivation

- Description: update member deactivation to preserve application assignment state and history.
- Backend: existing `src/employer/employer.service.ts` and shared membership authorization.
- Frontend: member management UI reflects deactivated state and prevents use as an assignee.
- Prisma: use assignment/history models from S9.2-004/S9.2-005.
- Dependencies: S9.1-006/S9.2-004/S9.2-005.
- Checks: separate user and membership activity; deactivation conditionally checks member `expectedUpdatedAt`,
  clears current assignments across the company and writes assignment history/required Outbox atomically;
  physical deletion is rejected.
- Acceptance: deactivated members have no current application assignments; history, required Outbox records, and
  member row are retained atomically.
  S9.4 adds the blocking-interview organizer guard before interviews are enabled.

### S9.2-008 Add pipeline unit/integration tests

- Description: cover transitions, summary, assignment, notes and concurrency.
- Backend: application service specs and PostgreSQL integration.
- Frontend: none.
- Prisma: test migrations.
- Dependencies: S9.2-001 to S9.2-007.
- Checks: unit/e2e/integration, IDOR, atomic version checks, assignment and note conflict behavior.
- Acceptance: Stage 9.2 endpoint suite passes against isolated PostgreSQL.

## 5. Stage 9.3 - Employer frontend

### S9.3-001 Add pipeline types and API client

- Description: add pipeline/summary query types and API functions.
- Backend: none.
- Frontend: `features/applications/api.ts`, `types.ts`, `hooks.ts`.
- Prisma: none.
- Dependencies: S9.2-002/S9.2-003.
- Checks: error/empty/loading and query keys.
- Acceptance: frontend receives paginated/server-filtered data.

### S9.3-002 Implement Kanban

- Description: extend `/employer/applications` with Kanban columns and cards.
- Backend: pipeline API.
- Frontend: applications employer components.
- Prisma: none.
- Dependencies: S9.3-001/S9.2-004/S9.2-005/S9.2-007.
- Checks: status counts, filters, pagination.
- Acceptance: no complete company result set is loaded for UI aggregation.

### S9.3-003 Implement status DnD and alternative status dialog

- Description: add drag/drop and menu-based status transition.
- Backend: status endpoint.
- Frontend: applications feature.
- Prisma: none.
- Dependencies: S9.2-001, S9.3-002.
- Checks: rollback, `APPLICATION_STATUS_CONFLICT`, `APPLICATION_CONFLICT`, disabled final states.
- Acceptance: refetch and explain conflicts without automatically replaying stale mutations; every UI transition
  is backend-authorized.

### S9.3-004 Implement responsible assignment UI

- Description: assign/change/remove responsible member.
- Backend: assignment endpoints.
- Frontend: application detail/card.
- Prisma: none.
- Dependencies: S9.2-004/S9.2-005/S9.2-007.
- Checks: RECRUITER denied, inactive/cross-company target denied.
- Acceptance: assignment UI reflects server state and history.

### S9.3-005 Implement internal notes UI

- Description: list/create/edit/delete soft-deleted employer notes.
- Backend: note endpoints.
- Frontend: employer application detail.
- Prisma: none.
- Dependencies: S9.2-006.
- Checks: own and foreign note permissions.
- Acceptance: candidate routes never render notes.

### S9.3-006 Extend employer application detail page

- Description: organize candidate, snapshot, status/assignment history, notes and responsible assignment.
- Backend: existing plus pipeline APIs.
- Frontend: employer application detail component.
- Prisma: none.
- Dependencies: S9.3-004/S9.3-005.
- Checks: privacy, loading/error/empty.
- Acceptance: snapshot remains non-editable; interview UI is delivered only in S9.6 after interview APIs exist.

## 6. Stage 9.4 - Interview backend

### S9.4-001 Add interview Prisma entities

- Description: add interview enums/models and participant/history entities.
- Backend: Prisma schema only.
- Frontend: none.
- Prisma: `Interview`, `InterviewParticipant`, `InterviewHistory`; `EmployerMember.isActive`/`deactivatedAt`
  and restricted membership FKs are implemented in S9.1-006; make `Interview.organizerId` a required FK to
  `EmployerMember.id` with `onDelete: Restrict`; make `Interview.applicationId`, `Interview.employerId`,
  `InterviewHistory.interviewId`, and `InterviewParticipant.interviewId` `onDelete: Restrict`;
  make `InterviewParticipant.userId` `onDelete: Restrict`; add `removedAt` for soft removal;
  add required interview notification enum values; preserve participant/history references and store
  actor/member/user display snapshots without cascading FKs.
- Dependencies: S9.2 complete.
- Checks: Prisma validate and migration SQL; verify hard deletion cannot cascade interview history and organizer
  references cannot be deleted.
- Acceptance: schema valid; no existing migrations edited; historical rows survive member deactivation.

### S9.4-002 Create interview migration

- Description: create additive migration and indexes.
- Backend: migration.
- Frontend: none.
- Prisma: new migration.
- Dependencies: S9.4-001.
- Checks: isolated PostgreSQL migration.
- Acceptance: existing data preserved; no destructive SQL.

### S9.4-003 Implement interview module and DTOs

- Description: add Nest module, controller, service scaffolding and DTO validation.
- Backend: `src/interview/*`, existing `src/employer/employer.service.ts`.
- Frontend: none.
- Prisma: entities from S9.4-001.
- Dependencies: S9.4-001/S9.4-002.
- Checks: DTO validation, typed privacy-specific employer/candidate payloads, IDOR-safe not-found responses.
- Acceptance: no mutating route is enabled before S9.4-004 conflict/version safeguards exist.

### S9.4-004 Implement schedule conflict and locking foundation

- Description: implement application-row locking, participant advisory locks, conflict querying, and member/account
  lifecycle safeguards before enabling scheduling writes.
- Backend: interview service/repository and existing `src/employer/employer.service.ts`; account lifecycle hook.
- Frontend: later.
- Prisma: indexes from S9.4-001.
- Dependencies: S9.4-003.
- Checks: PostgreSQL integration; acquire sorted participant/assignee user locks before sorted Application rows;
  include the union of current/proposed interview participant IDs and previous/new assignee IDs; coordinate
  membership/User deactivation; candidate, organizer and additional employee conflicts across companies; only
  blocking statuses; half-open intervals.
- Acceptance: lock and conflict service is complete before any create/update/participant/deactivation/account-status mutation
  endpoint is enabled. Account status transitions use only `ACTIVE`/`BLOCKED`/`DELETED`, clear assignments with
  history, preserve all participant rows/statuses, and cannot leave an active interview with an unavailable
  organizer. Adjacent meetings are allowed; no cross-company details leak.

### S9.4-005 Implement interview creation and Application coupling

- Description: atomically create interview/participants/history and apply the approved first-interview rule.
- Backend: interview controller/service.
- Frontend: later.
- Prisma: unique `(applicationId, clientRequestId)`, Application status history.
- Dependencies: S9.4-004.
- Checks: required `scheduledAt`/IANA timezone, owner-approved duration/past-time rules, idempotency, mandatory
  application version, Application status transition and both history models inside the same transaction.
- Acceptance: from `IN_REVIEW`, the first interview atomically moves Application to `INTERVIEW`; on an already
  `INTERVIEW` application, another interview adds no Application history. Additional employees start `INVITED`
  and have no self-response endpoint. Uses the existing Outbox transaction API.

### S9.4-006 Implement candidate responses and interview state machine

- Description: implement candidate confirm/decline/reschedule-request and global interview state transitions.
- Backend: candidate interview endpoints/service.
- Frontend: later.
- Prisma: interview/participant/history.
- Dependencies: S9.4-005.
- Checks: candidate JWT/participant/application match, expected interview version, candidate refusal terminality.
- Acceptance: responses update only Interview and its candidate participant/history/Outbox; they never change
  Application status or schedule. `DECLINED` cannot be reopened; retry uses a new interview record.

### S9.4-007 Implement employer interview lifecycle

- Description: implement edit, cancel, complete, no-show and employer reschedule operations.
- Backend: interview controller/service.
- Frontend: later.
- Prisma: interview/history/participant.
- Dependencies: S9.4-005/S9.4-006.
- Checks: changes from `SCHEDULED`, `CONFIRMED`, `RESCHEDULE_REQUESTED`; version CAS; application terminal
  status gate; cancellation preserves participant states; time conflict and timezone errors are distinct.
- Acceptance: time/date/duration/timezone changes set Interview `SCHEDULED`, candidate `INVITED`, write
  `RESCHEDULED`, notify candidate, and rerun conflicts under locks. Informational edits preserve confirmation.
  Application `OFFER` does not mutate an interview; terminal Application changes follow approved active-interview
  gating. Cancel/decline do not regress Application.

### S9.4-008 Implement participant management

- Description: add/remove organizer/additional employee participants.
- Additional employees are created as `INVITED` and have no self-confirmation endpoint in v1.
- Verify `Interview.organizerId` references `EmployerMember.id`; verify organizer participant `userId` resolves to `User.id`.
- Backend: interview service/DTO.
- Frontend: later.
- Prisma: participant/history.
- Dependencies: S9.4-004/S9.4-005/S9.4-007.
- Checks: same-company active users; expected version; lock union includes old/new participant and organizer
  IDs; remove uses `removedAt`; re-add restores the same participant row as `INVITED`.
- Acceptance: no hard participant deletion; history remains; no concurrent participant edit can bypass conflict
  checking.

### S9.4-009 Add interview unit/integration tests

- Description: test all interview state and privacy behavior.
- Backend: interview specs and real PostgreSQL integration.
- Frontend: none.
- Prisma: test migration.
- Dependencies: S9.4-001 to S9.4-008.
- Checks: format, timezone, conflict, idempotency, concurrency.
- Add tests that additional employees receive `INVITED`, cannot confirm themselves, and cannot change global status.
- Add cancellation test proving participant statuses are unchanged and no participant becomes `DECLINED`.
- Add confirmed-time-change and reconfirmation tests, plus reschedules from each required global status.
- Add organizer deactivation test requiring reassignment/cancellation before deactivation.
- Add concurrent participant-change conflict test and sequential non-overlapping interview test.
- Add stale application/interview request tests that prove only the winning request writes entity/history/Outbox.
- Add Application coupling tests: first `IN_REVIEW` interview moves to `INTERVIEW` atomically; additional interviews
  do not create duplicate Application history; cancellation/decline do not change Application; `OFFER` coexistence
  and terminal active-interview guard.
- Add UserStatus tests for existing enum values, assignment cleanup, organizer safeguards, retained participant
  rows/statuses, and restrictive physical-delete FKs.
- Add missing/invalid-timezone and DST-gap/overlap tests; duration boundaries, past scheduling, and 90-day range.
- Assert exact error codes/envelope and same `404 INTERVIEW_NOT_FOUND` for absent/foreign interview.
- Use real PostgreSQL for FK, advisory-lock, transaction rollback, and concurrent-write assertions; Prisma mocks
  alone do not satisfy acceptance.
- Acceptance: interview integration suite passes.

## 7. Stage 9.5 - Calendar and notifications

### S9.5-001 Implement employer calendar API

- Description: range/filter/pagination interview calendar.
- Backend: interview/employer controller/service/DTO.
- Frontend: later.
- Prisma: range indexes.
- Dependencies: S9.4.
- Checks: active membership and range limits.
- Acceptance: only employer company interviews.

### S9.5-002 Implement candidate calendar API

- Description: range query for own interviews.
- Backend: candidate interview controller/service/DTO.
- Frontend: later.
- Prisma: range indexes.
- Dependencies: S9.4.
- Checks: candidate ownership and privacy.
- Acceptance: no internal/interview foreign data.

### S9.5-003 Extend Outbox events

- Description: complete application-status and assignment event types/messages; interview events are added and
  queued transactionally by S9.4.
- Backend: notifications and interview/application services.
- Frontend: later.
- Prisma: existing `NotificationOutbox`.
- Dependencies: S9.2/S9.4.
- Checks: event key/idempotency and participant targeting.
- Acceptance: no duplicate notifications on retries.

### S9.5-004 Extend Socket.IO events

- Description: emit participant-safe update events after transaction commit.
- Backend: realtime gateway/application/interview services.
- Frontend: later.
- Prisma: none.
- Dependencies: S9.5-003.
- Checks: private room and payload privacy.
- Acceptance: reconnect is followed by API refresh.

## 8. Stage 9.6 - Frontend interviews/calendars

### S9.6-001 Add interview feature

- Description: create `features/interviews` API/types/hooks/schemas/components.
- Backend: interview API.
- Frontend: new feature module.
- Prisma: none.
- Dependencies: S9.4/S9.5.
- Checks: types, forms and cache keys.
- Acceptance: no `any` or local fake API data.

### S9.6-002 Implement interview creation/edit

- Description: date/time/timezone/duration/format/participant form.
- Backend: interview create/update APIs.
- Frontend: employer pages/dialog.
- Prisma: none.
- Dependencies: S9.6-001.
- Checks: selected IANA timezone; missing/invalid timezone; past time and approved duration; DST gap/overlap;
  `INTERVIEW_STALE` vs `INTERVIEW_SCHEDULE_CONFLICT`.
- Acceptance: forms convert local time to UTC explicitly, require user choice for ambiguous DST time, and cannot
  submit invalid local datetime or silently use UTC.

### S9.6-003 Implement employer calendar

- Description: month/week/list view and filters.
- Backend: employer calendar API.
- Frontend: `/employer/interviews`.
- Prisma: none.
- Dependencies: S9.5-001/S9.6-001.
- Checks: UTC `[from,to)` range, approved maximum range, empty/error/filter states.
- Acceptance: mobile and desktop usable.

### S9.6-004 Implement candidate interview UI

- Description: application detail interview list and confirm/decline/reschedule request.
- Backend: candidate interview APIs.
- Frontend: candidate application detail.
- Prisma: none.
- Dependencies: S9.4-006/S9.5-002.
- Checks: no internal data, canonical meeting timezone and labeled local equivalent, version/conflict handling.
- Acceptance: candidate sees only own interview instants and participant-safe data.

### S9.6-005 Implement candidate calendar

- Description: add optional/route-aligned candidate interview calendar.
- Backend: candidate calendar API.
- Frontend: candidate application or new interview route.
- Prisma: none.
- Dependencies: S9.5-002/S9.6-004.
- Checks: range/empty/error/timezone.
- Acceptance: candidate can view past/upcoming/cancelled interviews.

### S9.6-006 Integrate realtime/cache recovery

- Description: update TanStack Query and UI after Socket.IO events.
- Backend: realtime events.
- Frontend: realtime provider/hooks.
- Prisma: none.
- Dependencies: S9.5-004/S9.6-001.
- Checks: reconnect, stale cache, no duplicate request.
- Acceptance: API remains source of truth after reconnect.

## 9. Stage 9.7 - Final validation

### S9.7-001 Run backend unit/e2e suite

- Description: run existing and Stage 9 backend tests.
- Commands: backend lint/build/test/e2e/Prisma validate.
- Dependencies: all backend stages.
- Acceptance: no ignored or disabled failures.

### S9.7-002 Run real-PostgreSQL integration suite

- Description: validate migrations, foreign keys, indexes, transactions and locks.
- Backend: isolated integration configuration.
- Dependencies: isolated database.
- Acceptance: no working database mutation.

### S9.7-003 Run frontend checks

- Description: lint, TypeScript and production build.
- Frontend: Next.js.
- Dependencies: all frontend stages.
- Acceptance: no build/type errors.

### S9.7-004 Run frontend tests/E2E

- Description: test Kanban, forms, calendars and candidate actions.
- Frontend: Vitest/Playwright or adopted project-native stack.
- Dependencies: test infrastructure decision.
- Acceptance: required user flows pass.

### S9.7-005 Complete manual smoke test

- Description: execute successful hiring, candidate decline, reschedule, conflict and cross-company isolation.
- Dependencies: all stages.
- Acceptance: no real data is damaged and all six mandatory scenarios pass.

## 10. Checkpoints

### Checkpoint A - Security baseline

Completed after:

- S9.1-001 through S9.1-006.

Required:

- Argon2 stable;
- active membership centralized;
- global moderator/admin denied;
- stale application status protected;
- isolated PostgreSQL available.

### Checkpoint B - Hiring pipeline

Completed after:

- S9.2 and S9.3.

Required:

- pipeline/summary and strict status transitions;
- responsible assignment/history;
- protected notes;
- employer UI complete.

### Checkpoint C - Interviews

Completed after:

- S9.4 and S9.5.

Required:

- migration valid;
- state machine and participant rules complete;
- advisory lock conflicts;
- idempotency;
- calendar and notifications.

### Checkpoint D - Final product

Completed after:

- S9.6 and S9.7.

Required:

- employer/candidate UI;
- realtime recovery;
- frontend/backend tests;
- manual acceptance;
- no source-code or database blocker.

## 11. Common acceptance criteria

Stage 9 is complete only when:

- all status transitions are backend enforced;
- no moderator/admin bypass exists;
- assignment and notes use active membership;
- interview date/format/status/participant/history rules are enforced;
- candidate cannot access internals;
- cross-company interview conflicts cannot leak data;
- PostgreSQL advisory locks prevent overlapping creates and edits;
- interview idempotency is database-backed;
- Application/Interview coupling follows the approved lifecycle and does not create implicit backward transitions;
- UserStatus and membership deactivation preserve assignment, participant, and history records;
- API conflict codes and frontend recovery behavior match the architecture contract;
- calendar bounds, duration, past-time, timezone, and DST policies are owner-approved and tested;
- notifications are Outbox-based;
- realtime payloads are privacy-safe;
- frontend uses API-derived pipeline and calendar data;
- unit/integration/e2e/build/lint/Prisma checks pass;
- no existing migration or working database is modified unexpectedly.

## 12. Risks

- RBAC bypass in existing employer routes.
- membership activity inferred only by membership row instead of User status.
- stale application/interview update loss.
- advisory lock implementation differing in Prisma SQL execution context.
- timezone conversion bugs.
- cross-company conflict information leakage.
- candidate/internal note leakage through nested DTO.
- duplicate interview/outbox/history writes.
- frontend optimistic update after stale server response.
- real PostgreSQL test setup unavailable.

## 13. Manual testing order

1. Register candidate and employer.
2. Create candidate resume and published vacancy.
3. Submit application.
4. Verify pipeline and strict status sequence.
5. Assign responsible user with OWNER/HR.
6. Verify RECRUITER cannot assign.
7. Add/edit/delete internal notes.
8. Verify candidate cannot see notes.
9. Create interview with an explicitly selected IANA timezone; verify the stored timestamp is UTC.
10. Verify candidate confirm/decline/reschedule.
11. Verify employer reschedule and conflict response.
12. Verify calendar in both roles.
13. Test cross-company isolation.
14. Test stale status and stale interview update.
15. Test duplicate interview creation.
16. Verify notification/realtime/candidate privacy.

## 14. Stage readiness table

| Stage | Dependency/acceptance state | Readiness |
|---|---|---|
| 9.1 | Membership lifecycle, role hardening, all-Application optimistic concurrency, isolated PostgreSQL setup | Not started; gated on owner approval and explicit permission |
| 9.2 | Depends on 9.1; assignment/history and notes complete before Kanban | Blocked by 9.1 |
| 9.3 | Kanban depends on pipeline plus assignment/history/deactivation cleanup | Blocked by 9.2 |
| 9.4 | Interview schema, app-row/advisory locks before all schedule mutations, state coupling, membership/user lifecycle | Blocked by 9.3 execution order (technical dependency: 9.2) and owner approval |
| 9.5 | Calendars and notifications use completed interview models and existing Outbox/Socket.IO | Blocked by 9.4 |
| 9.6 | Interview/calendar UI depends on completed APIs and approved time policies | Blocked by 9.4/9.5 and owner approval |
| 9.7 | PostgreSQL integration, full tests, build/lint, and manual acceptance | Blocked by 9.1–9.6 |

This table describes document dependencies only. No stage is marked implemented or ready to start.
