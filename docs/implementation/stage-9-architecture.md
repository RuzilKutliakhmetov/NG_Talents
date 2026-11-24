# Stage 9 Architecture

Date: 24 November 2026

## 1. Scope and source of truth

This document is the final architecture source for Stage 9.
Its product-decision proposals in Section 18 require owner approval; Stage 9 implementation is gated on that
approval.

Stage 9 extends the existing system with:

- hiring pipeline and server-side summary;
- responsible `EmployerMember` assignment;
- immutable application assignment history;
- soft-deleted `ApplicationNote`;
- `Interview`, `InterviewParticipant`, and `InterviewHistory`;
- employer/candidate interview calendars;
- timezone-safe scheduling;
- cross-company conflict detection;
- candidate interview responses;
- existing Outbox and Socket.IO integration;
- backend RBAC and IDOR protection.

No source code, Prisma schema, migration, dependency, test, environment, or database is changed by this document.

## 2. Current implementation confirmed

### 2.1. Application

`Application` already contains:

- vacancy and candidate relations;
- optional resume relation;
- immutable `resumeSnapshot`;
- `ApplicationStatus`;
- `employerComment`;
- `appliedAt`, `viewedAt`, `createdAt`, `updatedAt`;
- `ApplicationStatusHistory`;
- unique `(vacancyId, candidateId)`;
- one-to-one `Conversation`.

Relevant implementation:

- `app/api/prisma/schema.prisma`
- `app/api/src/application/application.service.ts`
- `app/api/src/application/application.controller.ts`
- `app/api/src/application/employer-application.controller.ts`
- `app/api/src/application/dto/employer-application-list-query.dto.ts`
- `app/api/src/application/dto/update-application-status.dto.ts`

### 2.2. Existing status limitations

The current status transition method validates a static map and writes status plus history in a transaction.

It does not currently provide:

- strict expected-status or expected-`updatedAt` concurrency;
- pipeline/summary API;
- responsible assignment;
- assignment history;
- separate internal notes;
- interview entities;
- range/calendar APIs.

The employer service bypasses `MODERATOR`/`ADMIN` in some paths; Stage 9 must remove these bypasses for hiring data.

### 2.3. Employer membership

`EmployerMember` has:

- `employerId`;
- `userId`;
- `role`;
- `memberRole`;
- unique `(employerId, userId)`.

Active participation requires both:

- `EmployerMember.isActive = true`;
- `User.status = ACTIVE`.

`EmployerMemberRole` values are `OWNER`, `ADMIN`, `HR`, `RECRUITER`.
The existing Prisma `UserStatus` enum contains exactly `ACTIVE`, `BLOCKED`, and `DELETED`.

The current schema has no membership active/deactivated field. `EmployerService.removeMember` physically deletes
the membership, and `EmployerMember.user` currently uses `onDelete: Cascade`.

Stage 9 will add `EmployerMember.isActive Boolean @default(true)` and a nullable `deactivatedAt DateTime?`.
Normal member removal becomes deactivation; membership rows are not physically deleted through employer APIs.
The Prisma relations `EmployerMember.user` and `EmployerMember.employer` change from `onDelete: Cascade` to
`onDelete: Restrict` so deleting a user or company cannot silently erase membership references needed by history.
Company hard deletion is rejected while memberships or retained hiring history exist; Stage 9 must not cascade-
delete hiring history.

`EmployerService.removeMember` must be changed to:

1. reject deactivation if the member is organizer of any blocking interview;
2. require organizer reassignment or interview cancellation before deactivation;
3. acquire the member's per-user advisory lock;
4. clear current application assignments transactionally and append assignment-history snapshots;
5. require the current member `updatedAt` and conditionally update the active membership in the transaction;
6. set `isActive = false` and `deactivatedAt`;
7. preserve `EmployerMember`, participant rows/statuses, and historical identifiers.

Reactivation uses `PATCH /members/:memberId` with `isActive = true` and `expectedUpdatedAt`. It is allowed only
when `User.status = ACTIVE`, sets `deactivatedAt = null`, and does not restore assignments or removed
participants. A repeated `POST /members` for an existing deactivated membership returns
`409 MEMBER_ALREADY_EXISTS`;
the explicit update route is required.

The existing code has no User status transition or physical user-delete operation; login rejects every
`User.status` other than `ACTIVE`. Stage 9 must use only these existing enum values:

- `BLOCKED`: account-level deactivation; preserve the User and EmployerMember rows. It denies authentication and
  all operations even when `EmployerMember.isActive` remains true.
- `DELETED`: soft-deleted account state in the existing enum, not a physical database deletion. Preserve the User,
  membership, interview participant, and history rows.
- Before a member's User status is changed from `ACTIVE`, apply the same safe lifecycle: clear assignments with
  history; reassign/cancel blocking interviews where the member is organizer. Existing participant rows and
  statuses (candidate, organizer, or additional employee) are preserved; the non-active User loses API access,
  and no Application or Interview status changes automatically.
- The member activity flag and `User.status` remain distinct. Reactivating a User does not reactivate a
  deactivated membership, restore cleared assignments, or silently reinstate removed participants.
- Physical User deletion is prohibited throughout Stage 9; `User.status = DELETED` is the available soft-delete
  state. The new
  `EmployerMember.user` and `InterviewParticipant.userId` relations use `onDelete: Restrict`; historical actor and
  member identifiers are retained as scalar snapshots, not cascading FKs.

No current user-status mutation path exists to extend. Add a dedicated lifecycle service hook in Stage 9 so any
future status transition follows these rules; do not introduce new `UserStatus` values or a physical-delete path.
Physical Employer deletion is not exposed by the current EmployerController. Stage 9 uses `onDelete: Restrict` for
membership/interview/history references, so a future company hard-delete must be rejected while those records
exist; no hiring history may be cascade-deleted.

### 2.4. Notifications and realtime

The existing Outbox and realtime gateway are reusable:

- `NotificationOutbox`;
- `NotificationsService.enqueue(...)`;
- `NotificationPreference`;
- IN_APP delivery;
- Socket.IO namespace `/events`;
- private user rooms;
- Redis adapter.

The candidate, employer, moderation, and notification data must remain isolated in DTOs and realtime payloads.

## 3. Final application status design

### 3.1. Statuses

Only the existing `ApplicationStatus` enum is used:

