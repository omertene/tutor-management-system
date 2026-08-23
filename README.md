# Tutor Management System

A full-stack app for a private tutor to manage students, lesson scheduling, payments, and
study materials. 

Stack: Spring Boot (Java 17) + PostgreSQL on the backend, React + TypeScript (Vite) on the
frontend.

## Running it

**Backend**

1. Create a Postgres database matching `spring.datasource.url` in
   `src/main/resources/application.properties` (defaults to `tutor_db2` on `localhost:5432`).
2. Copy `.env.example` to `.env` (or otherwise set the environment variables it lists) with
   real values for your database credentials and JWT secret.
3. Run `./mvnw spring-boot:run` (or run `TutorManagementSystemApplication` from your IDE).
4. On first startup, a teacher account is auto-created using the `teacher.seed.email` /
   `teacher.seed.password` values.

Tables are created/updated automatically (`spring.jpa.hibernate.ddl-auto=update`) — no manual
migration step needed for a fresh database.

**Frontend**

```
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`, calling the backend at `http://localhost:8080`.

## Features

- **Auth** — JWT-based login, two roles (TEACHER / STUDENT). Only the teacher can register
  new student accounts; there's no public sign-up.
- **Subjects** — the teacher defines subjects (e.g. "Math") that lessons are booked under.
- **Availability** — recurring weekly schedule rules (e.g. "available Mondays 9–17") combined
  with one-off overrides (block or add availability on a specific date) to determine what's
  bookable.
- **Lessons** — either party can book (teacher for a student, or a student for themselves),
  protected against double-booking. Lessons can be cancelled by either party, or marked
  completed by the teacher, which is what feeds debt tracking.
- **Payments** — the teacher records payments against a student; outstanding debt is
  calculated automatically and viewable per-student or as a full list.
- **Materials** — the teacher shares files, links, or plain-text notes with a student,
  optionally tied to a specific lesson.
- **Student roster** — the teacher can edit a student's profile and deactivate/reactivate a
  student without losing their history.
- **Statistics** — revenue, lesson counts, and a debt overview for the teacher.
- **Email reminders** — students are notified ahead of upcoming lessons.

## Architecture

- **Controller → Service → Repository** layering throughout, with a consistent rule that a
  service never reaches into another domain's repository directly — it goes through that
  domain's service instead.
- **DTOs (Java records)** separate the API surface from JPA entities; entities never cross the
  controller boundary.
- **A single global exception handler** maps every domain-specific error to a proper HTTP
  status code.
- **Secrets** (DB credentials, JWT signing key) are read from environment variables rather
  than committed to source.

## Known trade-offs

A few read paths in `LessonService`/`PaymentService` (e.g. counting lessons in a weekly slot,
computing every student's debt) load full tables via `findAll()`/`Student` lists and filter or
aggregate in Java rather than pushing the filtering into the query, and `@ManyToOne`/`@OneToOne`
associations default to eager fetching, so listing lessons can trigger extra per-row queries.
At one tutor's data volume this doesn't matter and the derived-query style stays readable;
`getBusySlots` — the one hot path a student hits on every schedule page load — has been scoped
to a date range instead of loading every lesson ever booked, but the rest are left as-is
pending real scale.
