/**
 * Project / curriculum mock data.
 *
 * Each project describes:
 *  - catalogue info shown on the Learning Lab cards
 *  - `reference`: the reference circuit expressed as components + required nets
 *    (consumed by src/lib/circuitValidator.js — never by UI components directly)
 *  - `steps`: guided assembly steps. `requires` lists the checks that mark the
 *    step complete; `ghost` is an optional placement hint drawn on the board.
 *
 * Net member syntax: 'VCC' | 'GND' | '<ref>.<pin>'.
 * Non-polarized two-pin parts use the abstract pins 'a' and 'b'; the validator
 * tries both orientations.
 */

export const projects = [
  {
    id: 'led-basic',
    title: 'First LED Circuit',
    status: 'available',
    difficulty: 'Beginner',
    duration: '15 min',
    illustration: 'led',
    summary:
      'Light an LED from the 5 V rail and learn why every LED needs a current-limiting resistor.',
    components: ['1 × 220 Ω resistor', '1 × red LED (5 mm)', '2 × jumper wires'],
    objectives: [
      'Read breadboard rows, columns and power rails',
      'Identify LED polarity (anode vs. cathode)',
      'Explain why a series resistor limits current',
      'Close a complete circuit from +5 V to ground',
    ],
    reference: {
      supplyVoltage: 5,
      components: [
        { ref: 'R1', type: 'resistor', value: 220, label: '220 Ω resistor', polarized: false },
        { ref: 'D1', type: 'led', color: 'red', label: 'Red LED', polarized: true, pins: ['anode', 'cathode'] },
      ],
      nets: [
        { id: 'n_supply', label: '+5 V → resistor', members: ['VCC', 'R1.a'] },
        { id: 'n_series', label: 'Resistor → LED anode', members: ['R1.b', 'D1.anode'] },
        { id: 'n_ground', label: 'LED cathode → ground', members: ['D1.cathode', 'GND'] },
      ],
    },
    steps: [
      {
        id: 'place-resistor',
        label: 'Resistor',
        title: 'Place the 220 Ω resistor',
        requires: [{ component: 'R1' }],
        ghost: { id: 'ghost-R1', type: 'resistor', value: 220, pins: { p1: 'b10', p2: 'b14' } },
        guidance:
          'Insert the 220 Ω resistor (red-red-brown bands) so its legs sit in B10 and B14. Each leg lands in a different numbered column.',
      },
      {
        id: 'place-led',
        label: 'LED',
        title: 'Insert the LED',
        requires: [{ component: 'D1' }, { net: 'n_series' }],
        ghost: { id: 'ghost-D1', type: 'led', color: 'red', pins: { anode: 'c14', cathode: 'c15' } },
        guidance:
          'Insert the LED with its longer leg (anode) in C14 — the same column as the resistor — and the shorter leg (cathode) in C15.',
      },
      {
        id: 'connect-power',
        label: 'Power',
        title: 'Connect +5 V',
        requires: [{ net: 'n_supply' }],
        ghost: { id: 'ghost-W1', type: 'wire', color: 'red', pins: { a: 'tp8', b: 'a10' } },
        guidance:
          'Run a red jumper from the top + rail into A10 so the free end of the resistor receives +5 V.',
      },
      {
        id: 'connect-ground',
        label: 'Ground',
        title: 'Connect ground',
        requires: [{ net: 'n_ground' }],
        ghost: { id: 'ghost-W2', type: 'wire', color: 'black', pins: { a: 'tn17', b: 'a15' } },
        guidance:
          'Run a black jumper from the top − rail into column 15 (A15) so the LED cathode returns to ground.',
      },
      {
        id: 'verify',
        label: 'Verify',
        title: 'Verify the circuit',
        requires: [{ allNets: true }],
        guidance: 'All connections are in place. I will verify the circuit against the reference.',
      },
    ],
  },
  {
    id: 'push-button',
    title: 'Push Button Circuit',
    status: 'coming-soon',
    difficulty: 'Beginner',
    duration: '20 min',
    illustration: 'button',
    summary: 'Control an LED with a momentary switch and see how an open switch breaks the loop.',
    components: ['1 × tactile push button', '1 × 220 Ω resistor', '1 × LED', '3 × jumper wires'],
    objectives: ['Understand open vs. closed circuits', 'Orient a 4-leg tactile switch', 'Trace current through a switch'],
  },
  {
    id: 'voltage-divider',
    title: 'Voltage Divider',
    status: 'coming-soon',
    difficulty: 'Intermediate',
    duration: '25 min',
    illustration: 'divider',
    summary: 'Split 5 V into a predictable output voltage using two resistors and measure it live.',
    components: ['2 × 10 kΩ resistors', '1 × 4.7 kΩ resistor', '3 × jumper wires'],
    objectives: ['Apply the divider equation', 'Predict and measure node voltages', 'See how load changes output'],
  },
  {
    id: 'logic-gates',
    title: 'Logic Gates',
    status: 'coming-soon',
    difficulty: 'Intermediate',
    duration: '40 min',
    illustration: 'logic',
    summary: 'Wire a 74HC08 AND gate with two switches and an LED to build a truth table by hand.',
    components: ['1 × 74HC08 IC', '2 × push buttons', '2 × 10 kΩ resistors', '1 × LED', '8 × jumper wires'],
    objectives: ['Read an IC pinout', 'Use pull-down resistors', 'Verify a truth table physically'],
  },
  {
    id: 'series-parallel',
    title: 'Series and Parallel Circuits',
    status: 'coming-soon',
    difficulty: 'Beginner',
    duration: '30 min',
    illustration: 'series',
    summary: 'Compare LED brightness and current in series vs. parallel arrangements.',
    components: ['3 × 220 Ω resistors', '3 × LEDs', '6 × jumper wires'],
    objectives: ['Distinguish series and parallel', 'Predict current sharing', 'Measure branch currents'],
  },
];

export const DEFAULT_PROJECT_ID = 'led-basic';
