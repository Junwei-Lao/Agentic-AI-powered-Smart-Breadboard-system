# Pinpoint — Agentic AI Smart Breadboard (UI)

Companion desktop web app for a **physical smart breadboard**. The board reports component placement and wiring changes; the app shows a live, read-only **digital twin** and an **AI agent** that proactively spots wiring mistakes, explains the electrical concepts, and guides students through assembly.

> This is not a circuit simulator. Students build on a real breadboard; the software observes. Until the hardware prototype exists, a **Hardware Emulator** page plays the role of the board.

## Run the project

Requirements: **Node.js 18+** (tested with Node 26) and npm.

```bash
cd smartboard-ui
npm install
npm run dev          # opens on http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `smartboard-ui/dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run verify` | Headless check: runs the 9-step demo sequence through the validator + agent engine and asserts each state |

## Demo walkthrough (about 2 minutes)

1. Open **http://localhost:5173/#/workspace**. The board shows "No board connected".
2. Open **http://localhost:5173/#/emulator** in a **second browser window** (or use the sidebar → *Hardware Emulator*). The two windows stay in sync through `localStorage`.
3. In the emulator, click **Advance** repeatedly, or press **▶ (auto-play)** to run the whole sequence:
   1. Empty breadboard connected
   2. Resistor inserted
   3. LED inserted
   4. Power connection added
   5. Ground wire inserted into the wrong column (A16)
   6. The agent detects the mismatch on its own and runs its tools
   7. The board highlights the dead column in red and the suggested hole A15 in green
   8. Ground wire corrected
   9. The agent re-checks the circuit and confirms it matches the reference; the LED lights up and current flows
4. Ask the agent questions in the chat (for example "Why do I need a resistor?").
5. To start again, use **Reset board** or **Clear session & event history** in the emulator.

## Pages

| Route | Page |
| --- | --- |
| `#/workspace` | **Live Workspace**: sidebar, live digital twin, progress, measurements, event timeline, AI agent panel |
| `#/projects` | **Learning Lab**: project cards. Only *First LED Circuit* works; the rest are marked "Coming soon" |
| `#/device` | **My Device**: product view, device ID, firmware placeholder, configuration, sensors, connection options (labelled as a virtual device) |
| `#/emulator` | **Hardware Emulator**: developer page, clearly labelled as simulated hardware |
| `#/history`, `#/settings` | Session history and preferences (light placeholders) |

## Architecture

```
hardware events ─► useHardware (board state + simulated sensors, cross-tab sync)
                       │
                       ├─► lib/circuitValidator   → diagnostics (codes + data, no text)
                       └─► hooks/useAgent ◄────────┘  → tool runs, messages, published assessment
                                    │
                       lib/highlights → <Breadboard/> props
                                    │
                       pages & components (render props only)
```

```
smartboard-ui/
├── index.html, vite.config.js, package.json
├── scripts/verify-demo.mjs        # headless demo-sequence test
├── public/favicon.svg
└── src/
    ├── App.jsx / App.css / main.jsx   # shell, routing, data flow, design system
    ├── components/                # presentational, props-driven
    │   ├── Breadboard.jsx         # dynamic SVG digital twin (read-only)
    │   ├── AgentPanel.jsx         # agent status, proactive messages, tool runs, activity log, chat
    │   ├── Sidebar.jsx  EventLog.jsx  SensorCards.jsx  SchematicView.jsx
    │   └── ProgressSteps.jsx  ProjectIllustration.jsx  StatusPill.jsx  Logo.jsx
    ├── pages/                     # Workspace, Projects, Device, Emulator, SessionHistory, Settings
    ├── data/                      # ALL mock data (swap for real backend later)
    │   ├── mockData.js            # device, board config, demo parts/states, sessions, settings
    │   ├── projects.js            # project catalogue + reference circuits + guided steps
    │   └── agentPlaybook.js       # every sentence the agent says (templates)
    ├── lib/                       # pure logic, no React
    │   ├── boardModel.js  netlist.js  circuitValidator.js  highlights.js
    │   ├── hardwareEvents.js      # event protocol + reducer
    │   ├── virtualDevice.js       # emulator actions + simulated sensors
    │   └── agentEngine.js  agentService.js   # mock agent (swap for LLM)
    └── hooks/                     # useHardware, useAgent, useHashRoute, useNow, useLiveTelemetry
```

Design rules:
- **No validation logic in UI components.** `lib/circuitValidator.js` builds a netlist and compares it to the project's reference circuit.
- **No AI text in UI components.** All agent wording lives in `data/agentPlaybook.js` and is filled in by `lib/agentEngine.js` / `lib/agentService.js`.
- **Everything is props-driven.** Board state, hardware events, diagnostics and agent messages reach components through props, so each visual state can be set from code.

### Connecting real hardware / a real LLM later
- **Hardware:** send the same events defined in `lib/hardwareEvents.js` (`DEVICE_CONNECTED`, `COMPONENT_INSERTED`, `COMPONENT_MOVED`, …) to `useHardware().sendEvents()`, for example from WebSerial.
- **Agent:** replace `planAgentRun` (proactive) and `askAgent` (chat) with API calls that return the same `{ tools, message }` shape.

See [AI_assumptions.md](AI_assumptions.md) for the decisions made where the brief was open.

## Professional workspace

Open `#/professional` after starting the emulator. The page shows the live
reference checks, observed electrical nets and the recent session trace.
During the LED demo, the incorrect A16 connection leaves two of three
reference nets matched and adds a fault to the trace. Moving the wire to A15
restores all three matches. The report times the first circuit fault through
the first full verification in the current build. Use **Export session CSV**
to save the recorded events, validation states and issue codes for review.

The breadboard and readings remain simulated in this demo. The 400-point
layout matches the Board One industrial-design concept. If the browser has
pruned earlier events, the export retains the recent hardware events and
omits replayed validation states and the recovery time.
