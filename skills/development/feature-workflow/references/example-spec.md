# Example spec (fictional, trimmed)

A scope spec for an invented feature in an invented two-repo product, cut down to the parts
that show the shape: the header, a few facts from §3, the decisions (§8), the plan (§9) and
the change log (§12). Read it once for density and tone; write real specs from
`spec-template.md`. Nothing here describes a real codebase, so never cite it as fact.

---

# Bookings CSV export — scope v1

| | |
|---|---|
| Slug / flag key | `bookings-csv-export` / reuses the `reports:read` permission — no new flag |
| Track stage | **Scope v1 rev 3, 2026-03-12.** Step 1 (api) built and verified, not committed; step 2 (web) file list is next |
| Policy | `web/docs/features.md` §2 — a new action on an existing page needs no flag when a permission gates it |
| Page / area | `/bookings` list — `web/src/pages/bookings/BookingList.tsx` |
| Upstream contract | `GET /bookings` — `api/src/routes/bookings.ts:24`; NEW `GET /bookings/export` (§5) |
| Background | `api/docs/architecture.md` §Paging, §Time zones |

Paths are `<repo>/<path>`: `api` = bookings-api, `web` = bookings-web.

## 3. What exists today — the facts the design rests on (excerpt)

- `GET /bookings` pages by cursor and caps `limit` at 100 (`api/src/routes/bookings.ts:41`), so
  the browser cannot fetch a month in one call. Verified on 2026-03-09: `?limit=500` returned
  100 rows and a `nextCursor`.
- Times are stored in UTC and converted to the room's time zone only in the browser
  (`web/src/lib/time.ts:18`). The API has no formatter, so a file built server-side needs one.
- The list keeps its filters in the URL query (`web/src/pages/bookings/BookingList.tsx:57`), so
  the export can send the same query unchanged.

## 8. Decisions — recommendation first

| # | Decision | Recommendation (with the reason) | Alternative |
|---|---|---|---|
| 1 | Where the file is built | **API** — walks the cursor server-side: no 100-row cap, one formatter for every client | Browser — no API change, but 100 rows per call and a slow tab past a few thousand rows |
| 2 | Which rows | **The list's current filters** — what the user sees is what they get | Everything the user may see — simpler, but surprises anyone who filtered first |
| 3 | Time format | **ISO 8601 in the room's time zone, with offset** — matches the screen, stays unambiguous | UTC — simpler, but every reader converts by hand |
| 4 | Size limit | **20 000 rows, then 422 `TooManyRows` with a message to narrow the filters** — a month at the busiest office is ~6 000 | No limit — risks the gateway's 30 s timeout |

**Status (rev 1, 2026-03-10):** 1–3 accepted provisionally, re-reviewed per step. 4 — Alex:
50 000 rows, for quarterly reports (20 000 not chosen). Scheduled e-mail exports deferred to L2.

## 9. Implementation plan

**9.0 Working agreement.** File list before each step, then "go"; stop after each step for
review. Branch `feature/bookings-export-214` in both repos. No commits — Alex commits.

### 9.1 Step 1 — export endpoint (api)

Added:

| File | Change |
|---|---|
| `src/routes/bookingsExport.ts` | NEW `GET /bookings/export` — the list's filters, streams `text/csv` (§5) |
| `src/filters/bookingFilters.ts` | the filter parser, moved out of `bookings.ts` unchanged |
| `src/csv/bookingRow.ts` | row mapper; times in the room's zone with offset (§8-3) |
| `test/bookingsExport.test.ts` | filters, the 50 000-row limit, time zones, empty result |

Changed:

| File | Change |
|---|---|
| `src/routes/bookings.ts` | imports the moved filter parser — no behaviour change |
| `src/routes/index.ts` | registers the export route behind `reports:read` |

### 9.2 Step 2 — Export button (web)

Added:

| File | Change |
|---|---|
| `src/pages/bookings/BookingList.export.test.tsx` | button hidden without `reports:read`; the 422 message |

Changed:

| File | Change |
|---|---|
| `src/pages/bookings/BookingList.tsx` | Export CSV button beside the filters |
| `src/api/bookings.ts` | `exportBookings(query)` — the download; 422 mapped to the §6 message |

| Step | Repo | Work | Effort |
|---|---|---|---|
| 1 | api | export endpoint, shared filter parser, tests | ½ day |
| 2 | web | button, download, error message, tests | ½ day |

## 12. Change log

| Rev | Date | Change |
|---|---|---|
| v1 | 2026-03-09 | First draft from the brief (#214): §3 facts, design, four decisions, two steps |
| rev 1 | 2026-03-10 | Alex answered §8: 1–3 accepted provisionally; 4 → 50 000 rows; scheduled exports → L2. §5, §7 updated |
| rev 2 | 2026-03-11 | Step 1 file list: the filter parser moves to its own file instead of being copied (§9.1) |
| rev 3 | 2026-03-12 | Step 1 built and verified: gates green; 50 000 rows exported in 3.8 s (6.1 MB) on staging data. The local seed has 40 bookings, so the limit was checked on staging (§10) |
