# Stage 9 RBAC Matrix

Date: 24 November 2026

## 1. Authority layers

Stage 9 separates:

- global role: `CANDIDATE`, `EMPLOYER`, `MODERATOR`, `ADMIN`;
- company role: `OWNER`, `ADMIN`, `HR`, `RECRUITER`;
- active membership: `EmployerMember.isActive = true` plus `User.status = ACTIVE`;
- actual `UserStatus` enum: `ACTIVE`, `BLOCKED`, `DELETED` only.

Every employer action requires all applicable layers.

Global `EMPLOYER` is not sufficient. `employerId`, `applicationId`, `interviewId`, `memberId`, or `organizerId` supplied by a client is never accepted as proof of ownership.

## 2. Final company-role matrix

| Operation | OWNER | ADMIN | HR | RECRUITER |
|---|---:|---:|---:|---:|
| View hiring pipeline | Yes | Yes | Yes | Yes |
| View application card/detail | Yes | Yes | Yes | Yes |
| Change application status | Yes | Yes | Yes | Yes |
| Assign responsible employee | Yes | Yes | Yes | No |
| Change responsible employee | Yes | Yes | Yes | No |
| Remove responsible employee | Yes | Yes | Yes | No |
| View responsible assignment history | Yes | Yes | Yes | Yes |
| Create internal note | Yes | Yes | Yes | Yes |
| View internal notes | Yes | Yes | Yes | Yes |
| Edit own internal note | Yes | Yes | Yes | Yes |
| Edit another employee's note | Yes | Yes | No | No |
| Delete own internal note | Yes | Yes | Yes | Yes |
| Delete another employee's note | Yes | Yes | No | No |
| Create interview | Yes | Yes | Yes | Yes |
| Change interview | Yes | Yes | Yes | Yes |
| Cancel interview | Yes | Yes | Yes | Yes |
| Complete interview | Yes | Yes | Yes | Yes |
| Mark interview NO_SHOW | Yes | Yes | Yes | Yes |
| Add/remove interview participant | Yes | Yes | Yes | Yes |
| Change interview organizer | Yes | Yes | Yes | Yes |
| View interview history | Yes | Yes | Yes | Yes |
| View company calendar | Yes | Yes | Yes | Yes |
| Manage company members | Yes | Yes | No | No |

For all matrix rows, `User.status` must be `ACTIVE` and membership in the target company must exist.
Membership activity and user activity are checked separately; an active user with deactivated company membership
and an active membership with blocked/deleted user are both denied.

## 3. Candidate matrix

| Operation | Candidate |
|---|---|
| Create own application | Yes |
| View own applications | Yes |
| View own application history | Yes |
| Withdraw own withdrawable application | Yes |
| View own interviews | Yes |
| Confirm own interview | Yes |
| Decline own interview | Yes |
| Request interview reschedule | Yes |
| Change employer status | No |
| Assign responsible employee | No |
| View/change internal note | No |
| View hidden participant information | No |
| Change interview date/time | No |
| View another candidate data | No |

Candidate identity for all candidate operations is taken from the JWT subject. Client-supplied candidate IDs are not trusted.

## 4. Global roles

### 4.1. MODERATOR

Stage 9 denies `MODERATOR` access to:

- application pipeline;
- application details;
- resume snapshot;
- responsible assignment;
- internal notes;
- interviews;
- calendars;
- candidate interview actions except their own candidate role, if role changes in a later scenario.

### 4.2. ADMIN

Stage 9 denies global `ADMIN` access to:

- application pipeline;
- application details;
- resume snapshot;
- responsible assignment;
- internal notes;
- interviews;
- calendars.

A future privileged admin capability requires a separate endpoint, explicit permission, audit logging and separate tests.

Existing application/employer service bypasses for `MODERATOR` and `ADMIN` must not apply to Stage 9 hiring operations.

## 5. Backend checks

Every service operation must execute:

