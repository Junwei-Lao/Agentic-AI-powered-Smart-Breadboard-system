# AI Assumptions

Decisions the AI assistant made where the brief was open. In each case it chose the simplest option that still meets the requirements.

## Structure & tooling
1. **File structure.** The app lives in `smartboard-ui/` and follows `file_structure.md`. Added folders: `src/lib/` (pure logic), `src/hooks/` (state), `scripts/` (headless test). The mock data is split into `projects.js` and `agentPlaybook.js`; `mockData.js` re-exports both so it remains the single entry point. Extra components (ProgressSteps, SchematicView, etc.) sit in `src/components/`.
2. **Stack.** React 18 + Vite 6 + plain JavaScript + plain CSS (one `App.css` with design tokens). No Tailwind, so there is one less build dependency. The only runtime dependency besides React is `lucide-react` for icons.
3. **Routing.** A small hash router (`#/workspace`, `#/emulator`, …) instead of react-router. It is enough for 6 pages and works when the build is opened from any static host.
4. **Pages beyond the brief.** *Session History* and *Settings* appear in the required sidebar, so each got a light page. Past sessions are sample data. Two settings (ghost hints, labels) work; the agent preferences are marked as placeholders.
5. **Theme.** Dark only (IDE-style, desktop-first). The breadboard itself stays a realistic light colour so it stands out. Brand name **"Pinpoint"**, with amber (`#f5a524`) as the brand colour and violet for everything AI.
6. **Fonts** load from Google Fonts (Inter, JetBrains Mono). Offline, the app falls back to system fonts.

## Hardware model
7. **Board.** A half-size 830-point layout with 30 columns, rows A–J and 4 power rails. Rails run the full length without gaps (as on most modern boards). The device powers the top and bottom **+ rails at 5 V** and ties both **− rails to ground**.
8. **Hole IDs.** `b10` = row B, column 10. Rails are `tp`/`tn` (top +/−) and `bp`/`bn` (bottom +/−) plus a column number.
9. **Event protocol.** The board is assumed to report `DEVICE_CONNECTED`, `DEVICE_DISCONNECTED`, `COMPONENT_INSERTED`, `COMPONENT_REMOVED`, `COMPONENT_MOVED` and `BOARD_RESET`, and to identify parts (type, value, LED polarity). Moving a wire end is a single `COMPONENT_MOVED` event, not remove + insert.
10. **Demo layout.** Resistor 220 Ω at B10→B14, LED anode C14 / cathode C15, red wire + rail 8→A10, black ground wire − rail 17→**A16 (wrong)**, corrected to **A15**.
11. **Measurements.** Readings come from a simple simulated DC model of the virtual device: a single loop of +V → resistor → LED → GND, with a 2.0 V LED drop, giving ≈13.6 mA. Small random noise makes them look live. Values show "—" when they are not available.
12. **Emulator ↔ workspace sync.** Hardware state is saved to `localStorage`, so the emulator can drive the workspace from a second browser window. It also survives a page reload. *Clear session* resets it.

## Validation & agent
13. **Validation.** Placed wires are merged into a netlist and compared with the reference circuit's required nets. The resistor is non-polar, so both orientations are accepted. Detected problems: wire end in a dead column next to the target (with a suggested free hole), LED reversed, +5 V/GND short, wrong resistor value, extra parts. Only the LED project has a reference circuit.
14. **"Incorrect" versus "not done yet".** A missing connection only counts as an error when there is evidence of a wrong attempt, such as a wire end in a dead column. Otherwise the step is just *pending*, and the agent gives next-step guidance instead of an error.
15. **The agent is mocked.** There is no LLM call. Proactive runs come from a template playbook (`data/agentPlaybook.js`), and chat answers come from keyword matching plus live board context (`lib/agentService.js`). Both use the same `{ tools, message }` shape a real LLM backend would return.
16. **Agent timing.** Every hardware event starts a run: 4 tool steps of ~0.5 s each, then a short "responding" phase. Board highlights and progress follow the agent's *published* assessment, so the error appears when the agent "finds" it, which makes demo states 6 and 7 visible. Highlights dim while it re-analyses. If a new event interrupts a run, the interrupted run's message is still posted.
17. **Read-only twin.** The breadboard has no click/drag interactions. Hover tooltips are the only interaction.
18. **Responsive.** Optimised for desktop widths of 1280–1920 px. Below 1100 px the sidebar collapses to icons and the agent panel stacks under the workspace.
