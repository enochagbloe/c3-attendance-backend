# Feature Progress Tracker

Use this checklist to record the implementation status of each domain module. Update the status column as work progresses (Todo → In Progress → Done) and add brief notes when helpful.

| Domain / Feature            | Status       | Notes |
| --------------------------- | ------------ | ----- |
| Auth (login, JWT, RBAC)     | Done         | Seeded super admin; token + permissions middleware. |
| Members CRUD                | Done         | Soft delete flag; Zod validation. |
| Attendance (check-in, queries) | Done      | Duplicate check-in guarded; today/range endpoints. |
| Services (create/list/detail) | Done       | Uses enum `ServiceType`; date/time validation. |
| Inventory (items, logs, low stock) | Done  | Quantity adjust with audit log; low-stock helper. |
| Follow-up tracking          | Todo         | Models exist; routes/services pending. |
| Events management           | Todo         | Models exist; routes/services pending. |
| Reports (attendance/member summaries) | Todo | Define queries + aggregation. |
| Communication (email/SMS placeholders) | Todo | Decide provider abstraction; enqueue jobs. |
| Departments / roles UX glue | Todo         | Expose department endpoints; link to members. |

## Testing & Ops
- [ ] Add basic route tests for auth, members, attendance, inventory.
- [ ] Add Dockerfile + compose for Postgres + app.
- [ ] Add linting/formatting config (ESLint/Prettier).
- [ ] Add CI pipeline for tests/migrations.

## Notes
- Update this file whenever a feature moves forward or new scope is added.
- Keep seed users/roles in sync with RBAC matrix. 