1. JWT subject and global role validation.
2. active `User.status` validation.
3. active membership lookup for `(employerId, userId)` with `isActive = true`.
4. member-role action authorization.
5. application/interview/note ownership validation.
6. assigned-member same-company validation.
7. additional participant same-company validation.
8. privacy and DTO field filtering.

No controller guard is considered sufficient.

## 6. Application access

Employer rules:

- application vacancy employer equals `employerId`;
- membership row exists;
- user is active;
- member role permits the action;
- cross-company application returns `404 APPLICATION_NOT_FOUND` or `403 APPLICATION_ACCESS_DENIED`.

Candidate rules:

- `application.candidateId = authenticatedUserId`;
- no access to another candidate application;
- no internal note DTO;
- no internal assignment history beyond the candidate-safe state;
- no unauthorized resume snapshot.

Forbidden actions:

- candidate changing status or responsible member;
- employer reading applications from another company;
- moderator/admin bypass;
- inactive member access.

## 7. Status transition authorization

Allowed for active members OWNER/ADMIN/HR/RECRUITER:

- strict status transitions defined in the architecture document;
- rejection from any non-terminal status.

Candidate:

- withdrawal only from `NEW`, `VIEWED`, `IN_REVIEW`, `INTERVIEW`, or `OFFER`.
- withdrawal requires current `expectedStatus`/`expectedUpdatedAt`; it returns `409 APPLICATION_CONFLICT` while
  any blocking interview exists, until the employer cancels that interview.

Server:

- rejects unknown target status;
- rejects reverse transitions;
- rejects reopening terminal statuses;
- requires `expectedStatus` and `expectedUpdatedAt` for application record mutations;
- uses a server-side conditional update so concurrent stale requests cannot both commit;
- atomically writes application, history, and Outbox; stale requests return HTTP 409;
- returns no-op for a repeated same-status request;
- creates no duplicate history or notification for no-op.

Interview coupling follows the architecture's proposed policy: first interview creation from `IN_REVIEW` advances
the application to `INTERVIEW` atomically; additional interviews do not change an already-`INTERVIEW`
application. Interview cancel/decline/reschedule never changes Application status. `OFFER` may coexist with a
blocking interview; terminal `REJECTED`/`WITHDRAWN`/`HIRED` transitions are blocked while a blocking interview
exists. These are new product decisions awaiting owner approval.

## 8. Responsible assignment authorization

Allowed actor:

- OWNER;
- ADMIN;
- HR.

Denied actor:

- RECRUITER.

Assignee:

- must be an existing active membership;
- must belong to the application company;
- must have one of `OWNER`, `ADMIN`, `HR`, `RECRUITER`.

All assignment, change and removal operations:

- verify application ownership;
- verify actor membership;
- verify target membership;
- write immutable assignment history;
- return `403` or `404` for cross-company assignee.

Assignment history must keep previous/new member identifiers and name/role snapshots.
Physical deletion must not delete history. The required employee lifecycle is deactivation:

- set `EmployerMember.isActive = false` and `deactivatedAt`; preserve the membership row;
- reactivation requires OWNER/ADMIN, `User.status = ACTIVE`, and a fresh `expectedUpdatedAt`;
- clear current assignments transactionally and append history with ID/name/role snapshots;
- retain existing additional-employee participant rows and invitation statuses; deactivation alone does not
  mutate Interview state;
- retain immutable assignment history;
- reject membership deactivation while a blocking interview uses the member as organizer;
- require organizer reassignment or interview cancellation before deactivation;
- do not cascade-delete interview or assignment history during any approved retention cleanup;
- retain historical actor/responsible identifiers and name snapshots.

The current schema does not yet support this lifecycle: Stage 9 must add `isActive` and `deactivatedAt`, change
the member-to-user and member-to-employer FKs from cascading deletion to `Restrict`, and update
`EmployerService.removeMember` to perform the guarded deactivation workflow. These are future implementation
changes, not present behavior.

The existing enum values have these proposed effects:

