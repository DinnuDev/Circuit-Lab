/**
 * Circuit AI Engine
 * Converts natural language into circuit blueprints.
 * Supports: rule-based template matching + OpenAI API (optional)
 */
import { v4 as uuidv4 } from 'uuid';
import { CIRCUIT_TEMPLATES, KEYWORD_MAP, matchTemplate } from './templates';
import type { CircuitBlueprint } from './templates';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import type { ComponentType, Point2D } from '@/types';

// ── Grid layout helpers ───────────────────────────────────────
const GRID_COL_WIDTH = 160;  // canvas units between columns
const GRID_ROW_HEIGHT = 120; // canvas units between rows
const ORIGIN_X = 200;
const ORIGIN_Y = 200;

function gridToCanvas(gx: number, gy: number): Point2D {
  return {
    x: ORIGIN_X + gx * GRID_COL_WIDTH,
    y: ORIGIN_Y + gy * GRID_ROW_HEIGHT,
  };
}

// ── Build actions from blueprint ──────────────────────────────
export interface BuildAction {
  type: 'add_component';
  id: string;
  compType: ComponentType;
  label: string;
  position: Point2D;
  properties: Record<string, unknown>;
}

export interface WireAction {
  type: 'add_wire';
  fromCompId: string;
  fromPinLabel: string; // pin.name (e.g. '+', 'A', 'BASE')
  fromPinType: string;  // pin.type (e.g. 'plus', 'base')
  toCompId: string;
  toPinLabel: string;
  toPinType: string;
  startPos: Point2D;
  endPos: Point2D;
}

export type CircuitAction = BuildAction | WireAction;

export interface BuildResult {
  success: boolean;
  actions: CircuitAction[];
  blueprint: CircuitBlueprint;
  message: string;
  notes: string[];
}

// ── Resolve pin by name or type ────────────────────────────────
function resolvePin(compType: ComponentType, pinQuery: string) {
  const def = COMPONENT_DEFINITIONS[compType];
  if (!def) return null;
  const q = pinQuery.toLowerCase();
  return def.pins.find(p =>
    p.name.toLowerCase() === q ||
    p.type.toLowerCase() === q ||
    p.id.toLowerCase() === q
  ) ?? def.pins[0];
}

// ── Blueprint → actions ────────────────────────────────────────
export function blueprintToActions(blueprint: CircuitBlueprint): BuildResult {
  const idMap: Record<number, string> = {};
  const posMap: Record<number, Point2D> = {};
  const typeMap: Record<number, ComponentType> = {};
  const actions: CircuitAction[] = [];

  // Auto-layout: if no gx/gy, place in a row
  blueprint.components.forEach((comp, i) => {
    const id = uuidv4();
    idMap[i] = id;
    typeMap[i] = comp.type;

    const gx = comp.gx ?? i;
    const gy = comp.gy ?? 0;
    const pos = gridToCanvas(gx, gy);
    posMap[i] = pos;

    actions.push({
      type: 'add_component',
      id,
      compType: comp.type,
      label: comp.label ?? `${comp.type}${i + 1}`,
      position: pos,
      properties: comp.properties ?? {},
    });
  });

  // Wires
  blueprint.wires.forEach(wire => {
    const fromId = idMap[wire.from.comp];
    const toId = idMap[wire.to.comp];
    const fromType = typeMap[wire.from.comp];
    const toType = typeMap[wire.to.comp];

    if (!fromId || !toId) return;

    const fromPin = resolvePin(fromType, wire.from.pin);
    const toPin = resolvePin(toType, wire.to.pin);

    if (!fromPin || !toPin) return;

    // Approximate pin world positions
    const fromPos = posMap[wire.from.comp];
    const toPos = posMap[wire.to.comp];
    const fromPinPos = { x: fromPos.x + fromPin.position.x, y: fromPos.y + fromPin.position.y };
    const toPinPos   = { x: toPos.x   + toPin.position.x,   y: toPos.y   + toPin.position.y };

    actions.push({
      type: 'add_wire',
      fromCompId: fromId,
      fromPinLabel: fromPin.name,
      fromPinType: fromPin.type,
      toCompId: toId,
      toPinLabel: toPin.name,
      toPinType: toPin.type,
      startPos: fromPinPos,
      endPos: toPinPos,
    });
  });

  return {
    success: true,
    actions,
    blueprint,
    message: `✓ Built: ${blueprint.title}`,
    notes: blueprint.notes ?? [],
  };
}

// ── Parse custom properties from prompt ───────────────────────
function extractProps(prompt: string): Record<string, number> {
  const props: Record<string, number> = {};
  const voltMatch = prompt.match(/(\d+(?:\.\d+)?)\s*v(?:olt)?(?:age)?/i);
  if (voltMatch) props.voltage = parseFloat(voltMatch[1]);
  const resMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:k|K)?\s*(?:ohm|Ω|Ω|R\b)/i);
  if (resMatch) props.resistance = parseFloat(resMatch[1]) * (prompt.match(/k/i) ? 1000 : 1);
  const freqMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:k)?hz/i);
  if (freqMatch) props.frequency = parseFloat(freqMatch[1]) * (prompt.match(/khz/i) ? 1000 : 1);
  return props;
}

