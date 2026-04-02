# API Endpoints (v1)

Base path: `/api/v1`

## Auth
- `POST /auth/login` — email + password, returns JWT and user info.
- `POST /auth/signup` — signup for private portal. First user auto-Super Admin; subsequent signups require `signupKey`.
- `POST /auth/forgot-password` — request reset token (returned for now; in production send via email/SMS).
- `POST /auth/reset-password` — submit token + new password.

## Users (Super Admin)
- `POST /users` — create user with role/optional permissions.

## Members
- `GET /members` — list members (excludes soft-deleted by default), supports `page` & `limit` query params.
- `POST /members` — create member.
- `GET /members/:id` — get member by id.
- `PUT /members/:id` — update member.
- `DELETE /members/:id` — soft-delete member.
  (Optional `departmentId` can be provided.)
  (Fields include optional `dateOfBirth`, `joinedAt`, `baptizedHere`.)
- `POST /members/:id/self-update-link` — generate a short-lived self-update link + QR payload for that member (accepts optional `expiresInMinutes`, default 60).
- `POST /members/invite-link` — generate a generic self-registration link + QR payload (optional `expiresInMinutes`, default 1440 minutes).
- `POST /members/self-register` — public endpoint for members to submit their own info using an invite token.

## Lookups
- `GET /lookups/fellowships` — active fellowships.
- `GET /lookups/leadership-roles` — active leadership roles.
- `GET /lookups/volunteer-roles` — active volunteer roles.
- `GET /lookups/departments` — active departments.

## Settings (admin only: Super Admin / Church Admin)
- Volunteer roles: `POST /settings/volunteer-roles`, `GET /settings/volunteer-roles`, `GET /settings/volunteer-roles/:id`, `PATCH /settings/volunteer-roles/:id`, `PATCH /settings/volunteer-roles/:id/deactivate`, `PATCH /settings/volunteer-roles/:id/activate`
- Leadership roles: `POST /settings/leadership-roles`, `GET /settings/leadership-roles`, `GET /settings/leadership-roles/:id`, `PATCH /settings/leadership-roles/:id`, `PATCH /settings/leadership-roles/:id/deactivate`, `PATCH /settings/leadership-roles/:id/activate`
- Departments: `POST /settings/departments`, `GET /settings/departments`, `GET /settings/departments/:id`, `PATCH /settings/departments/:id`, `PATCH /settings/departments/:id/deactivate`, `PATCH /settings/departments/:id/activate`
- Fellowships: `POST /settings/fellowships`, `GET /settings/fellowships`, `GET /settings/fellowships/:id`, `PATCH /settings/fellowships/:id`, `PATCH /settings/fellowships/:id/deactivate`, `PATCH /settings/fellowships/:id/activate`

## Attendance
- `POST /attendance/check-in` — check in a member to a service.
- `GET /attendance/today` — today’s check-ins.
- `GET /attendance/range?startDate=ISO&endDate=ISO` — check-ins in date range.
- `POST /attendance/close-service` — mark members from a service as no longer in church (sets `inChurch=false`).

## Services
- `POST /services` — create service.
- `GET /services` — list services.
- `GET /services/:id` — service details.

## Inventory
- `POST /inventory` — create item.
- `GET /inventory` — list items.
- `PATCH /inventory/:id/quantity` — adjust quantity (action + amount).
- `GET /inventory/low-stock` — items at/below reorder level.

### Auth & RBAC
- All endpoints except `POST /auth/login`, `POST /auth/signup`, `POST /auth/forgot-password`, `POST /auth/reset-password` require Bearer token.
- Permissions enforced via role/permissions middleware per route.