- `ACTIVE`: login and operations are allowed only if any required membership is also active.
- `BLOCKED`: deny login and all user actions; preserve the User and membership rows, clear current assignments
  with history, and do not rewrite candidate participant invitation status or application status.
- `DELETED`: soft-deleted account state only; same retention and access behavior as `BLOCKED`, not a physical
  `User` deletion.

The current code has no User-status mutation or physical user-delete path. Stage 9 must add a lifecycle service
hook for status changes: before a member's status leaves `ACTIVE`, reassign/cancel their blocking organizer
interviews. Preserve all existing participant rows and invitation statuses; candidate loses response access while
non-active, and no interview/application status changes automatically. No physical User deletion is allowed in
Stage 9. Historical
IDs and display snapshots remain. Reactivation does not restore assignments or participants; a deactivated
membership cannot be reactivated through `POST /members`. This lifecycle policy needs owner/security/privacy
approval.

## 9. Internal note authorization

Create/list:

- active OWNER, ADMIN, HR, RECRUITER of the application company.

Edit:

- owner of the note: all four roles;
- another note: OWNER/ADMIN only.

Soft-delete:

- owner of the note: all four roles;
- another note: OWNER/ADMIN only.

Candidate, moderator and global admin receive no note data.

Deleted notes are excluded from normal API, notifications and realtime.

## 10. Interview access

Employer rules:

- interview `employerId` equals employer route ID;
- application belongs to that employer;
- active membership;
- member role permits operation;
- organizer is active member of that company;
- every additional participant is active member of that company.
- organizer participant `userId` matches the `User.id` reached through `Interview.organizerId -> EmployerMember.id`;
- organizer deactivation first requires reassignment or cancellation of every blocking interview.

Additional participants:

- are created with `INVITED`;
- do not have a self-confirmation or self-declination action;
- may be added or removed only by an authorized employer actor;
- removal is soft (`removedAt`) and retains the participant row and invitation status;
- do not affect the global interview status if removed or left invited.

Cancellation sets global status to `CANCELLED`, records history, notifies participants, and preserves every
participant status. `DECLINED` means candidate refusal only. A declined interview is terminal and a retry creates
a new interview record. Any employer change to date/time, duration, or timezone resets global status to
`SCHEDULED` and candidate participant to `INVITED`, whether the original status was `SCHEDULED`, `CONFIRMED`, or
`RESCHEDULE_REQUESTED`; informational-only edits do not reset confirmation.

Candidate rules:

- explicit candidate participant exists;
- participant `userId = application.candidateId`;
- participant and interview belong to the candidate;
- candidate may confirm/decline/request reschedule;
- candidate cannot set organizer or additional participants;
- candidate cannot change date/time or format.

Global moderator/admin rules:

- no access unless a separately scoped future capability is implemented.

## 11. Calendar access

Employer:

- route `employerId` ownership and membership required;
- range required;
- only company interviews returned;
- filters checked by service;
- no cross-company conflict details.

Candidate:

- JWT identity defines candidate;
- only interviews linked to the candidate;
- no internal comments;
- no hidden participant identities;
- no employer internal note data.

Calendar API must not return conflict information from another company.
Scheduling requires an explicit IANA timezone from the client; the current schema has no confirmed
profile/company/system timezone source. A detected browser zone may be shown as a visible selection, but must be
explicitly submitted. The frontend must require a timezone if detection fails and must not silently submit UTC.
Interview duration (15–240 minutes), maximum calendar range (90 days), no-past-scheduling, and DST rules are
proposals in the architecture and require product-owner approval.

## 12. Conflict privacy

Conflict errors expose only:

- `INTERVIEW_SCHEDULE_CONFLICT` for calendar overlap (stale versions use `INTERVIEW_STALE`);
- conflict participant type: candidate, organizer or additional participant;
- no other company, candidate, vacancy or interview details.

Candidate calendar cannot infer which company conflict exists.

## 13. Realtime and notifications

Candidate:

