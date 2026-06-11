import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { COMPONENT_DEFINITIONS } from '@/data/componentLibrary';
import type { CircuitComponent, Wire } from '@/types';

export default function Canvas3D() {
  const { circuit } = useCircuitStore();
  const components = Object.values(circuit.components);
  const wires = Object.values(circuit.wires);
  const simResult = useCircuitStore(s => s.simulationResult);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 8, 14], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a0c14' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={0.3} color="#3b82f6" />

          {/* Ground grid */}
          <Grid
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#1e2230"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#2a3050"
            fadeDistance={50}
            position={[0, -0.01, 0]}
          />

          {/* PCB board */}
          <mesh position={[0, -0.1, 0]} receiveShadow>
            <boxGeometry args={[30, 0.1, 20]} />
            <meshStandardMaterial color="#0a2010" roughness={0.8} metalness={0.1} />
          </mesh>

          {/* Components */}
          {components.map(comp => (
            <Component3D key={comp.id} component={comp} simResult={simResult} />
          ))}

          {/* Wires */}
          {wires.map(wire => (
            <Wire3D key={wire.id} wire={wire} circuit={circuit} simResult={simResult} />
          ))}

          <OrbitControls
            makeDefault
            minDistance={1}
            maxDistance={100}
            enableDamping
            dampingFactor={0.05}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>

      {/* 3D Controls hint */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-600 pointer-events-none">
        Left-drag: Rotate · Right-drag: Pan · Scroll: Zoom
      </div>
    </div>
  );
}

function Component3D({ component, simResult }: { component: CircuitComponent; simResult: unknown }) {
  const ref = useRef<THREE.Mesh>(null);
  const def = COMPONENT_DEFINITIONS[component.type];
  const isSelected = component.selected;

  // Convert 2D position to 3D
  const px = (component.position.x - 400) / 40;
  const pz = (component.position.y - 300) / 40;

  const mesh3d = def?.mesh3d ?? 'box';
  const color = getComponentColor(component.type);

  const simData = (simResult as { componentResults?: Record<string, { temperature: number; current: number }> })
    ?.componentResults?.[component.id];
  const temp = simData?.temperature ?? 25;
  const heatColor = temp > 80 ? '#ef4444' : temp > 60 ? '#f97316' : temp > 40 ? '#f59e0b' : color;

  return (
    <group position={[px, 0, pz]} rotation={[0, (-component.rotation * Math.PI) / 180, 0]}>
      {mesh3d === 'cylinder' && (
        <mesh ref={ref} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.5, 12]} />
          <meshStandardMaterial color={heatColor} roughness={0.4} metalness={0.3} />
        </mesh>
      )}
      {mesh3d === 'capacitor_electrolytic' && (
        <mesh ref={ref} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.6, 12]} />
          <meshStandardMaterial color="#1a2040" roughness={0.5} metalness={0.2} />
        </mesh>
      )}
      {mesh3d === 'led' && (
        <mesh ref={ref} castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.3, 8]} />
          <meshStandardMaterial
            color={component.properties.color ?? '#ff0000'}
            emissive={simData && simData.current > 0.001 ? component.properties.color ?? '#ff0000' : '#000000'}
            emissiveIntensity={simData && simData.current > 0.001 ? 2 : 0}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      {mesh3d === 'dip' && (
        <mesh ref={ref} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.4]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.7} metalness={0.1} />
        </mesh>
      )}
      {mesh3d === 'sot' && (
        <mesh ref={ref} castShadow>
          <boxGeometry args={[0.3, 0.15, 0.2]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.7} metalness={0.1} />
        </mesh>
      )}
      {(mesh3d === 'box' || !mesh3d) && (
        <mesh ref={ref} castShadow>
          <boxGeometry args={[0.6, 0.25, 0.4]} />
          <meshStandardMaterial color={heatColor} roughness={0.5} metalness={0.2} />
        </mesh>
      )}

      {/* Selection glow */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[0.9, 0.4, 0.7]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.14}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
        font="/fonts/JetBrainsMono.woff"
      >
        {component.label}
      </Text>
    </group>
  );
}

function Wire3D({ wire, circuit, simResult }: { wire: Wire; circuit: { components: Record<string, CircuitComponent> }; simResult: unknown }) {
  if (!wire.fromComponentId || !wire.toComponentId) return null;

  const fromComp = circuit.components[wire.fromComponentId];
  const toComp = circuit.components[wire.toComponentId];
  if (!fromComp || !toComp) return null;

  const points = [
    new THREE.Vector3(
      (fromComp.position.x - 400) / 40,
      0.05,
      (fromComp.position.y - 300) / 40
    ),
    new THREE.Vector3(
      (toComp.position.x - 400) / 40,
      0.05,
      (toComp.position.y - 300) / 40
    ),
  ];

  const color = '#22c55e';

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
    />
  );
}

function getComponentColor(type: string): string {
  const colorMap: Record<string, string> = {
    resistor: '#c4823d',
    capacitor: '#2a5080',
    inductor: '#3a6050',
    battery: '#3a5020',
    dc_source: '#203050',
    led: '#cc4400',
    diode: '#884400',
    bjt_npn: '#202040',
    bjt_pnp: '#202040',
    mosfet_n: '#202040',
    opamp: '#1a1a30',
    timer_555: '#1a1a30',
    gate_and: '#1a1a30',
    relay: '#203020',
    motor_dc: '#302010',
  };
  return colorMap[type] ?? '#2a2a3e';
}
