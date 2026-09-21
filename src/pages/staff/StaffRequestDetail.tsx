import { useState } from 'react';
import { useRequestDetail, useStaffActions, useStaffList } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { RequestDetailCard } from '@/components/RequestDetailCard';
import { RequestTimeline } from '@/components/RequestTimeline';
import { RouterLink } from '@/utils/router';
import type { RequestStatus } from '@/types';
import {
  ArrowLeft,
  CheckCircle2,
  Play,
  UserPlus,
  AlertTriangle,
  XCircle,
  User,
  MessageCircle,
  Loader2,
} from 'lucide-react';

export function StaffRequestDetail({ requestId }: { requestId: string }) {
  const { staffData } = useAuth();
  const { request, events, loading, refresh, setRequest } = useRequestDetail(requestId);
  const { updateStatus, assignRequest, escalateRequest } = useStaffActions();
  const staffList = useStaffList(staffData?.hotelId ?? '');
  const [showAssign, setShowAssign] = useState(false);
  const [acting, setActing] = useState(false);

  if (!staffData) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-ops-400" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-ops-400">Request not found.</p>
        <RouterLink to="/staff/requests" className="mt-3 inline-block text-sm font-medium text-ops-600">← Back to requests</RouterLink>
      </div>
    );
  }

  const staffName = staffData.name;

  const canAccept = request.status === 'Submitted';
  const canStart = request.status === 'Assigned' || request.status === 'Submitted';
  const canComplete = request.status === 'In Progress' || request.status === 'Assigned';
  const canCancel = request.status !== 'Completed' && request.status !== 'Cancelled';
  const canEscalate = request.status !== 'Completed' && request.status !== 'Cancelled';

  async function handleAction(fn: () => Promise<boolean>, optimisticPatch?: Partial<HotelRequest>) {
    const prevRequest = request;
    if (optimisticPatch && request) {
      setRequest({ ...request, ...optimisticPatch });
    }
    setActing(true);
    try {
      const ok = await fn();
      if (!ok && prevRequest) {
        setRequest(prevRequest);
      }
    } catch {
      if (prevRequest) {
        setRequest(prevRequest);
      }
    } finally {
      setActing(false);
      refresh();
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <RouterLink to="/staff/requests" className="inline-flex items-center gap-1.5 text-sm font-medium text-ops-500 transition-colors hover:text-ops-700">
        <ArrowLeft className="h-4 w-4" /> Back to all requests
      </RouterLink>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <RequestDetailCard request={request} guestName={request.guestName} staffName={request.assignedStaffName}>
            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {acting && <Loader2 className="h-4 w-4 animate-spin text-ops-400" />}
              {canAccept && !acting && (
                <ActionButton
                  onClick={() => handleAction(
                    () => assignRequest(request.id, staffData.staffId, staffName),
                    { status: 'Assigned', assignedStaffId: staffData.staffId, assignedStaffName: staffName }
                  )}
                  icon={<UserPlus className="h-4 w-4" />}
                  label="Accept & Assign"
                  variant="primary"
                />
              )}
              {!canAccept && !request.assignedStaffName && !acting && (
                <ActionButton onClick={() => setShowAssign(!showAssign)} icon={<UserPlus className="h-4 w-4" />} label="Assign" />
              )}
              {canStart && !acting && (
                <ActionButton
                  onClick={() => handleAction(
                    () => updateStatus(request.id, 'In Progress'),
                    { status: 'In Progress' }
                  )}
                  icon={<Play className="h-4 w-4" />}
                  label="Start"
                  variant="primary"
                />
              )}
              {canComplete && !acting && (
                <ActionButton
                  onClick={() => handleAction(
                    () => updateStatus(request.id, 'Completed'),
                    { status: 'Completed' }
                  )}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Complete"
                  variant="success"
                />
              )}
              {canEscalate && !acting && (
                <ActionButton
                  onClick={() => handleAction(
                    () => escalateRequest(request.id),
                    { status: 'Escalated' }
                  )}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Escalate"
                  variant="warn"
                />
              )}
              {canCancel && !acting && (
                <ActionButton
                  onClick={() => handleAction(
                    () => updateStatus(request.id, 'Cancelled'),
                    { status: 'Cancelled' }
                  )}
                  icon={<XCircle className="h-4 w-4" />}
                  label="Cancel"
                  variant="danger"
                />
              )}
            </div>

            {/* Assign picker */}
            {showAssign && (
              <div className="mt-3 rounded-lg border border-ops-200 bg-ops-50 p-3 animate-slide-up">
                <p className="mb-2 text-xs font-medium text-ops-500">Assign to staff member:</p>
                <div className="flex flex-wrap gap-2">
                  {staffList.filter((s) => s.role === 'staff').map((s) => {
                    const fullName = `${s.first_name} ${s.last_name}`;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          handleAction(
                            () => assignRequest(request.id, s.id, fullName),
                            { status: 'Assigned', assignedStaffId: s.id, assignedStaffName: fullName }
                          );
                          setShowAssign(false);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-ops-200 bg-white px-3 py-1.5 text-xs font-medium text-ops-700 transition-colors hover:border-ops-400 hover:bg-ops-100"
                      >
                        <User className="h-3 w-3" />
                        {fullName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </RequestDetailCard>

          {/* Guest context */}
          {request.guestName && (
            <div className="rounded-2xl border border-ops-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-ops-900">Guest Information</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Info label="Name" value={request.guestName} />
                <Info label="Room" value={request.roomNumber} />
              </div>
            </div>
          )}

          {/* Original request context */}
          {request.conversationId && (
            <div className="rounded-2xl border border-ops-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-ops-400" />
                <h3 className="text-sm font-semibold text-ops-900">Original Request</h3>
              </div>
              <p className="mt-2 rounded-lg bg-ops-50 p-3 text-sm text-ops-600">
                "{request.description}"
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-ops-200 bg-white p-6 sticky top-20">
            <h3 className="text-sm font-semibold text-ops-900">Request Timeline</h3>
            <p className="mt-0.5 text-xs text-ops-400">Full audit trail of events.</p>
            <div className="mt-5">
              <RequestTimeline events={events} request={request} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  variant = 'default',
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warn' | 'danger';
}) {
  const styles = {
    default: 'border-ops-200 bg-white text-ops-700 hover:bg-ops-50',
    primary: 'bg-ops-900 text-white hover:bg-ops-800',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    warn: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
    danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${styles[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ops-400">{label}</p>
      <p className="mt-0.5 font-medium text-ops-800">{value}</p>
    </div>
  );
}