- application status;
- own interview create/update/cancel;
- candidate response confirmation state;
- candidate reschedule state.

Employer:

- own company application/interview events;
- responsible assignment events;
- internal application note events only to members permitted to view notes;
- candidate interview responses.

No realtime payload may include:

- internal note body;
- internal interview comment;
- hidden participant list;
- other company conflict details;
- other candidate resume data.

Socket.IO delivery must remain in private user rooms. Frontend refreshes state through API after reconnect.

## 14. Required HTTP IDOR tests

Test every operation in at least these scenarios:

| Scenario | Expected |
|---|---|
| Candidate reads own application | 200 |
| Candidate reads foreign application | 403 or 404 |
| Candidate reads own interview | 200 |
| Candidate reads foreign interview | 403 or 404 |
| Candidate reads internal note endpoint | 403/404 |
| Candidate changes interview date/time | 403 |
| Active OWNER reads own pipeline | 200 |
| Active ADMIN reads own pipeline | 200 |
| Active HR reads own pipeline | 200 |
| Active RECRUITER reads own pipeline | 200 |
| Any member reads foreign pipeline | 403/404 |
| Inactive member reads pipeline | 403 |
| Inactive member changes status | 403 |
| Inactive member creates interview | 403 |
| OWNER deactivates member with no blocking organizer interview | 200; assignments cleared with history |
| OWNER deactivates blocking interview organizer | 409 `MEMBER_ACTIVE_INTERVIEWS` |
| OWNER reactivates membership for non-active User | 409 `USER_NOT_ACTIVE` |
| Stale member reactivation | 409 `MEMBER_CONFLICT`; no state change |
| Reactivated membership | Cleared assignments and removed participants remain cleared/removed |
| Member assigns another-company member | 403/404 |
| Member assigns inactive member | 403/404 |
| Member creates interview participant from another company | 403/404 |
| HR edits another note | 403 |
| RECRUITER edits another note | 403 |
| OWNER edits another note | 200 |
| ADMIN edits another note | 200 |
| HR deletes another note | 403 |
| RECRUITER deletes another note | 403 |
| Global MODERATOR reads applications | 403 |
| Global ADMIN reads applications | 403 |
| Global MODERATOR reads interviews | 403 |
| Global ADMIN reads internal notes | 403 |

## 15. Required candidate privacy tests

- candidate candidate API response has no `ApplicationNote`;
- candidate history contains status history, not assignment or note history;
- candidate interview response excludes internal comment;
- candidate interview response excludes additional employee identities unless product-safe to expose;
- candidate notification payload has no note body;
- realtime candidate event has no hidden participant or internal comment;
- immutable `resumeSnapshot` cannot change through interview or note operations.

## 16. Required concurrent-operation tests

- two status requests with stale `expectedUpdatedAt` only allow one update;
- repeated status target is no-op;
- terminal status cannot be reopened;
- simultaneous interview creation uses the same idempotency constraint without duplicate history;
- same `clientRequestId` with changed payload returns conflict;
- same participant conflict is prevented with advisory locking;
- stale interview update returns `409 INTERVIEW_STALE`;
- cross-company conflict response leaks no foreign details.
- cancellation leaves candidate and additional-participant statuses unchanged and does not create `DECLINED`;
- changing a confirmed interview's time resets the candidate to `INVITED` and requires reconfirmation;
- organizer deactivation is rejected until blocking interviews are reassigned or cancelled;
- simultaneous participant changes lock the union of old/new participant IDs and cannot create conflicts;
- back-to-back half-open time ranges are allowed;
- an interview without an explicit or confirmed timezone source returns `400 TIMEZONE_REQUIRED`;
- concurrent stale application/interview requests allow no lost update and create history/Outbox only for the winner.

## 17. Endpoint-to-RBAC mapping

For every employer route below, the global role must be `EMPLOYER`, `User.status` must be `ACTIVE`, the
`EmployerMember` must belong to the route company and have `isActive = true`, and the service must verify the
target resource's company ownership. Global `ADMIN` and `MODERATOR` are denied even where an existing controller
currently has broad role decorators.

