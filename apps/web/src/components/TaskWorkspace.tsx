"use client";

import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Columns3,
  Download,
  ExternalLink,
  List,
  Paperclip,
  Pencil,
  Plus,
  Save,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
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
import type { Feedback } from "@/lib/feedback";
import { formatDateTime, formatFileSize, toLocalDateTimeInput } from "@/lib/format";
import { taskStatuses } from "@/lib/tasks/status";

function TagChip({ tag }: { tag: Tag }) {
  return (
    <span className="ds-tag">
      {tag.color && <span className="ds-tag-dot" style={{ backgroundColor: tag.color }} aria-hidden="true" />}
      {tag.name}
    </span>
  );
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

  if (previewError) return <span className="ds-danger-text text-xs">Pré-visualização indisponível</span>;
  if (!previewUrl) return <span className="ds-meta">Carregando pré-visualização...</span>;

  return <Image alt="" className="ds-thumbnail" src={previewUrl} width={48} height={48} unoptimized />;
}

function AttachmentItem({ attachment, onDelete }: { attachment: Attachment; onDelete?: (attachment: Attachment) => void }) {
  const [openPending, setOpenPending] = useState(false);
  const [openError, setOpenError] = useState("");

  async function openAttachment() {
    if (openPending) return;
    const previewTab = attachment.is_image ? window.open("about:blank", "_blank") : null;
    if (attachment.is_image && !previewTab) {
      setOpenError("Seu navegador bloqueou a aba da imagem. Permita pop-ups para o Taskly e tente novamente.");
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
          throw new Error("A aba da imagem foi fechada antes do carregamento terminar.");
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
      setOpenError(error instanceof ApiError ? error.message : "Não foi possível abrir este anexo.");
    } finally {
      setOpenPending(false);
    }
  }

  return (
    <li className="ds-attachment flex flex-wrap items-center gap-3">
      {attachment.is_image && <PersistedImagePreview attachment={attachment} />}
      <div className="min-w-0 flex-1">
        <p className="ds-attachment-name truncate">{attachment.original_name}</p>
        <p className="ds-meta">{attachment.mime_type} · {formatFileSize(attachment.size)}</p>
      </div>
      <button className="ds-action-button" disabled={openPending} onClick={() => void openAttachment()} type="button">
        {attachment.is_image ? <ExternalLink className="ds-icon-sm" aria-hidden="true" /> : <Download className="ds-icon-sm" aria-hidden="true" />}
        {openPending ? "Carregando..." : attachment.is_image ? "Abrir" : "Baixar"}
      </button>
      {onDelete && (
        <button className="ds-action-button is-danger" onClick={() => onDelete(attachment)} type="button">
          <Trash2 className="ds-icon-sm" aria-hidden="true" />
          Excluir
        </button>
      )}
      {openError && <p className="ds-danger-text w-full text-xs" role="alert">{openError}</p>}
    </li>
  );
}

const previewableImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function PendingImagePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const reader = new FileReader();

    reader.onload = () => {
      if (!cancelled && typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };

    reader.readAsDataURL(file);

    return () => {
      cancelled = true;

      if (reader.readyState === FileReader.LOADING) {
        reader.abort();
      }
    };
  }, [file]);

  if (!previewUrl) {
    return <span className="ds-meta">Carregando pré-visualização...</span>;
  }

  return (
    <Image
      src={previewUrl}
      alt={`Pré-visualização de ${file.name}`}
      className="ds-thumbnail"
      width={48}
      height={48}
      unoptimized
    />
  );
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
  const [dueAt, setDueAt] = useState(toLocalDateTimeInput(task?.due_at ?? null));
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
  const attachmentCancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!attachmentToDelete) return;

    const focusFrame = window.requestAnimationFrame(() => attachmentCancelRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !attachmentDeletePending) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setAttachmentToDelete(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [attachmentDeletePending, attachmentToDelete]);

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
      setMessage(error instanceof ApiError ? error.message : "Não foi possível criar esta etiqueta.");
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
              : "Não foi possível concluir o envio do anexo.";
          }
        }
      }
      setPendingFiles(failedFiles);
      if (failedFiles.length > 0) {
        setMessage(`Tarefa salva e ${pendingFiles.length - failedFiles.length} anexo(s) enviado(s). ${failedFiles.length} falhou(aram): ${uploadFailure} Envie novamente para tentar de novo.`);
        return;
      }
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.validationErrors);
        setMessage(error.message);
      } else {
        setMessage("Não foi possível salvar esta tarefa.");
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
      setMessage("Não foi possível excluir este anexo.");
    } finally {
      setAttachmentDeletePending(false);
    }
  }

  return (
    <form className="ds-form grid gap-5" onSubmit={submit}>
      <div>
        <label className="ds-label mb-1" htmlFor="task-title">Título <span className="ds-danger-text">*</span></label>
        <input id="task-title" className="ds-input" value={title} onChange={(event) => setTitle(event.target.value)} aria-describedby={errors.title ? "task-title-error" : undefined} required />
        {errors.title?.map((error) => <p className="ds-danger-text mt-1 text-xs" id="task-title-error" key={error}>{error}</p>)}
      </div>
      <div>
        <label className="ds-label mb-1" htmlFor="task-short-description">Descrição curta</label>
        <input id="task-short-description" className="ds-input" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} maxLength={500} />
        {errors.short_description?.map((error) => <p className="ds-danger-text mt-1 text-xs" key={error}>{error}</p>)}
      </div>
      <div>
        <label className="ds-label mb-1" htmlFor="task-description">Descrição</label>
        <textarea id="task-description" className="ds-input" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="ds-label mb-1" htmlFor="task-status">Status</label>
          <select id="task-status" className="ds-input" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {taskStatuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div>
          <label className="ds-label mb-1" htmlFor="task-due-at">Prazo</label>
          <input id="task-due-at" className="ds-input" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          {errors.due_at?.map((error) => <p className="ds-danger-text mt-1 text-xs" key={error}>{error}</p>)}
        </div>
      </div>
      <fieldset>
        <legend className="ds-label flex items-center gap-2"><TagIcon className="ds-icon-sm" aria-hidden="true" />Etiquetas</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {availableTags.length === 0 && <p className="ds-meta">Nenhuma etiqueta ainda.</p>}
          {availableTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return <button key={tag.id} className="ds-tag" aria-pressed={selected} onClick={() => toggleTag(tag.id)} type="button">{selected ? "✓ " : ""}{tag.name}</button>;
          })}
        </div>
        {errors.tag_ids?.map((error) => <p className="ds-danger-text mt-1 text-xs" key={error}>{error}</p>)}
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="sr-only" htmlFor="new-tag-name">Nome da nova etiqueta</label>
          <input id="new-tag-name" className="ds-input" placeholder="Nome da nova etiqueta" value={newTagName} onChange={(event) => setNewTagName(event.target.value)} maxLength={50} />
          <label className="sr-only" htmlFor="new-tag-color">Cor da nova etiqueta</label>
          <input id="new-tag-color" className="ds-color-input" type="color" value={newTagColor} onChange={(event) => setNewTagColor(event.target.value.toUpperCase())} />
          <button className="ds-button ds-button-secondary" disabled={creatingTag || !newTagName.trim()} onClick={() => void createTag()} type="button">
            <Plus className="ds-icon-sm" aria-hidden="true" />
            {creatingTag ? "Adicionando..." : "Adicionar etiqueta"}
          </button>
        </div>
      </fieldset>
      <div>
        <label className="ds-label mb-1" htmlFor="task-attachments">Adicionar anexos</label>
        <input id="task-attachments" className="ds-file-input block w-full" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (files.length > 0) setPendingFiles((current) => [...current, ...files]);
          event.currentTarget.value = "";
        }} />
        <p className="ds-meta mt-1">JPEG, PNG, WebP, PDF ou texto; até 10 MB cada.</p>
        {pendingFiles.length > 0 && (
          <div className="mt-3" role="status">
            <h4 className="ds-label">Anexos pendentes</h4>
            <p className="ds-meta mt-1">Estes arquivos são enviados depois que você salvar a tarefa.</p>
            <ul className="mt-2 grid gap-2">
              {pendingFiles.map((file, index) => (
                <li className="ds-attachment flex items-center gap-3" key={`${file.name}-${file.lastModified}-${index}`}>
                  {previewableImageTypes.has(file.type) && <PendingImagePreview file={file} />}
                  <span className="ds-copy min-w-0 flex-1 truncate">{file.name} · {formatFileSize(file.size)}</span>
                  <button className="ds-action-button is-danger" disabled={saving} onClick={() => setPendingFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button">
                    <X className="ds-icon-sm" aria-hidden="true" />
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {persistedTask && persistedTask.attachments.length > 0 && (
        <div>
          <h4 className="ds-label">Anexos atuais</h4>
          <ul className="mt-2 grid gap-2">{persistedTask.attachments.map((attachment) => <AttachmentItem attachment={attachment} key={attachment.id} onDelete={setAttachmentToDelete} />)}</ul>
        </div>
      )}
      {message && <p className="ds-alert" role="alert">{message}</p>}
      <div className="ds-task-form-actions flex flex-wrap gap-2">
        <button className="ds-button ds-button-primary" disabled={saving || creatingTag || attachmentDeletePending} type="submit">
          <Save className="ds-icon-sm" aria-hidden="true" />
          {saving ? (pendingFiles.length > 0 ? "Salvando e enviando..." : "Salvando...") : persistedTask ? "Salvar alterações" : "Criar tarefa"}
        </button>
        <button className="ds-button ds-button-secondary" disabled={saving || attachmentDeletePending} onClick={onCancel} type="button">Cancelar</button>
      </div>

      {attachmentToDelete && (
        <div
          className="ds-modal-overlay fixed inset-0 z-30 grid place-items-center p-4"
          data-task-nested-dialog="true"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-attachment-title"
        >
          <div className="ds-modal">
            <h2 className="ds-modal-title" id="delete-attachment-title">Excluir &quot;{attachmentToDelete.original_name}&quot;?</h2>
            <p className="ds-copy mt-2">O arquivo privado será removido permanentemente.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button ref={attachmentCancelRef} className="ds-button ds-button-secondary" disabled={attachmentDeletePending} onClick={() => setAttachmentToDelete(null)} type="button">Cancelar</button>
              <button className="ds-button ds-button-danger-solid" disabled={attachmentDeletePending} onClick={() => void deleteAttachment()} type="button">
                <Trash2 className="ds-icon-sm" aria-hidden="true" />
                {attachmentDeletePending ? "Excluindo..." : "Excluir anexo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

type TaskDrawerProps = {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
};

function TaskDrawer({ title, subtitle, onClose, children }: TaskDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector('[data-task-nested-dialog="true"]')) return;
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => returnFocus?.focus());
    };
  }, [onClose]);

  return (
    <>
      <button className="ds-task-drawer-backdrop" aria-label="Fechar editor de tarefa" onClick={onClose} type="button" />
      <aside ref={panelRef} className="ds-task-drawer" role="dialog" aria-modal="true" aria-labelledby="task-drawer-title">
        <header className="ds-task-drawer-header">
          <div className="min-w-0">
            <p className="ds-task-drawer-eyebrow">Detalhes da tarefa</p>
            <h3 className="ds-task-drawer-title" id="task-drawer-title">{title}</h3>
            <p className="ds-task-drawer-subtitle">{subtitle}</p>
          </div>
          <button ref={closeButtonRef} className="ds-icon-button ds-task-drawer-close" aria-label="Fechar editor de tarefa" onClick={onClose} type="button">
            <X className="ds-icon" aria-hidden="true" />
          </button>
        </header>
        <div className="ds-task-drawer-body">{children}</div>
      </aside>
    </>
  );
}

export default function TaskWorkspace({ projectId }: { projectId: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const pendingTaskIdsRef = useRef<Set<number>>(new Set());
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(new Set());
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getTasks(projectId), api.getTags()]).then(([taskItems, tagItems]) => {
      if (active) { setTasks(taskItems); setTags(tagItems); }
    }).catch(() => { if (active) setLoadError("Não foi possível carregar as tarefas e etiquetas deste projeto."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); };
  }, []);

  const closeTaskDrawer = useCallback(() => {
    setCreating(false);
    setEditingTask(null);
  }, []);

  function startCreatingTask() {
    setCreating(true);
    setEditingTask(null);
    setFeedback(null);
  }

  function startEditingTask(task: Task) {
    setEditingTask(task);
    setCreating(false);
    setFeedback(null);
  }

  function updateTask(saved: Task) {
    setTasks((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
    setEditingTask((current) => current?.id === saved.id ? saved : current);
  }

  function finishSaving(saved: Task) {
    updateTask(saved);
    setCreating(false);
    setEditingTask(null);
    setFeedback({ text: "Tarefa salva.", tone: "success" });
  }

  async function changeStatus(task: Task, status: TaskStatus) {
    if (pendingTaskIdsRef.current.has(task.id) || editingTask?.id === task.id || status === task.status) return;
    const previous = task;
    pendingTaskIdsRef.current.add(task.id);
    setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    setFeedback(null);
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      const saved = await api.updateTask(task.id, { status });
      updateTask(saved);
      setFeedback({ text: "Status da tarefa atualizado.", tone: "success" });
    } catch {
      setTasks((current) => current.map((item) => item.id === task.id ? previous : item));
      setFeedback({ text: "Não foi possível atualizar o status. A tarefa foi restaurada.", tone: "error" });
    } finally {
      pendingTaskIdsRef.current.delete(task.id);
      setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    }
  }

  async function deleteTask() {
    if (!taskToDelete || deletePending) return;
    setDeletePending(true);
    setFeedback(null);
    try {
      await api.deleteTask(taskToDelete.id);
      setTasks((current) => current.filter((item) => item.id !== taskToDelete.id));
      setFeedback({ text: "Tarefa excluída.", tone: "success" });
    } catch {
      setFeedback({ text: "Não foi possível excluir esta tarefa.", tone: "error" });
    } finally {
      setDeletePending(false);
      setTaskToDelete(null);
    }
  }

  const formProps = {
    projectId,
    availableTags: tags,
    onChanged: updateTask,
    onSaved: finishSaving,
    onTagCreated: (tag: Tag) => setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name))),
  };

  const drawerOpen = creating || editingTask !== null;

  return (
    <div className="ds-task-workspace min-w-0">
      <div className="ds-task-toolbar mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="ds-section-title">Tarefas</h3>
          <p className="ds-meta mt-1">Planeje, acompanhe e mova o trabalho sem sair do projeto.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="ds-view-toggle" aria-label="Visualização de tarefas">
            <button className="ds-view-option" aria-pressed={view === "list"} onClick={() => setView("list")} type="button">
              <List className="ds-icon-sm" aria-hidden="true" />
              Lista
            </button>
            <button className="ds-view-option" aria-pressed={view === "kanban"} onClick={() => setView("kanban")} type="button">
              <Columns3 className="ds-icon-sm" aria-hidden="true" />
              Kanban
            </button>
          </div>
          {!drawerOpen && (
            <button className="ds-button ds-button-primary" onClick={startCreatingTask}>
              <Plus className="ds-icon" aria-hidden="true" />
              Nova tarefa
            </button>
          )}
        </div>
      </div>

      {drawerOpen && (
        <TaskDrawer
          title={editingTask ? "Editar tarefa" : "Nova tarefa"}
          subtitle={editingTask ? editingTask.title : "Adicione trabalho sem sair do projeto atual."}
          onClose={closeTaskDrawer}
        >
          {editingTask
            ? <TaskForm {...formProps} task={editingTask} onCancel={closeTaskDrawer} />
            : <TaskForm {...formProps} onCancel={closeTaskDrawer} />}
        </TaskDrawer>
      )}

      {loading && <p className="ds-meta">Carregando tarefas...</p>}
      {loadError && <p className="ds-alert" role="alert">{loadError}</p>}
      {!loading && !loadError && tasks.length === 0 && !drawerOpen && (
        <div className="ds-empty py-12">
          <h4 className="ds-empty-title">Nenhuma tarefa ainda</h4>
          <p className="ds-copy mt-1">Crie a primeira tarefa e comece a fazer o trabalho avançar.</p>
          <button className="ds-button ds-button-primary mt-4" onClick={startCreatingTask}>
            <Plus className="ds-icon" aria-hidden="true" />
            Criar tarefa
          </button>
        </div>
      )}

      {!loading && !loadError && tasks.length > 0 && view === "kanban" && (
        <TaskKanban
          tasks={tasks}
          statuses={taskStatuses}
          pendingTaskIds={pendingTaskIds}
          editingTaskId={editingTask?.id ?? null}
          onMove={(task, status) => void changeStatus(task, status)}
          onEdit={startEditingTask}
          onDelete={(task) => { setTaskToDelete(task); setFeedback(null); }}
        />
      )}

      {!loading && !loadError && tasks.length > 0 && view === "list" && (
        <div className="mt-4 grid gap-3">
          {tasks.map((task) => {
            const overdue = now !== null && task.due_at !== null && new Date(task.due_at).getTime() < now && task.status !== "completed" && task.status !== "cancelled";
            return (
              <article className={`ds-task-card ${task.status === "completed" ? "is-completed" : ""}`} data-status={task.status} key={task.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="ds-card-title">{task.title}</h4>
                    {task.short_description && <p className="ds-copy mt-1">{task.short_description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      {task.due_at && (
                        <span className="ds-inline-meta">
                          <CalendarClock className="ds-icon-sm" aria-hidden="true" />
                          {formatDateTime(task.due_at)}
                        </span>
                      )}
                      {overdue && (
                        <span className="ds-overdue">
                          <AlertTriangle className="ds-icon-sm" aria-hidden="true" />
                          Atrasada
                        </span>
                      )}
                      {task.attachments.length > 0 && (
                        <span className="ds-inline-meta">
                          <Paperclip className="ds-icon-sm" aria-hidden="true" />
                          {task.attachments.length} anexo{task.attachments.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                  <select
                    className="ds-input ds-status-select ds-status-control"
                    aria-label={`Status de ${task.title}`}
                    disabled={pendingTaskIds.has(task.id) || editingTask?.id === task.id}
                    value={task.status}
                    onChange={(event) => void changeStatus(task, event.target.value as TaskStatus)}
                  >
                    {taskStatuses.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                  </select>
                </div>

                {task.description && <p className="ds-copy ds-task-description mt-3 whitespace-pre-wrap">{task.description}</p>}
                {task.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2" aria-label="Etiquetas">{task.tags.map((tag) => <TagChip tag={tag} key={tag.id} />)}</div>}
                {task.attachments.length > 0 && <ul className="mt-3 grid gap-2">{task.attachments.map((attachment) => <AttachmentItem attachment={attachment} key={attachment.id} />)}</ul>}

                <div className="ds-task-actions mt-4">
                  <button className="ds-action-button" disabled={pendingTaskIds.has(task.id)} onClick={() => startEditingTask(task)}>
                    <Pencil className="ds-icon-sm" aria-hidden="true" />
                    Editar
                  </button>
                  <button className="ds-action-button is-danger" disabled={pendingTaskIds.has(task.id)} onClick={() => { setTaskToDelete(task); setFeedback(null); }}>
                    <Trash2 className="ds-icon-sm" aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {feedback && <p className={`ds-feedback mt-4 ${feedback.tone === "error" ? "ds-feedback-error" : ""}`} role="status">{feedback.text}</p>}

      {taskToDelete && (
        <div className="ds-modal-overlay fixed inset-0 z-20 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-task-title">
          <div className="ds-modal">
            <h2 className="ds-modal-title" id="delete-task-title">Excluir &quot;{taskToDelete.title}&quot;?</h2>
            <p className="ds-copy mt-2">Esta ação e os anexos da tarefa não podem ser desfeitos.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button className="ds-button ds-button-secondary" disabled={deletePending} onClick={() => setTaskToDelete(null)}>Cancelar</button>
              <button className="ds-button ds-button-danger-solid" disabled={deletePending} onClick={() => void deleteTask()}>
                <Trash2 className="ds-icon-sm" aria-hidden="true" />
                {deletePending ? "Excluindo..." : "Excluir tarefa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
