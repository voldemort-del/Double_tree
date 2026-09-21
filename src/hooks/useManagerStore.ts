import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { CHANNELS } from '@/realtime/channels';
import { subscribeToRealtimeBroadcast } from '@/realtime/bus';
import type { HotelRequest } from '@/types';
import { getAllRequests } from '@/services/requestService';
import { getStaffByHotel, type StaffWithDepartment } from '@/services/staffService';
import {
  getRecentActivity,
  computeDepartmentMetrics,
  computeStaffWorkload,
  computeSlaMetrics,
  computeDailyTrend,
  type ActivityItem,
  type DepartmentMetric,
  type StaffWorkloadItem,
  type SlaMetrics,
  type DayBucket,
} from '@/services/managerService';

// ============================================================
// Single hook that owns all manager-level data and realtime
// subscriptions. A single channel handles all events to avoid
// duplicate subscriptions.
// ============================================================

export interface ManagerStore {
  requests: HotelRequest[];
  staffList: StaffWithDepartment[];
  activity: ActivityItem[];
  deptMetrics: DepartmentMetric[];
  staffWorkload: StaffWorkloadItem[];
  slaMetrics: SlaMetrics;
  dailyTrend: DayBucket[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export type TimeRange = 'today' | '7d' | '30d';

export function filterRequestsByRange(
  requests: HotelRequest[],
  range: TimeRange,
): HotelRequest[] {
  const cutoff = new Date();
  if (range === 'today') {
    cutoff.setHours(0, 0, 0, 0);
  } else if (range === '7d') {
    cutoff.setDate(cutoff.getDate() - 7);
  } else {
    cutoff.setDate(cutoff.getDate() - 30);
  }
  return requests.filter((r) => new Date(r.createdAt) >= cutoff);
}

export function useManagerData(hotelId: string, timeRange: TimeRange = '7d'): ManagerStore {
  const [requests, setRequests] = useState<HotelRequest[]>([]);
  const [staffList, setStaffList] = useState<StaffWithDepartment[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = useCallback(async () => {
    if (!hotelId) return;
    try {
      const [reqs, staff, acts] = await Promise.all([
        getAllRequests(hotelId),
        getStaffByHotel(hotelId),
        getRecentActivity(hotelId),
      ]);
      setRequests(reqs);
      setStaffList(staff);
      setActivity(acts);
      setError(null);
    } catch (err) {
      console.error('Manager data fetch error:', err);
      setError('Failed to load manager data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refresh();
    }, 100);
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Cross-tab broadcast listener for demo mode / instant local sync
  useEffect(() => {
    const unsub = subscribeToRealtimeBroadcast((ev) => {
      if (
        ev.type.startsWith('request:') ||
        ev.type.startsWith('assignment:') ||
        ev.type === 'request_events:created'
      ) {
        debouncedRefresh();
      }
    });
    return unsub;
  }, [debouncedRefresh]);

  // Single realtime channel — requests + events
  useEffect(() => {
    if (!hotelId) return;
    const channelName = CHANNELS.managerRequests(hotelId);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => { debouncedRefresh(); },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_events' },
        () => { debouncedRefresh(); },
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [hotelId, debouncedRefresh]);

  // Derive computed metrics from the fetched request list
  const rangedRequests = filterRequestsByRange(requests, timeRange);
  const trendDays = timeRange === 'today' ? 1 : timeRange === '7d' ? 7 : 30;

  const deptMetrics = computeDepartmentMetrics(rangedRequests);
  const staffWorkload = computeStaffWorkload(requests, staffList); // always current
  const slaMetrics = computeSlaMetrics(requests); // always current
  const dailyTrend = computeDailyTrend(rangedRequests, trendDays);

  return {
    requests,
    staffList,
    activity,
    deptMetrics,
    staffWorkload,
    slaMetrics,
    dailyTrend,
    loading,
    error,
    refresh,
  };
}

// Re-export types for use in ManagerView
export type { ActivityItem, DepartmentMetric, StaffWorkloadItem, SlaMetrics, DayBucket };
