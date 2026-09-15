"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  api,
  type Task,
  type TaskPayload,
  type TaskStatus,
} from "@/lib/api/client";

const statuses: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type TaskFormProps = {
  projectId: number;
  task?: Task;
  onCancel: () => void;
  onSaved: (task: Task) => void;
};

function TaskForm({ projectId, task, onCancel, onSaved }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [shortDescription, setShortDescription] = useState(
    task?.short_description ?? "",
  );
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? "not_started",
  );
  const [dueAt, setDueAt] = useState(toLocalDateTime(task?.due_at ?? null));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setErrors({});
    setMessage("");

    const payload: TaskPayload = {
      title,
      short_description: shortDescription || null,
      description: description || null,
      status,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    };

    try {
      const saved = task
        ? await api.updateTask(task.id, payload)
        : await api.createTask(projectId, payload);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.validationErrors);
        setMessage(error.message);
      } else {
        setMessage("Unable to save this task.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="task-title">
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="task-title"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-describedby={errors.title ? "task-title-error" : undefined}
          required
        />
        {errors.title?.map((error) => <p className="mt-1 text-xs text-red-600" id="task-title-error" key={error}>{error}</p>)}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="task-short-description">
          Short description
        </label>
        <input
          id="task-short-description"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          maxLength={500}
          aria-describedby={errors.short_description ? "task-short-description-error" : undefined}
        />
        {errors.short_description?.map((error) => <p className="mt-1 text-xs text-red-600" id="task-short-description-error" key={error}>{error}</p>)}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="task-description">
          Description
        </label>
        <textarea
          id="task-description"
          className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="task-status">
            Status
          </label>
          <select
            id="task-status"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
          >
            {statuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="task-due-at">
            Due date
          </label>
          <input
            id="task-due-at"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
          {errors.due_at?.map((error) => <p className="mt-1 text-xs text-red-600" key={error}>{error}</p>)}
        </div>
      </div>
      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p>}
      <div className="flex gap-2">
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60" disabled={saving} type="submit">
          {saving ? "Saving..." : task ? "Save changes" : "Create task"}
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-white disabled:opacity-60" disabled={saving} onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function TaskWorkspace({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState("");
  const [statusPendingId, setStatusPendingId] = useState<number | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    let active = true;

    api.getTasks(projectId)
      .then((items) => {
        if (active) setTasks(items);
      })
      .catch(() => {
        if (active) setLoadError("Unable to load tasks for this project.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  function saveTask(saved: Task) {
    setTasks((current) => {
      const exists = current.some((item) => item.id === saved.id);
      return exists
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved];
    });
    setCreating(false);
    setEditingTask(null);
    setFeedback("Task saved.");
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    if (statusPendingId !== null || status === task.status) return;
    setStatusPendingId(task.id);
    setFeedback("");
    try {
      const saved = await api.updateTask(task.id, { status });
      setTasks((current) => current.map((item) => item.id === saved.id ? saved : item));
      setFeedback("Task status updated.");
    } catch {
      setFeedback("Unable to update task status.");
    } finally {
      setStatusPendingId(null);
    }
  }

  async function deleteTask() {
    if (!taskToDelete || deletePending) return;
    setDeletePending(true);
    setFeedback("");
    try {
      await api.deleteTask(taskToDelete.id);
      setTasks((current) => current.filter((item) => item.id !== taskToDelete.id));
      setFeedback("Task deleted.");
    } catch {
      setFeedback("Unable to delete this task.");
    } finally {
      setDeletePending(false);
      setTaskToDelete(null);
    }
  }

  return (
    <div className="mt-10 border-t border-slate-200 pt-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-900">Tasks</h3>
        {!creating && !editingTask && (
          <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onClick={() => { setCreating(true); setFeedback(""); }}>
            + New task
          </button>
        )}
      </div>

      {creating && <TaskForm projectId={projectId} onCancel={() => setCreating(false)} onSaved={saveTask} />}
      {editingTask && <TaskForm projectId={projectId} task={editingTask} onCancel={() => setEditingTask(null)} onSaved={saveTask} />}

      {loading && <p className="text-sm text-slate-500">Loading tasks...</p>}
      {loadError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{loadError}</p>}
      {!loading && !loadError && tasks.length === 0 && !creating && (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No tasks yet. Create one to plan the next step.</p>
      )}
      {!loading && !loadError && tasks.length > 0 && (
        <div className="grid gap-3">
          {tasks.map((task) => (
              <article className={`rounded-xl border p-4 ${task.status === "completed" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`} key={task.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-semibold text-slate-900 ${task.status === "completed" ? "line-through decoration-slate-400" : ""}`}>{task.title}</h4>
                    {task.short_description && <p className="mt-1 text-sm text-slate-600">{task.short_description}</p>}
                    {task.due_at && <p className="mt-2 text-xs font-medium text-slate-500">Due · {formatDateTime(task.due_at)}</p>}
                  </div>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 disabled:opacity-60"
                    aria-label={`Status for ${task.title}`}
                    disabled={statusPendingId !== null}
                    value={task.status}
                    onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)}
                  >
                    {statuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                  </select>
                </div>
                {task.description && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{task.description}</p>}
                <div className="mt-4 flex gap-3 text-sm font-semibold">
                  <button className="text-indigo-600 hover:underline" onClick={() => { setEditingTask(task); setCreating(false); setFeedback(""); }}>Edit</button>
                  <button className="text-red-700 hover:underline" onClick={() => { setTaskToDelete(task); setFeedback(""); }}>Delete</button>
                </div>
              </article>
          ))}
        </div>
      )}

      {feedback && <p className={`mt-4 text-sm font-medium ${feedback.startsWith("Unable") ? "text-red-700" : "text-emerald-700"}`} role="status">{feedback}</p>}

      {taskToDelete && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-900/40 p-6" role="dialog" aria-modal="true" aria-labelledby="delete-task-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900" id="delete-task-title">Delete &quot;{taskToDelete.title}&quot;?</h2>
            <p className="mt-2 text-slate-600">This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 disabled:opacity-60" disabled={deletePending} onClick={() => setTaskToDelete(null)}>Cancel</button>
              <button className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={deletePending} onClick={deleteTask}>{deletePending ? "Deleting..." : "Delete task"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
