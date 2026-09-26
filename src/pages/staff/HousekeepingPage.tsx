import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDot, Clock3, Loader2, Pause, Play, RotateCcw, Save, UserRoundCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHousekeepingTaskList } from '@/hooks/useRoomOperations';
import { getHousekeepingTeam, performHousekeepingAction, setStaffAvailability } from '@/services/roomOperationsService';
import type { HousekeepingStaffAvailability, HousekeepingTask } from '@/types';
import { navigate } from '@/utils/router';

type TaskSection = 'my' | 'today' | 'upcoming' | 'completed';

export function HousekeepingPage() {
  const { staffData } = useAuth();
  const hotelId = staffData?.hotelId ?? '';
  const isManager = staffData?.role === 'manager';
  const { tasks, loading, error, refresh } = useHousekeepingTaskList(
    hotelId,
    isManager ? undefined : staffData?.staffId,
  );
  const [team, setTeam] = useState<HousekeepingStaffAvailability[]>([]);
  const [section, setSection] = useState<TaskSection>('my');
  const [availability, setAvailability] = useState<HousekeepingStaffAvailability['availability']>('available');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);

  const refreshTeam = useCallback(async () => {
    if (!hotelId || (!isManager && !staffData?.housekeepingEligible)) return;
    try {
      const list = await getHousekeepingTeam(hotelId);
      setTeam(list);
      const mine = list.find((member) => member.id === staffData?.staffId);
      if (mine) setAvailability(mine.availability);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to load housekeeping availability.');
    }
  }, [hotelId, isManager, staffData?.housekeepingEligible, staffData?.staffId]);

  useEffect(() => { void refreshTeam(); }, [refreshTeam]);

  const visibleTasks = useMemo(
    () => isManager ? tasks : tasks.filter((task) => task.assignedStaffId === staffData?.staffId),
    [isManager, staffData?.staffId, tasks],
  );
  const myTasks = visibleTasks.filter((task) => ['assigned', 'in_progress', 'paused'].includes(task.status));
  const todayTasks = visibleTasks.filter((task) => {
    const today = new Date().toDateString();
    return task.status === 'in_progress' || new Date(task.createdAt).toDateString() === today;
  });
  const upcomingTasks = visibleTasks.filter((task) => ['pending', 'assigned'].includes(task.status));
  const completedTasks = visibleTasks.filter((task) => task.status === 'completed');
  const sectionTasks: Record<TaskSection, HousekeepingTask[]> = {
    my: myTasks,
    today: todayTasks,
    upcoming: upcomingTasks,
    completed: completedTasks,
  };

  if (!staffData) return null;
  if (!isManager && !staffData.housekeepingEligible) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Housekeeping tasks are available to managers and housekeeping-authorized staff.
      </div>
    );
  }

  async function runTaskAction(task: HousekeepingTask, action: string, extras?: {
    note?: string;
    inspectionPassed?: boolean;
  }) {
    setBusyTask(task.id);
    setActionError(null);
    try {
      await performHousekeepingAction({ taskId: task.id, action, ...extras });
      await Promise.all([refresh(), refreshTeam()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Task update failed.';
      setActionError(message);
      console.error(message, err);
    } finally {
      setBusyTask(null);
    }
  }

  async function changeAvailability(next: HousekeepingStaffAvailability['availability']) {
    setActionError(null);
    try {
      await setStaffAvailability(next);
      setAvailability(next);
      await refreshTeam();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Availability update failed.';
      setActionError(message);
      console.error(message, err);
    }
  }

  const sections: { id: TaskSection; label: string; count: number }[] = [
    { id: 'my', label: 'My Tasks', count: myTasks.length },
    { id: 'today', label: "Today's Rooms", count: todayTasks.length },
    { id: 'upcoming', label: 'Upcoming', count: upcomingTasks.length },
    { id: 'completed', label: 'Completed', count: completedTasks.length },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ops-400">Mobile work queue</p>
          <h1 className="mt-1 text-2xl font-bold text-ops-900">Housekeeping</h1>
          <p className="mt-1 text-sm text-ops-500">Room tasks, guest requests and inspection handoff.</p>
        </div>
        <button type="button" onClick={() => navigate('/staff/rooms')} className="min-h-11 rounded-lg border border-ops-200 bg-white px-4 text-sm font-semibold text-ops-700">
          Room board
        </button>
      </header>

      {!isManager && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ops-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ops-100 text-ops-700"><UserRoundCheck className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-semibold text-ops-900">{staffData.name}</p>
              <p className="text-xs text-ops-500">Current shift availability</p>
            </div>
          </div>
          <select
            aria-label="Set availability"
            value={availability}
            onChange={(event) => void changeAvailability(event.target.value as HousekeepingStaffAvailability['availability'])}
            className="min-h-11 rounded-lg border border-ops-200 bg-white px-3 text-sm font-semibold text-ops-800"
          >
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="off_shift">Off shift</option>
          </select>
        </section>
      )}

      {(error || actionError) && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError ?? error}</div>
      )}

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Housekeeping task sections">
        {sections.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`min-h-14 rounded-xl border px-3 text-left ${
              section === item.id ? 'border-ops-800 bg-ops-900 text-white' : 'border-ops-200 bg-white text-ops-700'
            }`}
          >
            <span className="block text-xs font-semibold">{item.label}</span>
            <span className={`text-sm tabular-nums ${section === item.id ? 'text-ops-200' : 'text-ops-400'}`}>{item.count} tasks</span>
          </button>
        ))}
      </nav>

      {isManager && team.length > 0 && (
        <section className="rounded-xl border border-ops-200 bg-white p-4">
          <h2 className="text-sm font-bold text-ops-900">Housekeeping workload</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-lg bg-ops-50 px-3 py-2">
                <span className="text-sm font-medium text-ops-800">{member.name}</span>
                <span className="text-xs text-ops-500">{member.availability.replace(/_/g, ' ')} · {member.activeTasks} active</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-ops-500" /></div>
      ) : sectionTasks[section].length === 0 ? (
        <div className="rounded-xl border border-dashed border-ops-300 bg-white px-5 py-14 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-ops-700">
            {section === 'my' ? 'No active tasks assigned to you.' : `No ${sections.find((item) => item.id === section)?.label.toLowerCase()} tasks.`}
          </p>
          {section === 'my' && <p className="mt-1 text-xs text-ops-400">New assignments appear here in real time.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {sectionTasks[section].map((task) => (
            <HousekeepingTaskCard
              key={task.id}
              task={task}
              currentStaffId={staffData.staffId}
              isManager={isManager}
              busy={busyTask === task.id}
              onAction={runTaskAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HousekeepingTaskCard({
  task,
  currentStaffId,
  isManager,
  busy,
  onAction,
}: {
  task: HousekeepingTask;
  currentStaffId: string;
  isManager: boolean;
  busy: boolean;
  onAction: (task: HousekeepingTask, action: string, extras?: { note?: string; inspectionPassed?: boolean }) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [issue, setIssue] = useState('');
  const isMine = task.assignedStaffId === currentStaffId;
  const canWork = isManager || isMine;
  const isInspection = task.taskType === 'inspection';
  const dueLabel = task.dueAt ? new Date(task.dueAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;

  return (
    <article className="rounded-xl border border-ops-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ops-900">{task.title}</h2>
            <span className="rounded-full bg-ops-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-ops-700">{task.status.replace(/_/g, ' ')}</span>
            {isInspection && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-800">Inspection</span>}
          </div>
          <p className="mt-1 text-sm text-ops-600">Room {task.roomNumber} · {task.roomType} · Floor {task.floor}</p>
          <p className="mt-1 text-xs text-ops-500">{task.description}</p>
          {task.assignedStaffName && <p className="mt-2 text-xs font-medium text-ops-500">Assigned to {task.assignedStaffName}</p>}
          {task.requestId && (
            <button type="button" onClick={() => navigate(`/staff/requests/${task.requestId}`)} className="mt-2 text-xs font-semibold text-sea-700 underline">
              Guest request · {task.requestStatus?.replace('_', ' ') ?? 'Open'}
            </button>
          )}
          {dueLabel && <p className="mt-2 flex items-center gap-1 text-xs text-amber-700"><Clock3 className="h-3.5 w-3.5" /> Due {dueLabel}</p>}
        </div>
        <span className="shrink-0 rounded-lg bg-ops-50 px-2.5 py-1 text-xs font-semibold capitalize text-ops-600">{task.priority}</span>
      </div>

      {task.notes && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Notes: {task.notes}</p>}

      {task.status !== 'completed' && task.status !== 'cancelled' && (
        <div className="mt-4 space-y-3 border-t border-ops-100 pt-4">
          {!canWork ? (
            <p className="text-sm text-ops-500">Waiting for a manager to assign this task to a housekeeper.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {task.status === 'assigned' && (
                  <TaskAction disabled={busy} icon={<Play className="h-4 w-4" />} onClick={() => void onAction(task, 'start')}>Start task</TaskAction>
                )}
                {task.status === 'paused' && (
                  <TaskAction disabled={busy} icon={<Play className="h-4 w-4" />} onClick={() => void onAction(task, 'resume')}>Resume</TaskAction>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <TaskAction disabled={busy} muted icon={<Pause className="h-4 w-4" />} onClick={() => void onAction(task, 'pause', { note: note || undefined })}>Pause</TaskAction>
                    {isInspection ? (
                      <>
                        <TaskAction disabled={busy} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void onAction(task, 'mark_inspected', { note: note || undefined, inspectionPassed: true })}>Pass inspection</TaskAction>
                        <TaskAction disabled={busy} danger icon={<RotateCcw className="h-4 w-4" />} onClick={() => void onAction(task, 'mark_inspected', { note: note || 'Inspection failed; room needs another clean.', inspectionPassed: false })}>Fail · re-clean</TaskAction>
                      </>
                    ) : (
                      <TaskAction disabled={busy} icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void onAction(task, 'complete', { note: note || undefined })}>Complete task</TaskAction>
                    )}
                  </>
                )}
              </div>

              {task.status === 'pending' && isManager && (
                <button type="button" onClick={() => navigate('/staff/rooms')} className="text-sm font-semibold text-sea-700 underline">
                  Assign this task from the room board
                </button>
              )}

              <details className="rounded-lg border border-ops-100">
                <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-ops-700">
                  Add note or report an issue
                </summary>
                <div className="space-y-2 border-t border-ops-100 p-3">
                  <label className="block text-xs font-medium text-ops-600">Task note</label>
                  <div className="flex gap-2">
                    <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Short update" className="h-11 min-w-0 flex-1 rounded-lg border border-ops-200 px-3 text-sm" />
                    <button type="button" disabled={busy || !note.trim()} onClick={() => void onAction(task, 'add_note', { note: note.trim() })} className="flex min-h-11 items-center gap-1.5 rounded-lg border border-ops-200 px-3 text-sm font-semibold text-ops-700 disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
                  </div>
                  <label className="block pt-1 text-xs font-medium text-ops-600">Report a room issue</label>
                  <div className="flex gap-2">
                    <input value={issue} onChange={(event) => setIssue(event.target.value)} placeholder="Describe the issue" className="h-11 min-w-0 flex-1 rounded-lg border border-ops-200 px-3 text-sm" />
                    <button type="button" disabled={busy || !issue.trim()} onClick={() => void onAction(task, 'report_issue', { note: issue.trim() })} className="flex min-h-11 items-center gap-1.5 rounded-lg bg-rose-700 px-3 text-sm font-semibold text-white disabled:opacity-50"><AlertTriangle className="h-4 w-4" /> Report</button>
                  </div>
                </div>
              </details>
            </>
          )}
        </div>
      )}
      {task.status === 'completed' && <p className="mt-4 flex items-center gap-2 border-t border-ops-100 pt-3 text-sm font-medium text-emerald-700"><CircleDot className="h-4 w-4" /> Completed{task.completedAt ? ` at ${new Date(task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</p>}
    </article>
  );
}

function TaskAction({
  children,
  icon,
  onClick,
  disabled,
  muted = false,
  danger = false,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  muted?: boolean;
  danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-50 sm:min-w-36 ${
      danger ? 'bg-rose-700 hover:bg-rose-800' : muted ? 'bg-ops-600 hover:bg-ops-700' : 'bg-emerald-700 hover:bg-emerald-800'
    }`}>
      {busyIcon(icon, disabled)} {children}
    </button>
  );
}

function busyIcon(icon: React.ReactNode, busy: boolean) {
  return busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon;
}