// ── OpenAI API call ────────────────────────────────────────────
const AI_SYSTEM_PROMPT = `You are an electrical circuit design AI. When given a circuit request, respond ONLY with a JSON object matching this TypeScript type:

interface CircuitBlueprint {
  title: string;
  description: string;
  components: Array<{
    type: string;   // One of: resistor, capacitor, inductor, battery, dc_source, ac_source, ground, vcc, led, diode, bjt_npn, bjt_pnp, mosfet_n, opamp, timer_555, gate_and, gate_or, gate_not, relay, motor_dc, voltage_regulator, fuse, switch_spst, voltmeter, ammeter, buzzer, zener, crystal
    label?: string;
    properties?: Record<string, number | string | boolean>;
    gx?: number;    // grid column (0-based, left to right)
    gy?: number;    // grid row (0-based, top to bottom)
  }>;
  wires: Array<{
    from: { comp: number; pin: string };  // comp = index into components array, pin = pin type (plus, minus, anode, cathode, base, collector, emitter, gate, drain, source, in, out, gnd, vcc, inv, noninv, trig, cv, rst)
    to:   { comp: number; pin: string };
  }>;
  notes?: string[];
}

Rules:
- Always include at least one ground component
- Use proper pin types (see above)
- Lay out components logically from left to right, top to bottom
- Include protection resistors where appropriate
- Add notes explaining key values and design decisions
- Respond ONLY with the JSON object, no markdown, no explanation`;

export async function callAI(prompt: string, apiKey: string, model = 'gpt-4o-mini'): Promise<CircuitBlueprint | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    // Strip markdown code fences if present
    const clean = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean) as CircuitBlueprint;
  } catch (err) {
    console.error('[AI] API call failed:', err);
    return null;
  }
}

// ── Main AI handler ────────────────────────────────────────────
export interface AIResponse {
  type: 'circuit' | 'info' | 'error' | 'suggestions';
  text: string;
  result?: BuildResult;
  suggestions?: string[];
}

export async function processPrompt(
  prompt: string,
  apiKey?: string,
): Promise<AIResponse> {
  const clean = prompt.trim();
  if (!clean) return { type: 'error', text: 'Please describe the circuit you want to build.' };

  // ── Help / list templates ─────────────────────────────────
  if (/^(help|list|templates?|what can|show me|examples?)[\s?]*$/i.test(clean)) {
    return {
      type: 'suggestions',
      text: 'Here are circuits I can build for you:',
      suggestions: Object.values(CIRCUIT_TEMPLATES).map(t => t.title),
    };
  }

  // ── Try API first if key provided ─────────────────────────
  if (apiKey?.trim()) {
    const blueprint = await callAI(clean, apiKey.trim());
    if (blueprint) {
      // Patch component types to valid ones
      blueprint.components = blueprint.components.map(c => ({
        ...c,
        type: COMPONENT_DEFINITIONS[c.type as ComponentType] ? c.type as ComponentType : 'resistor',
      }));
      const result = blueprintToActions(blueprint);
      return {
        type: 'circuit',
        text: `🤖 AI designed: **${blueprint.title}**\n${blueprint.description}`,
        result,
      };
    }
    // Fall through to rule-based
  }

  // ── Rule-based template matching ──────────────────────────
  const templateKey = matchTemplate(clean);
  if (templateKey) {
    const blueprint = structuredClone(CIRCUIT_TEMPLATES[templateKey]);

    // Apply any explicit voltage/value overrides from the prompt
    const overrides = extractProps(clean);
    if (overrides.voltage) {
      blueprint.components.forEach(c => {
        if (c.type === 'dc_source' || c.type === 'battery' || c.type === 'vcc') {
          c.properties = { ...c.properties, voltage: overrides.voltage! };
        }
      });
    }

    const result = blueprintToActions(blueprint);
    return {
      type: 'circuit',
      text: `⚡ Built: **${blueprint.title}**\n${blueprint.description}`,
      result,
    };
  }

  // ── Suggest similar ────────────────────────────────────────
  const suggestions = KEYWORD_MAP
    .filter(k => k.patterns.some(p =>
      p.split(' ').some(word => clean.toLowerCase().includes(word) && word.length > 3)
    ))
    .map(k => CIRCUIT_TEMPLATES[k.template].title)
    .slice(0, 4);

  if (suggestions.length > 0) {
    return {
      type: 'suggestions',
      text: `I didn't fully understand that. Did you mean one of these?`,
      suggestions,
    };
  }

  return {
    type: 'error',
    text: 'I couldn\'t match that to a circuit. Try describing it differently or type **help** to see available templates.',
  };
}