```text
NEW
VIEWED
IN_REVIEW
INTERVIEW
OFFER
HIRED
REJECTED
WITHDRAWN
```

No second pipeline stage enum or stage table is added.

### 3.2. Canonical sequence

```text
NEW -> VIEWED -> IN_REVIEW -> INTERVIEW -> OFFER -> HIRED
```

`REJECTED` and `WITHDRAWN` are terminal statuses.

Status semantics:

- `NEW`: received, not opened by the employer.
- `VIEWED`: opened and viewed by the employer.
- `IN_REVIEW`: employer is actively reviewing the candidate.
- `INTERVIEW`: candidate is in the interview stage.
- `OFFER`: employer made an offer.
- `HIRED`: candidate is hired.
- `REJECTED`: employer rejected the application.
- `WITHDRAWN`: candidate withdrew the application.

### 3.3. Allowed transitions

Employer transitions:

| From | To |
|---|---|
| `NEW` | `VIEWED`, `REJECTED` |
| `VIEWED` | `IN_REVIEW`, `REJECTED` |
| `IN_REVIEW` | `INTERVIEW`, `REJECTED` |
| `INTERVIEW` | `OFFER`, `REJECTED` |
| `OFFER` | `HIRED`, `REJECTED` |
| `HIRED` | none |
| `REJECTED` | none |
| `WITHDRAWN` | none |

Candidate transitions:

| From | To | Initiator |
|---|---|---|
| `NEW`, `VIEWED`, `IN_REVIEW`, `INTERVIEW`, `OFFER` | `WITHDRAWN` | Candidate |

Employer may reject from any non-terminal status. Candidate cannot change another application status.

No reverse transition and no reopening of a terminal status are allowed.

### 3.3.2. Application and interview lifecycle

`Application.status`, `Interview.status`, and `InterviewParticipant.invitationStatus` are separate state machines;
interview participant responses never directly write an application status.

The proposed creation rule is:

- interviews may be created only while the application is `IN_REVIEW` or `INTERVIEW`;
- creating the first interview while the application is `IN_REVIEW` atomically moves the application to
  `INTERVIEW` and adds `ApplicationStatusHistory`;
- the same transaction creates the interview, participants, `InterviewHistory`, and required Outbox entries;
- if the application is already `INTERVIEW`, another interview may be created without changing application status
  or adding another application status-history row;
- an interview create request must include the application's `expectedStatus` and `expectedUpdatedAt`;
- creating interviews from `NEW`, `VIEWED`, `OFFER`, `HIRED`, `REJECTED`, or `WITHDRAWN` returns
  `409 APPLICATION_CONFLICT` with reason `INTERVIEW_NOT_ALLOWED_FOR_APPLICATION_STATUS`.

Multiple interview records per application are allowed. Each uses its own `clientRequestId`; the normal
participant conflict rule prevents overlapping interviews for the candidate, while sequential interviews are
allowed.

Interview cancellation, candidate decline, reschedule, completion, and no-show do not automatically move the
application backward or forward. An application may move from `INTERVIEW` to `OFFER` while a blocking interview
exists; the interview remains unchanged and may be explicitly cancelled by an authorized employer. Transitioning
an application to `REJECTED`, `WITHDRAWN`, or `HIRED` is rejected with
`409 APPLICATION_CONFLICT` / `ACTIVE_INTERVIEWS` while any blocking interview exists. The employer must cancel
blocking interviews before rejection or hire; the candidate must wait for the employer to cancel them before
withdrawing. Non-blocking interview records and their history are retained. These are explicit proposed product
rules pending owner approval; no other automatic application/interview transition is implied.

### 3.3.1. Automatic employer VIEWED

The existing implementation already has `markViewed`: the first call for a `NEW` application updates `viewedAt`,
changes status to `VIEWED`, writes `ApplicationStatusHistory`, and encloses all writes in one Prisma transaction.
The existing endpoint is `POST /api/v1/employer/:employerId/applications/:applicationId/view`.

For Stage 9 this behavior remains the canonical first-open behavior:

- opening `NEW` the first time atomically updates `viewedAt` and status;
- the mutating request supplies `expectedStatus = NEW` and `expectedUpdatedAt`; the server enforces the version
  with a conditional update in the same transaction;
- opening again after `VIEWED` is a no-op;
- no second history row or status notification is created;
- `VIEWED` only means that the employer opened the application;
- moving to `IN_REVIEW` is a separate employer status action;
- the existing implementation must gain stale-state protection and active-member checks before this endpoint is considered Stage 9-safe.

This functionality is not implemented by the documentation-only Stage 9 preparation.

### 3.4. Repeated and concurrent transitions

If the requested target equals the current status:

- return the current application;
- perform no status update;
- create no history record;
- send no status notification.

For example, repeated `NEW -> VIEWED` requests are idempotent.

Status mutations must accept:

- `status`;
- optional `comment`;
- required `expectedStatus`;
- required `expectedUpdatedAt`.

The server must:

1. verify employer membership and application ownership;
2. read the current status and `updatedAt`;
3. verify the transition;
4. atomically compare both expected values while performing a conditional update/version check;
5. update status and write immutable history in one transaction;
6. enqueue the candidate status notification in the same transaction;
7. emit realtime only after successful commit.

If either expected value is stale, return `409 APPLICATION_STATUS_CONFLICT` with the current status and
`updatedAt`. The compare-and-write must be enforced by the server in the transaction (for example, conditional
update on `id`, `status`, and `updatedAt`); reading a version and then unconditionally writing it is insufficient.

Every mutation of an `Application` record, including status and assignment changes, requires both
`expectedStatus` and `expectedUpdatedAt` and enforces them in a conditional database update. Note edits/deletes
use the note's own required `expectedUpdatedAt`; note creation has no pre-existing note version to compare.
Stale writes return HTTP 409 with a resource-specific conflict code. Entity mutation, history, and required
Outbox writes commit or roll back atomically.

### 3.5. Status history

`ApplicationStatusHistory` remains the source of status history.

Every employer or candidate status change includes:

- `applicationId`;
- `actorId`;
- `actorRole`;
- `fromStatus`;
- `toStatus`;
- optional comment/reason;
- `createdAt`;
- source/action supplied by the service.

The existing model may be extended with `source` and `comment` as needed. Existing history cannot be edited or deleted.

