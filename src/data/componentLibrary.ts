import type { ComponentDefinition, ComponentType } from '@/types';

// ============================================================
// SVG SYMBOLS — Standard schematic symbols
// ============================================================
const SYMBOLS: Record<string, string> = {
  resistor: `
    <line x1="-30" y1="0" x2="-10" y2="0"/>
    <rect x="-10" y="-6" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="10" y1="0" x2="30" y2="0"/>
  `,
  capacitor: `
    <line x1="-30" y1="0" x2="-4" y2="0"/>
    <line x1="-4" y1="-12" x2="-4" y2="12"/>
    <line x1="4" y1="-12" x2="4" y2="12"/>
    <line x1="4" y1="0" x2="30" y2="0"/>
  `,
  inductor: `
    <line x1="-30" y1="0" x2="-20" y2="0"/>
    <path d="M-20 0 Q-17,-10,-14,0 Q-11,-10,-8,0 Q-5,-10,-2,0 Q1,-10,4,0 Q7,-10,10,0 Q13,-10,16,0 Q19,-10,20,0" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="20" y1="0" x2="30" y2="0"/>
  `,
  battery: `
    <line x1="-30" y1="0" x2="-6" y2="0"/>
    <line x1="-6" y1="-14" x2="-6" y2="14"/>
    <line x1="6" y1="-8" x2="6" y2="8"/>
    <line x1="6" y1="0" x2="30" y2="0"/>
    <text x="-12" y="-16" font-size="8" fill="currentColor">+</text>
    <text x="8" y="-16" font-size="8" fill="currentColor">−</text>
  `,
  ground: `
    <line x1="0" y1="-20" x2="0" y2="0"/>
    <line x1="-16" y1="0" x2="16" y2="0"/>
    <line x1="-10" y1="6" x2="10" y2="6"/>
    <line x1="-4" y1="12" x2="4" y2="12"/>
  `,
  vcc: `
    <line x1="0" y1="20" x2="0" y2="0"/>
    <line x1="-16" y1="0" x2="16" y2="0"/>
    <text x="-5" y="-6" font-size="9" fill="#3b82f6" font-weight="bold">VCC</text>
  `,
  led: `
    <line x1="-30" y1="0" x2="-10" y2="0"/>
    <polygon points="-10,-10 -10,10 10,0" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="10" y1="-10" x2="10" y2="10"/>
    <line x1="10" y1="0" x2="30" y2="0"/>
    <line x1="14" y1="-10" x2="22" y2="-20"/>
    <line x1="20" y1="-6" x2="28" y2="-16"/>
  `,
  diode: `
    <line x1="-30" y1="0" x2="-10" y2="0"/>
    <polygon points="-10,-10 -10,10 10,0" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="10" y1="-10" x2="10" y2="10"/>
    <line x1="10" y1="0" x2="30" y2="0"/>
  `,
  switch_spst: `
    <line x1="-30" y1="0" x2="-10" y2="0"/>
    <circle cx="-10" cy="0" r="2" fill="currentColor"/>
    <line x1="-10" y1="0" x2="10" y2="-12"/>
    <circle cx="10" cy="0" r="2" fill="currentColor"/>
    <line x1="10" y1="0" x2="30" y2="0"/>
  `,
  push_button: `
    <line x1="-30" y1="0" x2="-8" y2="0"/>
    <circle cx="-8" cy="0" r="2" fill="currentColor"/>
    <line x1="-8" y1="0" x2="8" y2="-14"/>
    <circle cx="8" cy="0" r="2" fill="currentColor"/>
    <line x1="8" y1="0" x2="30" y2="0"/>
    <line x1="0" y1="-14" x2="0" y2="-22"/>
    <line x1="-6" y1="-22" x2="6" y2="-22"/>
  `,
  bjt_npn: `
    <line x1="-20" y1="-16" x2="0" y2="-16"/>
    <line x1="-20" y1="16" x2="0" y2="16"/>
    <line x1="-30" y1="0" x2="0" y2="0"/>
    <line x1="0" y1="-24" x2="0" y2="24"/>
    <line x1="0" y1="0" x2="20" y2="-16"/>
    <line x1="0" y1="0" x2="20" y2="16"/>
    <polygon points="20,16 12,14 14,8" fill="currentColor"/>
  `,
  opamp: `
    <polygon points="-24,-20 -24,20 24,0" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-30" y1="-10" x2="-24" y2="-10"/>
    <line x1="-30" y1="10" x2="-24" y2="10"/>
    <line x1="24" y1="0" x2="30" y2="0"/>
    <text x="-21" y="-7" font-size="8" fill="currentColor">+</text>
    <text x="-21" y="13" font-size="8" fill="currentColor">−</text>
  `,
  gate_and: `
    <path d="M-10,-16 L-10,16 Q16,16 16,0 Q16,-16 -10,-16 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-24" y1="-8" x2="-10" y2="-8"/>
    <line x1="-24" y1="8" x2="-10" y2="8"/>
    <line x1="16" y1="0" x2="30" y2="0"/>
  `,
  gate_or: `
    <path d="M-10,-16 Q0,-16 16,0 Q0,16 -10,16 Q-2,0 -10,-16 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-24" y1="-8" x2="-4" y2="-8"/>
    <line x1="-24" y1="8" x2="-4" y2="8"/>
    <line x1="16" y1="0" x2="30" y2="0"/>
  `,
  gate_not: `
    <polygon points="-16,-14 -16,14 10,0" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="14" cy="0" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-30" y1="0" x2="-16" y2="0"/>
    <line x1="18" y1="0" x2="30" y2="0"/>
  `,
  dc_source: `
    <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-30" y1="0" x2="-20" y2="0"/>
    <line x1="20" y1="0" x2="30" y2="0"/>
    <text x="-5" y="5" font-size="12" fill="currentColor">V</text>
  `,
  ac_source: `
    <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-30" y1="0" x2="-20" y2="0"/>
    <line x1="20" y1="0" x2="30" y2="0"/>
    <path d="M-10,0 Q-5,-10 0,0 Q5,10 10,0" fill="none" stroke="currentColor" stroke-width="1.5"/>
  `,
  fuse: `
    <line x1="-30" y1="0" x2="-12" y2="0"/>
    <rect x="-12" y="-6" width="24" height="12" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="12" y1="0" x2="30" y2="0"/>
    <line x1="-8" y1="0" x2="8" y2="0"/>
  `,
  voltmeter: `
    <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="-7" y="5" font-size="12" fill="currentColor">V</text>
    <line x1="-30" y1="0" x2="-20" y2="0"/>
    <line x1="20" y1="0" x2="30" y2="0"/>
  `,
  ammeter: `
    <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="-7" y="5" font-size="12" fill="currentColor">A</text>
    <line x1="-30" y1="0" x2="-20" y2="0"/>
    <line x1="20" y1="0" x2="30" y2="0"/>
  `,
  motor_dc: `
    <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="-7" y="5" font-size="12" fill="currentColor">M</text>
    <line x1="-30" y1="0" x2="-20" y2="0"/>
    <line x1="20" y1="0" x2="30" y2="0"/>
  `,
  relay: `
    <rect x="-20" y="-16" width="40" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-30" y1="-8" x2="-20" y2="-8"/>
    <line x1="-30" y1="8" x2="-20" y2="8"/>
    <line x1="20" y1="-8" x2="30" y2="-8"/>
    <line x1="20" y1="8" x2="30" y2="8"/>
    <text x="-10" y="5" font-size="9" fill="currentColor">RLY</text>
  `,
  timer_555: `
    <rect x="-28" y="-28" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="-14" y="5" font-size="11" font-weight="bold" fill="currentColor">555</text>
    <line x1="-30" y1="-16" x2="-28" y2="-16"/>
    <line x1="-30" y1="0" x2="-28" y2="0"/>
    <line x1="-30" y1="16" x2="-28" y2="16"/>
    <line x1="28" y1="-16" x2="30" y2="-16"/>
    <line x1="28" y1="0" x2="30" y2="0"/>
    <line x1="28" y1="16" x2="30" y2="16"/>
  `,
  crystal: `
    <line x1="-30" y1="0" x2="-10" y2="0"/>
    <line x1="-10" y1="-12" x2="-10" y2="12"/>
    <rect x="-6" y="-10" width="12" height="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="6" y1="-12" x2="6" y2="12"/>
    <line x1="6" y1="0" x2="30" y2="0"/>
  `,
  transformer: `
    <path d="M-20,-16 Q-12,-16 -12,0 Q-12,16 -20,16" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="M20,-16 Q12,-16 12,0 Q12,16 20,16" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <line x1="-1" y1="-18" x2="-1" y2="18"/>
    <line x1="1" y1="-18" x2="1" y2="18"/>
    <line x1="-30" y1="-8" x2="-20" y2="-8"/>
    <line x1="-30" y1="8" x2="-20" y2="8"/>
    <line x1="20" y1="-8" x2="30" y2="-8"/>
    <line x1="20" y1="8" x2="30" y2="8"/>
  `,
};

