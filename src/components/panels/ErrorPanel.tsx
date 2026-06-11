import { useCircuitStore } from '@/store/circuitStore';
import { detectCircuitErrors } from '@/simulation/errorDetector';
import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Lightbulb } from 'lucide-react';

export default function ErrorPanel() {
  const { circuit, simulationResult } = useCircuitStore();

  const liveChecks = useMemo(() => detectCircuitErrors(circuit), [circuit]);

  const allErrors = [
    ...(simulationResult?.errors ?? []),
    ...liveChecks.errors,
  ];
  const allWarnings = [
    ...(simulationResult?.warnings ?? []),
    ...liveChecks.warnings,
  ];

  if (allErrors.length === 0 && allWarnings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-center p-4">
        <CheckCircle size={28} className="text-green-400 opacity-60" />
        <p className="text-xs text-gray-500">No errors detected</p>
        <p className="text-xs text-gray-600">Run simulation to perform full electrical analysis</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 overflow-y-auto">
      {allErrors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertCircle size={12} /> Errors ({allErrors.length})
          </h4>
          <div className="space-y-1.5">
            {allErrors.map((err, i) => (
              <ErrorCard key={i} type="error" message={err.message} suggestion={err.suggestion} />
            ))}
          </div>
        </div>
      )}

      {allWarnings.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle size={12} /> Warnings ({allWarnings.length})
          </h4>
          <div className="space-y-1.5">
            {allWarnings.map((warn, i) => (
              <ErrorCard key={i} type="warning" message={warn.message} suggestion={warn.suggestion} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorCard({ type, message, suggestion }: { type: 'error' | 'warning'; message: string; suggestion?: string }) {
  const isError = type === 'error';
  return (
    <div className={`rounded p-2 border ${isError ? 'bg-red-950/30 border-red-900/40' : 'bg-yellow-950/30 border-yellow-900/40'}`}>
      <div className="flex gap-2">
        {isError
          ? <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
          : <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0 mt-0.5" />}
        <div>
          <p className={`text-xs ${isError ? 'text-red-300' : 'text-yellow-300'}`}>{message}</p>
          {suggestion && (
            <div className="flex gap-1 mt-1">
              <Lightbulb size={10} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">{suggestion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
