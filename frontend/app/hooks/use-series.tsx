'use client';

import { useState, useEffect, useCallback } from 'react';
import { seriesApi, Series, SeriesDetail } from '@/app/lib/api';

interface UseSeriesOptions {
  search?: string;
  archived?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  per_page?: number;
}

interface UseSeriesReturn {
  series: Series[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSeries: (data: { name: string; description?: string; languages?: string[] }) => Promise<SeriesDetail>;
  updateSeries: (id: string, data: Partial<Series>) => Promise<SeriesDetail>;
  deleteSeries: (id: string, permanent?: boolean) => Promise<void>;
  toggleArchive: (id: string) => Promise<void>;
}

export function useSeries(options: UseSeriesOptions = {}): UseSeriesReturn {
  const [series, setSeries] = useState<Series[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Destructure options to ensure stable dependencies
  const { search, archived, sort_by, sort_order, page, per_page } = options;

  const fetchSeries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await seriesApi.list({ search, archived, sort_by, sort_order, page, per_page });

      // Transform API response to match frontend format
      const transformedSeries = response.items.map(s => ({
        ...s,
        updated: formatRelativeTime(s.updated_at),
        ts: new Date(s.updated_at).getTime(),
      }));

      setSeries(transformedSeries);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch series');
    } finally {
      setIsLoading(false);
    }
  }, [search, archived, sort_by, sort_order, page, per_page]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const createSeries = useCallback(async (data: { name: string; description?: string; languages?: string[] }) => {
    const result = await seriesApi.create(data);
    await fetchSeries();
    return result;
  }, [fetchSeries]);

  const updateSeries = useCallback(async (id: string, data: Partial<Series>) => {
    const result = await seriesApi.update(id, data);
    await fetchSeries();
    return result;
  }, [fetchSeries]);

  const deleteSeries = useCallback(async (id: string, permanent?: boolean) => {
    await seriesApi.delete(id, permanent);
    await fetchSeries();
  }, [fetchSeries]);

  const toggleArchive = useCallback(async (id: string) => {
    await seriesApi.toggleArchive(id);
    await fetchSeries();
  }, [fetchSeries]);

  return {
    series,
    total,
    isLoading,
    error,
    refetch: fetchSeries,
    createSeries,
    updateSeries,
    deleteSeries,
    toggleArchive,
  };
}

export function useSeriesDetail(seriesId: string | null) {
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seriesId) {
      setSeries(null);
      return;
    }

    const fetchSeries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await seriesApi.get(seriesId);
        setSeries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch series');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeries();
  }, [seriesId]);

  const refetch = useCallback(async () => {
    if (!seriesId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await seriesApi.get(seriesId);
      setSeries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch series');
    } finally {
      setIsLoading(false);
    }
  }, [seriesId]);

  return { series, isLoading, error, refetch };
}

// Utility functions
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
