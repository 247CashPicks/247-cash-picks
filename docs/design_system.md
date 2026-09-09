# DataNexus / TAC — Design System

The command center is the first surface of the rebuild. Task 3 extends these
tokens; it does not invent a second set.

## Source

The TAC logo: **brushed steel (T), electric blue (A), lime green (C)** on **deep
navy**, with a network-node motif. That is the entire palette and the entire
visual language. Nothing here is chosen for taste; every value is derived from
the mark or from a contrast requirement.

## Palette

| token | value | role |
|---|---|---|
| `--navy-void` | `#070C14` | page ground |
| `--navy-base` | `#0B1220` | panel ground |
| `--navy-raised` | `#111C2E` | raised rows, inputs |
| `--steel-line` | `#1E2C40` | borders, grid rules |
| `--steel` | `#8695A8` | secondary text, structure |
| `--steel-bright` | `#C3CEDB` | primary text |
| `--blue` | `#2F9BF0` | interactive, live state, primary accent |
| `--blue-dim` | `#1B6FB0` | pressed, secondary interactive |
| `--lime` | `#8FD14F` | positive, promoted, healthy |
| `--amber` | `#E8A33D` | stale, warning |
| `--alert` | `#E2564D` | error, contradiction |

`--amber` and `--alert` are the one addition the logo does not supply: a warm
pair chosen to sit against navy for stale states and errors. Nothing else. No
purples, no teals, no second blue.

### Contrast

Measured, not estimated (`scripts/check-contrast.mjs` recomputes these and
fails the build if a pair drops below AA):

| pair | on `--navy-base` | on `--navy-raised` |
|---|---:|---:|
| `--steel-bright` | 11.74 | 10.71 |
| `--steel` | 6.13 | 5.59 |
| `--blue` | 6.30 | 5.75 |
| `--lime` | 10.16 | 9.27 |
| `--amber` | 8.68 | 7.92 |
| `--alert` | 5.06 | 4.61 |
| `--blue-dim` | **3.52** | **3.21** |

Every pair clears AA body text (4.5:1) **except `--blue-dim`**, which is
therefore a NON-TEXT token: pressed states, borders, and fills only. It clears
AA large/non-text (3:1). Using it for body copy is the one palette mistake
available here, so it is named rather than left to be discovered.

`--steel-line` is structure, never text.

## The T→A→C gradient is a narrative

steel → blue → lime is **raw → processed → signal**. It marks *state
progression* — preview → compare → promote — and nothing else. It is not a
background, not a button fill, not decoration. A gradient that appears where no
progression exists tells the reader something untrue about the interface.

`--gradient-tac: linear-gradient(90deg, var(--steel) 0%, var(--blue) 55%, var(--lime) 100%)`

## Typography

- **UI:** one geometric sans. `--font-ui`.
- **Numbers, ids, hashes, timestamps:** monospace. `--font-mono`.

The numbers are the content. They get the mono, they align on the decimal
(`font-variant-numeric: tabular-nums`), and they are never centred in a column
where they should be right-aligned against a decimal point.

## Density

Panels, not cards. Grids, not hero sections. It should read as a console: dark,
information-dense, scannable in one pass. Padding is tight (`--pad-tight: 8px`,
`--pad: 14px`), rules are 1px `--steel-line`, and there is no drop shadow
anywhere — shadow implies a card floating over a page, and this is one surface.

## Motion

**Motion shows data, never decoration.** A value animates because it changed. A
row highlights because it just moved. Nothing animates on a timer, nothing
animates on load, and nothing animates with invented data. `--motion-fast:
120ms` for state feedback; that is the whole vocabulary.

`prefers-reduced-motion` removes all of it.

## Constraints

- **Sport-agnostic.** No team marks, no league marks, no player likenesses,
  anywhere. The node motif is the only illustrative element.
- **The logo appears once**, in the shell header.
- Every control is keyboard-reachable and has a visible `:focus-visible` ring in
  `--blue`.
- No recommendation language. The copy guard runs on this page like every other.