## 4. Responsible employee

`Application` is extended with nullable:

- `assignedMemberId`
- relation to `EmployerMember`
- `onDelete: Restrict`
- index on `assignedMemberId`.

Assignment may be made only to an active `EmployerMember` of the application company.

No assignment may reference:

- a membership of another company;
- an inactive `User`;
- a deleted/nonexistent membership.

When a membership is deactivated or the user becomes inactive:

- existing applications must not retain an active assignment;
- assignment must be set to null;
- assignment history must retain the previous and new member identifiers;
- no physical assignment-history deletion is allowed.

The FK uses `Restrict`, not `SetNull`, so a physical member deletion cannot silently clear an assignment without
history. The deactivation transaction explicitly clears assignments and records snapshots before marking the
membership inactive; Stage 9 exposes no physical member-delete operation.

Create immutable `ApplicationAssignmentHistory`:

```text
id
applicationId
previousMemberId nullable
newMemberId nullable
previousMemberName nullable
newMemberName nullable
previousMemberRole nullable
newMemberRole nullable
actorId
actorRole
comment nullable
createdAt
```

The member identifiers are historical identifiers and must not use a foreign key that cascades or deletes history.
The name and role snapshots preserve the responsible employee information after membership removal.
`applicationId` references the application with `onDelete: Restrict`; assignment history cannot be removed by
application deletion. A physical FK to either historical member is intentionally not required.

Assignment/change/removal operations require the application's `expectedStatus` and `expectedUpdatedAt`, enforced
in the same database update, and are:

- allowed to OWNER, ADMIN, HR;
- prohibited to RECRUITER;
- atomic with history;
- idempotent by target member;
- protected against stale application state.

They also acquire the per-user advisory lock for previous and target assignee User IDs in sorted order before
locking/updating the Application row. Membership deactivation and User-status changes use the same lock, so an
assignment cannot race with making its assignee inactive.

## 5. Internal application notes

Create `ApplicationNote`:

```text
id
applicationId
employerId
authorMemberId
body
createdAt
updatedAt
deletedAt nullable
```

Rules:

- visible only to active members of `employerId`;
- candidate DTO never includes notes;
- moderator/admin DTO never includes notes;
- Outbox payload never includes note body;
- Socket.IO payload never includes note body;
- public API never includes notes.

Operations:

- add: active OWNER, ADMIN, HR, RECRUITER;
- edit own: active OWNER, ADMIN, HR, RECRUITER;
- edit another: OWNER, ADMIN only;
- soft-delete own: active OWNER, ADMIN, HR, RECRUITER;
- soft-delete another: OWNER, ADMIN only;
- deleted notes excluded without an explicit future admin operation.

Note mutation must verify the application belongs to the company and the author/active member belongs to that company.

## 6. Interview entities

### 6.1. Interview

Create Prisma enum `InterviewFormat`:

```text
ONLINE
OFFLINE
PHONE
```

Create Prisma enum `InterviewStatus`:

```text
SCHEDULED
CONFIRMED
DECLINED
RESCHEDULE_REQUESTED
COMPLETED
CANCELLED
NO_SHOW
```

Create `Interview`:

```text
id
applicationId
employerId
organizerId
scheduledAt
durationMinutes
timezone
format
location nullable
meetingUrl nullable
title nullable
description nullable
candidateMessage nullable
internalComment nullable
clientRequestId
status
cancelledAt nullable
cancelledById nullable
cancellationReason nullable
completedAt nullable
createdAt
updatedAt
```

`Interview.organizerId` is a required FK to `EmployerMember.id` with `onDelete: Restrict`.
It is not nullable. Membership deactivation does not delete the membership row; organizer reassignment or
interview cancellation is required before deactivation when the interview is blocking.
`Interview.applicationId` and `Interview.employerId` also use `onDelete: Restrict`, preventing hard deletion of
an application or company from cascading away interviews and their audit records.

`scheduledAt` is UTC. `endAt` is derived as `scheduledAt + durationMinutes`.

Unique constraints:

- `@@unique([applicationId, clientRequestId])`
- `InterviewParticipant` unique `(interviewId, userId)`.

Indexes:

- `(applicationId, scheduledAt)`
- `(employerId, scheduledAt, status)`
- `(organizerId, scheduledAt, status)`
- `(status, scheduledAt)`.

### 6.2. InterviewParticipant

Create Prisma enum `InterviewParticipantRole`:

```text
CANDIDATE
ORGANIZER
ADDITIONAL_EMPLOYEE
```

Create Prisma enum `InterviewParticipantStatus`:

```text
INVITED
CONFIRMED
DECLINED
RESCHEDULE_REQUESTED
```

Create `InterviewParticipant`:

```text
id
interviewId
userId
role
invitationStatus
invitedAt
respondedAt nullable
removedAt nullable
createdAt
updatedAt
```

Candidate participation is mandatory. The participant with `CANDIDATE` role must have `userId = Interview.application.candidateId`.

`InterviewParticipant.userId` references `User.id`, not `EmployerMember.id`.

The participant with `ORGANIZER` role must correspond exactly to `Interview.organizerId`:

```text
participant.role = ORGANIZER
participant.userId =
  EmployerMember.findUnique(Interview.organizerId).userId
```

Changing the organizer is an atomic interview operation that must:

1. verify the replacement is an active `EmployerMember` of the same company;
2. update `Interview.organizerId`;
3. update or replace the organizer participant row;
4. keep a former organizer as `ADDITIONAL_EMPLOYEE` only if they remain a requested participant;
5. set `removedAt` on stale participant rows without deleting them;
6. write `ORGANIZER_CHANGED` with before/after member and user identifiers to `InterviewHistory`.

For participant FK behavior, participant `userId` uses `onDelete: Restrict`. `InterviewHistory.actorId`,
`InterviewParticipant.userId`, and membership references must not cascade-delete audit/history records.
Historical actor/participant display names and roles are snapshotted in history where the relation could otherwise
become unavailable.
`InterviewParticipant.interviewId` also uses `onDelete: Restrict`. Removing a participant sets `removedAt` and
adds history; it does not physically delete the participant row. Re-adding that user reactivates the same row,
resets it to `INVITED`, and appends `PARTICIPANT_ADDED` history.

Employer participant roles:

