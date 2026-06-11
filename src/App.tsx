import MainLayout from '@/components/layout/MainLayout';
import { DragProvider } from '@/context/DragContext';

export default function App() {
  return (
    <DragProvider>
      <div className="w-full h-full flex flex-col bg-[#0f1117]">
        <MainLayout />
      </div>
    </DragProvider>
  );
}
