# Summit Spark Roadmap

## North Star

Build an original precision platformer whose identity is not imitation, but mastery: instant controls, readable rooms, fast retry, and a signature movement language built around dash afterglow, spark hops, wall rhythm, and risky light relays.

## What We Must Beat

- Feel: every input should be immediate, legible, and recoverable.
- Teaching: rooms should introduce one idea safely, then ask for it under pressure.
- Practice: deaths should be fast, informative, and almost frictionless.
- Identity: spark hop and light relay chains must become our own expressive mechanic.
- Presentation: effects should clarify player state without visual noise.

## Current Pillars

- Direction keys are direction only; jump, dash, and grab stay separate.
- Spark hop: a tiny post-dash jump window turns dash momentum into a learned technique.
- Wall rhythm: neutral wall jumps, away wall jumps, and grab wall jumps have distinct uses.
- Light trails are visual only; light relays provide limited, authored risk/reward extension.

## Next Milestones

1. Movement depth: tune spark hop, wall jump lock, corner correction, and grounded recovery.
2. Practice feedback: show run time, deaths, room count, recent death marks, and short death trajectory replays.
3. Teaching vertical slice: expand the route so each mechanic has a room that teaches it.
4. Light relay mechanic: tune non-solid, timed relays and relay-chain feedback that reward fast spark movement without enabling hovering.
5. Presentation pass: add action cues, better player states, and successful-tech feedback.
6. Public test loop: keep GitHub Pages updated, collect player feedback, and track known issues.

## Design Rules

- Never bind jump to up.
- Never let visual particles become hidden platforms.
- Every new powerful mechanic needs a cooldown, cost, route constraint, or room-authored limit.
- A room should be readable before it is difficult.
- Restart speed matters as much as spectacle.
