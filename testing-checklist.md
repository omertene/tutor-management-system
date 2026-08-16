# Full Precise Test Plan — Tutor Management System

Fresh database. Work top to bottom, in order — later sections reuse students/subjects/lessons created earlier. Every field value below is exact — type it exactly as written so the expected numbers match. Every "Expect:" line is the exact result you should see; if you see anything else, stop and report the section number, what you entered, and what happened instead.

Backend teacher login (already seeded): **teacher@example.com** / **temp123**

---

## SECTION 0 — Teacher login

0.1. Go to the login page. Email: `teacher@example.com`, Password: `temp123`. Click Log in.
**Expect:** redirected to `/teacher`, Teacher Dashboard loads.

0.2. Log out. Try email `teacher@example.com`, password `wrongpass`. Click Log in.
**Expect:** error "Invalid email or password". Stay on login page.

0.3. Repeat 0.2 four more times (5 total wrong attempts for this exact email).
**Expect:** on the 5th failed attempt, still "Invalid email or password" (the lock triggers only once you try a 6th time).

0.4. Immediately try logging in again (6th attempt), even with the CORRECT password `temp123`.
**Expect:** error containing "Too many failed login attempts. Try again in" followed by a number of seconds (starts near 60).

0.5. Wait 60 seconds. Try logging in with the correct password again.
**Expect:** succeeds, redirected to `/teacher`.

0.6. Log out and log back in immediately with correct credentials.
**Expect:** succeeds instantly, no lockout (a successful login clears the failure count).

---

## SECTION 1 — Create 3 students (teacher side)

Go to Students page ("Students" in nav). Use "+ Add student".

### Student A — Noa Cohen
- Email: `noa.cohen@test.com`
- Password: `noa1234`
- First name: `Noa`
- Last name: `Cohen`
- Phone: `0501111111`
- Hourly rate: `100`
- Education level: `High School`
- Notes: *(leave blank)*

1.1. Fill all fields above, click "Add student".
**Expect:** success message "Student created successfully", Noa Cohen appears in the active students list, form clears.

### Student B — Dan Levi
- Email: `dan.levi@test.com`
- Password: `dan1234`
- First name: `Dan`
- Last name: `Levi`
- Phone: `0502222222`
- Hourly rate: `120`
- Education level: `University`
- Notes: `Prefers evening lessons`

1.2. Add Dan Levi with the values above.
**Expect:** same success, Dan Levi appears in list with rate ₪120.

### Student C — Maya Bar
- Email: `maya.bar@test.com`
- Password: `maya1234`
- First name: `Maya`
- Last name: `Bar`
- Phone: `0503333333`
- Hourly rate: `80`
- Education level: `Middle School`
- Notes: *(leave blank)*

1.3. Add Maya Bar with the values above.
**Expect:** same success, Maya Bar appears in list with rate ₪80.

1.4. Try adding a 4th student using Noa's exact email `noa.cohen@test.com` again (any other field values).
**Expect:** clear error, something like "email already registered". No new student created — list still shows exactly 3 active students.

1.5. Try clicking "Add student" with the Email field filled but First name left blank.
**Expect:** blocked before any request is sent — "Please fill in all required fields" or equivalent, no student created.

1.6. Type `noa` into the search box.
**Expect:** only Noa Cohen shown.

1.7. Clear search. Toggle to "Show inactive".
**Expect:** empty list (none inactive yet).

1.8. Toggle back to "Show active".
**Expect:** all 3 students shown again.

1.9. Click Edit on Maya Bar. Change Hourly rate from `80` to `90`. Click Save.
**Expect:** Maya's rate now shows ₪90 in the list. (Keep this in mind — she'll have both a ₪80 lesson and a ₪90 lesson later, since price is locked in at booking time.)

1.10. Click Edit on Maya Bar again, click Cancel without changing anything (or change something and hit Cancel).
**Expect:** any unsaved change is discarded, rate still shows ₪90.

1.11. Click "Deactivate" on Dan Levi.
**Expect:** Dan disappears from the active list.

1.12. Toggle to "Show inactive".
**Expect:** Dan Levi shown here, marked inactive.

1.13. Click "Reactivate" (or equivalent) on Dan Levi.
**Expect:** Dan returns to the active list. (We need him active for the rest of this test.)

---

## SECTION 2 — Subjects

Go to Subjects page.

2.1. Add subject: `Math`.
**Expect:** appears in list.

2.2. Add subject: `English`.
**Expect:** appears in list.

