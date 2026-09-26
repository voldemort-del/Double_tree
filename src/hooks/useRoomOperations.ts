import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CHANNELS } from '@/realtime/channels';
import type { HousekeepingTask, RoomOperationsRoom } from '@/types';
import { getHousekeepingTasks, getRoomOperations } from '@/services/roomOperationsService';
import { toast } from '@/hooks/useToast';

export function useRoomOperationsData(hotelId: string) {
  const [rooms, setRooms] = useState<RoomOperationsRoom[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!hotelId) return;
    try {
      const [nextRooms, nextTasks] = await Promise.all([
        getRoomOperations(hotelId),
        getHousekeepingTasks(hotelId),
      ]);
      setRooms(nextRooms);
      setTasks(nextTasks);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load room operations.';
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refresh(), 80);
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hotelId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(CHANNELS.roomOperations(hotelId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `hotel_id=eq.${hotelId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'housekeeping_tasks', filter: `hotel_id=eq.${hotelId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_events', filter: `hotel_id=eq.${hotelId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_availability' }, scheduleRefresh)
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Room operations realtime subscription failed:', error ?? status);
          setError('Live room updates are unavailable. Check the Supabase realtime configuration.');
        }
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [hotelId, scheduleRefresh]);

  return { rooms, tasks, loading, error, refresh };
}

export function useHousekeepingTaskList(hotelId: string, staffId?: string) {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);
  const assignedTaskIdsRef = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!hotelId) return;
    try {
      const nextTasks = await getHousekeepingTasks(hotelId, staffId);
      const assignedTaskIds = new Set(
        nextTasks
          .filter((task) => task.assignedStaffId === staffId && !['completed', 'cancelled'].includes(task.status))
          .map((task) => task.id),
      );
      if (staffId && !initialLoadRef.current) {
        for (const task of nextTasks) {
          if (assignedTaskIds.has(task.id) && !assignedTaskIdsRef.current.has(task.id)) {
            toast.show({
              type: 'info',
              title: 'Housekeeping task assigned',
              message: `${task.title} · Room ${task.roomNumber}`,
            });
          }
        }
      }
      initialLoadRef.current = false;
      assignedTaskIdsRef.current = assignedTaskIds;
      setTasks(nextTasks);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load your housekeeping tasks.';
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [hotelId, staffId]);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refresh(), 80);
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hotelId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(CHANNELS.housekeepingTasks(staffId ?? hotelId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'housekeeping_tasks', filter: `hotel_id=eq.${hotelId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `hotel_id=eq.${hotelId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_events', filter: `hotel_id=eq.${hotelId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, scheduleRefresh)
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Housekeeping realtime subscription failed:', error ?? status);
          setError('Live task updates are unavailable. Check the Supabase realtime configuration.');
        }
      });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [hotelId, staffId, scheduleRefresh]);

  return { tasks, loading, error, refresh };
}
