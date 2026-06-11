// ============================================================
// CIRCUIT SIMULATOR — Core TypeScript Types
// ============================================================

export type ComponentCategory =
  | 'passive'
  | 'power'
  | 'switching'
  | 'protection'
  | 'semiconductor'
  | 'transistor'
  | 'ic'
  | 'logic'
  | 'microcontroller'
  | 'sensor'
  | 'actuator'
  | 'display'
  | 'measurement';

export type ComponentType =
  // Passive
  | 'resistor' | 'potentiometer' | 'capacitor' | 'inductor' | 'transformer' | 'crystal'
  // Power
  | 'battery' | 'dc_source' | 'ac_source' | 'ground' | 'vcc'
  // Switching
  | 'switch_spst' | 'switch_spdt' | 'switch_dpdt' | 'push_button'
  // Protection
  | 'fuse' | 'circuit_breaker'
  // Semiconductor
  | 'diode' | 'led' | 'zener' | 'schottky' | 'bridge_rectifier'
  // Transistors
  | 'bjt_npn' | 'bjt_pnp' | 'mosfet_n' | 'mosfet_p' | 'jfet'
  // ICs
  | 'opamp' | 'comparator' | 'timer_555' | 'voltage_regulator' | 'adc' | 'dac'
  // Logic
  | 'gate_and' | 'gate_or' | 'gate_xor' | 'gate_nand' | 'gate_nor' | 'gate_not'
  | 'flipflop_d' | 'flipflop_jk' | 'flipflop_sr'
  // MCU
  | 'arduino_uno' | 'arduino_mega' | 'esp32' | 'esp8266' | 'stm32'
  // Sensors
  | 'sensor_temp' | 'sensor_humidity' | 'sensor_motion' | 'sensor_light' | 'sensor_ultrasonic'
  // Actuators
  | 'motor_dc' | 'motor_servo' | 'motor_stepper' | 'relay' | 'buzzer' | 'solenoid'
  // Displays
  | 'display_7seg' | 'display_lcd' | 'display_oled' | 'led_matrix'
  // Measurement
  | 'voltmeter' | 'ammeter' | 'probe';

export type WireType = 'copper' | 'jumper' | 'ribbon' | 'shielded';

export type ViewMode = '2d' | '3d' | 'split' | 'breadboard';

export type SimulationMode = 'dc' | 'ac' | 'transient' | 'logic';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// =====================
// COMPONENT PIN / PORT
// =====================
export interface Pin {
  id: string;
  name: string;
  position: Point2D;    // relative to component center, in schematic coords
  type: 'anode' | 'cathode' | 'base' | 'collector' | 'emitter'
      | 'gate' | 'drain' | 'source' | 'plus' | 'minus'
      | 'in' | 'out' | 'clk' | 'vcc' | 'gnd' | 'io' | 'nc';
  connectedWireIds: string[];
  voltage?: number;
  current?: number;
}

// =====================
// COMPONENT PROPERTIES
// =====================
export interface ComponentProperties {
  // Resistor
  resistance?: number;
  tolerance?: number;
  powerRating?: number;
  // Capacitor
  capacitance?: number;
  esr?: number;
  voltageRating?: number;
  // Inductor
  inductance?: number;
  // Battery / Source
  voltage?: number;
  capacity?: number;
  frequency?: number;
  // LED
  color?: string;
  forwardVoltage?: number;
  currentRating?: number;
  // Motor
  rpm?: number;
  torque?: number;
  // Generic
  label?: string;
  value?: string;
  model?: string;
  description?: string;
  // Switch
  isOpen?: boolean;
  // Logic
  logicFamily?: 'TTL' | 'CMOS' | 'LVTTL' | 'LVCMOS';
}

// =====================
// CIRCUIT COMPONENT
// =====================
export interface CircuitComponent {
  id: string;
  type: ComponentType;
  category: ComponentCategory;
  label: string;
  position: Point2D;
  rotation: number;          // degrees: 0, 90, 180, 270
  flipped: boolean;
  pins: Pin[];
  properties: ComponentProperties;
  // Simulation results
  simulationData?: {
    voltage: number;
    current: number;
    power: number;
    temperature: number;
    state?: boolean;        // for digital
    warning?: string;
    error?: string;
  };
  // Visual
  selected: boolean;
  locked: boolean;
  visible: boolean;
  // 3D position override
  position3d?: Point3D;
}

// =====================
// WIRE
// =====================
export interface WireSegment {
  start: Point2D;
  end: Point2D;
}

