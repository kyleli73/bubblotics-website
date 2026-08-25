---
title: Scouting app guide
summary: How to sign in, scout a match, and run the stand as a manager.
app: Bubblotics Scouting
order: 1
appUrl: 'https://scouting.bubblotics.ca'
revision: '26-7'
draft: false
---

<!--
  IMPORTANT, for whoever edits this next:

  The team join codes are NOT in this file, and must not be added. This page
  is public. Anyone who reads a code can sign in as a stand manager and read
  or overwrite the scouting data, including the picklist, which is exactly
  what the codes exist to prevent.

  Ask a stand manager for the code in person, or send it in the team chat.
-->

Everything below applies to **[scouting.bubblotics.ca](https://scouting.bubblotics.ca)**.

## Team codes

The first time you sign in, the app asks for a one-time code. There are two,
one for scouts and one for stand managers, and the code you enter decides
what you can see.

**The codes are not published here on purpose.** This page is public, and
anyone with the manager code could read or overwrite our scouting data. Ask a
stand manager for yours.

| Job | What you get |
|---|---|
| **Scout** | Your match list and the scouting form. |
| **Stand manager** | All of the above, plus assignments, analytics, and the picklist. |

Entering a code is a one-time step per device. Managers cannot demote
themselves by entering the scout code.

---

# For scouts

## 1. Sign in

Open the link and continue with Google, Discord, or your email. If you choose
email, you will get a confirmation from `noreply@bubblotics.ca` — **click that
link before trying to sign in**, or it will not let you through.

## 2. Enter the team code

Use the scout code. Ask a manager if you do not have it.

## 3. Save the app to your phone

**Do this before the event, not at it.** It is what makes the app work when
the venue wifi does not.

- **iPhone:** open in Safari → Share → Add to Home Screen
- **Android:** open in Chrome → three dots → Add to Home Screen

That first visit saves the app to your phone.

## 4. Find your match

Your match list shows only the matches a manager assigned you. Each row tells
you the match number and which robot to watch.

**Watch only your robot.** Somebody else has the others. Tap the next match to
open the form.

## 5. Fill in the form

Four tabs, filled in as the match happens.

### Auto

Before the match starts, set your robot's starting zone to **close** or
**far**. If you missed it, pick **Not seen** rather than guessing.

During auto, record whether they left the starting position, how many balls
they scored, whether they interacted with the gate, and the final pattern in
the ramp.

### Teleop

Tap the **cycle** button each time your robot completes a cycle. The app
records both the count and how long each one took.

Also note where they collect artifacts, what role they played, whether they
played defence, the pattern at the end of teleop, their ball colour control,
and how many classified and overflow artifacts they scored.

### Endgame

Whether they returned to base, the type of park, and how many attempts it
took.

### After the match

A short reflection: did they break down, any fouls, and **how confident you
are in what you just recorded**. Be honest here. If the robot spent half the
match hidden behind another one, say so. Managers use this to decide which
numbers to trust, and a confident wrong number is worse than an admitted
gap.

Anything that did not fit a field goes in **notes**.

## 6. Submit

**Submit means "safely saved on this phone", not "uploaded".** The app sends
entries up on its own once it finds a connection.

The badge in the top right saying **offline** or **3 queued** is normal at a
venue. It is not an error and nothing is lost. There is also a short
autosave, so a dead battery mid-form does not cost you the entry.

## Multi-day events

At provincials, and hopefully Worlds, a **day selector** appears at the top of
your match list. Your assignments can differ from day to day.

---

# For stand managers

Signing in works the same way. The only difference is the code.

## The home screen

| Tile | What it does |
|---|---|
| **Event setup** | Load teams, schedule and OPR. Refreshes posted scores. |
| **Assignments** | Roster, auto-rotation, coverage. |
| **Data quality** | Missing entries, outliers, scout accuracy. |
| **Team analytics** | Averages and OPR, sortable and filterable. |
| **Picklist** | Ranks, tiers, export for alliance selection. |
| **Team members** | Approve new sign-ins, promote scouts to managers. |
| **Backup** | Export everything to CSV. |

## Event setup

Enter the FTC event code — it looks like `USNYNYNYQ1` and is in the
[ftcscout.org](https://ftcscout.org) URL for your event — then **Load event**.

You can load several events at once. Refresh periodically to pull real posted
scores, which is what scout accuracy is measured against.

## Assignments

Paste the roster, one name per line, then **Auto-rotate**, then
**Push to scouts**.

**Minimum four scouts**, because four robots play every match. The rotation
shifts everyone one seat per match so nobody watches the same alliance all
day. Tap a name in the table to cycle that one row to the next person.
**Load per scout** shows how many matches each person is carrying — use it to
spread the work.

**Push to scouts is the step people forget.** Nothing appears on anyone's
phone until you press it. Do it before the competition starts.

On multi-day events, a **competition day** selector appears. Days are worked
out from the schedule automatically, and you generate assignments per day, so
roster changes between days are handled.

## Data quality

**This is the screen to live on during an event.** Pull entries from scouts'
devices every few matches.

- **Scout coverage** — assigned, submitted, and rate per scout. When
  somebody's rate drops, go find them while the match is still fresh enough
  to remember.
- **Missing data** names the match and the scout.
- **Worth a second look** flags entries well above a team's usual numbers.
  Sometimes it is a genuinely good match. Sometimes it is a miscount. Ask.
- **Scout accuracy (auto)** compares each scout's logged auto against the real
  posted alliance auto score, with average deviation and bias.

**Read all of it relatively, never absolutely.** Robots perform relative to
whoever else is on the field, so comparing a team against their own earlier
matches, against different opponents, will mislead you. Compare scouts
against each other to find the drift.

## Team analytics

Averages and OPR, filterable by team number or name, with columns for auto,
cycles, defence, park and total.

You can hand-enter drivetrain size, drivetrain type, and robot notes per team
— that is where pit scouting goes. Scout notes show what your scouts wrote
during matches; pre-scouted reference is what you recorded beforehand.

## Picklist

**This is what the whole app is for.** Everything else exists to make this
list trustworthy.

Add teams, reorder them, set tiers, and write your reasoning in
**Why this rank**. Tiers matter as much as the order — they are what you fall
back on when your first pick is gone. Mark teams **Do not pick** so nobody
picks them by accident under pressure.

**Screenshot the picklist, or write it out, before your representative goes
up.** Teams get picked and teams decline, and the floor is not the place to
be reloading a web app.

## Team members

Everyone who has signed in, with name, email, role, method, and last sign-in.
Anyone who signed in but never entered a code sits as **pending** with no
access at all — check here if a scout says they cannot see anything.

## Backup

Exports everything to CSV in a few seconds. Do it at the end of each day.
