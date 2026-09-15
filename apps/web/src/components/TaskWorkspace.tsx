"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import TaskKanban from "@/components/TaskKanban";
import {
  ApiError,
  api,
  type Attachment,
  type Tag,
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
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TagChip({ tag }: { tag: Tag }) {
  return <span className="ds-tag">
    {tag.color && <span className="ds-tag-dot" style={{ backgroundColor: tag.color }} aria-hidden="true" />}
    {tag.name}
  </span>;
}

function PersistedImagePreview({ attachment }: { attachment: Attachment }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    api.getAttachmentContent(attachment.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => { if (active) setPreviewError(true); });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id]);

  if (previewError) return <span className="ds-danger-text text-xs">Preview unavailable</span>;
  if (!previewUrl) return <span className="ds-meta">Loading preview...</span>;

  return <Image alt="" className="ds-thumbnail" src={previewUrl} width={48} height={48} unoptimized />;
}

function AttachmentItem({ attachment, onDelete }: { attachment: Attachment; onDelete?: (attachment: Attachment) => void }) {
  const [openPending, setOpenPending] = useState(false);
  const [openError, setOpenError] = useState("");

  async function openAttachment() {
    if (openPending) return;
    const previewTab = attachment.is_image ? window.open("about:blank", "_blank") : null;
    if (attachment.is_image && !previewTab) {
      setOpenError("Your browser blocked the image tab. Allow popups for Taskly and try again.");
      return;
    }
    if (previewTab) previewTab.opener = null;

    setOpenPending(true);
    setOpenError("");

    try {
      const blob = await api.getAttachmentContent(attachment.id);
      const objectUrl = URL.createObjectURL(blob);

      if (previewTab) {
        if (previewTab.closed) {
          URL.revokeObjectURL(objectUrl);
          throw new Error("The image tab was closed before loading finished.");
        }
        previewTab.location.replace(objectUrl);
        previewTab.focus();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60_000);
      } else {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = attachment.original_name;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch (error) {
      previewTab?.close();
      setOpenError(error instanceof ApiError ? error.message : "Unable to open this attachment.");
    } finally {
      setOpenPending(false);
    }
  }

  return <li className="ds-attachment flex flex-wrap items-center gap-3">
    {attachment.is_image && <PersistedImagePreview attachment={attachment} />}
    <div className="min-w-0 flex-1">
      <p className="ds-attachment-name truncate">{attachment.original_name}</p>
      <p className="ds-meta">{attachment.mime_type} · {formatFileSize(attachment.size)}</p>
    </div>
    <button className="ds-button ds-button-ghost ds-accent-text" disabled={openPending} onClick={() => void openAttachment()} type="button">{openPending ? "Loading..." : attachment.is_image ? "Open" : "Download"}</button>
    {onDelete && <button className="ds-button ds-button-danger" onClick={() => onDelete(attachment)} type="button">Delete</button>}
    {openError && <p className="ds-danger-text w-full text-xs" role="alert">{openError}</p>}
  </li>;
}

const previewableImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function PendingImagePreview({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = objectUrl;

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // This local blob URL is temporary and cannot be processed by the Next image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imageRef} alt={`Preview of ${file.name}`} className="ds-thumbnail" />;
}

type TaskFormProps = {
  projectId: number;
  availableTags: Tag[];
  task?: Task;
  onCancel: () => void;
  onChanged: (task: Task) => void;
  onSaved: (task: Task) => void;
  onTagCreated: (tag: Tag) => void;
};

function TaskForm({ projectId, availableTags, task, onCancel, onChanged, onSaved, onTagCreated }: TaskFormProps) {
  const [persistedTask, setPersistedTask] = useState<Task | undefined>(task);
  const [title, setTitle] = useState(task?.title ?? "");
  const [shortDescription, setShortDescription] = useState(task?.short_description ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "not_started");
  const [dueAt, setDueAt] = useState(toLocalDateTime(task?.due_at ?? null));
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(task?.tags.map((tag) => tag.id) ?? []);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366F1");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [attachmentDeletePending, setAttachmentDeletePending] = useState(false);

  function toggleTag(tagId: number) {
    setSelectedTagIds((current) => current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]);
  }

  async function createTag() {
    if (creatingTag || !newTagName.trim()) return;
    setCreatingTag(true);
    setMessage("");
    try {
      const tag = await api.createTag({ name: newTagName, color: newTagColor });
      onTagCreated(tag);
      setSelectedTagIds((current) => [...current, tag.id]);
      setNewTagName("");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to create this tag.");
    } finally {
      setCreatingTag(false);
    }
  }

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
      tag_ids: selectedTagIds,
    };

    try {
      let saved = persistedTask ? await api.updateTask(persistedTask.id, payload) : await api.createTask(projectId, payload);
      setPersistedTask(saved);
      onChanged(saved);
      const failedFiles: File[] = [];
      let uploadFailure = "";
      for (const file of pendingFiles) {
        try {
          const attachment = await api.uploadAttachment(saved.id, file);
          saved = { ...saved, attachments: [...saved.attachments, attachment] };
          setPersistedTask(saved);
          onChanged(saved);
        } catch (error) {
          failedFiles.push(file);
          if (!uploadFailure) {
            uploadFailure = error instanceof ApiError
              ? error.validationErrors.file?.[0] ?? error.message
              : "The attachment upload could not be completed.";
          }
        }
      }
      setPendingFiles(failedFiles);
      if (failedFiles.length > 0) {
        setMessage(`Task saved and ${pendingFiles.length - failedFiles.length} attachment(s) uploaded. ${failedFiles.length} failed: ${uploadFailure} Submit again to retry them.`);
        return;
      }
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

  async function deleteAttachment() {
    if (!attachmentToDelete || !persistedTask || attachmentDeletePending) return;
    setAttachmentDeletePending(true);
    setMessage("");
    try {
      await api.deleteAttachment(attachmentToDelete.id);
      const changed = { ...persistedTask, attachments: persistedTask.attachments.filter((item) => item.id !== attachmentToDelete.id) };
      setPersistedTask(changed);
      onChanged(changed);
      setAttachmentToDelete(null);
    } catch {
      setMessage("Unable to delete this attachment.");
    } finally {
      setAttachmentDeletePending(false);
    }
  }

  return <form className="ds-form grid gap-5" onSubmit={submit}>
    <div>
      <label className="ds-label mb-1" htmlFor="task-title">Title <span className="ds-danger-text">*</span></label>
      <input id="task-title" className="ds-input" value={title} onChange={(event) => setTitle(event.target.value)} aria-describedby={errors.title ? "task-title-error" : undefined} required />
      {errors.title?.map((error) => <p className="ds-danger-text mt-1 text-xs" id="task-title-error" key={error}>{error}</p>)}
    </div>
    <div>
      <label className="ds-label mb-1" htmlFor="task-short-description">Short description</label>
      <input id="task-short-description" className="ds-input" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} maxLength={500} />
      {errors.short_description?.map((error) => <p className="ds-danger-text mt-1 text-xs" key={error}>{error}</p>)}
    </div>
    <div>
      <label className="ds-label mb-1" htmlFor="task-description">Description</label>
      <textarea id="task-description" className="ds-input" value={description} onChange={(event) => setDescription(event.target.value)} />
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="ds-label mb-1" htmlFor="task-status">Status</label><select id="task-status" className="ds-input" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>{statuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
      <div><label className="ds-label mb-1" htmlFor="task-due-at">Due date</label><input id="task-due-at" className="ds-input" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />{errors.due_at?.map((error) => <p className="ds-danger-text mt-1 text-xs" key={error}>{error}</p>)}</div>
    </div>
    <fieldset>
      <legend className="ds-label">Tags</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {availableTags.length === 0 && <p className="ds-meta">No tags yet.</p>}
        {availableTags.map((tag) => { const selected = selectedTagIds.includes(tag.id); return <button key={tag.id} className="ds-tag" aria-pressed={selected} onClick={() => toggleTag(tag.id)} type="button">{selected ? "✓ " : ""}{tag.name}</button>; })}
      </div>
      {errors.tag_ids?.map((error) => <p className="ds-danger-text mt-1 text-xs" key={error}>{error}</p>)}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor="new-tag-name">New tag name</label><input id="new-tag-name" className="ds-input" placeholder="New tag name" value={newTagName} onChange={(event) => setNewTagName(event.target.value)} maxLength={50} />
        <label className="sr-only" htmlFor="new-tag-color">New tag color</label><input id="new-tag-color" className="ds-color-input" type="color" value={newTagColor} onChange={(event) => setNewTagColor(event.target.value.toUpperCase())} />
        <button className="ds-button ds-button-secondary" disabled={creatingTag || !newTagName.trim()} onClick={() => void createTag()} type="button">{creatingTag ? "Adding..." : "Add tag"}</button>
      </div>
    </fieldset>
    <div>
      <label className="ds-label mb-1" htmlFor="task-attachments">Add attachments</label>
      <input id="task-attachments" className="ds-file-input block w-full" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={(event) => {
        const files = Array.from(event.currentTarget.files ?? []);
        if (files.length > 0) setPendingFiles((current) => [...current, ...files]);
        event.currentTarget.value = "";
      }} />
      <p className="ds-meta mt-1">JPEG, PNG, WebP, PDF, or text; up to 10 MB each.</p>
      {pendingFiles.length > 0 && <div className="mt-3" role="status"><h4 className="ds-label">Pending attachments</h4><p className="ds-meta mt-1">These files upload after you save the task.</p><ul className="mt-2 grid gap-2">{pendingFiles.map((file, index) => <li className="ds-attachment flex items-center gap-3" key={`${file.name}-${file.lastModified}-${index}`}>{previewableImageTypes.has(file.type) && <PendingImagePreview file={file} />}<span className="ds-copy min-w-0 flex-1 truncate">{file.name} · {formatFileSize(file.size)}</span><button className="ds-button ds-button-danger" disabled={saving} onClick={() => setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">Remove</button></li>)}</ul></div>}
    </div>
    {persistedTask && persistedTask.attachments.length > 0 && <div><h4 className="ds-label">Current attachments</h4><ul className="mt-2 grid gap-2">{persistedTask.attachments.map((attachment) => <AttachmentItem attachment={attachment} key={attachment.id} onDelete={setAttachmentToDelete} />)}</ul></div>}
    {message && <p className="ds-alert" role="alert">{message}</p>}
    <div className="flex flex-wrap gap-2">
      <button className="ds-button ds-button-primary" disabled={saving || creatingTag || attachmentDeletePending} type="submit">{saving ? (pendingFiles.length > 0 ? "Saving and uploading..." : "Saving...") : persistedTask ? "Save changes" : "Create task"}</button>
      <button className="ds-button ds-button-secondary" disabled={saving || attachmentDeletePending} onClick={onCancel} type="button">Cancel</button>
    </div>
    {attachmentToDelete && <div className="ds-modal-overlay fixed inset-0 z-30 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-attachment-title"><div className="ds-modal"><h2 className="ds-modal-title" id="delete-attachment-title">Delete &quot;{attachmentToDelete.original_name}&quot;?</h2><p className="ds-copy mt-2">The private file will be permanently removed.</p><div className="mt-6 flex flex-wrap justify-end gap-2"><button className="ds-button ds-button-secondary" disabled={attachmentDeletePending} onClick={() => setAttachmentToDelete(null)} type="button">Cancel</button><button className="ds-button ds-button-danger-solid" disabled={attachmentDeletePending} onClick={() => void deleteAttachment()} type="button">{attachmentDeletePending ? "Deleting..." : "Delete attachment"}</button></div></div></div>}
  </form>;
}

export default function TaskWorkspace({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const pendingTaskIdsRef = useRef<Set<number>>(new Set());
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(new Set());
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getTasks(projectId), api.getTags()]).then(([taskItems, tagItems]) => {
      if (active) { setTasks(taskItems); setTags(tagItems); }
    }).catch(() => { if (active) setLoadError("Unable to load tasks and tags for this project."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  function updateTask(saved: Task) {
    setTasks((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
    setEditingTask((current) => current?.id === saved.id ? saved : current);
  }

  function finishSaving(saved: Task) {
    updateTask(saved);
    setCreating(false);
    setEditingTask(null);
    setFeedback("Task saved.");
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    if (pendingTaskIdsRef.current.has(task.id) || editingTask?.id === task.id || status === task.status) return;
    const previous = task;
    pendingTaskIdsRef.current.add(task.id);
    setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    setFeedback("");
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      const saved = await api.updateTask(task.id, { status });
      updateTask(saved);
      setFeedback("Task status updated.");
    } catch {
      setTasks((current) => current.map((item) => item.id === task.id ? previous : item));
      setFeedback("Unable to update task status. The task was restored.");
    } finally {
      pendingTaskIdsRef.current.delete(task.id);
      setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    }
  }

  async function deleteTask() {
    if (!taskToDelete || deletePending) return;
    setDeletePending(true); setFeedback("");
    try { await api.deleteTask(taskToDelete.id); setTasks((current) => current.filter((item) => item.id !== taskToDelete.id)); setFeedback("Task deleted."); }
    catch { setFeedback("Unable to delete this task."); }
    finally { setDeletePending(false); setTaskToDelete(null); }
  }

  const formProps = {
    projectId,
    availableTags: tags,
    onChanged: updateTask,
    onSaved: finishSaving,
    onTagCreated: (tag: Tag) => setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name))),
  };

  return <div className="ds-task-workspace min-w-0">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h3 className="ds-section-title">Tasks</h3><div className="flex flex-wrap items-center gap-3"><div className="ds-view-toggle" aria-label="Task view"><button className="ds-view-option" aria-pressed={view === "list"} onClick={() => setView("list")} type="button">List</button><button className="ds-view-option" aria-pressed={view === "kanban"} onClick={() => setView("kanban")} type="button">Kanban</button></div>{!creating && !editingTask && <button className="ds-button ds-button-primary" onClick={() => { setCreating(true); setFeedback(""); }}>+ New task</button>}</div></div>
    {creating && <TaskForm {...formProps} onCancel={() => setCreating(false)} />}
    {editingTask && <TaskForm {...formProps} task={editingTask} onCancel={() => setEditingTask(null)} />}
    {loading && <p className="ds-meta">Loading tasks...</p>}
    {loadError && <p className="ds-alert" role="alert">{loadError}</p>}
    {!loading && !loadError && tasks.length === 0 && !creating && <div className="ds-empty"><p className="ds-empty-title">No tasks yet</p><p className="ds-copy mt-1">Create one to plan the next step.</p></div>}
    {!loading && !loadError && tasks.length > 0 && view === "kanban" && <TaskKanban tasks={tasks} statuses={statuses} pendingTaskIds={pendingTaskIds} editingTaskId={editingTask?.id ?? null} onMove={(task, status) => void changeStatus(task, status)} onEdit={(task) => { setEditingTask(task); setCreating(false); setFeedback(""); }} onDelete={(task) => { setTaskToDelete(task); setFeedback(""); }} />}
    {!loading && !loadError && tasks.length > 0 && view === "list" && <div className="mt-5 grid gap-3">{tasks.map((task) => <article className="ds-task-card" data-status={task.status} key={task.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h4 className={`ds-card-title ${task.status === "completed" ? "line-through" : ""}`}>{task.title}</h4>{task.short_description && <p className="ds-copy mt-1">{task.short_description}</p>}{task.due_at && <p className="ds-meta mt-2">Due · {formatDateTime(task.due_at)}</p>}</div><select className="ds-input ds-status-select" aria-label={`Status for ${task.title}`} disabled={pendingTaskIds.has(task.id) || editingTask?.id === task.id} value={task.status} onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)}>{statuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
      {task.description && <p className="ds-copy mt-3 whitespace-pre-wrap">{task.description}</p>}
      {task.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="Tags">{task.tags.map((tag) => <TagChip tag={tag} key={tag.id} />)}</div>}
      {task.attachments.length > 0 && <ul className="mt-3 grid gap-2">{task.attachments.map((attachment) => <AttachmentItem attachment={attachment} key={attachment.id} />)}</ul>}
      <div className="mt-4 flex gap-1"><button className="ds-button ds-button-ghost" disabled={pendingTaskIds.has(task.id)} onClick={() => { setEditingTask(task); setCreating(false); setFeedback(""); }}>Edit</button><button className="ds-button ds-button-danger" disabled={pendingTaskIds.has(task.id)} onClick={() => { setTaskToDelete(task); setFeedback(""); }}>Delete</button></div>
    </article>)}</div>}
    {feedback && <p className={`ds-feedback mt-4 ${feedback.startsWith("Unable") ? "ds-feedback-error" : ""}`} role="status">{feedback}</p>}
    {taskToDelete && <div className="ds-modal-overlay fixed inset-0 z-20 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-task-title"><div className="ds-modal"><h2 className="ds-modal-title" id="delete-task-title">Delete &quot;{taskToDelete.title}&quot;?</h2><p className="ds-copy mt-2">This action and its attachments cannot be undone.</p><div className="mt-6 flex flex-wrap justify-end gap-2"><button className="ds-button ds-button-secondary" disabled={deletePending} onClick={() => setTaskToDelete(null)}>Cancel</button><button className="ds-button ds-button-danger-solid" disabled={deletePending} onClick={() => void deleteTask()}>{deletePending ? "Deleting..." : "Delete task"}</button></div></div></div>}
  </div>;
}
