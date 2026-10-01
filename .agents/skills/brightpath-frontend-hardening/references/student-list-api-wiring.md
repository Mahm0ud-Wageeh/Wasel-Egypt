# Student-list API wiring (BrightPath / Namaa Journey)

Recurring bug class: a teacher logs in (api mode) but a student-list page shows only
~22 hardcoded students instead of the 74+ in the database. Root cause is the same
every time: the page keeps a local mock roster and gates mock-vs-API on the **class-id
prefix**, not on `sessionMode`.

## How rosters are loaded today (audit result)

Mock sources of truth (hardcoded lists, NOT from the DB):
- `frontend/src/features/daily-reviews/TeacherDailyReviewView.jsx` → `STUDENT_ROSTERS`
- `frontend/src/features/attendance/AttendancePage.jsx` → `DEMO_STUDENTS`
- `frontend/src/shared/components/GlobalStudentSearch.jsx` → `DEMO_STUDENTS` (fallback only; this one already calls `apiListStudents` first)
- `frontend/src/features/grades/GradesPage.jsx` → `DEMO_STUDENTS`

Real API entry points (already exist in `frontend/src/app/api/schoolClient.js`):
- `getClassStudents(classId)` → `GET /classes/{id}/students` (returns enrolled students)
- `apiListStudents({ search, limit })` → `GET /students` (all students, supports search)
- `getClasses()` → `GET /classes`
- `apiListStudents` is also reachable via `BP_TOKEN_ACCESS` header fetch for the daily-reviews endpoint.

DB reality: Postgres at `DATABASE_URL` in `backend/.env` (`127.0.0.1:5432/brightpath`),
reachable. `Student` links to classes via `StudentClassEnrollment` (many-to-many), so
real class ids are uuids — the mock uses `class-3b` / `demo-class-3b`.

## The trap (verbatim pattern that breaks it)

```js
// WRONG — forces mock mode for any class id arriving via URL
const isDemoOrMockClass = isDemo
  || String(selectedClassId).startsWith('demo-')
  || String(selectedClassId).startsWith('class-');
```

Global search and cross-page navigation pass `class-3b` / `demo-class-3b`, so even an
api-mode user lands in the mock branch and sees only the 22 hardcoded students.

## Canonical fix (API-first, mock as fallback)

Branch on `sessionMode` / token presence, never on id prefix:

```js
const useMock = isDemo; // NOT isDemo || id.startsWith(...)

if (useMock) {
  // local DEMO_STUDENTS / STUDENT_ROSTERS
} else {
  try {
    const { data } = await getClassStudents(selectedClassId); // or apiListStudents({ search })
    if (data?.length) { setStudents(data); return; }
  } catch { /* fall through to mock */ }
  setStudents(DEMO_STUDENTS); // fallback only
}
```

For the **"all classes"** scope, do NOT read `Object.values(STUDENT_ROSTERS)` in api
mode — call `apiListStudents` so a search like "آية فتحي" resolves against the real DB.
This is the exact spot that kept re-breaking: the id-prefix fix alone is NOT enough,
because the `all` branch still fell through to the 22-sample mock even for logged-in
users. The `all` branch must hit the API first.

```js
// In api mode OR demo mode with a reachable backend, the "All Classes" scope
// should reach the live DB first, falling back to mock only on failure.
} else if (selectedClassId === 'all') {
  try {
    const res = await apiListStudents({ limit: 200 });
    const dbList = (res?.data || res || []).filter(Boolean);
    if (!cancelled && dbList.length > 0) {
      let finalStudents = dbList;
      if (targetStudentIdParam && !finalStudents.some(s => s.id === targetStudentIdParam)) {
        finalStudents = [{ id: targetStudentIdParam /* name fields */ }, ...finalStudents];
      }
      setStudents(finalStudents);
    } else {
      throw new Error('empty');
    }
  } catch (allErr) {
    console.warn('Could not load all students from API, using demo:', allErr);
    setStudents([...DEMO_STUDENTS]); // fallback ONLY on API failure
  }
}
```

Notes:
- `apiListStudents({ limit: 200 })` hits `GET /students` and works in both `sessionMode`
  when a backend is reachable. If the backend is down / not running, it throws and the
  mock fallback keeps the page usable (22 sample students) — acceptable degraded mode.
- The same pattern applies to **daily-reviews**, **grades (GradesPage fetchMatrix)**, and
  **attendance (loadRosterAndAttendance)**: each had its own `all`-scope mock branch that
  needed the same API-first rewrite. Apply it to all three for consistency.
- A deep-link / global-search navigation that lands on a DB-only student (e.g. `آية فتحي`)
  will only resolve once the `all` scope calls the API; the per-class branch alone will
  never surface a student whose class isn't in the mock map.

## Dark-mode note
A page can be api-wired but still show a white card/search if the component defines its
own light background. Add explicit `body.dark-theme .<scope>` overrides (see SKILL.md
"White island" trap). After fixing, confirm the override is in `dist/assets/app-*.css`
and tell the user to hard-refresh — a correct build does not auto-update a running app.

## Verification
- `node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().student.count().then(n=>console.log(n))"` → live count.
- After fix, login as teacher, open the page, select "all classes", search a DB-only
  student → should appear. Build + `impeccable detect` must stay green.
