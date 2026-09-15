"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  GripVertical,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
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

  return (
    <div className="ds-kanban-board" aria-label="Kanban board">
      <p className="ds-meta mb-3">Drag cards between columns, or change status from the card control.</p>
      <div className="ds-kanban-grid">
        {statuses.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.value);
          const activeDrop = dropStatus === column.value;
          return (
            <section
              key={column.value}
              className={`ds-kanban-column ${activeDrop ? "is-drop-target" : ""}`}
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
              <h4 className="ds-kanban-heading mb-3 flex items-center justify-between gap-2" data-status={column.value}>
                {column.label}
                <span className="ds-kanban-count" aria-label={`${columnTasks.length} tasks`}>{columnTasks.length}</span>
              </h4>

              <div className="grid content-start gap-3">
                {columnTasks.length === 0 && <p className="ds-kanban-empty">No tasks</p>}
                {columnTasks.map((task) => {
                  const pending = pendingTaskIds.has(task.id);
                  const locked = !canMove(task);
                  const overdue = now !== null && task.due_at !== null && new Date(task.due_at).getTime() < now && task.status !== "completed" && task.status !== "cancelled";

                  return (
                    <article
                      key={task.id}
                      className="ds-kanban-card"
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
                      <div className="ds-kanban-card-top">
                        <GripVertical className="ds-icon-sm ds-kanban-grip" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <h5 className="ds-card-title">{task.title}</h5>
                          {task.short_description && <p className="ds-copy mt-1 break-words">{task.short_description}</p>}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                        {task.due_at && (
                          <span className="ds-inline-meta">
                            <CalendarClock className="ds-icon-sm" aria-hidden="true" />
                            {formatDue(task.due_at)}
                          </span>
                        )}
                        {overdue && (
                          <span className="ds-overdue">
                            <AlertTriangle className="ds-icon-sm" aria-hidden="true" />
                            Overdue
                          </span>
                        )}
                        {task.attachments.length > 0 && (
                          <span className="ds-inline-meta">
                            <Paperclip className="ds-icon-sm" aria-hidden="true" />
                            {task.attachments.length}
                          </span>
                        )}
                      </div>

                      {task.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
                          {task.tags.map((tag) => (
                            <span key={tag.id} className="ds-tag">
                              {tag.color && <span className="ds-tag-dot" style={{ backgroundColor: tag.color }} aria-hidden="true" />}
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="ds-kanban-footer">
                        <label className="sr-only" htmlFor={`kanban-status-${task.id}`}>Status for {task.title}</label>
                        <select
                          id={`kanban-status-${task.id}`}
                          className="ds-input ds-status-control"
                          aria-label={`Status for ${task.title}`}
                          disabled={locked}
                          value={task.status}
                          onChange={(event) => onMove(task, event.target.value as TaskStatus)}
                        >
                          {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        {pending && <p className="ds-accent-text mt-2 text-xs" role="status">Moving...</p>}
                        <div className="ds-task-actions mt-3">
                          <button className="ds-action-button" disabled={pending} onClick={() => onEdit(task)} type="button">
                            <Pencil className="ds-icon-sm" aria-hidden="true" />
                            Edit
                          </button>
                          <button className="ds-action-button is-danger" disabled={pending} onClick={() => onDelete(task)} type="button">
                            <Trash2 className="ds-icon-sm" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
