'use client';

import { AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { CalendarHeader, MonthView, MultiMonthView, SixMonthView, CustomMonthView, YearView } from '@/components/calendar';
import { Sidebar } from '@/components/layout/Sidebar';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { EventModal } from '@/components/modals/EventModal';
import { PlanningContextModal } from '@/components/modals/PlanningContextModal';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';
import { DndProvider, TaskPanel } from '@/components/dnd';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useConstraintChecker } from '@/hooks/useConstraintChecker';

export default function Home() {
  const { viewMode, isFullscreen } = useUIStore();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  // Check constraints whenever events or constraints change
  useConstraintChecker();

  const renderCalendarView = () => {
    switch (viewMode) {
      case 'month':
        return <MonthView />;
      case 'multi-month':
        return <MultiMonthView />;
      case 'six-month':
        return <SixMonthView />;
      case 'custom':
        return <CustomMonthView />;
      case 'year':
        return <YearView />;
      default:
        return <MonthView />;
    }
  };

  return (
    <DndProvider>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {!isFullscreen && <CalendarHeader />}
        
        <div className="flex-1 flex overflow-hidden">
          {!isFullscreen && <Sidebar />}
          
          <main className={`flex-1 overflow-auto ${isFullscreen ? 'p-2' : 'p-4 lg:p-6'}`}>
            <AnimatePresence mode="wait">
              {renderCalendarView()}
            </AnimatePresence>
          </main>

          {!isFullscreen && <AIAssistant />}
        </div>

        <EventModal />
        <PlanningContextModal />
        <CommandPalette />
        <ToastContainer />
        <TaskPanel />
      </div>
    </DndProvider>
  );
}