// ============================================================
// COMPONENT DEFINITIONS
// ============================================================
export const COMPONENT_DEFINITIONS: Partial<Record<ComponentType, ComponentDefinition>> = {
  resistor: {
    type: 'resistor',
    category: 'passive',
    label: 'R',
    description: 'Fixed resistor',
    symbol: SYMBOLS.resistor,
    defaultProperties: { resistance: 1000, tolerance: 5, powerRating: 0.25, label: 'R' },
    pins: [
      { id: 'p1', name: 'P1', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'p2', name: 'P2', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -10, width: 60, height: 20 },
    keywords: ['resistor', 'resistance', 'ohm', 'R'],
    spiceModel: 'R',
    mesh3d: 'cylinder',
  },

  potentiometer: {
    type: 'potentiometer',
    category: 'passive',
    label: 'RV',
    description: 'Variable resistor / potentiometer',
    symbol: SYMBOLS.resistor,
    defaultProperties: { resistance: 10000, tolerance: 10, powerRating: 0.5 },
    pins: [
      { id: 'p1', name: 'P1', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'p2', name: 'P2', position: { x: 30, y: 0 }, type: 'minus' },
      { id: 'wiper', name: 'W', position: { x: 0, y: -16 }, type: 'out' },
    ],
    boundingBox: { x: -30, y: -20, width: 60, height: 30 },
    keywords: ['pot', 'potentiometer', 'variable resistor', 'rheostat'],
    mesh3d: 'cylinder',
  },

  capacitor: {
    type: 'capacitor',
    category: 'passive',
    label: 'C',
    description: 'Capacitor',
    symbol: SYMBOLS.capacitor,
    defaultProperties: { capacitance: 0.000001, voltageRating: 50, esr: 0.01 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -12, width: 60, height: 24 },
    keywords: ['capacitor', 'cap', 'farad', 'C'],
    spiceModel: 'C',
    mesh3d: 'capacitor_electrolytic',
  },

  inductor: {
    type: 'inductor',
    category: 'passive',
    label: 'L',
    description: 'Inductor / coil',
    symbol: SYMBOLS.inductor,
    defaultProperties: { inductance: 0.001, resistance: 0.1 },
    pins: [
      { id: 'p1', name: 'P1', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'p2', name: 'P2', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -12, width: 60, height: 24 },
    keywords: ['inductor', 'coil', 'henry', 'L'],
    mesh3d: 'cylinder',
  },

  transformer: {
    type: 'transformer',
    category: 'passive',
    label: 'T',
    description: 'Transformer',
    symbol: SYMBOLS.transformer,
    defaultProperties: { voltage: 1 },
    pins: [
      { id: 'pri_p', name: 'L1+', position: { x: -30, y: -8 }, type: 'plus' },
      { id: 'pri_n', name: 'L1−', position: { x: -30, y: 8 }, type: 'minus' },
      { id: 'sec_p', name: 'L2+', position: { x: 30, y: -8 }, type: 'plus' },
      { id: 'sec_n', name: 'L2−', position: { x: 30, y: 8 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -20, width: 60, height: 40 },
    keywords: ['transformer', 'coil', 'coupled inductors'],
    mesh3d: 'box',
  },

  crystal: {
    type: 'crystal',
    category: 'passive',
    label: 'Y',
    description: 'Crystal oscillator',
    symbol: SYMBOLS.crystal,
    defaultProperties: { frequency: 16000000 },
    pins: [
      { id: 'p1', name: 'P1', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'p2', name: 'P2', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -14, width: 60, height: 28 },
    keywords: ['crystal', 'oscillator', 'xtal', 'resonator'],
    mesh3d: 'box',
  },

  battery: {
    type: 'battery',
    category: 'power',
    label: 'BT',
    description: 'Battery',
    symbol: SYMBOLS.battery,
    defaultProperties: { voltage: 9, capacity: 2000 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -16, width: 60, height: 32 },
    keywords: ['battery', 'cell', 'power', 'voltage source'],
    spiceModel: 'V',
    mesh3d: 'cylinder',
  },

  dc_source: {
    type: 'dc_source',
    category: 'power',
    label: 'V',
    description: 'DC voltage source',
    symbol: SYMBOLS.dc_source,
    defaultProperties: { voltage: 5 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -22, width: 60, height: 44 },
    keywords: ['voltage source', 'dc', 'supply', 'power'],
    spiceModel: 'V',
    mesh3d: 'cylinder',
  },

  ac_source: {
    type: 'ac_source',
    category: 'power',
    label: 'VAC',
    description: 'AC voltage source',
    symbol: SYMBOLS.ac_source,
    defaultProperties: { voltage: 120, frequency: 60 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -22, width: 60, height: 44 },
    keywords: ['ac source', 'mains', 'sine', 'alternating'],
    spiceModel: 'V',
    mesh3d: 'cylinder',
  },

  ground: {
    type: 'ground',
    category: 'power',
    label: 'GND',
    description: 'Ground reference',
    symbol: SYMBOLS.ground,
    defaultProperties: { voltage: 0 },
    pins: [
      { id: 'gnd', name: 'GND', position: { x: 0, y: -20 }, type: 'gnd' },
    ],
    boundingBox: { x: -16, y: -20, width: 32, height: 32 },
    keywords: ['ground', 'gnd', 'reference', '0V'],
    mesh3d: 'box',
  },

  vcc: {
    type: 'vcc',
    category: 'power',
    label: 'VCC',
    description: 'Power supply rail',
    symbol: SYMBOLS.vcc,
    defaultProperties: { voltage: 5 },
    pins: [
      { id: 'vcc', name: 'VCC', position: { x: 0, y: 20 }, type: 'vcc' },
    ],
    boundingBox: { x: -20, y: -10, width: 40, height: 32 },
    keywords: ['vcc', 'vdd', 'power', '5v', '3.3v'],
    mesh3d: 'box',
  },

  switch_spst: {
    type: 'switch_spst',
    category: 'switching',
    label: 'SW',
    description: 'Single pole single throw switch',
    symbol: SYMBOLS.switch_spst,
    defaultProperties: { isOpen: true },
    pins: [
      { id: 'p1', name: 'P1', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'p2', name: 'P2', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -16, width: 60, height: 32 },
    keywords: ['switch', 'toggle', 'SPST'],
    mesh3d: 'box',
  },

  push_button: {
    type: 'push_button',
    category: 'switching',
    label: 'BTN',
    description: 'Momentary push button',
    symbol: SYMBOLS.push_button,
    defaultProperties: { isOpen: true },
    pins: [
      { id: 'p1', name: 'P1', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'p2', name: 'P2', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -24, width: 60, height: 40 },
    keywords: ['button', 'push', 'momentary'],
    mesh3d: 'box',
  },

  fuse: {
    type: 'fuse',
    category: 'protection',
    label: 'F',
    description: 'Fuse',
    symbol: SYMBOLS.fuse,
    defaultProperties: { currentRating: 1 },
    pins: [
      { id: 'p1', name: 'P1', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'p2', name: 'P2', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -10, width: 60, height: 20 },
    keywords: ['fuse', 'protection', 'overcurrent'],
    mesh3d: 'cylinder',
  },

  diode: {
    type: 'diode',
    category: 'semiconductor',
    label: 'D',
    description: 'Rectifier diode',
    symbol: SYMBOLS.diode,
    defaultProperties: { forwardVoltage: 0.7, currentRating: 1 },
    pins: [
      { id: 'anode', name: 'A', position: { x: -30, y: 0 }, type: 'anode' },
      { id: 'cathode', name: 'K', position: { x: 30, y: 0 }, type: 'cathode' },
    ],
    boundingBox: { x: -30, y: -12, width: 60, height: 24 },
    keywords: ['diode', 'rectifier', '1N4007'],
    spiceModel: 'D',
    mesh3d: 'cylinder',
  },

  led: {
    type: 'led',
    category: 'semiconductor',
    label: 'LED',
    description: 'Light Emitting Diode',
    symbol: SYMBOLS.led,
    defaultProperties: { forwardVoltage: 2.0, currentRating: 0.02, color: '#ff0000' },
    pins: [
      { id: 'anode', name: 'A', position: { x: -30, y: 0 }, type: 'anode' },
      { id: 'cathode', name: 'K', position: { x: 30, y: 0 }, type: 'cathode' },
    ],
    boundingBox: { x: -30, y: -14, width: 60, height: 28 },
    keywords: ['led', 'light', 'diode'],
    mesh3d: 'led',
  },

  zener: {
    type: 'zener',
    category: 'semiconductor',
    label: 'DZ',
    description: 'Zener diode',
    symbol: SYMBOLS.diode,
    defaultProperties: { forwardVoltage: 5.1, currentRating: 0.05, voltageRating: 5.1 },
    pins: [
      { id: 'anode', name: 'A', position: { x: -30, y: 0 }, type: 'anode' },
      { id: 'cathode', name: 'K', position: { x: 30, y: 0 }, type: 'cathode' },
    ],
    boundingBox: { x: -30, y: -12, width: 60, height: 24 },
    keywords: ['zener', 'voltage regulator', 'breakdown'],
    mesh3d: 'cylinder',
  },

  bjt_npn: {
    type: 'bjt_npn',
    category: 'transistor',
    label: 'Q',
    description: 'NPN BJT Transistor',
    symbol: SYMBOLS.bjt_npn,
    defaultProperties: { currentRating: 0.1, voltageRating: 40 },
    pins: [
      { id: 'base', name: 'B', position: { x: -30, y: 0 }, type: 'base' },
      { id: 'collector', name: 'C', position: { x: 20, y: -16 }, type: 'collector' },
      { id: 'emitter', name: 'E', position: { x: 20, y: 16 }, type: 'emitter' },
    ],
    boundingBox: { x: -30, y: -24, width: 60, height: 48 },
    keywords: ['bjt', 'npn', 'transistor', '2N2222', 'BC547'],
    spiceModel: 'Q',
    mesh3d: 'sot',
  },

  bjt_pnp: {
    type: 'bjt_pnp',
    category: 'transistor',
    label: 'Q',
    description: 'PNP BJT Transistor',
    symbol: SYMBOLS.bjt_npn,
    defaultProperties: { currentRating: 0.1, voltageRating: 40 },
    pins: [
      { id: 'base', name: 'B', position: { x: -30, y: 0 }, type: 'base' },
      { id: 'collector', name: 'C', position: { x: 20, y: -16 }, type: 'collector' },
      { id: 'emitter', name: 'E', position: { x: 20, y: 16 }, type: 'emitter' },
    ],
    boundingBox: { x: -30, y: -24, width: 60, height: 48 },
    keywords: ['bjt', 'pnp', 'transistor'],
    spiceModel: 'Q',
    mesh3d: 'sot',
  },

  mosfet_n: {
    type: 'mosfet_n',
    category: 'transistor',
    label: 'M',
    description: 'N-Channel MOSFET',
    symbol: SYMBOLS.bjt_npn,
    defaultProperties: { currentRating: 10, voltageRating: 60 },
    pins: [
      { id: 'gate', name: 'G', position: { x: -30, y: 0 }, type: 'gate' },
      { id: 'drain', name: 'D', position: { x: 20, y: -16 }, type: 'drain' },
      { id: 'source', name: 'S', position: { x: 20, y: 16 }, type: 'source' },
    ],
    boundingBox: { x: -30, y: -24, width: 60, height: 48 },
    keywords: ['mosfet', 'n-channel', 'IRF540', 'FET'],
    spiceModel: 'M',
    mesh3d: 'sot',
  },

  opamp: {
    type: 'opamp',
    category: 'ic',
    label: 'U',
    description: 'Operational Amplifier',
    symbol: SYMBOLS.opamp,
    defaultProperties: { voltageRating: 15 },
    pins: [
      { id: 'inv', name: '−', position: { x: -30, y: 10 }, type: 'in' },
      { id: 'noninv', name: '+', position: { x: -30, y: -10 }, type: 'in' },
      { id: 'out', name: 'OUT', position: { x: 30, y: 0 }, type: 'out' },
      { id: 'vp', name: 'V+', position: { x: 0, y: -24 }, type: 'vcc' },
      { id: 'vn', name: 'V−', position: { x: 0, y: 24 }, type: 'gnd' },
    ],
    boundingBox: { x: -30, y: -24, width: 60, height: 48 },
    keywords: ['opamp', 'op-amp', 'LM741', 'LM358', 'amplifier'],
    mesh3d: 'dip',
  },

  timer_555: {
    type: 'timer_555',
    category: 'ic',
    label: 'IC',
    description: '555 Timer IC',
    symbol: SYMBOLS.timer_555,
    defaultProperties: { voltage: 9 },
    pins: [
      { id: 'gnd', name: 'GND', position: { x: -30, y: -16 }, type: 'gnd' },
      { id: 'trig', name: 'TRIG', position: { x: -30, y: 0 }, type: 'in' },
      { id: 'out', name: 'OUT', position: { x: -30, y: 16 }, type: 'out' },
      { id: 'rst', name: 'RST', position: { x: 30, y: -16 }, type: 'in' },
      { id: 'cv', name: 'CV', position: { x: 30, y: 0 }, type: 'io' },
      { id: 'vcc', name: 'VCC', position: { x: 30, y: 16 }, type: 'vcc' },
    ],
    boundingBox: { x: -30, y: -30, width: 60, height: 60 },
    keywords: ['555', 'timer', 'astable', 'monostable', 'NE555'],
    mesh3d: 'dip',
  },

  gate_and: {
    type: 'gate_and',
    category: 'logic',
    label: 'AND',
    description: 'AND Logic Gate',
    symbol: SYMBOLS.gate_and,
    defaultProperties: { logicFamily: 'CMOS' },
    pins: [
      { id: 'in1', name: 'A', position: { x: -24, y: -8 }, type: 'in' },
      { id: 'in2', name: 'B', position: { x: -24, y: 8 }, type: 'in' },
      { id: 'out', name: 'Y', position: { x: 30, y: 0 }, type: 'out' },
    ],
    boundingBox: { x: -24, y: -18, width: 56, height: 36 },
    keywords: ['AND', 'gate', 'logic', '74HC08'],
    mesh3d: 'dip',
  },

  gate_or: {
    type: 'gate_or',
    category: 'logic',
    label: 'OR',
    description: 'OR Logic Gate',
    symbol: SYMBOLS.gate_or,
    defaultProperties: { logicFamily: 'CMOS' },
    pins: [
      { id: 'in1', name: 'A', position: { x: -24, y: -8 }, type: 'in' },
      { id: 'in2', name: 'B', position: { x: -24, y: 8 }, type: 'in' },
      { id: 'out', name: 'Y', position: { x: 30, y: 0 }, type: 'out' },
    ],
    boundingBox: { x: -24, y: -18, width: 56, height: 36 },
    keywords: ['OR', 'gate', 'logic'],
    mesh3d: 'dip',
  },

  gate_not: {
    type: 'gate_not',
    category: 'logic',
    label: 'NOT',
    description: 'NOT Gate (Inverter)',
    symbol: SYMBOLS.gate_not,
    defaultProperties: { logicFamily: 'CMOS' },
    pins: [
      { id: 'in', name: 'A', position: { x: -30, y: 0 }, type: 'in' },
      { id: 'out', name: 'Y', position: { x: 30, y: 0 }, type: 'out' },
    ],
    boundingBox: { x: -30, y: -16, width: 62, height: 32 },
    keywords: ['NOT', 'inverter', 'gate', 'logic'],
    mesh3d: 'dip',
  },

  gate_nand: {
    type: 'gate_nand',
    category: 'logic',
    label: 'NAND',
    description: 'NAND Logic Gate',
    symbol: SYMBOLS.gate_and,
    defaultProperties: { logicFamily: 'CMOS' },
    pins: [
      { id: 'in1', name: 'A', position: { x: -24, y: -8 }, type: 'in' },
      { id: 'in2', name: 'B', position: { x: -24, y: 8 }, type: 'in' },
      { id: 'out', name: 'Y', position: { x: 30, y: 0 }, type: 'out' },
    ],
    boundingBox: { x: -24, y: -18, width: 56, height: 36 },
    keywords: ['NAND', 'gate', 'logic', '74HC00'],
    mesh3d: 'dip',
  },

  gate_nor: {
    type: 'gate_nor',
    category: 'logic',
    label: 'NOR',
    description: 'NOR Logic Gate',
    symbol: SYMBOLS.gate_or,
    defaultProperties: { logicFamily: 'CMOS' },
    pins: [
      { id: 'in1', name: 'A', position: { x: -24, y: -8 }, type: 'in' },
      { id: 'in2', name: 'B', position: { x: -24, y: 8 }, type: 'in' },
      { id: 'out', name: 'Y', position: { x: 30, y: 0 }, type: 'out' },
    ],
    boundingBox: { x: -24, y: -18, width: 56, height: 36 },
    keywords: ['NOR', 'gate', 'logic'],
    mesh3d: 'dip',
  },

  gate_xor: {
    type: 'gate_xor',
    category: 'logic',
    label: 'XOR',
    description: 'XOR Logic Gate',
    symbol: SYMBOLS.gate_or,
    defaultProperties: { logicFamily: 'CMOS' },
    pins: [
      { id: 'in1', name: 'A', position: { x: -24, y: -8 }, type: 'in' },
      { id: 'in2', name: 'B', position: { x: -24, y: 8 }, type: 'in' },
      { id: 'out', name: 'Y', position: { x: 30, y: 0 }, type: 'out' },
    ],
    boundingBox: { x: -24, y: -18, width: 56, height: 36 },
    keywords: ['XOR', 'gate', 'logic', 'exclusive or'],
    mesh3d: 'dip',
  },

  voltage_regulator: {
    type: 'voltage_regulator',
    category: 'ic',
    label: 'VR',
    description: 'Linear Voltage Regulator',
    symbol: SYMBOLS.timer_555,
    defaultProperties: { voltage: 5, currentRating: 1, voltageRating: 35 },
    pins: [
      { id: 'in', name: 'IN', position: { x: -30, y: 0 }, type: 'in' },
      { id: 'gnd', name: 'GND', position: { x: 0, y: 30 }, type: 'gnd' },
      { id: 'out', name: 'OUT', position: { x: 30, y: 0 }, type: 'out' },
    ],
    boundingBox: { x: -30, y: -20, width: 60, height: 52 },
    keywords: ['regulator', '7805', 'LM317', '3.3V', '5V'],
    mesh3d: 'sot',
  },

  relay: {
    type: 'relay',
    category: 'actuator',
    label: 'RLY',
    description: 'Electromechanical relay',
    symbol: SYMBOLS.relay,
    defaultProperties: { voltage: 5, currentRating: 10 },
    pins: [
      { id: 'coil1', name: 'COIL+', position: { x: -30, y: -8 }, type: 'plus' },
      { id: 'coil2', name: 'COIL−', position: { x: -30, y: 8 }, type: 'minus' },
      { id: 'com', name: 'COM', position: { x: 30, y: 0 }, type: 'io' },
      { id: 'no', name: 'NO', position: { x: 30, y: -8 }, type: 'io' },
      { id: 'nc', name: 'NC', position: { x: 30, y: 8 }, type: 'io' },
    ],
    boundingBox: { x: -30, y: -20, width: 60, height: 40 },
    keywords: ['relay', 'coil', 'switch', 'electromechanical'],
    mesh3d: 'box',
  },

  motor_dc: {
    type: 'motor_dc',
    category: 'actuator',
    label: 'M',
    description: 'DC Motor',
    symbol: SYMBOLS.motor_dc,
    defaultProperties: { voltage: 12, currentRating: 0.5, rpm: 200 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -22, width: 60, height: 44 },
    keywords: ['motor', 'dc', 'actuator', 'drive'],
    mesh3d: 'cylinder',
  },

  buzzer: {
    type: 'buzzer',
    category: 'actuator',
    label: 'BZ',
    description: 'Piezo Buzzer',
    symbol: SYMBOLS.motor_dc,
    defaultProperties: { voltage: 5, currentRating: 0.03, frequency: 2400 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -22, width: 60, height: 44 },
    keywords: ['buzzer', 'piezo', 'beeper', 'speaker'],
    mesh3d: 'cylinder',
  },

  voltmeter: {
    type: 'voltmeter',
    category: 'measurement',
    label: 'VM',
    description: 'Voltmeter',
    symbol: SYMBOLS.voltmeter,
    defaultProperties: { voltageRating: 1000 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -22, width: 60, height: 44 },
    keywords: ['voltmeter', 'voltage', 'measure', 'meter'],
    mesh3d: 'box',
  },

  ammeter: {
    type: 'ammeter',
    category: 'measurement',
    label: 'AM',
    description: 'Ammeter',
    symbol: SYMBOLS.ammeter,
    defaultProperties: { currentRating: 10 },
    pins: [
      { id: 'plus', name: '+', position: { x: -30, y: 0 }, type: 'plus' },
      { id: 'minus', name: '−', position: { x: 30, y: 0 }, type: 'minus' },
    ],
    boundingBox: { x: -30, y: -22, width: 60, height: 44 },
    keywords: ['ammeter', 'current', 'measure', 'meter'],
    mesh3d: 'box',
  },
};

// Category display names and icons (Lucide icon names)
export const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  passive:        { label: 'Passive',        icon: 'Minus',         color: '#94a3b8' },
  power:          { label: 'Power',          icon: 'Zap',           color: '#f59e0b' },
  switching:      { label: 'Switching',      icon: 'ToggleLeft',    color: '#22c55e' },
  protection:     { label: 'Protection',     icon: 'ShieldAlert',   color: '#ef4444' },
  semiconductor:  { label: 'Semiconductor',  icon: 'Cpu',           color: '#a78bfa' },
  transistor:     { label: 'Transistors',    icon: 'Triangle',      color: '#06b6d4' },
  ic:             { label: 'ICs',            icon: 'CircuitBoard',  color: '#3b82f6' },
  logic:          { label: 'Logic Gates',    icon: 'GitMerge',      color: '#f97316' },
  microcontroller:{ label: 'MCUs',           icon: 'Microchip',     color: '#10b981' },
  sensor:         { label: 'Sensors',        icon: 'Radio',         color: '#e879f9' },
  actuator:       { label: 'Actuators',      icon: 'Activity',      color: '#fb923c' },
  display:        { label: 'Displays',       icon: 'Monitor',       color: '#38bdf8' },
  measurement:    { label: 'Measurement',    icon: 'Gauge',         color: '#a3e635' },
};

// All definitions as array for searching
export const ALL_COMPONENT_DEFINITIONS: ComponentDefinition[] = Object.values(
  COMPONENT_DEFINITIONS
) as ComponentDefinition[];

export function searchComponents(query: string): ComponentDefinition[] {
  if (!query.trim()) return ALL_COMPONENT_DEFINITIONS;
  const q = query.toLowerCase();
  return ALL_COMPONENT_DEFINITIONS.filter(def =>
    def.label.toLowerCase().includes(q) ||
    def.description.toLowerCase().includes(q) ||
    def.keywords.some(k => k.toLowerCase().includes(q)) ||
    def.category.toLowerCase().includes(q)
  );
}
