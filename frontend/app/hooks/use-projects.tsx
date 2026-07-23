'use client';

import { useState, useEffect, useCallback } from 'react';
import { projectsApi, Project as ApiProject } from '@/app/lib/api';
import { mapApiProject } from '@/app/lib/mappers';
import type { Project } from '@/app/types';

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
  updateProject: (id: string, data: Partial<ApiProject>) => Promise<Project>;
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

  const { search, status, favorite, archived, sort_by, sort_order, page, per_page } = options;

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await projectsApi.list({
        search, status, favorite, archived, sort_by, sort_order, page, per_page,
      }) as { items: ApiProject[]; total: number };

      setProjects(response.items.map(mapApiProject));
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, [search, status, favorite, archived, sort_by, sort_order, page, per_page]);

  useEffect(() => {
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
    return mapApiProject(project);
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: string, data: Partial<ApiProject>) => {
    const project = await projectsApi.update(id, data);
    await fetchProjects();
    return mapApiProject(project);
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
    return mapApiProject(project);
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
        setProject(mapApiProject(data));
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
