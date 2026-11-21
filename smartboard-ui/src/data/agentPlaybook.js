/**
 * Mock agent "playbook".
 *
 * All natural-language text the AI agent produces lives here as templates.
 * src/lib/agentEngine.js and src/lib/agentService.js fill the {placeholders}
 * from diagnostics and board context. UI components only render the
 * resulting message objects. Swap this file (or agentService) for a real
 * LLM backend later.
 */

export const agentPlaybook = {
  persona: {
    name: 'Pinpoint Copilot',
    tagline: 'Watching your physical board',
  },

  tools: {
    read_board_state: { label: 'Read board state' },
    validate_connections: { label: 'Validate electrical connections' },
    compare_reference: { label: 'Compare reference circuit' },
    generate_guidance: { label: 'Generate corrective guidance', altLabel: 'Generate next-step guidance' },
    retrieve_concepts: { label: 'Retrieve concept notes' },
    compose_answer: { label: 'Compose answer' },
  },

  /* Observation sentences describing the hardware event that triggered a run. */
  observations: {
    session: 'Session resumed. I re-read the board: {componentSummary}.',
    DEVICE_CONNECTED: '{deviceName} connected. I read the board: {componentSummary}.',
    DEVICE_DISCONNECTED: 'The device disconnected. I will pause monitoring until it is back.',
    BOARD_RESET: 'The board was cleared. Starting fresh — {componentSummary}.',
    COMPONENT_INSERTED: {
      resistor: 'I detected a {value} resistor inserted at {pinList}.',
      led: 'I detected an LED: anode in {anode}, cathode in {cathode}.',
      wire: 'I detected a new {color} jumper wire from {from} to {to}.',
      default: 'I detected a new component at {pinList}.',
    },
    COMPONENT_REMOVED: 'The {componentName} was removed from the board.',
    COMPONENT_MOVED: 'The {componentName} was moved: {fromPin} → {toPin}.',
  },

  /* Issue explanations, keyed by diagnostic issue code. */
  issues: {
    MISPLACED_WIRE_END: {
      title: 'Wire lands in the wrong column',
      explanation:
        'Your {wireColor} wire reaches the {anchorLabel}, but its other end sits in {wrongHole} — column {wrongCol} has nothing else connected. The {targetLabel} is in column {targetCol}, so it is still not connected to {anchorShort}. The circuit is open and no current can flow.',
      action: 'Move the wire end from {wrongHole} to {suggestedHole}. Any free hole in column {targetCol}, rows {terminalRows}, also works.',
      concept: {
        title: 'Why one column makes the difference',
        body: 'Inside the breadboard, each numbered column of five holes (A–E) is a single metal strip. Parts only connect when their legs share a strip — one column over is a completely separate node.',
      },
    },
    LED_REVERSED: {
      title: 'LED is inserted backwards',
      explanation:
        'The LED anode is in {anode} and the cathode is in {cathode}, which is reversed relative to the reference. An LED is a diode — it only conducts from anode (+) to cathode (−), so it will stay dark.',
      action: 'Pull the LED and rotate it 180°: the longer leg (anode) goes to {cathode}, the shorter leg with the flat rim (cathode) goes to {anode}.',
      concept: {
        title: 'Finding LED polarity',
        body: 'The anode is the longer leg. The cathode has the shorter leg and a flat edge on the LED rim.',
      },
    },
    SHORT_CIRCUIT: {
      title: 'Short circuit between +5 V and ground',
      explanation:
        'The + rail and the − rail are connected directly with nothing to limit current. The simulation shows the supply disabled.',
      action: 'Remove the jumper that bridges the rails, then re-check each wire end before reconnecting.',
      concept: {
        title: 'What is a short circuit?',
        body: 'A short is a near-zero-resistance path from supply to ground. Ohm’s law (I = V / R) means current spikes when R is almost zero.',
      },
    },
    WRONG_RESISTOR_VALUE: {
      title: 'Unexpected resistor value',
      explanation: 'The resistor reads about {actual}, but this project uses {expected}. The LED may be too dim or draw too much current.',
      action: 'Swap it for a {expected} resistor (bands: red-red-brown).',
    },
    UNEXPECTED_COMPONENT: {
      title: 'Extra component detected',
      explanation: 'There is a {componentName} at {pinList} that is not part of the reference circuit.',
      action: 'Remove it unless you are experimenting on purpose — it may change how the circuit behaves.',
    },
  },

  resolved: 'Fixed: “{issueTitle}” is resolved.',

  success: {
    title: 'Circuit verified',
    body: 'All {matched} required connections match the reference circuit. Current flows +5 V → 220 Ω → LED → GND{measurementText}.',
    measurementText: ', and the simulator estimates {current} mA through the loop — well within the LED’s 20 mA rating',
    concept: {
      title: 'Check it with Ohm’s law',
      body: 'I = (5 V − 2.0 V LED drop) / 220 Ω ≈ 13.6 mA. The resistor drops the extra 3 V so the LED is not over-driven.',
    },
  },

  nextStepPrefix: 'Next step — {stepTitle}.',
  emptyBoard: 'the board is empty',
  disconnectedHint: 'Connect a device (or start the virtual device in the Hardware Emulator) and I will begin monitoring.',

  /* Suggested questions shown under the chat input. */
  suggestions: [
    'What should I do next?',
    'Why do I need a resistor?',
    'How do I find the LED cathode?',
    'What does ground mean?',
  ],

  /* Lightweight knowledge base for the mock chat service. */
  knowledge: [
    {
      id: 'resistor',
      keywords: ['resistor', 'why resistor', 'current limit', '220', 'ohm'],
      answer:
        'An LED has almost no resistance once it turns on, so without a resistor the current would rise until the LED burns out. The 220 Ω resistor limits current to about (5 V − 2 V) / 220 Ω ≈ 13.6 mA.',
    },
    {
      id: 'cathode',
      keywords: ['cathode', 'anode', 'polarity', 'leg', 'backwards', 'direction'],
      answer:
        'The anode (+) is the longer leg. The cathode (−) is the shorter leg, next to the flat edge on the LED rim. Current flows anode → cathode, so the cathode should face ground.',
    },
    {
      id: 'ground',
      keywords: ['ground', 'gnd', 'negative', 'rail', '−', 'minus'],
      answer:
        'Ground is the 0 V reference — the return path back to the supply. On this board the blue − rails are ground. Every circuit needs a closed loop from +5 V back to ground for current to flow.',
    },
    {
      id: 'breadboard',
      keywords: ['column', 'row', 'strip', 'connected', 'breadboard', 'holes'],
      answer:
        'Each numbered column of five holes (A–E, and separately F–J) is one connected metal strip. The long rails along the top and bottom run horizontally and carry power (+) and ground (−).',
    },
    {
      id: 'measure',
      keywords: ['current', 'voltage', 'measure', 'reading', 'ma', 'volts'],
      answer: 'The board measures the supply rail and loop current live. {measurementSummary}',
    },
  ],

  contextual: {
    next: '{nextStepText}',
    issue: 'Right now the main problem is: {issueTitle}. {issueAction}',
    complete: 'Your circuit already matches the reference — nice work. Try removing the resistor in your head: what would happen to the current?',
  },

  fallback:
    'I can help with the circuit on your board — try asking about the next step, the resistor, LED polarity, or ground. I am also watching the board and will speak up when something changes.',
};