- `ORGANIZER`: the responsible/selected organizer;
- `ADDITIONAL_EMPLOYEE`: active member of the interview company.

Additional participants are never loaded from another company.

### 6.3. InterviewHistory

Create immutable `InterviewHistory`:

```text
id
interviewId
actorId
actorName nullable
actorRole
action
fromStatus nullable
toStatus nullable
changes Json nullable
comment nullable
createdAt
```

Actions include:

- `CREATED`
- `RESCHEDULED`
- `FORMAT_CHANGED`
- `LOCATION_CHANGED`
- `ORGANIZER_CHANGED`
- `PARTICIPANT_ADDED`
- `PARTICIPANT_REMOVED`
- `CONFIRMED`
- `DECLINED`
- `RESCHEDULE_REQUESTED`
- `CANCELLED`
- `COMPLETED`
- `NO_SHOW`.

Interview history must preserve actor-name snapshots and changed participant/member snapshots.
Its records must not depend on cascading foreign keys for `EmployerMember` or `User` deletion.
`actorId` is a historical scalar identifier (not a cascading FK), with nullable `actorName` snapshot; the
`changes` snapshot contains previous/new organizer member IDs, user IDs, display names, and roles as applicable.
`InterviewHistory.interviewId` references its interview with `onDelete: Restrict`; interviews are never
physically deleted through Stage 9 APIs.

## 7. Interview state machine

### 7.1. Global interview transitions

| From | To | Initiator | Side effects |
|---|---|---|---|
| none | `SCHEDULED` | Employer | Create candidate and organizer participants; notify candidate/participants |
| `SCHEDULED` | `CONFIRMED` | Candidate | Candidate participant `CONFIRMED`; notify organizer |
| `SCHEDULED` | `DECLINED` | Candidate | Candidate participant `DECLINED`; notify organizer |
| `SCHEDULED`/`CONFIRMED`/`RESCHEDULE_REQUESTED` | `RESCHEDULE_REQUESTED` | Candidate | Candidate participant `RESCHEDULE_REQUESTED`; no date/time change |
| `SCHEDULED`/`CONFIRMED`/`RESCHEDULE_REQUESTED` | `SCHEDULED` | Employer | On date/time/duration/timezone change, reset candidate participant to `INVITED`; write `RESCHEDULED`; recheck conflicts and notify candidate |
| `SCHEDULED`/`CONFIRMED`/`RESCHEDULE_REQUESTED` | `CANCELLED` | Employer | Set global status and cancellation fields; preserve every participant status; write history and notify participants |
| `SCHEDULED`/`CONFIRMED` | `COMPLETED` | Employer | Set `completedAt`; notify candidate/organizer |
| `SCHEDULED`/`CONFIRMED` | `NO_SHOW` | Employer | Preserve the candidate participant's previous invitation status; write `NO_SHOW` only to the global interview and history |

Any employer change to `scheduledAt`, `durationMinutes`, or timezone while global status is
`SCHEDULED`, `CONFIRMED`, or `RESCHEDULE_REQUESTED` is a reschedule:

- rerun all conflict checks for the union of current and proposed participants;
- set global status to `SCHEDULED`;
- reset the candidate participant status to `INVITED` and clear `respondedAt`;
- leave additional employees `INVITED`;
- write `RESCHEDULED` history with old and new date/time/timezone;
- enqueue a candidate notification in the same transaction.

The rule applies even when the previous global status was `SCHEDULED` or `CONFIRMED`, and when it was
`RESCHEDULE_REQUESTED`. An edit to title, description, candidate message, internal comment, location/link,
or other non-time information does not reset candidate confirmation unless it also changes time, duration,
or timezone.

Employer cannot modify or reschedule `CANCELLED`, `COMPLETED`, `NO_SHOW`, or `DECLINED` interviews.
`DECLINED` is exclusively a candidate refusal. Employer cancellation never changes any participant status to
`DECLINED`; the global status becomes `CANCELLED`, `InterviewHistory` records `CANCELLED`, and notifications are
sent to participants.

### 7.2. Participant transitions

Candidate participant:

| From | To | Initiator |
|---|---|---|
| `INVITED` | `CONFIRMED` | Candidate |
| `INVITED` | `DECLINED` | Candidate |
| `INVITED`/`CONFIRMED` | `RESCHEDULE_REQUESTED` | Candidate |
| `RESCHEDULE_REQUESTED` | `INVITED` | Employer proposed a new date |

Additional employee participant:

- starts `INVITED`;
- remains `INVITED` in the first implementation;
- does not have a self-confirmation or self-declination endpoint;
- may be removed or changed only by an authorized employer participant-management action;
- an additional employee response never changes the global interview status.

No additional employee confirmation scenarios are included in Stage 9.

Global status and participant status remain synchronized:

- candidate confirmation: participant `CONFIRMED`, global `CONFIRMED`;
- candidate decline: participant `DECLINED`, global `DECLINED`;
- candidate reschedule request: participant and global `RESCHEDULE_REQUESTED`;
- employer proposal: participant `INVITED`, global `SCHEDULED`;
- employer cancellation: global `CANCELLED`; all participant statuses are preserved;
- employer completion: global `COMPLETED`;
- employer no-show: global `NO_SHOW`;
- no additional employee decline transition exists in the first version.

`DECLINED` on `InterviewStatus` and `InterviewParticipantStatus` is reserved for candidate refusal. It is
terminal for that `Interview` record. A new invitation requires creation of a new `Interview`; the old record
and its history remain unchanged. `DECLINED`, `CANCELLED`, `COMPLETED`, and `NO_SHOW` do not block calendar time.

## 8. Timezone and calendar

### 8.1. Storage

- `scheduledAt`: UTC `DateTime`;
- `timezone`: IANA name, for example `Europe/Amsterdam`, `Asia/Yekaterinburg`;
- `durationMinutes`: positive integer; proposed bounds are in Section 8.4 and require owner approval.

The server rejects:

- fixed offsets;
- unknown IANA names;
- past create/reschedule times (proposed rule, pending owner approval);
- duration outside the proposed bounds in Section 8.4 (pending owner approval).

Timezone resolution:

1. use an explicitly sent timezone;
2. if omitted, use a confirmed timezone field in the existing user profile or company model, if one exists;
3. otherwise, require the client to provide a timezone and reject the request with `400 TIMEZONE_REQUIRED`.

