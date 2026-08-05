import React from 'react';
import SprintBoard from '../components/SprintBoard';
import GoogleCalendarConnect from '../components/GoogleCalendarConnect';

export default function SprintPlannerPage() {
  return (
    <div className="flex-1 w-full bg-[var(--background)] flex flex-col pt-4 overflow-hidden">
      {/* Header */}
      <div className="px-6 pr-48 text-left">
        <h2 className="!mb-0 text-2xl font-bold tracking-tight text-[var(--text-h)]">
          Sprint Workspace Board
        </h2>
        <p className="text-xs text-[var(--text)] mt-0.5">
          Place or modify sticky item cards, departmental configurations, and mock layout workflows.
        </p>
      </div>

      {/* Google Calendar Connect Widget */}
      <div className="px-6 mt-4 pr-48">
        <GoogleCalendarConnect />
      </div>

      <div className="flex-1 overflow-y-auto">
        <SprintBoard />
      </div>
    </div>
  );
}