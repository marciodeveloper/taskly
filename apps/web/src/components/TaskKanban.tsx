"use client";

import { useEffect, useState } from "react";
import type { Task, TaskStatus } from "@/lib/api/client";

type StatusOption = { value: TaskStatus; label: string };

type Props = {
  tasks: Task[];
  statuses: StatusOption[];
  pendingTaskIds: Set<number>;
  editingTaskId: number | null;
  onMove: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function formatDue(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function TaskKanban({ tasks, statuses, pendingTaskIds, editingTaskId, onMove, onEdit, onDelete }: Props) {
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dropStatus, setDropStatus] = useState<TaskStatus | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); };
  }, []);

  function canMove(task: Task): boolean {
    return !pendingTaskIds.has(task.id) && editingTaskId !== task.id;
  }

  function drop(event: React.DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/plain"));
    const task = tasks.find((item) => item.id === id && item.id === draggedTaskId);
    setDraggedTaskId(null);
    setDropStatus(null);
    if (task && task.status !== status && canMove(task)) onMove(task, status);
  }

  return <div className="mt-5 max-w-full overflow-x-auto pb-3" aria-label="Kanban board">
    <p className="mb-3 text-sm text-slate-600">Drag cards between columns, or use each card&apos;s Status select.</p>
    <div className="grid min-w-[64rem] grid-cols-4 gap-3">
      {statuses.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.value);
        const activeDrop = dropStatus === column.value;
        return <section
          key={column.value}
          className={`min-w-0 rounded-xl border p-3 ${activeDrop ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}
          aria-label={`${column.label} column`}
          onDragOver={(event) => {
            const dragged = tasks.find((task) => task.id === draggedTaskId);
            if (dragged && dragged.status !== column.value && canMove(dragged)) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropStatus(column.value);
            }
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropStatus(null);
          }}
          onDrop={(event) => drop(event, column.value)}
        >
          <h4 className="mb-3 flex items-center justify-between gap-2 font-semibold text-slate-900">
            {column.label}<span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600" aria-label={`${columnTasks.length} tasks`}>{columnTasks.length}</span>
          </h4>
          <div className="grid content-start gap-3">
            {columnTasks.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No tasks</p>}
            {columnTasks.map((task) => {
              const pending = pendingTaskIds.has(task.id);
              const locked = !canMove(task);
              const overdue = now !== null && task.due_at !== null && new Date(task.due_at).getTime() < now && task.status !== "completed" && task.status !== "cancelled";
              return <article
                key={task.id}
                className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                draggable={!locked}
                aria-busy={pending}
                onDragStart={(event) => {
                  if (locked) { event.preventDefault(); return; }
                  event.dataTransfer.setData("text/plain", String(task.id));
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedTaskId(task.id);
                }}
                onDragEnd={() => { setDraggedTaskId(null); setDropStatus(null); }}
              >
                <h5 className="break-words font-semibold text-slate-900">{task.title}</h5>
                {task.short_description && <p className="mt-1 break-words text-sm text-slate-600">{task.short_description}</p>}
                {task.due_at && <p className="mt-2 text-xs text-slate-600">Due · {formatDue(task.due_at)}</p>}
                {overdue && <span className="mt-2 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Overdue</span>}
                {task.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1" aria-label="Tags">{task.tags.map((tag) => <span key={tag.id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{tag.color && <span className="h-2 w-2 rounded-full border border-black/10" style={{ backgroundColor: tag.color }} aria-hidden="true" />}{tag.name}</span>)}</div>}
                <p className="mt-3 text-xs text-slate-500">{task.attachments.length} attachment{task.attachments.length === 1 ? "" : "s"}</p>
                <label className="mt-3 block text-xs font-medium text-slate-700" htmlFor={`kanban-status-${task.id}`}>Status</label>
                <select
                  id={`kanban-status-${task.id}`}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 disabled:opacity-60"
                  aria-label={`Status for ${task.title}`}
                  disabled={locked}
                  value={task.status}
                  onChange={(event) => onMove(task, event.target.value as TaskStatus)}
                >{statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                {pending && <p className="mt-2 text-xs font-medium text-indigo-700" role="status">Moving...</p>}
                <div className="mt-3 flex gap-3 text-sm font-semibold">
                  <button className="text-indigo-600 hover:underline disabled:opacity-60" disabled={pending} onClick={() => onEdit(task)} type="button">Edit</button>
                  <button className="text-red-700 hover:underline disabled:opacity-60" disabled={pending} onClick={() => onDelete(task)} type="button">Delete</button>
                </div>
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>
  </div>;
}