export interface Wire {
  id: string;
  segments: WireSegment[];
  type: WireType;
  gauge?: number;             // AWG
  resistance?: number;        // Ω/m
  // Connections
  fromComponentId?: string;
  fromPinId?: string;
  toComponentId?: string;
  toPinId?: string;
  // Simulation
  nodeId?: string;
  voltage?: number;
  current?: number;
  // Visual
  selected: boolean;
  color?: string;
}

// =====================
// NET NODE (for simulation)
// =====================
export interface NetNode {
  id: string;
  name: string;
  connectedPins: Array<{ componentId: string; pinId: string }>;
  voltage: number;
  isGround: boolean;
  isVcc: boolean;
}

// =====================
// CIRCUIT
// =====================
export interface Circuit {
  id: string;
  name: string;
  description: string;
  components: Record<string, CircuitComponent>;
  wires: Record<string, Wire>;
  nodes: Record<string, NetNode>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  viewport3d: {
    position: Point3D;
    target: Point3D;
  };
  metadata: {
    created: string;
    modified: string;
    version: string;
    author: string;
  };
}

// =====================
// SIMULATION RESULTS
// =====================
export interface SimulationResult {
  success: boolean;
  mode: SimulationMode;
  timestamp: number;
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  componentResults: Record<string, ComponentSimResult>;
  errors: SimulationError[];
  warnings: SimulationWarning[];
  // Transient
  timePoints?: number[];
  transientData?: Record<string, number[]>;
}

export interface ComponentSimResult {
  componentId: string;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  state?: string;
}

export interface SimulationError {
  type: 'short_circuit' | 'open_circuit' | 'convergence' | 'singular_matrix' | 'component_failure';
  message: string;
  componentIds?: string[];
  wireIds?: string[];
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface SimulationWarning {
  type: 'overcurrent' | 'overvoltage' | 'overheat' | 'reverse_polarity' | 'floating_input' | 'no_ground';
  message: string;
  componentId?: string;
  value?: number;
  threshold?: number;
  suggestion?: string;
}

// =====================
// DRAG STATE
// =====================
export interface DragState {
  isDragging: boolean;
  dragType: 'component' | 'wire' | 'selection' | 'canvas' | 'pin' | null;
  startPos: Point2D;
  currentPos: Point2D;
  componentId?: string;
  wireId?: string;
  pinId?: string;
  fromPinId?: string;
  newWirePoints?: Point2D[];
}

// =====================
// SELECTION
// =====================
export interface SelectionState {
  componentIds: string[];
  wireIds: string[];
  selectionBox?: BoundingBox;
}

// =====================
// INSTRUMENT READINGS
// =====================
export interface MultimeterReading {
  mode: 'voltage' | 'current' | 'resistance' | 'continuity' | 'diode';
  value: number;
  unit: string;
  range: string;
}

export interface OscilloscopeChannel {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
  voltage: number;
  timebase: number;
  offset: number;
  data: number[];
  timestamps: number[];
}

export interface OscilloscopeState {
  channels: OscilloscopeChannel[];
  triggerMode: 'auto' | 'normal' | 'single';
  triggerLevel: number;
  triggerChannel: string;
  timebase: number;
  running: boolean;
}

// =====================
// COMPONENT DEFINITION (for library)
// =====================
export interface ComponentDefinition {
  type: ComponentType;
  category: ComponentCategory;
  label: string;
  description: string;
  symbol: string;           // SVG path data
  defaultProperties: ComponentProperties;
  pins: Omit<Pin, 'connectedWireIds' | 'voltage' | 'current'>[];
  boundingBox: BoundingBox;
  keywords: string[];
  spiceModel?: string;
  // 3D mesh hint
  mesh3d?: 'box' | 'cylinder' | 'dip' | 'qfp' | 'sot' | 'led' | 'capacitor_electrolytic';
}

// =====================
// UI STATE
// =====================
export interface UIState {
  viewMode: ViewMode;
  activeTab: 'components' | 'properties' | 'simulation' | 'instruments' | 'errors';
  showGrid: boolean;
  showLabels: boolean;
  showValues: boolean;
  showCurrentFlow: boolean;
  showThermal: boolean;
  showVoltageOverlay: boolean;
  snapToGrid: boolean;
  gridSize: number;
  sidebarOpen: boolean;
  propertiesPanelOpen: boolean;
  instrumentsOpen: boolean;
  activeInstrument: 'multimeter' | 'oscilloscope' | 'logic_analyzer' | 'power_meter' | null;
  zoom: number;
  panX: number;
  panY: number;
  isSimulationRunning: boolean;
  isDarkMode: boolean;
}
