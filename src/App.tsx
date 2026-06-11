import { useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { DragProvider } from '@/context/DragContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { isDirty } from '@/utils/format';

export default function App() {
  // Warn on page reload/close if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Leave anyway?';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <ErrorBoundary>
      <DragProvider>
        <div className="w-full h-full flex flex-col bg-[#0f1117]">
          <ErrorBoundary>
            <MainLayout />
          </ErrorBoundary>
        </div>
      </DragProvider>
    </ErrorBoundary>
  );
}