| Endpoint(s) | Company-role permission | Additional mandatory ownership checks |
|---|---|---|
| `GET /api/v1/employer/:employerId/applications`, `GET .../applications/:applicationId`, `GET .../resume`, `GET .../history`, `GET .../pipeline`, `GET .../summary` | OWNER/ADMIN/HR/RECRUITER | Application vacancy belongs to route employer; no cross-company resume/history |
| `POST .../applications/:applicationId/view`, `POST .../status`, `PATCH .../comment` | OWNER/ADMIN/HR/RECRUITER | Application belongs to route employer; require application `expectedStatus`/`expectedUpdatedAt` |
| `PUT`/`DELETE .../applications/:applicationId/assignee` | OWNER/ADMIN/HR | Target assignee is an active same-company member; require application version |
| `GET .../applications/:applicationId/assignee/history` | OWNER/ADMIN/HR/RECRUITER | Application belongs to route employer |
| `GET`/`POST .../applications/:applicationId/notes` | OWNER/ADMIN/HR/RECRUITER | Note application and employer match route; creation author is authenticated member |
| `PATCH`/`DELETE .../applications/:applicationId/notes/:noteId` | Author or OWNER/ADMIN | Note, application, and employer all match; non-author HR/RECRUITER denied |
| `GET /api/v1/employer/:employerId/interviews`, `GET .../interviews/:interviewId`, `GET .../history` | OWNER/ADMIN/HR/RECRUITER | Interview and linked application belong to route employer |
| `POST .../applications/:applicationId/interviews`, `PATCH .../interviews/:interviewId`, `POST .../cancel`, `.../complete`, `.../no-show` | OWNER/ADMIN/HR/RECRUITER | Application/interview company match; expected version; organizer/participants same company |
| `POST`/`DELETE .../interviews/:interviewId/participants...`, `PATCH .../interviews/:interviewId/organizer` | OWNER/ADMIN/HR/RECRUITER | Participant belongs to that interview; employee is active same-company member; candidate/organizer cannot be removed through additional-participant route |
| `GET /api/v1/employer/:employerId/interviews` calendar | OWNER/ADMIN/HR/RECRUITER | Route company match; bounded range; no cross-company conflict details |
| `GET /api/v1/employer/:employerId/members` | Active OWNER/ADMIN/HR/RECRUITER | Company roster only; no global-role bypass |
| `POST`/`PATCH`/`DELETE /api/v1/employer/:employerId/members...` | OWNER/ADMIN only | Actor manages that company; added/reactivated User must be `ACTIVE`; target membership belongs to same company; deletion route performs guarded deactivation |

Candidate endpoints require global `CANDIDATE` and `User.status = ACTIVE`; candidate identity comes only from JWT:

| Endpoint(s) | Additional mandatory ownership checks |
|---|---|
| `POST /api/v1/applications`, `GET /api/v1/applications/my`, `GET /api/v1/applications/:applicationId`, `GET .../history`, `POST .../withdraw` | Application candidate is authenticated user; withdrawal also checks expected application version |
| `GET /api/v1/candidate/interviews`, `GET .../interviews/:interviewId`, `POST .../confirm`, `.../decline`, `.../reschedule-request` | Interview candidate participant and `application.candidateId` equal authenticated user; candidate cannot set employer/company/participant IDs |

Every missing or foreign interview on an `interviewId` route returns the same `404 INTERVIEW_NOT_FOUND`.
All listed routes perform service-level ownership checks; controller decorators alone are insufficient.
Error meanings and frontend recovery behavior are defined once in architecture Section 12.4. In particular,
`APPLICATION_STATUS_CONFLICT` is only a stale Application version, `APPLICATION_CONFLICT` is a business-rule
conflict, `INTERVIEW_STALE` is only a stale interview version, and `INTERVIEW_SCHEDULE_CONFLICT` is only a
calendar overlap.