The current Prisma schema has no confirmed timezone field in the candidate profile or company, and no existing
system timezone setting has been confirmed. Do not invent a profile/company setting or silently substitute UTC.
`scheduledAt` is always persisted as a UTC instant; `timezone` is stored separately as a validated IANA name.
The frontend must prefill a detected browser IANA timezone only as a visible, explicitly submitted selection.
If it cannot detect or obtain a timezone, it must require the user to select one and must not submit the form
until that happens. When editing, preserve and display the interview's stored timezone unless the user changes it.

### 8.2. API format

Create/update payload:

```json
{
  "scheduledAt": "2026-12-01T09:00:00.000Z",
  "timezone": "America/Toronto",
  "durationMinutes": 60,
  "format": "ONLINE",
  "location": null,
  "meetingUrl": "https://...",
  "title": "Technical interview",
  "candidateMessage": "Please join...",
  "organizerId": "employer-member-id",
  "participantMemberIds": [],
  "clientRequestId": "f83de5d3-50ab-45bb-87bd-fd520bf7c214",
  "expectedStatus": "IN_REVIEW",
  "expectedUpdatedAt": "2026-11-24T11:00:00.000Z"
}
```

For create, `expectedStatus`/`expectedUpdatedAt` are the linked Application version. The API requires
`scheduledAt` as UTC ISO 8601 and an explicit IANA `timezone` in the current schema. Local datetime strings are
not accepted; the frontend converts the selected local date/time and DST occurrence to a UTC instant, then
explicitly submits both values.

### 8.3. Calendar endpoints

Employer calendar:

- `GET /api/v1/employer/:employerId/interviews?from=...&to=...`
- filters: vacancyId, organizerMemberId, status, format;
- pagination or strict range limit;
- active membership required.

Candidate calendar:

- `GET /api/v1/candidate/interviews?from=...&to=...`
- no public route parameter may override candidate identity;
- only own interviews are returned;
- internal comment and hidden participant data excluded.

Calendar `from` and `to` are required UTC ISO 8601 instants and define the half-open query range `[from, to)`.
The API rejects invalid or reversed ranges and requests over the proposed 90-day maximum; it never silently
clamps a range. The proposed maximum requires owner approval.

### 8.4. Proposed scheduling limits and display rules

The current codebase does not establish interview-duration limits, a calendar range maximum, past-scheduling
policy, or daylight-saving-time behavior. The following are proposed product defaults, not existing requirements:

- duration: integer minutes from 15 through 240 inclusive;
- maximum calendar query range: 90 days;
- new interviews and reschedules must have `scheduledAt` strictly later than server time; historical events may
  still be viewed, completed, or marked no-show;
- the employer selects the meeting timezone in the create/edit form; this IANA timezone is stored on the
  interview and is the canonical display timezone for both parties;
- both parties see the same event instant. Candidate and employer interfaces may additionally show their detected
  local equivalent, with an explicit timezone label; local display never changes the event;
- local wall times inside a daylight-saving gap are rejected. Repeated wall times in a daylight-saving overlap
  require the user to select the earlier or later occurrence; the client sends the resulting UTC instant and
  selected IANA timezone;
- duration and conflict intervals are elapsed minutes on the UTC timeline, not wall-clock arithmetic.

These are new product decisions and require owner approval before implementation. Until approved, no numeric or
past-time policy is considered an existing project requirement.

## 9. Schedule conflicts

### 9.1. Blocking states

Blocking interview states:

- `SCHEDULED`
- `CONFIRMED`
- `RESCHEDULE_REQUESTED`

Non-blocking states:

- `DECLINED`
- `CANCELLED`
- `COMPLETED`
- `NO_SHOW`

`DECLINED` is terminal for the individual interview record. It cannot be reopened or receive a new invitation.
A retry must create a new `Interview`; the declined record and all previous history remain unchanged.

Conflict checks include:

- candidate;
- organizer;
- every additional employee participant with `removedAt = null`;
- all companies of the employee and all employers of the candidate.

A conflict response must disclose only:

- HTTP 409 code `INTERVIEW_SCHEDULE_CONFLICT`;
- whether a conflict exists;
- conflict type: candidate, organizer, or participant;
- safe suggested next step.

It must not disclose:

- other company name;
- other candidate;
- other vacancy;
- other interview title;
- other participant identity;
- other interview details.

### 9.2. Transaction and locking

Use PostgreSQL transaction-scoped advisory locks with Prisma for both create and edit operations.

For create, lock every proposed participant user ID. For edit, lock the sorted, deduplicated union of active
current and proposed participant user IDs, including the current and replacement organizer and any
current/proposed additional employees. Acquire every lock in lexicographically sorted user-ID order before
locking the linked Application row. Application terminal-state transitions lock the Application row but never
wait for participant locks.

Within the same transaction, acquire each user lock using a PostgreSQL advisory transaction lock, e.g.
`SELECT pg_advisory_xact_lock(hashtext('stage9-user:' || userId))` via Prisma `$queryRaw` on the same transaction
client. Assignment changes lock the user IDs of previous/new assignees; membership deactivation and User-status
changes use the same per-user lock before clearing assignments or checking organizer usage. Then lock affected
Application rows in sorted ID order. A hash collision may serialize unrelated users but must not weaken conflict
correctness.

Within the same transaction:

1. acquire advisory locks through Prisma `$queryRaw` on the transaction client;
2. lock and re-read the linked Application row; validate status eligibility;
3. re-read and validate the interview version/current participants;
4. run conflict checks, excluding the interview being edited;
5. conditionally update the interview using `expectedUpdatedAt` in the database; if no row matches, abort with
   `409 INTERVIEW_STALE`;
6. write participant changes;
7. write history and Outbox notifications;
8. commit (which releases transaction-scoped locks).

Advisory locks are scoped to the transaction and do not introduce permanent locks.

This strategy serializes overlapping interview writes for the same candidate/organizer/additional employee across all companies and coordinates them with assignment/member lifecycle changes. It is compatible with the current PostgreSQL/Prisma architecture and is more explicit than global table locking or a full serializable transaction.

Intervals are half-open: `[scheduledAt, scheduledAt + duration)`. Two interviews overlap exactly when
`existingStart < requestedEnd AND requestedStart < existingEnd`; back-to-back interviews are allowed.
Conflict checks consider only `SCHEDULED`, `CONFIRMED`, and `RESCHEDULE_REQUESTED` records and exclude the
interview being edited. Conflict check and writes must remain in the lock-holding transaction.

