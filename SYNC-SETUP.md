# Turning on automatic Webtop sync

About fifteen minutes, once. Free, and it stays free.

---

## What we found

**Webtop needs no login.** You were right. Your class's timetable, and every change and
cancellation on it, come straight out of a public API:

```
POST https://webtopserver.smartschool.co.il/server/api/shotef/ShotefSchedualeData
POST https://webtopserver.smartschool.co.il/server/api/shotef/ChangesAndMessagesData
     body: {"institutionCode":541169,"selectedValue":"10|14","typeView":1,"todayOnly":false,"startWeek":true}
```

**So why isn't it already done?** One reason, and it isn't permission:

> Webtop sends no `Access-Control-Allow-Origin` header. Browsers therefore refuse to let a page on
> `github.io` read the response — not because you lack access, but because the browser blocks any
> cross-site read the other server hasn't explicitly approved.

`worker.js` exists solely to fix that. It fetches Webtop from a server (where no such rule applies)
and hands the result back with the header attached. It holds no password and stores nothing.

---

## 1 · Deploy the Worker

1. Go to **dash.cloudflare.com** and sign in (free account is fine).
2. Left sidebar → **Workers & Pages** → **Create** → **Workers** → **Create Worker**.
3. Name it `schedule-proxy`. **Deploy** the template as-is.
4. **Edit code** → select everything in the editor → delete → paste the whole of `worker.js` → **Deploy**.

You'll get an address like:

```
https://schedule-proxy.YOURNAME.workers.dev
```

**Test it in your browser** — open:

```
https://schedule-proxy.YOURNAME.workers.dev/school?inst=541169&cls=10|14
```

You should see a wall of JSON with `"changes"` in it. If you see `"error"`, see *If it doesn't work*.

## 2 · Point the app at it

In the app: **Classes** → scroll to **Sync with school** → paste the address into
*Sync address* → **Check Webtop now**.

You'll get a plain-English log of what it did:

```
Cancelled — Mon 14/09 · 7. 13:50-14:35 · חינוך תעבורתי
Room → מעבדה 2 — Wed 16/09 · 6. 12:55-13:40 · כימיה 5
1 exam added
1 change skipped — other classes' teachers
```

After that it checks itself every six hours whenever you open the app.

---

## What it actually does

| Webtop says | The app does |
|---|---|
| **ביטול שיעור** (cancelled) | Removes that class **from that date only**. Your normal week is untouched, and if it's the last class of the day, the gym, lunch and evening all move up. |
| **חדר חלופי** (room change) | Adds a small one-off task on that date with the new room. |
| **Exam** | Adds a one-off task, marked important. |
| **Event** | Adds a one-off task. |

Running it twice changes nothing twice — it's safe to press any time.

### Your subjects — the part that matters

Webtop answers for your whole class, so **every stream's group comes back**. Sunday period 0 arrives
with all six maths teachers. Changes arrive for any group that merely *contains* your class — this
week there's a room change for **אנגלית 5 with שגיא איליי**, which is not your English.

So the app matches on **studyGroupID**, and you choose which ones are yours:

**Classes → My subjects.** Every group the school runs, grouped by subject, with the teacher next to
it. Tick yours. That's what every cancellation, room change and closure is matched against — including
the מגמות like **הנדסת תוכנה** and **כימיה 5** that aren't tied to your class at all.

### When you change a subject

September 2026: you left **ביולוגיה 5** for **הנדסת תוכנה**. The app unticked biology for you, because a
subject you've left is worse than one you never had — it goes on matching cancellations and room changes
that aren't yours.

It did **not** tick software engineering in its place. Group IDs aren't guessable, and a wrong one
mis-matches silently — you'd get someone else's cancellations and never know. So Classes shows an amber
note until you finish the swap: press **Check Webtop now**, then tick your הנדסת תוכנה group (it's
highlighted in the list). The note disappears the moment you do.

Thursday periods 7–8 hold הנדסת תוכנה as a placeholder in your normal week. When sync sees what Webtop
actually says, Classes offers you **Use Webtop's version** and one press makes it real.

### Moving up a year

**Classes → Year.** Change it in September and everything follows:

| | |
|---|---|
| Your class token | `י14` → `יא14` → `יב14` |
| Webtop class | `10\|14` → `11\|14` → `12\|14` |
| Year calendar | שכבת יוד → שכבת יא → שכבת יב |
| Years ignored | the other two, whichever they are |

**Then re-pick your subjects**, because the group numbers change every year too. The picker reloads
from the live feed, so it'll show your new groups the moment you press *Check Webtop now*.

---

## The school calendar

The Worker also has an `/ical` route for public Google Calendars:

```
https://schedule-proxy.YOURNAME.workers.dev/ical?cid=hayovelhigh@gmail.com
```

Open that in a browser. If you get calendar text, it's public and I'll wire it into the app the same
way. If you get an error, the calendar isn't actually public and it would need your Google login,
which is a different and much bigger problem — and Webtop already carries exams and events anyway.

---

## If it doesn't work

**`/school` returns an error about a status code** — Webtop may be blocking requests that don't come
from a browser. We couldn't test that from here; the Worker is the test. If it is blocked, the
fallback is a scheduled task on your PC that drives your own browser, which we know works because
that's how the data above was read.

**The app says "Could not reach the proxy"** — check the address has no trailing slash and starts
with `https://`. Open the `/school` URL directly in a browser to see the real error.

**A cancellation didn't apply** — check the teacher is on the list above. The log line
*"N changes skipped — other classes' teachers"* tells you it saw something and decided it wasn't yours.

**You want to undo everything sync did** — Classes → the affected week → **Whole week back to normal**.
