import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UIState, ViewMode, SimulationMode } from '@/types';

interface UIStore extends UIState {
  setViewMode: (mode: ViewMode) => void;
  setActiveTab: (tab: UIState['activeTab']) => void;
  toggleGrid: () => void;
  toggleLabels: () => void;
  toggleValues: () => void;
  toggleCurrentFlow: () => void;
  toggleThermal: () => void;
  toggleVoltageOverlay: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setPropertiesPanelOpen: (open: boolean) => void;
  setInstrumentsOpen: (open: boolean) => void;
  setActiveInstrument: (instr: UIState['activeInstrument']) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setSimulationRunning: (running: boolean) => void;
  toggleDarkMode: () => void;
  simulationMode: SimulationMode;
  setSimulationMode: (mode: SimulationMode) => void;
}

export const useUIStore = create<UIStore>()(
  immer((set) => ({
    viewMode: '2d',
    activeTab: 'components',
    showGrid: true,
    showLabels: true,
    showValues: true,
    showCurrentFlow: true,
    showThermal: false,
    showVoltageOverlay: false,
    snapToGrid: true,
    gridSize: 20,
    sidebarOpen: true,
    propertiesPanelOpen: true,
    instrumentsOpen: false,
    activeInstrument: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    isSimulationRunning: false,
    isDarkMode: true,
    simulationMode: 'dc',

    setViewMode: (mode) => set(state => { state.viewMode = mode; }),
    setActiveTab: (tab) => set(state => { state.activeTab = tab; }),
    toggleGrid: () => set(state => { state.showGrid = !state.showGrid; }),
    toggleLabels: () => set(state => { state.showLabels = !state.showLabels; }),
    toggleValues: () => set(state => { state.showValues = !state.showValues; }),
    toggleCurrentFlow: () => set(state => { state.showCurrentFlow = !state.showCurrentFlow; }),
    toggleThermal: () => set(state => { state.showThermal = !state.showThermal; }),
    toggleVoltageOverlay: () => set(state => { state.showVoltageOverlay = !state.showVoltageOverlay; }),
    toggleSnapToGrid: () => set(state => { state.snapToGrid = !state.snapToGrid; }),
    setGridSize: (size) => set(state => { state.gridSize = size; }),
    setSidebarOpen: (open) => set(state => { state.sidebarOpen = open; }),
    setPropertiesPanelOpen: (open) => set(state => { state.propertiesPanelOpen = open; }),
    setInstrumentsOpen: (open) => set(state => { state.instrumentsOpen = open; }),
    setActiveInstrument: (instr) => set(state => { state.activeInstrument = instr; state.instrumentsOpen = instr !== null; }),
    setZoom: (zoom) => set(state => { state.zoom = zoom; }),
    setPan: (x, y) => set(state => { state.panX = x; state.panY = y; }),
    setSimulationRunning: (running) => set(state => { state.isSimulationRunning = running; }),
    toggleDarkMode: () => set(state => { state.isDarkMode = !state.isDarkMode; }),
    setSimulationMode: (mode) => set(state => { state.simulationMode = mode; }),
  }))
);