## 10. Interview idempotency

Interview creation requires `clientRequestId`, a UUID.

Database:

```text
@@unique([applicationId, clientRequestId])
```

Behavior:

- same application, same key, same payload: return existing interview;
- same application, same key, changed payload: `409 IDEMPOTENT_REQUEST_CONFLICT`;
- concurrent duplicate requests: unique constraint wins; service loads and compares original payload;
- no duplicate participants or history records.

The database constraint is mandatory. Application-only lookup is not sufficient.

## 11. Pipeline API

### 11.1. Pipeline

`GET /api/v1/employer/:employerId/applications/pipeline`

Query:

- `vacancyId`;
- `status`;
- `candidateSearch`;
- `assignedMemberId`;
- `appliedFrom`;
- `appliedTo`;
- `page`;
- `limit`;
- `sort`;
- `direction`.

Response:

- paginated application cards;
- status;
- candidate display fields allowed by privacy settings;
- vacancy summary;
- assigned member summary;
- nearest active interview;
- next scheduled interview date;
- total and per-status counts where required.

No full resume snapshot is loaded for pipeline cards.

### 11.2. Summary

`GET /api/v1/employer/:employerId/applications/summary`

Returns backend-computed:

- total applications;
- `NEW`;
- `VIEWED`;
- `IN_REVIEW`;
- `INTERVIEW`;
- `OFFER`;
- `HIRED`;
- `REJECTED`;
- `WITHDRAWN`;

Optional filters are the same date/vacancy/status scope. Summary never calculates from an incomplete frontend page.

### 11.3. Application mutation routes

| Method and path | Required input and purpose | RBAC | Expected errors |
|---|---|---|---|
| `POST /api/v1/employer/:employerId/applications/:applicationId/view` | `expectedStatus`, `expectedUpdatedAt`; first-open `NEW -> VIEWED` | Active employer-company member, any company role; application belongs to company | `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND`, `409 APPLICATION_STATUS_CONFLICT` |
| `POST /api/v1/employer/:employerId/applications/:applicationId/status` | `status`, `expectedStatus`, `expectedUpdatedAt`, optional `comment` | Active employer-company member, any company role | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND`, `409 APPLICATION_STATUS_CONFLICT` or `APPLICATION_CONFLICT` |
| `PATCH /api/v1/employer/:employerId/applications/:applicationId/comment` | `comment`, `expectedStatus`, `expectedUpdatedAt` | Active employer-company member, any company role | `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND`, `409 APPLICATION_STATUS_CONFLICT` |
| `POST /api/v1/applications/:applicationId/withdraw` | `expectedStatus`, `expectedUpdatedAt` | Authenticated active candidate; application belongs to JWT candidate | `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND`, `409 APPLICATION_STATUS_CONFLICT` or `APPLICATION_CONFLICT` |

Application creation (`POST /api/v1/applications`) is candidate-only and has no pre-existing version to compare.
The first interview creation also requires the linked application's `expectedStatus` and `expectedUpdatedAt`;
for that create operation these values refer to the application, not a not-yet-created interview.

## 12. Interview API

Employer endpoints:

```text
POST   /api/v1/employer/:employerId/applications/:applicationId/interviews
GET    /api/v1/employer/:employerId/interviews
GET    /api/v1/employer/:employerId/interviews/:interviewId
PATCH  /api/v1/employer/:employerId/interviews/:interviewId
POST   /api/v1/employer/:employerId/interviews/:interviewId/cancel
POST   /api/v1/employer/:employerId/interviews/:interviewId/complete
POST   /api/v1/employer/:employerId/interviews/:interviewId/no-show
```

Candidate endpoints:

```text
GET    /api/v1/candidate/interviews
GET    /api/v1/candidate/interviews/:interviewId
POST   /api/v1/candidate/interviews/:interviewId/confirm
POST   /api/v1/candidate/interviews/:interviewId/decline
POST   /api/v1/candidate/interviews/:interviewId/reschedule-request
```

The interview routes above are the canonical routes; do not add duplicate `/applications/:id/interviews` aliases.

All interview mutations require `expectedUpdatedAt`; create requires `clientRequestId`, `scheduledAt`, and
`timezone`. On create, `expectedStatus` and `expectedUpdatedAt` refer to the linked application. On an existing
interview mutation, `expectedUpdatedAt` refers to that interview. A time change requires an explicitly provided
IANA timezone. Stale versions return HTTP 409
`INTERVIEW_STALE`; calendar conflicts return HTTP 409 `INTERVIEW_SCHEDULE_CONFLICT`. Entity changes, histories,
and Outbox notifications are atomic.

### 12.1. Employer membership lifecycle API

| Method and path | Purpose and required input | RBAC and ownership | Expected errors |
|---|---|---|---|
| `GET /api/v1/employer/:employerId/members` | List company members | Active OWNER/ADMIN/HR/RECRUITER | `403 FORBIDDEN`, `404 EMPLOYER_NOT_FOUND` |
| `POST /api/v1/employer/:employerId/members` | Add a member; body `userId`, `role` | Active OWNER/ADMIN; target User is `ACTIVE`; employer is valid | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 EMPLOYER_NOT_FOUND`/`USER_NOT_FOUND`, `409 MEMBER_ALREADY_EXISTS` |
| `PATCH /api/v1/employer/:employerId/members/:memberId` | Change company role and/or activate membership; body `role` and/or `isActive`, `expectedUpdatedAt` | Active OWNER/ADMIN; member belongs to route employer; activation requires active User | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 MEMBER_NOT_FOUND`, `409 MEMBER_CONFLICT`/`USER_NOT_ACTIVE` |
| `DELETE /api/v1/employer/:employerId/members/:memberId` | Deactivate membership (not physical deletion); body `expectedUpdatedAt` | Active OWNER/ADMIN; member belongs to route employer | `403 FORBIDDEN`, `404 MEMBER_NOT_FOUND`, `409 MEMBER_CONFLICT` or `MEMBER_ACTIVE_INTERVIEWS` |

`MEMBER_CONFLICT` means a stale member version; `MEMBER_ACTIVE_INTERVIEWS` means a blocking interview still has
the member as organizer and requires organizer reassignment or interview cancellation. Neither allows global
`ADMIN` or `MODERATOR` bypass. The response follows the common error envelope in Section 12.4.

### 12.2. Assignment and note API contracts

| Method and path | Purpose and required input | RBAC and ownership | Expected errors |
|---|---|---|---|
| `PUT /api/v1/employer/:employerId/applications/:applicationId/assignee` | Set/replace assignee; body `memberId`, `expectedStatus`, `expectedUpdatedAt` | Active OWNER/ADMIN/HR; target must be active same-company member | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND`/`MEMBER_NOT_FOUND`, `409 APPLICATION_STATUS_CONFLICT` |
| `DELETE /api/v1/employer/:employerId/applications/:applicationId/assignee` | Clear assignee; body `expectedStatus`, `expectedUpdatedAt` | Active OWNER/ADMIN/HR | `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND`, `409 APPLICATION_STATUS_CONFLICT` |
| `GET /api/v1/employer/:employerId/applications/:applicationId/assignee/history` | Read immutable assignment history | Active member of company; all company roles may view | `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND` |
| `GET /api/v1/employer/:employerId/applications/:applicationId/notes` | List non-deleted internal notes | Active member; all company roles may view | `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND` |
| `POST /api/v1/employer/:employerId/applications/:applicationId/notes` | Create note; body `body` | Active OWNER/ADMIN/HR/RECRUITER | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 APPLICATION_NOT_FOUND` |
| `PATCH /api/v1/employer/:employerId/applications/:applicationId/notes/:noteId` | Edit note; body `body`, `expectedUpdatedAt` | Author or OWNER/ADMIN; note belongs to application/company | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 NOTE_NOT_FOUND`, `409 NOTE_CONFLICT` |
| `DELETE /api/v1/employer/:employerId/applications/:applicationId/notes/:noteId` | Soft-delete note; body `expectedUpdatedAt` | Author or OWNER/ADMIN; note belongs to application/company | `403 FORBIDDEN`, `404 NOTE_NOT_FOUND`, `409 NOTE_CONFLICT` |