2.3. Try adding `Math` again (exact same name).
**Expect:** clear conflict error, e.g. "Subject already exists". List still shows exactly 2 subjects.

2.4. Confirm there is no Edit or Delete button anywhere on this page.
**Expect:** subjects are permanent once created — no such controls exist.

---

## SECTION 3 — Schedule Rules (weekly availability)

Go to Schedule page → "Edit weekly availability".

3.1. Day: Sunday. Start: `08:00`. End: `16:00`. Click "Add rule".
**Expect:** rule saved, appears under "SUNDAY" in the list.

3.2. Day: Monday. Start: `08:00`. End: `16:00`. Add.
**Expect:** saved.

3.3. Day: Tuesday. Start: `08:00`. End: `16:00`. Add.
**Expect:** saved.

3.4. Day: Wednesday. Start: `08:00`. End: `16:00`. Add.
**Expect:** saved.

3.5. Day: Thursday. Start: `08:00`. End: `16:00`. Add.
**Expect:** saved.

3.6. Day: Sunday. Start: `16:00`. End: `20:00`. Add ("+ Add another time range for SUNDAY" then Add, or as a fresh entry).
**Expect:** saved — this is back-to-back with the first Sunday rule (16:00 = 16:00), NOT a conflict.

3.7. Try Day: Sunday, Start `18:00`, End `14:00` (end before start).
**Expect:** rejected — "Start time must be before end time".

3.8. Try Day: Sunday, Start `15:00`, End `17:00` (overlaps both existing Sunday rules).
**Expect:** rejected — "This time overlaps an existing rule".

3.9. Day: Wednesday, add a SECOND range in the same submission: range 1 = `08:00`–`10:00` (this will conflict with the existing Wed 08:00–16:00 rule), just to test partial failure — actually skip this, instead do: Day Friday, add two ranges in one session via "+ Add another time range for FRIDAY": range 1 `09:00`–`12:00`, range 2 `14:00`–`18:00`. Click the multi-add button (should read "Add 2 rules").
**Expect:** both Friday ranges save successfully.

