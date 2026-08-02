---
# ═══════════════════════════════════════════════════════════════════════════
#  ROBOT PAGE — the current season's robot.
#
#  Everything between the two --- lines is "frontmatter": structured data
#  the site reads. Everything below the second --- is the engineering notes
#  section, written in Markdown.
#
#  The filename becomes the URL. This file is decode-robot.md, so the page
#  is at /robots/decode-robot/. Rename it to the robot's actual name once
#  it has one (voyager.md -> /robots/voyager/).
#
#  [PLACEHOLDER] Every value below is invented. Replace all of it.
# ═══════════════════════════════════════════════════════════════════════════

name: '[PLACEHOLDER: Robot name]'
season: 'DECODE'
year: '2025-26'

# Higher number = newer. This controls ordering on every page that lists
# robots. Give each new season a number one higher than the last.
order: 4

# One or two sentences. Appears on the card, at the top of this page, and as
# the page's description in Google results.
summary: >-
  [PLACEHOLDER] One or two sentences on what makes this robot different from
  last year's. Lead with the thing you would point at first if someone walked
  up to it in the pits.

# Exactly one robot should have this. It leads the Robots page and is teased
# on the home page.
featured: true

# Photo. Save the file to src/assets/robots/ and point at it relatively.
# Leave commented out and the page shows a marked placeholder instead.
# heroImage: '../../assets/robots/decode-robot.jpg'
# heroImageAlt: '[PLACEHOLDER] Describe the photo for anyone who cannot see it.'

# Headline results only. The full record lives on the Awards page.
results:
  - '[PLACEHOLDER: Award or result]'
  - '[PLACEHOLDER: Award or result]'

# The quick-reference table. Add or remove rows freely.
specs:
  - label: 'Drivetrain'
    value: '[PLACEHOLDER: e.g. Mecanum]'
  - label: 'Weight'
    value: '[PLACEHOLDER: XX kg]'
  - label: 'Cycle time'
    value: '[PLACEHOLDER: X.X s]'
  - label: 'Auto points'
    value: '[PLACEHOLDER: XX]'

# ── Interactive CAD ────────────────────────────────────────────────────
# Paste an Onshape public embed URL here and a live, rotatable 3D viewer
# appears on this page. Delete the line (or leave it commented) and the
# whole CAD section is skipped.
#
# The README section "Adding an Onshape CAD viewer" walks through making the
# document public and generating this link. Do that before pasting anything:
# a private document renders as an Onshape sign-in screen for visitors.
#
# onshapeEmbedUrl: 'https://cad.onshape.com/documents/XXXX/w/XXXX/e/XXXX'
# onshapeCaption: '[PLACEHOLDER] Note what the viewer is showing, e.g. "Full competition assembly as of provincials."'

# ── Hologram viewer ────────────────────────────────────────────────────
# A translucent, glowing render of the real geometry that visitors can
# orbit, explode, and pick apart subsystem by subsystem.
#
# This needs an exported .glb saved to public/models/. It is a snapshot, so
# it does not update when the CAD changes; the Onshape embed above does.
# Having both is the ideal: one is always current, one looks like the future.
#
# See the README, "Adding a hologram CAD viewer", for export steps and how
# to keep the file small.
#
hologramModel: '/models/assembly-1.glb'
hologramCaption: '[PLACEHOLDER] Describe what this assembly shows.'

# YouTube video ID only, not the full URL. From
# https://youtube.com/watch?v=dQw4w9WgXcQ the ID is dQw4w9WgXcQ.
# videoId: 'XXXXXXXXXXX'

# Set to true to keep this page off the site while you write it.
draft: false
---

<!--
  ── ENGINEERING NOTES ────────────────────────────────────────────────────
  This section renders under a heading that says these notes are for judges
  and for next year's team. Write it that way: what you built, why you built
  it that way, what you tried first, and what you would change.

  Judges reward documented iteration far more than a polished final answer.
  The version that did not work is worth writing about.

  Markdown basics:
    ## Heading      a section heading
    **bold**        bold text
    - item          a bullet
    ![alt](path)    an image
-->

## Design goals

[PLACEHOLDER] What the team decided to optimise for this season, and why.
Reference the game: what scores points, what the field makes difficult, and
where a match is actually won or lost.

## Drivetrain

[PLACEHOLDER] What you chose and what you rejected. Include the numbers that
drove the decision (gear ratio, free speed, pushing power) rather than just
the conclusion.

**What we would change:** [PLACEHOLDER] Be honest here. This line is worth
more to a judge than a paragraph of what went right.

## Intake

[PLACEHOLDER] How it acquires game elements. How many iterations it took.
What broke at the first competition.

## Scoring mechanism

[PLACEHOLDER] The mechanism, its range, and its cycle time. If you measured
it, give the number.

## Autonomous

[PLACEHOLDER] What the routine does, how it localises, and how consistent it
actually is across matches. A 60% success rate stated plainly reads better
than "reliable".

## Iteration history

[PLACEHOLDER] A short list of the major revisions and what prompted each one.

- **v1** — [PLACEHOLDER: what it was, why it changed]
- **v2** — [PLACEHOLDER]
- **v3 (competition)** — [PLACEHOLDER]

## What we learned

[PLACEHOLDER] Two or three things the team will carry into next season.