### 12.3. Interview history, participant, and organizer API contracts

| Method and path | Purpose and required input | RBAC and ownership | Expected errors |
|---|---|---|---|
| `GET /api/v1/employer/:employerId/interviews/:interviewId/history` | Read immutable interview history | Active company member; interview belongs to company | `403 FORBIDDEN`, `404 INTERVIEW_NOT_FOUND` |
| `POST /api/v1/employer/:employerId/interviews/:interviewId/participants` | Add employee; body `memberId`, `expectedUpdatedAt` | Active OWNER/ADMIN/HR/RECRUITER; member active in same company | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 INTERVIEW_NOT_FOUND`/`MEMBER_NOT_FOUND`, `409 INTERVIEW_STALE`/`INTERVIEW_SCHEDULE_CONFLICT` |
| `DELETE /api/v1/employer/:employerId/interviews/:interviewId/participants/:participantId` | Remove additional employee; `expectedUpdatedAt` required | Active OWNER/ADMIN/HR/RECRUITER; cannot remove candidate or organizer here | `403 FORBIDDEN`, `404 PARTICIPANT_NOT_FOUND`, `409 INTERVIEW_STALE`/`INTERVIEW_SCHEDULE_CONFLICT` |
| `PATCH /api/v1/employer/:employerId/interviews/:interviewId/organizer` | Change organizer; body `memberId`, `expectedUpdatedAt` | Active OWNER/ADMIN/HR/RECRUITER; replacement active in same company | `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 INTERVIEW_NOT_FOUND`/`MEMBER_NOT_FOUND`, `409 INTERVIEW_STALE`/`INTERVIEW_SCHEDULE_CONFLICT` |

Participant/organizer mutations acquire locks for the sorted union of existing and proposed participant user IDs,
including old/new organizers. They recheck blocking conflicts and atomically update participants, interview
version, history, and any notifications. Every route verifies the interview belongs to the route company; no
cross-company participant or conflict details are returned.

Any endpoint with an `:interviewId` returns `404 INTERVIEW_NOT_FOUND` both when the row does not exist and when
the caller is not authorized to see it; it never reveals whether a foreign interview exists.
To keep the terminal-Application rule race-safe, every Interview mutation first locks its linked Application row
within the transaction and verifies its current status. Application transitions that are gated on blocking
interviews acquire the same row lock before checking interviews. This serializes interview writes against
Application closure.

### 12.4. Error envelope and frontend behavior

Every Stage 9 error uses the same JSON shape:

```json
{
  "statusCode": 409,
  "code": "INTERVIEW_STALE",
  "message": "The interview has changed.",
  "details": {}
}
```

`details` is omitted when it is not safe or useful. Codes and client behavior:

| HTTP/code | Meaning | Frontend behavior |
|---|---|---|
| `409 APPLICATION_STATUS_CONFLICT` | Application `expectedStatus` or `expectedUpdatedAt` is stale | Refetch application/history and show the latest state; do not retry the old mutation automatically |
| `409 APPLICATION_CONFLICT` | Current Application state violates a business invariant, including active interviews blocking a terminal transition or interview creation from a disallowed status | Keep the user's input, explain the returned safe `details.reason`, and require an explicit next action; do not treat as a version race |
| `409 MEMBER_CONFLICT` | Member `expectedUpdatedAt` is stale | Refetch the roster and require explicit resubmission |
| `409 MEMBER_ALREADY_EXISTS` | User already has a membership in the company | If inactive, use the explicit membership reactivation route; otherwise refresh the roster |
| `409 USER_NOT_ACTIVE` | Membership reactivation targets a `BLOCKED` or `DELETED` User | Keep membership inactive; show that account reactivation is required before company membership can be restored |
| `409 MEMBER_ACTIVE_INTERVIEWS` | A blocking interview still has this member as organizer | Show the safe count/reason and require organizer reassignment or interview cancellation |
| `409 INTERVIEW_STALE` | Interview `expectedUpdatedAt` is stale | Refetch interview/history/calendar and ask the user to review before resubmitting |
| `409 INTERVIEW_SCHEDULE_CONFLICT` | Candidate, organizer, or additional participant has a blocking interval overlap | Show only the safe conflict type and suggested next step; allow time/participant changes; never show foreign interview details |
| `400 TIMEZONE_REQUIRED` | Required IANA timezone is missing | Preserve form values, require timezone selection, and do not silently submit UTC |
| `400 TIMEZONE_INVALID` | Supplied timezone is not a valid IANA identifier | Preserve form values and request a valid timezone |
| `404 INTERVIEW_NOT_FOUND` | Interview is absent or not accessible to the caller | Use the same response for both cases; clear stale cached data and return to the permitted list without exposing existence |
| `409 IDEMPOTENT_REQUEST_CONFLICT` | `clientRequestId` was reused with a different payload | Do not retry with that key; show an error and require a new explicit create attempt |

`INTERVIEW_STALE` is never used for a schedule overlap, and `INTERVIEW_SCHEDULE_CONFLICT` is never used for a
version mismatch. The same envelope applies to note and assignment errors (`NOTE_CONFLICT` and
`APPLICATION_STATUS_CONFLICT`, respectively).

## 13. Notifications and realtime

Reuse existing `NotificationOutbox`, IN_APP delivery and Socket.IO.

Events:

- application status changed;
- responsible assignment changed;
- interview created;
- interview changed;
- interview cancelled;
- candidate confirmed;
- candidate declined;
- reschedule requested;
- employer reschedule proposal;
- interview completed/no-show.

Every notification is:

- event-keyed;
- idempotent;
- written to Outbox in the business transaction;
- targeted only to necessary participants;
- candidate-safe.

Candidate notifications exclude:

- internal notes;
- internal comments;
- hidden participants;
- employer pipeline details;
- conflicts from another company.

Realtime payloads contain only the recipient-authorized subset. If reconnect occurs, frontend refreshes current state through API.

## 14. Security and RBAC

Stage 9 requires the final matrix in `stage-9-rbac-matrix.md`.

Global `MODERATOR` and `ADMIN` have no automatic access to applications, pipeline, notes, interviews or calendars.

Every employer service must verify:

- global role `EMPLOYER`;
- `User.status = ACTIVE`;
- `EmployerMember.isActive = true` for `(employerId, userId)`;
- member role permits the action;
- application/interview/note belongs to that employer;
- assigned member belongs to that employer;
- additional employee belongs to that employer;
- candidate identity matches interview application.

Shared/privacy fields must be selected explicitly. Resume snapshots remain immutable and are never edited through interview APIs.

## 15. Transactions

Critical operations:

- application status plus history plus Outbox;
- assignment plus assignment history;
- note soft-delete/edit;
- interview create plus participant rows plus history plus Outbox;
- interview update plus history plus conflict lock plus Outbox;
- candidate response plus participant/global status plus history plus Outbox.

No main operation may commit unless history and required participants are successful.

## 16. Frontend consequences

Employer:

- replace/extend `/employer/applications` with Kanban and server-backed filters;
- retain list/detail routes;
- add status, responsible assignment, note and interview panels;
- use optimistic updates only after stale/conflict rules are included;
- invalidate pipeline, summary, detail, history and interview queries after mutations;
- show server errors and conflict details.

Candidate:

- extend `/candidate/applications` and `[id]`;
- show status timeline and own interviews;
- support confirm, decline and reschedule request;
- display timezone-resolved interview schedule;
- never include internal notes or employer-only participants.

## 17. Performance

Required query indexes and pagination:

- application pipeline by vacancy/status/responsible/appliedAt;
- application summary server aggregation;
- interview range by employer/status/organizer;
- interview range by candidate/application;
- participant conflict query by userId/scheduledAt/status;
- assignment history by application/createdAt;
- interview history by interview/createdAt;
- note list by application/deletedAt/createdAt.

No pipeline or calendar UI may fetch complete history to calculate aggregates.

## 18. Product decisions requiring owner approval

The project code and existing requirements do not establish the following policies. The recommendations below
make the documents internally consistent but are not approved product requirements until the owner confirms them:

| Decision | Proposed rule | Why confirmation is required |
|---|---|---|
| Application/interview coupling | First interview from `IN_REVIEW` atomically moves the Application to `INTERVIEW`; additional interviews on an `INTERVIEW` Application do not add another status-history row. Interview actions never auto-change Application. `OFFER` may coexist with a blocking interview; `REJECTED`, `WITHDRAWN`, or `HIRED` is blocked until blocking interviews are cancelled. | Changes hiring workflow and candidate withdrawal/rejection behavior |
| Interview limits | 15–240 minutes inclusive; calendar query range at most 90 days | No existing duration or range policy was found |
| Past scheduling | Create/reschedule only for a `scheduledAt` strictly later than server time | No existing past-time policy was found |
| Timezone and DST | Employer explicitly chooses the meeting IANA timezone; reject nonexistent DST wall times and require earlier/later occurrence for repeated wall times; show the same instant to both parties and optionally a labeled local equivalent | No existing timezone or DST policy was found |
| Account/member lifecycle | `BLOCKED` and `DELETED` both deny access and preserve User/history rows; `DELETED` is not a physical delete. Before a member status leaves `ACTIVE`, resolve blocking organizer interviews and clear assignments with history. Reactivation requires active User status and never restores assignments/participants. All participant rows/statuses are preserved. | Existing enum values are confirmed, but no status-mutation path or account-deletion policy was found; security/privacy owners must approve deactivation/reactivation constraints and retention |
| Physical deletion/retention | Do not physically delete User during Stage 9. Do not delete EmployerMember, Interview, InterviewParticipant, or employer rows referenced by retained history; use status/deactivation and restrictive FKs | Requires a data-retention/privacy decision for future legal erasure or anonymization |

Until approved, the numeric limits, terminal-application gating, offer coexistence, and account-retention rules are proposals only. No fallback may silently invent a timezone or change an Application status.

## 19. Risks and accepted constraints

- Existing employer routes use broad ADMIN/MODERATOR bypasses and require stabilization.
- The current schema has no membership active/deactivated flag; Stage 9 adds one and requires it to be checked
  separately from `User.status`.
- Existing application status writes do not yet use optimistic concurrency.
- Advisory locks are valid only in a PostgreSQL transaction and must cover sorted participant user IDs.
- Cross-company scheduling conflicts must not return other-company identifiers.
- Frontend status transition maps must become views of backend capability, not business authority.
- Argon2 tests require separate stabilization and must retain real Argon2.
