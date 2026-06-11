import type { ComponentType } from '@/types';

// ── Blueprint types ───────────────────────────────────────────
export interface ComponentBlueprint {
  type: ComponentType;
  label?: string;
  properties?: Record<string, unknown>;
  // Relative grid position (will be auto-placed if omitted)
  gx?: number; // grid x (col, 0-based)
  gy?: number; // grid y (row, 0-based)
}

export interface WireBlueprint {
  from: { comp: number; pin: string }; // comp = componentBlueprints index
  to:   { comp: number; pin: string };
}

export interface CircuitBlueprint {
  title: string;
  description: string;
  components: ComponentBlueprint[];
  wires: WireBlueprint[];
  notes?: string[];
}

// ── Built-in templates ────────────────────────────────────────
export const CIRCUIT_TEMPLATES: Record<string, CircuitBlueprint> = {

  // ── Basic LED ──────────────────────────────────────────────
  led_5v: {
    title: 'LED with Current-Limiting Resistor (5V)',
    description: 'Classic single LED circuit with a 220Ω resistor from a 5V supply.',
    components: [
      { type: 'dc_source', label: 'V1', properties: { voltage: 5 },            gx: 0, gy: 1 },
      { type: 'resistor',  label: 'R1', properties: { resistance: 220 },        gx: 2, gy: 0 },
      { type: 'led',       label: 'LED1', properties: { color: '#ff4400', forwardVoltage: 2.0 }, gx: 4, gy: 0 },
      { type: 'ground',    label: 'GND',                                         gx: 4, gy: 2 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' }, to: { comp: 1, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },  to: { comp: 2, pin: 'anode' } },
      { from: { comp: 2, pin: 'cathode' }, to: { comp: 3, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' },   to: { comp: 3, pin: 'gnd' } },
    ],
    notes: ['Resistor limits current to ~13mA', 'LED forward voltage ≈ 2V', 'Power: 0.17W total'],
  },

  // ── Voltage Divider ────────────────────────────────────────
  voltage_divider: {
    title: 'Voltage Divider',
    description: 'Two-resistor voltage divider producing Vout = Vin × R2 / (R1+R2).',
    components: [
      { type: 'dc_source', label: 'V1', properties: { voltage: 12 },            gx: 0, gy: 1 },
      { type: 'resistor',  label: 'R1', properties: { resistance: 10000 },       gx: 2, gy: 0 },
      { type: 'resistor',  label: 'R2', properties: { resistance: 10000 },       gx: 2, gy: 2 },
      { type: 'voltmeter', label: 'VM1',                                          gx: 4, gy: 1 },
      { type: 'ground',    label: 'GND',                                          gx: 2, gy: 4 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },  to: { comp: 1, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },    to: { comp: 2, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },    to: { comp: 3, pin: 'plus' } },
      { from: { comp: 2, pin: 'p2' },    to: { comp: 3, pin: 'minus' } },
      { from: { comp: 2, pin: 'p2' },    to: { comp: 4, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' }, to: { comp: 4, pin: 'gnd' } },
    ],
    notes: ['Vout = 12 × 10k/(10k+10k) = 6V', 'Adjust R1/R2 ratio to change output'],
  },

  // ── BJT Switch ─────────────────────────────────────────────
  bjt_switch: {
    title: 'NPN BJT Transistor Switch',
    description: 'Transistor switch: base resistor from control signal, load on collector.',
    components: [
      { type: 'dc_source', label: 'V1',  properties: { voltage: 12 },           gx: 0, gy: 2 },
      { type: 'dc_source', label: 'VB',  properties: { voltage: 5 },            gx: 0, gy: 0 },
      { type: 'resistor',  label: 'RB',  properties: { resistance: 10000 },     gx: 2, gy: 0 },
      { type: 'resistor',  label: 'RC',  properties: { resistance: 1000 },      gx: 2, gy: 1 },
      { type: 'bjt_npn',   label: 'Q1',                                         gx: 4, gy: 1 },
      { type: 'ground',    label: 'GND',                                         gx: 4, gy: 4 },
    ],
    wires: [
      { from: { comp: 1, pin: 'plus' },  to: { comp: 2, pin: 'p1' } },
      { from: { comp: 2, pin: 'p2' },    to: { comp: 4, pin: 'base' } },
      { from: { comp: 0, pin: 'plus' },  to: { comp: 3, pin: 'p1' } },
      { from: { comp: 3, pin: 'p2' },    to: { comp: 4, pin: 'collector' } },
      { from: { comp: 4, pin: 'emitter' }, to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' }, to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 1, pin: 'minus' }, to: { comp: 5, pin: 'gnd' } },
    ],
    notes: ['RB = 10kΩ limits base current', 'VBE ≈ 0.7V, transistor saturates when VB > 0.7V'],
  },

  // ── 555 Astable Blinker ────────────────────────────────────
  timer_555_astable: {
    title: '555 Timer — Astable Oscillator (LED Blinker)',
    description: 'Classic 555 astable circuit. Frequency ≈ 1.44 / ((R1+2×R2) × C).',
    components: [
      { type: 'dc_source',  label: 'V1',  properties: { voltage: 9 },           gx: 0, gy: 2 },
      { type: 'resistor',   label: 'RA',  properties: { resistance: 10000 },    gx: 2, gy: 0 },
      { type: 'resistor',   label: 'RB',  properties: { resistance: 47000 },    gx: 2, gy: 1 },
      { type: 'capacitor',  label: 'C1',  properties: { capacitance: 0.000010 }, gx: 2, gy: 2 },
      { type: 'capacitor',  label: 'C2',  properties: { capacitance: 0.000000010 }, gx: 4, gy: 0 },
      { type: 'timer_555',  label: 'IC1',                                        gx: 4, gy: 2 },
      { type: 'resistor',   label: 'RL',  properties: { resistance: 470 },      gx: 6, gy: 0 },
      { type: 'led',        label: 'LED1', properties: { color: '#00aaff', forwardVoltage: 2.0 }, gx: 6, gy: 1 },
      { type: 'ground',     label: 'GND',                                        gx: 4, gy: 5 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },  to: { comp: 1, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },    to: { comp: 2, pin: 'p1' } },
      { from: { comp: 2, pin: 'p2' },    to: { comp: 5, pin: 'trig' } },
      { from: { comp: 2, pin: 'p2' },    to: { comp: 3, pin: 'plus' } },
      { from: { comp: 3, pin: 'minus' }, to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 0, pin: 'plus' },  to: { comp: 5, pin: 'vcc' } },
      { from: { comp: 0, pin: 'plus' },  to: { comp: 4, pin: 'plus' } },
      { from: { comp: 4, pin: 'minus' }, to: { comp: 5, pin: 'cv' } },
      { from: { comp: 5, pin: 'gnd' },   to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 5, pin: 'out' },   to: { comp: 6, pin: 'p1' } },
      { from: { comp: 6, pin: 'p2' },    to: { comp: 7, pin: 'anode' } },
      { from: { comp: 7, pin: 'cathode' }, to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' }, to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 5, pin: 'rst' },   to: { comp: 0, pin: 'plus' } },
    ],
    notes: [
      'Frequency ≈ 1.44 / ((RA + 2×RB) × C1)',
      'With RA=10k, RB=47k, C1=10μF: f ≈ 1.4Hz (slow blink)',
      'Change RB or C1 to adjust frequency',
    ],
  },

  // ── Voltage Regulator ─────────────────────────────────────
  voltage_regulator_5v: {
    title: 'LM7805 Voltage Regulator (5V Output)',
    description: '7805 linear regulator providing stable 5V from 7–35V input.',
    components: [
      { type: 'dc_source',        label: 'V1',  properties: { voltage: 12 },   gx: 0, gy: 1 },
      { type: 'capacitor',        label: 'C1',  properties: { capacitance: 0.0000001, voltageRating: 50 }, gx: 2, gy: 0 },
      { type: 'voltage_regulator', label: 'U1', properties: { voltage: 5 },   gx: 2, gy: 1 },
      { type: 'capacitor',        label: 'C2',  properties: { capacitance: 0.0000001, voltageRating: 25 }, gx: 4, gy: 0 },
      { type: 'resistor',         label: 'RL',  properties: { resistance: 1000 }, gx: 4, gy: 1 },
      { type: 'voltmeter',        label: 'VM1',                                 gx: 5, gy: 1 },
      { type: 'ground',           label: 'GND',                                 gx: 3, gy: 3 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },  to: { comp: 1, pin: 'plus' } },
      { from: { comp: 0, pin: 'plus' },  to: { comp: 2, pin: 'in' } },
      { from: { comp: 1, pin: 'minus' }, to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 2, pin: 'gnd' },   to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 2, pin: 'out' },   to: { comp: 3, pin: 'plus' } },
      { from: { comp: 2, pin: 'out' },   to: { comp: 4, pin: 'p1' } },
      { from: { comp: 2, pin: 'out' },   to: { comp: 5, pin: 'plus' } },
      { from: { comp: 3, pin: 'minus' }, to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 4, pin: 'p2' },    to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 5, pin: 'minus' }, to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' }, to: { comp: 6, pin: 'gnd' } },
    ],
    notes: ['Input capacitor stabilizes supply', 'Output capacitor reduces ripple', 'Max current: 1A continuous'],
  },

  // ── RC Low-Pass Filter ─────────────────────────────────────
  rc_filter: {
    title: 'RC Low-Pass Filter',
    description: 'Simple RC filter. Cutoff frequency fc = 1 / (2π×R×C).',
    components: [
      { type: 'ac_source', label: 'V1', properties: { voltage: 5, frequency: 1000 }, gx: 0, gy: 1 },
      { type: 'resistor',  label: 'R1', properties: { resistance: 1000 },            gx: 2, gy: 0 },
      { type: 'capacitor', label: 'C1', properties: { capacitance: 0.00000016 },      gx: 4, gy: 1 },
      { type: 'voltmeter', label: 'VM1',                                               gx: 5, gy: 1 },
      { type: 'ground',    label: 'GND',                                               gx: 3, gy: 3 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },  to: { comp: 1, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },    to: { comp: 2, pin: 'plus' } },
      { from: { comp: 1, pin: 'p2' },    to: { comp: 3, pin: 'plus' } },
      { from: { comp: 2, pin: 'minus' }, to: { comp: 4, pin: 'gnd' } },
      { from: { comp: 3, pin: 'minus' }, to: { comp: 4, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' }, to: { comp: 4, pin: 'gnd' } },
    ],
    notes: ['fc = 1 / (2π × 1kΩ × 160nF) ≈ 1kHz', 'Signals above fc are attenuated'],
  },

  // ── LED RGB ────────────────────────────────────────────────
  rgb_led: {
    title: 'RGB LED Circuit',
    description: 'Common-cathode RGB LED with individual current-limiting resistors.',
    components: [
      { type: 'vcc',      label: 'VCC', properties: { voltage: 5 },             gx: 2, gy: 0 },
      { type: 'resistor', label: 'RR',  properties: { resistance: 150 },         gx: 0, gy: 1 },
      { type: 'resistor', label: 'RG',  properties: { resistance: 100 },         gx: 2, gy: 1 },
      { type: 'resistor', label: 'RB',  properties: { resistance: 100 },         gx: 4, gy: 1 },
      { type: 'led',      label: 'R',   properties: { color: '#ff0000', forwardVoltage: 2.0 }, gx: 0, gy: 2 },
      { type: 'led',      label: 'G',   properties: { color: '#00ff00', forwardVoltage: 3.2 }, gx: 2, gy: 2 },
      { type: 'led',      label: 'B',   properties: { color: '#0000ff', forwardVoltage: 3.5 }, gx: 4, gy: 2 },
      { type: 'ground',   label: 'GND',                                           gx: 2, gy: 4 },
    ],
    wires: [
      { from: { comp: 0, pin: 'vcc' }, to: { comp: 1, pin: 'p1' } },
      { from: { comp: 0, pin: 'vcc' }, to: { comp: 2, pin: 'p1' } },
      { from: { comp: 0, pin: 'vcc' }, to: { comp: 3, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },  to: { comp: 4, pin: 'anode' } },
      { from: { comp: 2, pin: 'p2' },  to: { comp: 5, pin: 'anode' } },
      { from: { comp: 3, pin: 'p2' },  to: { comp: 6, pin: 'anode' } },
      { from: { comp: 4, pin: 'cathode' }, to: { comp: 7, pin: 'gnd' } },
      { from: { comp: 5, pin: 'cathode' }, to: { comp: 7, pin: 'gnd' } },
      { from: { comp: 6, pin: 'cathode' }, to: { comp: 7, pin: 'gnd' } },
    ],
    notes: ['RR=150Ω for red (Vf=2V), RG=RB=100Ω for green/blue (Vf≈3.3V)'],
  },

  // ── MOSFET Switch ──────────────────────────────────────────
  mosfet_switch: {
    title: 'N-Channel MOSFET Switch',
    description: 'MOSFET low-side switch for controlling a DC load.',
    components: [
      { type: 'dc_source', label: 'VLoad', properties: { voltage: 12 },         gx: 0, gy: 1 },
      { type: 'dc_source', label: 'VGate', properties: { voltage: 5 },          gx: 0, gy: 3 },
      { type: 'resistor',  label: 'RLoad', properties: { resistance: 100 },     gx: 2, gy: 0 },
      { type: 'resistor',  label: 'RG',    properties: { resistance: 10000 },   gx: 2, gy: 3 },
      { type: 'mosfet_n',  label: 'M1',                                          gx: 4, gy: 1 },
      { type: 'ground',    label: 'GND',                                          gx: 3, gy: 5 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },  to: { comp: 2, pin: 'p1' } },
      { from: { comp: 2, pin: 'p2' },    to: { comp: 4, pin: 'drain' } },
      { from: { comp: 1, pin: 'plus' },  to: { comp: 3, pin: 'p1' } },
      { from: { comp: 3, pin: 'p2' },    to: { comp: 4, pin: 'gate' } },
      { from: { comp: 4, pin: 'source' }, to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' }, to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 1, pin: 'minus' }, to: { comp: 5, pin: 'gnd' } },
    ],
    notes: ['Gate voltage must exceed Vth (typically 2–4V) to turn ON', 'RG protects gate from ringing'],
  },

  // ── H-Bridge (motor control) ────────────────────────────────
  h_bridge: {
    title: 'H-Bridge Motor Driver',
    description: 'Simple MOSFET H-bridge for DC motor forward/reverse control.',
    components: [
      { type: 'dc_source', label: 'V1',  properties: { voltage: 12 },           gx: 1, gy: 0 },
      { type: 'mosfet_n',  label: 'Q1',                                          gx: 0, gy: 1 },
      { type: 'mosfet_n',  label: 'Q2',                                          gx: 2, gy: 1 },
      { type: 'mosfet_n',  label: 'Q3',                                          gx: 0, gy: 3 },
      { type: 'mosfet_n',  label: 'Q4',                                          gx: 2, gy: 3 },
      { type: 'motor_dc',  label: 'M1',  properties: { voltage: 12 },            gx: 1, gy: 2 },
      { type: 'ground',    label: 'GND',                                          gx: 1, gy: 5 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' }, to: { comp: 1, pin: 'drain' } },
      { from: { comp: 0, pin: 'plus' }, to: { comp: 2, pin: 'drain' } },
      { from: { comp: 1, pin: 'source' }, to: { comp: 5, pin: 'plus' } },
      { from: { comp: 2, pin: 'source' }, to: { comp: 5, pin: 'minus' } },
      { from: { comp: 5, pin: 'plus' },   to: { comp: 3, pin: 'drain' } },
      { from: { comp: 5, pin: 'minus' },  to: { comp: 4, pin: 'drain' } },
      { from: { comp: 3, pin: 'source' }, to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 4, pin: 'source' }, to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' },  to: { comp: 6, pin: 'gnd' } },
    ],
    notes: ['Q1+Q4 ON → motor forward', 'Q2+Q3 ON → motor reverse', 'Never turn on Q1+Q3 or Q2+Q4 simultaneously!'],
  },

  // ── Op-Amp Inverting Amplifier ──────────────────────────────
  opamp_inverting: {
    title: 'Op-Amp Inverting Amplifier',
    description: 'Inverting amplifier. Gain = –Rf/Rin.',
    components: [
      { type: 'ac_source', label: 'Vin',  properties: { voltage: 1, frequency: 1000 }, gx: 0, gy: 1 },
      { type: 'resistor',  label: 'Rin',  properties: { resistance: 10000 },            gx: 2, gy: 0 },
      { type: 'resistor',  label: 'Rf',   properties: { resistance: 100000 },           gx: 4, gy: 0 },
      { type: 'opamp',     label: 'U1',                                                  gx: 4, gy: 1 },
      { type: 'dc_source', label: 'VP',   properties: { voltage: 15 },                 gx: 6, gy: 0 },
      { type: 'dc_source', label: 'VN',   properties: { voltage: 15 },                 gx: 6, gy: 2 },
      { type: 'voltmeter', label: 'Vout',                                                gx: 7, gy: 1 },
      { type: 'ground',    label: 'GND',                                                 gx: 3, gy: 4 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },  to: { comp: 1, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },    to: { comp: 3, pin: 'inv' } },
      { from: { comp: 2, pin: 'p1' },    to: { comp: 3, pin: 'inv' } },
      { from: { comp: 2, pin: 'p2' },    to: { comp: 3, pin: 'out' } },
      { from: { comp: 3, pin: 'noninv' }, to: { comp: 7, pin: 'gnd' } },
      { from: { comp: 4, pin: 'plus' },  to: { comp: 3, pin: 'vp' } },
      { from: { comp: 5, pin: 'plus' },  to: { comp: 3, pin: 'vn' } },
      { from: { comp: 3, pin: 'out' },   to: { comp: 6, pin: 'plus' } },
      { from: { comp: 6, pin: 'minus' }, to: { comp: 7, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' }, to: { comp: 7, pin: 'gnd' } },
      { from: { comp: 4, pin: 'minus' }, to: { comp: 7, pin: 'gnd' } },
      { from: { comp: 5, pin: 'minus' }, to: { comp: 7, pin: 'gnd' } },
    ],
    notes: ['Gain = -Rf/Rin = -100k/10k = -10', 'Output is inverted', '±15V supply rails required'],
  },

  // ── Bridge Rectifier (4 discrete diodes) ──────────────────
  bridge_rectifier_diodes: {
    title: 'Full-Wave Bridge Rectifier (Discrete Diodes)',
    description: 'AC to DC conversion using 4 diodes. Vout(avg) ≈ 0.636 × Vpeak − 1.4V for diode drops.',
    components: [
      { type: 'ac_source',  label: 'VAC',  properties: { voltage: 12, frequency: 50 }, gx: 0, gy: 2 },
      // Top two diodes
      { type: 'diode', label: 'D1', properties: { forwardVoltage: 0.7, currentRating: 1 }, gx: 2, gy: 0 },
      { type: 'diode', label: 'D2', properties: { forwardVoltage: 0.7, currentRating: 1 }, gx: 4, gy: 0 },
      // Bottom two diodes
      { type: 'diode', label: 'D3', properties: { forwardVoltage: 0.7, currentRating: 1 }, gx: 2, gy: 4 },
      { type: 'diode', label: 'D4', properties: { forwardVoltage: 0.7, currentRating: 1 }, gx: 4, gy: 4 },
      // Filter capacitor
      { type: 'capacitor', label: 'C1', properties: { capacitance: 0.001, voltageRating: 50 }, gx: 6, gy: 1 },
      // Load
      { type: 'resistor', label: 'RL', properties: { resistance: 1000 }, gx: 6, gy: 2 },
      // Voltmeter
      { type: 'voltmeter', label: 'VM1', gx: 7, gy: 2 },
      { type: 'ground', label: 'GND', gx: 6, gy: 5 },
    ],
    wires: [
      // AC source to bridge inputs (midpoints of top and bottom pairs)
      { from: { comp: 0, pin: 'plus' },    to: { comp: 1, pin: 'anode' } },
      { from: { comp: 0, pin: 'plus' },    to: { comp: 3, pin: 'cathode' } },
      { from: { comp: 0, pin: 'minus' },   to: { comp: 2, pin: 'anode' } },
      { from: { comp: 0, pin: 'minus' },   to: { comp: 4, pin: 'cathode' } },
      // DC+ output: D1 and D2 cathodes
      { from: { comp: 1, pin: 'cathode' }, to: { comp: 5, pin: 'plus' } },
      { from: { comp: 2, pin: 'cathode' }, to: { comp: 5, pin: 'plus' } },
      { from: { comp: 5, pin: 'plus' },    to: { comp: 6, pin: 'p1' } },
      { from: { comp: 5, pin: 'plus' },    to: { comp: 7, pin: 'plus' } },
      // DC− output: D3 and D4 anodes
      { from: { comp: 3, pin: 'anode' },   to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 4, pin: 'anode' },   to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 6, pin: 'p2' },      to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 5, pin: 'minus' },   to: { comp: 8, pin: 'gnd' } },
      { from: { comp: 7, pin: 'minus' },   to: { comp: 8, pin: 'gnd' } },
    ],
    notes: [
      'Vout(avg) = 0.636 × Vpeak − 2×Vf ≈ 0.636 × 17V − 1.4V ≈ 9.4V DC',
      'C1=1000μF smoothing capacitor reduces ripple',
      'Each diode: 1N4007 (1A/1000V) recommended',
      'Peak reverse voltage on each diode = Vpeak ≈ 17V',
    ],
  },

  // ── Bridge Rectifier (compact IC symbol) ──────────────────
  bridge_rectifier_ic: {
    title: 'Bridge Rectifier Module (Integrated)',
    description: 'AC to DC rectification using a bridge rectifier module (e.g. W04G, DB107) with filter and load.',
    components: [
      { type: 'ac_source',       label: 'VAC', properties: { voltage: 12, frequency: 50 }, gx: 0, gy: 2 },
      { type: 'bridge_rectifier', label: 'BR1', properties: { voltageRating: 200, currentRating: 1 }, gx: 2, gy: 2 },
      { type: 'capacitor',       label: 'C1',  properties: { capacitance: 0.001, voltageRating: 50 }, gx: 4, gy: 1 },
      { type: 'capacitor',       label: 'C2',  properties: { capacitance: 0.0000001, voltageRating: 50 }, gx: 4, gy: 2 },
      { type: 'resistor',        label: 'RL',  properties: { resistance: 1000 }, gx: 5, gy: 2 },
      { type: 'voltmeter',       label: 'VM1', gx: 6, gy: 2 },
      { type: 'ground',          label: 'GND', gx: 5, gy: 4 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },    to: { comp: 1, pin: 'ac1' } },
      { from: { comp: 0, pin: 'minus' },   to: { comp: 1, pin: 'ac2' } },
      { from: { comp: 1, pin: 'dc_pos' },  to: { comp: 2, pin: 'plus' } },
      { from: { comp: 1, pin: 'dc_pos' },  to: { comp: 3, pin: 'plus' } },
      { from: { comp: 1, pin: 'dc_pos' },  to: { comp: 4, pin: 'p1' } },
      { from: { comp: 1, pin: 'dc_pos' },  to: { comp: 5, pin: 'plus' } },
      { from: { comp: 2, pin: 'minus' },   to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 3, pin: 'minus' },   to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 4, pin: 'p2' },      to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 5, pin: 'minus' },   to: { comp: 6, pin: 'gnd' } },
      { from: { comp: 1, pin: 'dc_neg' },  to: { comp: 6, pin: 'gnd' } },
    ],
    notes: [
      'AC input → bridge rectifier → filtered DC output',
      'C1=1000μF bulk capacitor reduces low-frequency ripple',
      'C2=100nF ceramic bypass for high-frequency noise',
      'Vout(DC) ≈ Vpeak − 1.4V (two diode drops)',
    ],
  },

  // ── Half-Wave Rectifier ─────────────────────────────────────
  half_wave_rectifier: {
    title: 'Half-Wave Rectifier',
    description: 'Simplest AC to DC circuit using a single diode. Only conducts on positive half-cycles.',
    components: [
      { type: 'ac_source', label: 'VAC', properties: { voltage: 12, frequency: 50 }, gx: 0, gy: 1 },
      { type: 'diode',     label: 'D1',  properties: { forwardVoltage: 0.7, currentRating: 1 }, gx: 2, gy: 0 },
      { type: 'capacitor', label: 'C1',  properties: { capacitance: 0.001, voltageRating: 50 }, gx: 4, gy: 0 },
      { type: 'resistor',  label: 'RL',  properties: { resistance: 1000 }, gx: 4, gy: 1 },
      { type: 'voltmeter', label: 'VM1', gx: 5, gy: 1 },
      { type: 'ground',    label: 'GND', gx: 4, gy: 3 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },   to: { comp: 1, pin: 'anode' } },
      { from: { comp: 1, pin: 'cathode' }, to: { comp: 2, pin: 'plus' } },
      { from: { comp: 1, pin: 'cathode' }, to: { comp: 3, pin: 'p1' } },
      { from: { comp: 1, pin: 'cathode' }, to: { comp: 4, pin: 'plus' } },
      { from: { comp: 2, pin: 'minus' },  to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 3, pin: 'p2' },     to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 4, pin: 'minus' },  to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' },  to: { comp: 5, pin: 'gnd' } },
    ],
    notes: [
      'Output = only positive half-cycles',
      'Vout(avg) ≈ 0.318 × Vpeak − Vf ≈ 3.1V from 12V AC',
      'Higher ripple than full-wave — use larger C for smoother output',
    ],
  },

  // ── Zener Voltage Regulator ─────────────────────────────────
  zener_regulator: {
    title: 'Zener Diode Voltage Regulator',
    description: 'Simple shunt regulator using a Zener diode. Vout = Vz.',
    components: [
      { type: 'dc_source', label: 'Vin', properties: { voltage: 12 },                gx: 0, gy: 1 },
      { type: 'resistor',  label: 'R1',  properties: { resistance: 470, powerRating: 0.5 }, gx: 2, gy: 0 },
      { type: 'zener',     label: 'DZ1', properties: { forwardVoltage: 5.1, currentRating: 0.05 }, gx: 4, gy: 1 },
      { type: 'resistor',  label: 'RL',  properties: { resistance: 1000 }, gx: 5, gy: 1 },
      { type: 'voltmeter', label: 'VM1', gx: 6, gy: 1 },
      { type: 'ground',    label: 'GND', gx: 4, gy: 3 },
    ],
    wires: [
      { from: { comp: 0, pin: 'plus' },    to: { comp: 1, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },      to: { comp: 2, pin: 'cathode' } },
      { from: { comp: 1, pin: 'p2' },      to: { comp: 3, pin: 'p1' } },
      { from: { comp: 1, pin: 'p2' },      to: { comp: 4, pin: 'plus' } },
      { from: { comp: 2, pin: 'anode' },   to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 3, pin: 'p2' },      to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 4, pin: 'minus' },   to: { comp: 5, pin: 'gnd' } },
      { from: { comp: 0, pin: 'minus' },   to: { comp: 5, pin: 'gnd' } },
    ],
    notes: [
      'Vout = Vz = 5.1V (zener breakdown voltage)',
      'R1 series resistor limits current: Iz = (Vin−Vz)/R1 = (12−5.1)/470 ≈ 15mA',
      'Max Zener power: Pz = Vz × Iz = 5.1 × 0.015 ≈ 75mW (within 250mW limit)',
      'Less efficient than LDO but much simpler',
    ],
  },
};

