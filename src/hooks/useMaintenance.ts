import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getMaintenanceWorkOrder,
  getMaintenanceWorkOrderEvents,
  getMaintenanceWorkOrders,
} from '@/services/maintenanceService';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CHANNELS } from '@/realtime/channels';
import type { MaintenanceWorkOrder, MaintenanceWorkOrderEvent } from '@/types';

export function useMaintenanceWorkOrders(hotelId: string) {
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!hotelId) return;
    try {
      setWorkOrders(await getMaintenanceWorkOrders(hotelId));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load maintenance work orders.';
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refresh(), 100);
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hotelId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(CHANNELS.maintenanceWorkOrders(hotelId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_work_orders', filter: `hotel_id=eq.${hotelId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_work_order_events' }, scheduleRefresh)
      .subscribe((status, subscriptionError) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const message = 'Live maintenance updates are unavailable. Check the Supabase realtime configuration.';
          setError(message);
          console.error(message, subscriptionError ?? status);
        }
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [hotelId, scheduleRefresh]);

  return { workOrders, loading, error, refresh };
}

export function useMaintenanceWorkOrder(hotelId: string, workOrderId: string) {
  const [workOrder, setWorkOrder] = useState<MaintenanceWorkOrder | null>(null);
  const [events, setEvents] = useState<MaintenanceWorkOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!hotelId || !workOrderId) return;
    try {
      const [nextWorkOrder, nextEvents] = await Promise.all([
        getMaintenanceWorkOrder(hotelId, workOrderId),
        getMaintenanceWorkOrderEvents(workOrderId),
      ]);
      setWorkOrder(nextWorkOrder);
      setEvents(nextEvents);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load maintenance work order.';
      setError(message);
      console.error(message, err);
    } finally {
      setLoading(false);
    }
  }, [hotelId, workOrderId]);

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refresh(), 100);
  }, [refresh]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hotelId || !workOrderId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(CHANNELS.maintenanceWorkOrder(workOrderId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_work_orders', filter: `id=eq.${workOrderId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_work_order_events', filter: `work_order_id=eq.${workOrderId}` }, scheduleRefresh)
      .subscribe((status, subscriptionError) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const message = 'Live maintenance history is unavailable. Check the Supabase realtime configuration.';
          setError(message);
          console.error(message, subscriptionError ?? status);
        }
      });
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [hotelId, workOrderId, scheduleRefresh]);

  return { workOrder, events, loading, error, refresh };
}

export function useMaintenanceTeamRealtime(hotelId: string, refresh: () => void) {
  useEffect(() => {
    if (!hotelId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(CHANNELS.maintenanceTeam(hotelId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_availability' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_work_orders', filter: `hotel_id=eq.${hotelId}` }, refresh)
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Maintenance staff availability subscription failed:', error ?? status);
        }
      });
    return () => { void supabase.removeChannel(channel); };
  }, [hotelId, refresh]);
}
