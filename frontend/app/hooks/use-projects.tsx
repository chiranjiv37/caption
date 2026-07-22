'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectsApi, Project } from '@/app/lib/api';

interface UseProjectsOptions {
  search?: string;
  status?: string;
  favorite?: boolean;
  archived?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  per_page?: number;
}

interface UseProjectsReturn {
  projects: Project[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProject: (data: {
    name: string;
    description?: string;
    source_language?: string;
    series_id?: string;
    file: File;
  }, onProgress?: (progress: number) => void) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string, permanent?: boolean) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
  duplicateProject: (id: string, newName?: string) => Promise<Project>;
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Destructure options to ensure stable dependencies
  const { search, status, favorite, archived, sort_by, sort_order, page, per_page } = options;

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await projectsApi.list({ search, status, favorite, archived, sort_by, sort_order, page, per_page }) as { items: Project[]; total: number };

      // Transform API response to match frontend format
      const transformedProjects = response.items.map(project => ({
        ...project,
        // Add frontend-specific fields if not present
        langs: project.langs || 1,
        dur: project.duration_display || formatDuration(project.duration_seconds || 0),
        updated: formatRelativeTime(project.updated_at),
        desc: project.description || '',
        ts: new Date(project.updated_at).getTime(),
      }));

      setProjects(transformedProjects);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, [search, status, favorite, archived, sort_by, sort_order, page, per_page]);

  useEffect(() => {
    console.log("fetchProjects effect");
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (
    data: {
      name: string;
      description?: string;
      source_language?: string;
      series_id?: string;
      file: File;
    },
    onProgress?: (progress: number) => void
  ) => {
    const project = await projectsApi.create(data, onProgress);
    await fetchProjects();
    return project;
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    const project = await projectsApi.update(id, data);
    await fetchProjects();
    return project;
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: string, permanent?: boolean) => {
    await projectsApi.delete(id, permanent);
    await fetchProjects();
  }, [fetchProjects]);

  const toggleFavorite = useCallback(async (id: string) => {
    await projectsApi.toggleFavorite(id);
    await fetchProjects();
  }, [fetchProjects]);

  const toggleArchive = useCallback(async (id: string) => {
    await projectsApi.toggleArchive(id);
    await fetchProjects();
  }, [fetchProjects]);

  const duplicateProject = useCallback(async (id: string, newName?: string) => {
    const project = await projectsApi.duplicate(id, newName);
    await fetchProjects();
    return project;
  }, [fetchProjects]);

  return {
    projects,
    total,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    toggleFavorite,
    toggleArchive,
    duplicateProject,
  };
}

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }

    const fetchProject = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await projectsApi.get(projectId);
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  return { project, isLoading, error };
}

// Utility functions
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `0:${seconds.toString().padStart(2, '0')}`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString();
}