3.10. Edit the Sunday `08:00`–`16:00` rule: change end time to `12:00`.
**Expect:** saved successfully (no conflict, since it's shrinking, not growing into anything).

3.11. Edit that same rule again: try to change it to `11:00`–`17:00` (would now overlap the Sunday `16:00`–`20:00` rule).
**Expect:** rejected — "This time overlaps an existing rule".

3.12. Edit the Sunday rule back to `08:00`–`16:00` (restore original).

3.13. Delete the Friday `14:00`–`18:00` rule (no lessons exist yet, so nothing depends on it).
**Expect:** deletes immediately, no warning dialog.

3.14. Confirm the rules list is grouped by day, only shows days that actually have a rule (no "SATURDAY" heading, since you never added one).

*(Leave the Friday 09:00–12:00 rule in place — you'll delete it later in Section 5 to test the "affected lessons" warning.)*

---

## SECTION 4 — Schedule Overrides

Stay on Schedule page, close the rules modal, look at the grid.

4.1. Click a Sunday cell at `10:00` (white/available, covered by your 08:00–16:00 rule). Popup should offer "Book a lesson here" + "Block this time".

4.2. Click "Block this time".
**Expect:** a BLOCK override is created for that exact hour; cell turns red.

4.3. Click a Saturday cell at `10:00` (gray/unavailable — no rule covers Saturday at all). Popup should offer "Book a lesson here" + "Add availability".

4.4. Click "Add availability".
**Expect:** an ADD override created; cell turns green.

4.5. Try to directly create (via the same "unavailable cell → Add availability" flow) an ADD override on a Saturday `10:00`–`11:00` slot again, right after 4.4 — this will now overlap the ADD override you just made.
**Expect:** rejected — "This time overlaps an existing override".

4.6. Click a different Saturday cell, e.g. `14:00` (unavailable). Choose "Block this time" instead of "Add availability" (even though it's already unavailable).
**Expect:** rejected — "This time is already unavailable - no need to block it".

4.7. Click the Sunday `12:00` cell (white/available, covered by rule). Choose "Add availability" instead of blocking.
**Expect:** rejected — "This time is already available - no need to add it".

4.8. Try creating any override (block or add) for **yesterday's date** — you'll need to navigate to "Previous week" first, then click a cell in the past.
**Expect:** rejected — "Cannot create an override for a past date".

4.9. Click directly on the red BLOCK override block you made in 4.2 (not a plain cell — the colored block itself).
**Expect:** opens a "Blocked time" modal (Edit / Delete), not the choose-action popup.

4.10. In that modal, click Edit. Add a note: `Doctor appointment`. Save.
**Expect:** override updates, note now shows on hover/click.

4.11. Delete the Saturday ADD override from 4.4.
**Expect:** deletes immediately, no confirmation needed, cell returns to gray.

4.12. Delete the BLOCK override from 4.2/4.10.
**Expect:** deletes immediately, Sunday 10:00 returns to white.

4.13. On the grid, find your Wednesday rule (08:00–16:00, all four quarters covered) — this is a clean example of a "fully white" cell for a sanity check.

4.14. Add a NEW rule to create a partial-coverage cell: Day Thursday, Start `10:15`, End `16:00` — wait, Thursday 08:00-16:00 already exists and would conflict. Instead: delete the Thursday 08:00–16:00 rule first, then re-add it as Thursday `08:15`–`16:00`.
**Expect:** the Thursday `08:00` grid cell now renders as a split block (part white, part gray) since the rule only covers the last 45 minutes of that hour.

4.15. Click that split Thursday `08:00` cell.
**Expect:** popup treats it as UNAVAILABLE (offers "Add availability", not "Block this time") — a partially-covered cell counts as not-fully-available.

4.16. Restore the Thursday rule back to `08:00`–`16:00` (delete the 08:15 one, re-add 08:00–16:00) so the rest of this test has a clean Thursday.

4.17. Click and drag from Monday `09:00` down through Monday `11:00` (across 3 hour-cells) — click-hold on the 09:00 cell, drag down to 11:00, release.
**Expect:** the whole dragged range highlights while dragging; releasing opens the popup for the full `09:00`–`12:00` range as one block.

4.18. Navigate "Previous week" then "Next week" to return to the current week.
**Expect:** grid returns to today's week; your Sunday/Monday/Tuesday/Wednesday/Thursday/Friday rules and any remaining overrides still show correctly.

4.19. Click "Show earlier hours" twice, then "Show later hours" twice.
**Expect:** window expands correctly (2 hours each direction, capped at 0 and 24); "Reset hours" link appears once the window differs from 08:00–22:00, and clicking it restores 08:00–22:00.

---

## SECTION 5 — Lessons: teacher booking, editing, completing, cancelling

Use today's date for all "today" references below — replace `<TODAY>` with the actual current date in `YYYY-MM-DD` format when typing into date fields.

### 5.1 — Basic booking
Go to Lessons page. "Book a lesson for a student":
- Student: `Noa Cohen`
- Subject: `Math`
- Date: `<TODAY>` (must be a day you have a rule for — pick the next Sunday/Monday/Tuesday/Wednesday/Thursday if today isn't one of those; call this date `<D1>`)
- Start: `09:00`, End: `10:00`

**Expect:** succeeds. Lesson appears in the list: Noa Cohen, Math, ₪100 (her rate), status SCHEDULED.

### 5.2 — Overlap rejection
Same student/subject, same date `<D1>`, Start `09:30`, End `10:30` (overlaps the 5.1 lesson).
**Expect:** rejected — "This time is already booked".

### 5.3 — Unavailable time rejection
Student: `Dan Levi`, Subject: `English`, Date `<D1>`, Start `20:00`, End `21:00` (outside your 08:00–16:00 rule for that day, and no ADD override there).
**Expect:** rejected — "This time is not available".

### 5.4 — Invalid range
Student: `Dan Levi`, Subject: `English`, Date `<D1>`, Start `12:00`, End `11:00` (end before start).
**Expect:** rejected — "Start time must be before end time".

### 5.5 — Book, cancel, rebook same slot
Book Student: `Dan Levi`, Subject: `Math`, Date `<D1>`, Start `13:00`, End `14:00`.
**Expect:** succeeds.
Now cancel that exact lesson (Cancel button on the Lessons list row).
**Expect:** succeeds immediately, status → CANCELLED.
Now book a NEW lesson: Student: `Maya Bar`, Subject: `English`, Date `<D1>`, Start `13:00`, End `14:00` (same slot, different student).
**Expect:** succeeds — a cancelled lesson does not block re-booking the same slot. Maya's lesson shows ₪90 (her current rate).

### 5.6 — Teacher can book in the past / with no notice
Pick a date `<PAST>` a few days before today. Book: Student `Noa Cohen`, Subject `Math`, Date `<PAST>`, Start `09:00`, End `10:00` — but first make sure that day-of-week has a rule covering 09:00–10:00 (use a Sunday/Monday/etc. from your rule list, in the past).
**Expect:** succeeds — teacher has no minimum-notice or past-date restriction (this is intentional, unlike the student flow).
Also try booking a lesson starting 5 minutes from right now (today, current time + 5 min), on a day/time covered by a rule.
**Expect:** succeeds for the teacher.

### 5.7 — Book outside regular hours (auto-override)
Go to the Schedule grid. Click a Saturday cell at `19:00` (uncovered by any rule). Choose "Book a lesson here".
Fill in: Student `Noa Cohen`, Subject `Math`, confirm date is that Saturday, Start `19:00`, End `20:00`.
**Expect:** succeeds. Afterward, confirm on the grid: (a) the lesson block appears blue at Saturday 19:00–20:00, AND (b) a new green ADD override now also exists at that same Saturday 19:00–20:00 slot with note "Lesson booked outside regular hours".

### 5.8 — Edit a lesson
Go back to the lesson from 5.1 (Noa Cohen, Math, `<D1>` 09:00–10:00). Edit it: change Start to `11:00`, End to `12:00` (same day, still within your rule).
**Expect:** succeeds, lesson now shows 11:00–12:00.

### 5.9 — Edit rejected (would overlap)
Try editing the lesson from 5.8 to overlap Maya's 13:00–14:00 lesson from 5.5 (e.g. set it to `13:30`–`14:30`, same date, same-ish time as Maya's — actually needs to be the exact same date `<D1>`).
**Expect:** rejected — "This time is already booked".

### 5.10 — Can't edit a completed/cancelled lesson
(Come back to this after 5.13 completes a lesson.) Try editing a COMPLETED lesson.
**Expect:** rejected — "Only a scheduled lesson can be edited".

### 5.11 — Mark completed before start time
Book a NEW lesson: Student `Maya Bar`, Subject `Math`, Date = tomorrow's date `<D2>` (a day covered by a rule), Start `10:00`, End `11:00`.
Immediately try "Mark completed" on it (it hasn't started yet — tomorrow).
**Expect:** rejected — "Cannot mark a lesson as completed before it has started".

### 5.12 — Mark completed after start time
Go back to the lesson from 5.1/5.8 (Noa Cohen, Math, `<D1>` — this date should now be today or in the past, and its time 11:00–12:00 should have already passed). Click "Mark completed".
**Expect:** succeeds, status → COMPLETED. (If `<D1>` was today and it's not past 12:00 yet, wait or pick an already-past lesson, e.g. reuse the one from 5.6.)

### 5.13 — Now test 5.10
Try to Edit the lesson you just marked COMPLETED in 5.12.
**Expect:** rejected — "Only a scheduled lesson can be edited".

### 5.14 — Cancel a scheduled lesson (teacher, no restriction)
Cancel Maya Bar's `<D2>` 10:00–11:00 lesson from 5.11 (still SCHEDULED).
**Expect:** succeeds immediately, no confirmation dialog, status → CANCELLED.

### 5.15 — Cancel a completed lesson (teacher, with confirm + debt reversal)
Before this step: note Noa Cohen's current debt (Payments page → search Noa → note the number). It should include ₪100 from the lesson you completed in 5.12.
Now cancel that COMPLETED lesson (from 5.12/5.13) via the Cancel button.
**Expect:** a confirm dialog appears: "Cancel this completed lesson? This will reverse its effect on debt and revenue." Click Cancel (dismiss) first.
**Expect:** nothing happens, lesson still COMPLETED, debt unchanged.
Now click the Cancel button again and this time confirm.
**Expect:** lesson → CANCELLED. Recheck Noa's debt — it should have dropped by exactly ₪100 from what you noted before.

### 5.16 — Cancel already-cancelled
Try clicking Cancel again on the same lesson from 5.15 if the button is still visible/reachable.
**Expect:** rejected — "This lesson can't be cancelled" (or the button is no longer shown at all, which is also correct).

---

## SECTION 6 — Lessons list, dashboard, and the Friday-rule-deletion warning

6.1. On the Lessons page, type `Maya` in the search box.
**Expect:** only Maya Bar's lessons shown.

6.2. Clear search, type `English` in the search box.
**Expect:** only English-subject lessons shown (from any student).

6.3. Clear search. Set status filter to "Cancelled".
**Expect:** only CANCELLED lessons shown (should include Dan's 5.5 cancel, Maya's 5.14 cancel, Noa's 5.15 cancel).

6.4. Set status filter back to "All statuses".

6.5. Book at least 8 more quick lessons (any valid student/subject/day/time combos covered by your rules, e.g. Dan Levi + English on Tuesday/Wednesday at various hours) so your total lesson count exceeds 10.
**Expect:** pagination controls appear ("Showing 1-10 of N", Previous/Next). Click Next — page 2 shows the rest. Previous is disabled on page 1, Next disabled on the last page.

6.6. Go to Teacher Dashboard. Confirm "Today" only shows lessons dated today; "Upcoming this week" shows the rest of this week's SCHEDULED lessons (capped at 5).

6.7. Confirm "Needs completion" shows any SCHEDULED lesson whose date is strictly before today (if you have one from testing) with an inline "Mark completed" button.

6.8. Confirm "Outstanding debt" only lists students with debt > 0.

6.9. Confirm the 3 stat tiles (Active students, Lessons this week, Revenue this month) look plausible given what you've done.

### Now the Friday-rule-with-lessons warning:
6.10. Book a lesson: Student `Dan Levi`, Subject `English`, Date = the next Friday `<FRI>`, Start `10:00`, End `11:00` (covered by your Friday 09:00–12:00 rule from Section 3).
**Expect:** succeeds.

6.11. Go to Schedule → "Edit weekly availability". Try to DELETE the Friday `09:00`–`12:00` rule.
**Expect:** a confirm dialog appears warning that 1 upcoming lesson falls inside this slot and won't be cancelled. Click Cancel (dismiss) first — rule should NOT be deleted.

6.12. Try deleting the Friday rule again, this time confirm.
**Expect:** rule is deleted. Go check the Lessons page — Dan's Friday `10:00`–`11:00` lesson should STILL be SCHEDULED (not auto-cancelled), it just no longer falls within any regular availability.

6.13. Re-add the Friday rule: `09:00`–`12:00`. Now try editing it to `10:30`–`12:00` (Dan's 10:00–11:00 lesson would partially fall outside this new range — it starts before 10:30).
**Expect:** a confirm dialog warns 1 upcoming lesson would no longer fall inside this slot. Confirm it.
**Expect:** rule updates, Dan's lesson remains SCHEDULED regardless.

6.14. Restore the Friday rule to `09:00`–`12:00` for cleanliness (edit again, no warning expected this time since Dan's lesson fits again).
**Expect:** saved with no warning (lesson now fits fully inside the range again).

---

## SECTION 7 — Payments

Go to Payments page.

7.1. Record a payment: Student `Noa Cohen`, Amount `50`, Method `Cash`, Notes *(blank)*.
**Expect:** succeeds, appears in payment history.

7.2. Record: Student `Dan Levi`, Amount `100`, Method `Bank transfer`, Notes `First payment`.
**Expect:** succeeds.

7.3. Record: Student `Maya Bar`, Amount `45`, Method `Bit`, Notes *(blank)*.
**Expect:** succeeds.

7.4. Record: Student `Noa Cohen`, Amount `25`, Method `Credit card`, Notes *(blank)*.
**Expect:** succeeds.

7.5. Record: Student `Dan Levi`, Amount `30`, Method `Paybox`, Notes *(blank)*.
**Expect:** succeeds. (You've now used all 5 payment methods at least once.)

7.6. Try clicking "Record payment" with Student selected but Amount left blank.
**Expect:** button is disabled, nothing submits.

7.7. Try entering Amount `0` or a negative number like `-10` (if the field allows typing it) and submitting.
**Expect:** rejected — "Payment amount must be greater than zero" (or the button stays disabled if client-side blocks it first).

7.8. Note Dan Levi's current debt (Payments page, debt list). It should reflect: (completed lesson prices) − (100 + 30 = 130 paid so far). Dan has no completed lessons yet from this test plan, so his debt should currently be negative (he's overpaid) — specifically **−130** if he has ₪0 in completed lessons.

7.9. Cancel the ₪30 Paybox payment from 7.5. Confirm dialog should read something like: "Cancel this ₪30 payment from Dan Levi? This will increase their outstanding debt." Click Cancel (dismiss).
**Expect:** nothing happens, payment still exists.

7.10. Cancel it again, this time confirm.
**Expect:** payment removed. Dan's debt increases by exactly ₪30 from what it was (back toward −100).

7.11. In the shared search box, type `Noa`.
**Expect:** BOTH the payment history list AND the debt list filter to just Noa Cohen simultaneously.

7.12. Clear the search.

7.13. Record 8+ more small payments (any students, any method, e.g. ₪10 each) so your total payment count exceeds 10.
**Expect:** pagination appears on the payment history list ("Showing 1-10 of N"), Previous/Next work correctly. Check whether the debt list also needs its own pagination test (it will if you have 10+ students with debt — you likely don't yet, that's fine, just confirm the payment list pagination works).

---

## SECTION 8 — Materials

Go to Materials page.

8.1. Add a LINK: Student `Noa Cohen`, Lesson `No specific lesson`, Title `Practice worksheet`, Description `Extra algebra practice`, URL `https://example.com/worksheet1`.
**Expect:** succeeds, appears in list tagged "general material".

8.2. Add a NOTE: Student `Noa Cohen`, Lesson: pick one of her SCHEDULED lessons from the dropdown if any exist (otherwise "No specific lesson"), Title `Lesson recap`, Description `Covered quadratic equations today`.
**Expect:** succeeds (uses the Description as the note body).

8.3. Upload a FILE: Student `Dan Levi`, Lesson `No specific lesson`, Title `Reading list`, pick any small file from your computer (e.g. a .txt or .pdf).
**Expect:** succeeds, appears in list with a Download button.

8.4. Try adding a LINK with Title filled but URL left blank.
**Expect:** "Add link" button stays disabled, nothing submits.

8.5. Try adding a NOTE with Title filled but Description left blank.
**Expect:** "Add note" button stays disabled.

8.6. Try clicking "Upload file" with no file chosen.
**Expect:** blocked with "Choose a file first" or the button stays disabled.

8.7. Confirm the "Lesson" dropdown for Dan Levi does NOT show any CANCELLED lesson of his (he has cancelled ones from Section 5/7) — only SCHEDULED/COMPLETED ones appear, sorted newest first.

8.8. Cancel one of Noa Cohen's currently-SCHEDULED lessons (pick any remaining one from earlier sections, or book+cancel a fresh one: Student Noa, Subject Math, a day/time covered by a rule, then immediately cancel it).
**Expect:** cancels fine.
Now try to add a NOTE to Noa Cohen attached to THAT specific now-cancelled lesson — but since the UI dropdown already filters it out, you likely can't select it. This confirms the filter works; the actual server-side rejection ("Can't attach a material to a cancelled lesson") is a deeper check we trust from code review, not required to force through the UI.

8.9. Click Download on the file material from 8.3.
**Expect:** downloads with the same filename and content you uploaded.

8.10. Click the link material from 8.1 ("Open link").
**Expect:** opens `https://example.com/worksheet1` in a new browser tab.

8.11. In the search box, type `worksheet`.
**Expect:** only the matching material(s) with "worksheet" in the title (or matching student name) shown.

8.12. Clear search. Set the type filter to "Link".
**Expect:** only LINK materials shown.

8.13. Set type filter back to "All types". Set subject filter to `Math`.
**Expect:** only materials tied to a Math lesson shown (materials with no lesson, like your 8.1 link, will NOT match this filter — confirm that's the case).

8.14. Set subject filter back to "All subjects". Type `15/03` or any date fragment into "Filter by lesson...".
**Expect:** only materials tied to a lesson matching that date fragment shown (may be empty if none match — that's fine, just confirm it filters correctly rather than erroring).

8.15. Clear all filters. Add 8+ more quick materials (any type, any student) so your total exceeds 10.
**Expect:** pagination appears, works correctly.

8.16. Delete the file material from 8.3.
**Expect:** confirm dialog: `Delete "Reading list"? This can't be undone.` Confirm it.
**Expect:** material is gone from the list permanently (this is a hard delete, unlike lessons/payments which soft-cancel).

---

## SECTION 9 — Statistics (teacher only)

Go to Statistics page.

9.1. Confirm the page loads automatically with numbers already populated — no button needed.

9.2. Note "Total income (all time)" — this should equal the sum of every payment you've recorded across Section 7 minus the ones you cancelled (7.9/7.10), plus your Section 7.13 batch. Do a rough sanity check against your own running total.

9.3. Note "Total completed lessons (all time)" — should be at least 1 (from 5.12), possibly more if you completed others.

9.4. Check the month filter dropdown — select the current month.
**Expect:** the "Income by month" and "Completed lessons by month" tables filter to just that month; "Breakdown by subject" and "Students who owe money" stay unaffected (still all-time).

9.5. Set filter back to "All months".

9.6. Confirm "Breakdown by subject" shows Math and English rows (whichever you actually completed lessons in), sorted by revenue descending.

9.7. Confirm "Students who owe money" only shows students whose debt is currently positive, sorted highest debt first. Given your test data, check whether Noa/Dan/Maya's debts match what you saw on the Payments page for each.

---

## SECTION 10 — Switch to Student A (Noa Cohen)

Log out. Log in: `noa.cohen@test.com` / `noa1234`.

10.1. **Expect:** redirected to `/student`, dashboard loads with the schedule grid embedded directly below the welcome text.

10.2. Confirm the Balance card shows a number matching what you saw for Noa on the teacher's Payments/Statistics pages.

10.3. Confirm there are exactly 2 quick-link buttons: "View lessons" and "View materials" (no "View balance" button — it was intentionally removed).

10.4. Confirm the nav bar shows: Lessons, Payments, Materials (no separate "Schedule" tab — the grid lives only on the dashboard).

---

## SECTION 11 — Student schedule grid (Noa, on dashboard)

11.1. Confirm the grid shows your Sunday–Thursday 08:00–16:00 (plus Sunday evening, Friday morning) availability as white, everything else as gray — matching what you set up as teacher.

11.2. Confirm any of Noa's own SCHEDULED lessons show as blue blocks with the subject name visible.

11.3. Confirm any COMPLETED lesson of Noa's (if you have one remaining that wasn't cancelled) shows as a slate/gray-ish block, still distinguishable from a plain unavailable cell (hover/click for details).

11.4. Open a second browser (or private/incognito window). Log in there as Dan Levi: `dan.levi@test.com` / `dan1234`. Book a lesson as Dan: pick any open slot, e.g. Tuesday `14:00`–`15:00` (a time more than 2 hours from now, and covered by your Tuesday rule).
**Expect:** succeeds for Dan.

11.5. Switch back to Noa's window/tab, refresh the dashboard.
**Expect:** that Tuesday `14:00`–`15:00` slot now shows gray with a "Booked" label — no student name, no subject visible to Noa.

11.6. As Noa, click that gray "Booked" Tuesday slot.
**Expect:** nothing happens — it's not clickable, no booking modal opens.

11.7. As Noa, click a genuinely open white cell, e.g. Wednesday `09:00` (assuming nothing else is booked there), where the resulting start time is MORE than 2 hours from right now.
**Expect:** booking modal opens, pre-filled with Subject dropdown empty, Date = that Wednesday, Start `09:00`, End `10:00`.

11.8. Select Subject `Math`, click "Book lesson".
**Expect:** succeeds, cell turns blue, modal closes.

11.9. Try to click an open cell whose start time is LESS than 2 hours from right now (e.g. if it's currently 14:30, try clicking today's `15:00`–`16:00` cell if today is covered by a rule and that cell is still open).
**Expect:** either the cell is visibly non-clickable (cursor doesn't change, nothing happens) or, if you do get the modal open some other way, submitting shows "Lessons must be booked at least 2 hours in advance".

11.10. Click the lesson you just booked in 11.8 (Wednesday `09:00`–`10:00`, currently more than 6 hours away).
**Expect:** a modal opens showing Subject/date/time/status, with a working "Cancel lesson" button.

11.11. Click Cancel lesson.
**Expect:** succeeds, lesson removed from the grid, that Wednesday slot returns to white.

11.12. Book another lesson (any student, this time via the teacher account in your other window) for Noa at a time LESS than 6 hours from now but more than 2 hours from now — e.g. if it's currently 14:00, book Noa for today `17:00`–`18:00` (only works if today is covered by a rule; otherwise pick tomorrow and note this test may need to wait for the right conditions — if you can't get a valid <6hr slot today, come back to this step later in the day).
**Expect:** teacher can book it fine (no notice restriction for teacher-initiated booking).

11.13. As Noa, click that lesson on the grid.
**Expect:** modal opens, but instead of a clickable "Cancel lesson" button, you see a note like "Can't be cancelled within 6 hours of the start time."

11.14. As Noa, click "Previous week" on the grid to go to a past week.
**Expect:** cells in the past are NOT clickable (no booking modal opens even on visually-white cells).

11.15. Confirm there is no "Edit weekly availability" button, no way to block/add availability, and no way to see or edit other students' lesson details — Noa's grid is booking-and-viewing only.

---

## SECTION 12 — Student Lessons page (Noa)

Go to Lessons page (as Noa).

12.1. Confirm three sections exist: **Upcoming**, **Completed**, and a collapsed **"Show N cancelled"** toggle (not an always-visible Cancelled list).

12.2. Book a lesson for later today (if a rule covers a remaining slot today and it's more than 2 hours out) OR for tomorrow: Subject `English`, appropriate Date/Start/End.
**Expect:** appears under "Upcoming" labeled "Today" or "Tomorrow" respectively (not a raw date), sorted so the soonest lesson is first.

12.3. Confirm Upcoming lessons are sorted soonest-first (earliest date/time at top).

12.4. Switch to the teacher window. Mark one of Noa's SCHEDULED lessons as completed (must be past its start time).
**Expect (teacher side):** succeeds.
Switch back to Noa, refresh the Lessons page.
**Expect:** that lesson now appears under "Completed" with a green "Done" badge, and Completed is sorted newest-first.

12.5. Cancel one of Noa's own upcoming lessons that's more than 6 hours away.
**Expect:** succeeds. It disappears from Upcoming. It does NOT appear under Completed.

12.6. Click "Show N cancelled".
**Expect:** the list expands, showing the lesson you just cancelled (date/time/subject, muted styling, no status badge clutter, no action buttons).

12.7. Click "Hide" (same toggle).
**Expect:** collapses again.

12.8. **The in-limbo edge case**: as the teacher, book a lesson for Noa in the recent past (e.g. yesterday, a day/time covered by a rule) and do NOT mark it completed or cancel it (leave it SCHEDULED).
Switch to Noa's Lessons page, refresh.
**Expect:** this lesson does NOT appear under Upcoming (it's not upcoming — it already happened) and does NOT appear under Completed (it was never marked completed) and does NOT appear under Cancelled either. It is effectively invisible on this page. Confirm this is actually what happens — this is a known design gap, flag back to me whether this feels wrong in practice so we can decide whether the teacher needs a better way to catch these.

12.9. On Noa's own "Book a lesson" form (not the grid — the form on this page), try Date = today, Start = a time less than 2 hours from now.
**Expect:** rejected client-side with "Lessons must be booked at least 2 hours in advance" before any request is sent.

12.10. Try to pick a past date in the Date field's calendar picker.
**Expect:** the picker's minimum is today — past dates aren't selectable.

---

## SECTION 13 — Student Payments & Materials (Noa)

13.1. Go to Payments page. Confirm you see only Noa's own payment history (the ₪50 Cash and ₪25 Credit card payments from 7.1/7.4) and her own balance — nothing from Dan or Maya.

13.2. Go to Materials page. Confirm you see only materials tied to Noa (the worksheet link and lesson recap note from 8.1/8.2) — nothing from Dan or Maya.

13.3. Confirm the search box, subject filter, and "Filter by lesson" box all work the same way they did for the teacher.

13.4. Confirm there is NO "type" filter dropdown (File/Link/Note) visible on the student view — this was intentionally left teacher-only. If you'd actually like it available to students too, flag it and we'll add it.

---

## SECTION 14 — Cross-role access control

14.1. While logged in as Noa (student), manually type this URL into the address bar: whatever your app's base URL is + `/teacher/statistics`.
**Expect:** redirected to `/login`, no teacher content is shown even briefly.

14.2. Try `/teacher/register`, `/teacher/schedule-rules`, `/teacher/payments` the same way.
**Expect:** all redirect to `/login`.

14.3. Log out from Noa's session.
**Expect:** redirected to `/login`. Press the browser Back button.
**Expect:** does not show the dashboard again — either redirects to login or shows a blank/login state, never the protected page's content.

14.4. Log in as Dan Levi (`dan.levi@test.com` / `dan1234`). Confirm his balance, lessons, and materials are all HIS OWN, distinct from Noa's and Maya's (spot-check a couple of numbers against what you recorded for him in Sections 5–8).

14.5. Log in as Maya Bar (`maya.bar@test.com` / `maya1234`). Same spot-check — confirm her balance reflects her ₪90 rate lesson from 5.5 and her ₪45 Bit payment from 7.3, and that she sees none of Noa's or Dan's data.

---

## SECTION 15 — Wrap-up

15.1. Go back through every section above and confirm every checkbox-equivalent line actually matched its "Expect:" — anywhere it didn't, write down: section number, exact steps you took, exact values you entered, and exactly what you saw instead.

15.2. Separately note anything that wasn't technically broken but felt confusing, awkward, or poorly worded while you were doing this — button labels, missing feedback, anything that made you pause and think "wait, what?"

15.3. Send me the full list (bugs + confusing-but-not-broken items together) and we'll go through them one at a time.