// ── Keyword → template mapping ────────────────────────────────
type TemplateKey = keyof typeof CIRCUIT_TEMPLATES;

export const KEYWORD_MAP: Array<{ patterns: string[]; template: TemplateKey }> = [
  {
    patterns: ['led', 'light emitting', 'blink led', 'led resistor', 'led 5v', 'simple led', 'led circuit', 'led lamp'],
    template: 'led_5v',
  },
  {
    patterns: ['voltage divider', 'resistor divider', 'voltage division', 'half voltage', 'vdiv'],
    template: 'voltage_divider',
  },
  {
    patterns: ['bjt switch', 'transistor switch', 'npn switch', 'bjt', 'transistor', 'npn'],
    template: 'bjt_switch',
  },
  {
    patterns: ['555', '555 timer', 'astable', 'oscillator', 'square wave', 'blink', 'pulse', 'timer', 'multivibrator'],
    template: 'timer_555_astable',
  },
  {
    patterns: ['7805', 'voltage regulator', 'lm7805', '5v regulator', 'linear regulator', 'regulated supply', 'power supply'],
    template: 'voltage_regulator_5v',
  },
  {
    patterns: ['rc filter', 'low pass', 'low-pass', 'rc circuit', 'filter', 'lpf'],
    template: 'rc_filter',
  },
  {
    patterns: ['rgb led', 'rgb', 'color led', 'colour led', 'three led', '3 led'],
    template: 'rgb_led',
  },
  {
    patterns: ['mosfet', 'mosfet switch', 'n channel', 'n-channel', 'power switch', 'fet'],
    template: 'mosfet_switch',
  },
  {
    patterns: ['h-bridge', 'h bridge', 'motor driver', 'motor control', 'dc motor', 'motor direction'],
    template: 'h_bridge',
  },
  {
    patterns: ['opamp', 'op-amp', 'op amp', 'inverting amplifier', 'amplifier', 'amplify'],
    template: 'opamp_inverting',
  },
  {
    patterns: [
      'bridge rectifier', 'bridge rect', 'full wave rectifier', 'full-wave rectifier',
      'fullwave', 'full wave', 'rectifier', 'rectify', 'ac to dc', 'ac dc', 'ac-dc',
      'diode bridge', '1n4007', 'w04g', 'db107', 'four diode',
    ],
    template: 'bridge_rectifier_ic',
  },
  {
    patterns: [
      'bridge rectifier diode', 'discrete bridge', '4 diode', 'four diode rectifier',
      'rectifier circuit', 'rectifier using diode',
    ],
    template: 'bridge_rectifier_diodes',
  },
  {
    patterns: ['half wave', 'half-wave', 'half wave rectifier', 'single diode rectifier', 'halfwave'],
    template: 'half_wave_rectifier',
  },
  {
    patterns: ['zener regulator', 'zener clamp', 'zener circuit', 'shunt regulator', 'zener voltage'],
    template: 'zener_regulator',
  },
];

// ── Match intent to template ───────────────────────────────────
export function matchTemplate(prompt: string): TemplateKey | null {
  const lower = prompt.toLowerCase();
  for (const { patterns, template } of KEYWORD_MAP) {
    if (patterns.some(p => lower.includes(p))) return template;
  }
  return null;
}

// ── List all templates ─────────────────────────────────────────
export function getAllTemplates(): Array<{ key: TemplateKey; title: string; description: string }> {
  return Object.entries(CIRCUIT_TEMPLATES).map(([key, t]) => ({
    key: key as TemplateKey,
    title: t.title,
    description: t.description,
  }));
}
