"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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

type KanbanCardProps = {
  task: Task;
  statuses: StatusOption[];
  pending: boolean;
  locked: boolean;
  overdue: boolean;
  onMove: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

type KanbanColumnProps = {
  column: StatusOption;
  tasks: Task[];
  statuses: StatusOption[];
  pendingTaskIds: Set<number>;
  editingTaskId: number | null;
  now: number | null;
  onMove: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

function formatDue(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function taskDragId(taskId: number): string {
  return `task:${taskId}`;
}

function statusDropId(status: TaskStatus): string {
  return `status:${status}`;
}

function KanbanCard({ task, statuses, pending, locked, overdue, onMove, onEdit, onDelete }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: taskDragId(task.id),
    disabled: locked,
    data: { taskId: task.id },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      className={`ds-kanban-card ${isDragging ? "is-dragging" : ""}`}
      style={style}
      aria-busy={pending}
    >
      <div className="ds-kanban-card-top">
        <button
          ref={setActivatorNodeRef}
          className="ds-kanban-grip-button"
          disabled={locked}
          type="button"
          aria-label={`Drag ${task.title}`}
          title="Drag task"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="ds-icon-sm" aria-hidden="true" />
        </button>
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
}

function KanbanColumn({ column, tasks, statuses, pendingTaskIds, editingTaskId, now, onMove, onEdit, onDelete }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: statusDropId(column.value),
    data: { status: column.value },
  });

  return (
    <section
      ref={setNodeRef}
      className={`ds-kanban-column ${isOver ? "is-drop-target" : ""}`}
      aria-label={`${column.label} column`}
    >
      <h4 className="ds-kanban-heading mb-3 flex items-center justify-between gap-2" data-status={column.value}>
        {column.label}
        <span className="ds-kanban-count" aria-label={`${tasks.length} tasks`}>{tasks.length}</span>
      </h4>

      <div className="grid content-start gap-3">
        {tasks.length === 0 && <p className="ds-kanban-empty">No tasks</p>}
        {tasks.map((task) => {
          const pending = pendingTaskIds.has(task.id);
          const locked = pending || editingTaskId === task.id;
          const overdue = now !== null
            && task.due_at !== null
            && new Date(task.due_at).getTime() < now
            && task.status !== "completed"
            && task.status !== "cancelled";

          return (
            <KanbanCard
              key={task.id}
              task={task}
              statuses={statuses}
              pending={pending}
              locked={locked}
              overdue={overdue}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function TaskKanban({ tasks, statuses, pendingTaskIds, editingTaskId, onMove, onEdit, onDelete }: Props) {
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); };
  }, []);

  const activeTask = useMemo(
    () => activeTaskId === null ? null : tasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, tasks],
  );

  function canMove(task: Task): boolean {
    return !pendingTaskIds.has(task.id) && editingTaskId !== task.id;
  }

  function handleDragStart(event: DragStartEvent) {
    const taskId = Number(event.active.data.current?.taskId);
    if (Number.isFinite(taskId)) setActiveTaskId(taskId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const taskId = Number(event.active.data.current?.taskId);
    const status = event.over?.data.current?.status as TaskStatus | undefined;
    setActiveTaskId(null);

    if (!Number.isFinite(taskId) || !status) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !canMove(task) || task.status === status) return;
    onMove(task, status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveTaskId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="ds-kanban-board" aria-label="Kanban board">
        <p className="ds-meta mb-3">Drag tasks by the grip handle, or change status from the card control.</p>
        <div className="ds-kanban-grid">
          {statuses.map((column) => (
            <KanbanColumn
              key={column.value}
              column={column}
              tasks={tasks.filter((task) => task.status === column.value)}
              statuses={statuses}
              pendingTaskIds={pendingTaskIds}
              editingTaskId={editingTaskId}
              now={now}
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="ds-kanban-drag-overlay">
            <GripVertical className="ds-icon-sm" aria-hidden="true" />
            <span className="truncate">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
