'use client';

import { useAppState } from '@/app/hooks/use-app-state';
import { TopBar } from '@/app/components/topbar';
import { Toast } from '@/app/components/toast';
import { ProjectsView } from '@/app/views/projects-view';
import { SeriesView } from '@/app/views/series-view';
import { AssetsView } from '@/app/views/assets-view';
import { EditorView } from '@/app/views/editor-view';
import { ProtectedRoute } from '@/app/components/protected-route';

export default function Home() {
  const { state } = useAppState();
  const { view } = state;

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen overflow-hidden">
        <TopBar />

        <main className="flex-1 min-h-0 overflow-hidden">
          {view === 'projects' && <ProjectsView />}
          {view === 'series' && <SeriesView />}
          {view === 'assets' && <AssetsView />}
          {view === 'editor' && <EditorView />}
        </main>

        <Toast />
      </div>
    </ProtectedRoute>
  );
}
