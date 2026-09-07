import React, { useState, useEffect } from 'react';
import type { ViewMode, CornerItem, Incident } from './types';
import { HeaderNav } from './components/HeaderNav';
import { StrategicDashboard } from './components/StrategicDashboard';
import { LiveStewardDashboard } from './components/LiveStewardDashboard';
import { TrackCalibrationTool } from './components/TrackCalibrationTool';
import { IncidentsQueueView } from './components/IncidentsQueueView';
import { IncidentReviewModal } from './components/IncidentReviewModal';

export const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<ViewMode>('STRATEGY');
  const [corners, setCorners] = useState<CornerItem[]>([]);
  const [selectedCornerId, setSelectedCornerId] = useState<string>('RBR-T9');
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState<number>(0);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);

  useEffect(() => {
    fetchCorners();
    fetchIncidents();
  }, []);

  const fetchCorners = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/corners');
      if (res.ok) {
        const data = await res.json();
        setCorners(data);
        if (data.length > 0 && !selectedCornerId) {
          setSelectedCornerId(data[0].corner_id);
        }
      }
    } catch (e) {
      console.error('Failed to load corners:', e);
    }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/incidents');
      if (res.ok) {
        const data: Incident[] = await res.json();
        const pending = data.filter(i => i.status === 'PENDING_REVIEW').length;
        setPendingIncidentsCount(pending);
      }
    } catch (e) {
      console.error('Failed to load incidents:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <HeaderNav
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        pendingIncidentsCount={pendingIncidentsCount}
        isLiveStreaming={isLiveStreaming}
      />

      {/* Main Content Area Based on Mode */}
      <main className="flex-1">
        {currentMode === 'STRATEGY' && (
          <StrategicDashboard
            corners={corners}
            selectedCornerId={selectedCornerId}
            onSelectCorner={setSelectedCornerId}
          />
        )}

        {currentMode === 'LIVE_STEWARD' && (
          <LiveStewardDashboard
            corners={corners}
            selectedCornerId={selectedCornerId}
            onSelectCorner={setSelectedCornerId}
            onOpenIncidentReview={setActiveIncidentId}
            onSetLiveStreaming={setIsLiveStreaming}
          />
        )}

        {currentMode === 'CALIBRATION' && (
          <TrackCalibrationTool
            corners={corners}
            selectedCornerId={selectedCornerId}
            onSelectCorner={setSelectedCornerId}
            onCalibrationSaved={fetchCorners}
          />
        )}

        {currentMode === 'INCIDENTS' && (
          <IncidentsQueueView
            onOpenIncidentReview={setActiveIncidentId}
          />
        )}
      </main>

      {/* Steward Incident Review Modal */}
      <IncidentReviewModal
        incidentId={activeIncidentId}
        onClose={() => setActiveIncidentId(null)}
        onIncidentUpdated={() => {
          fetchIncidents();
        }}
      />
    </div>
  );
};

export default App;
