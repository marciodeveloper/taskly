"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TaskWorkspace from "@/components/TaskWorkspace";
import { ApiError, api, type Project } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

type ProjectFormProps = {
  project?: Project;
  onCancel?: () => void;
  onSaved: (project: Project) => Promise<void>;
};

function ProjectForm({ project, onCancel, onSaved }: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? "#6366F1");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setErrors({});

    try {
      const saved = project
        ? await api.updateProject(project.id, { name, description, color })
        : await api.createProject({ name, description, color });
      await onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
        setErrors(error.validationErrors);
      } else {
        setMessage("Unable to save this project.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <label className="ds-label mb-1" htmlFor="project-name">
          Name <span className="ds-danger-text">*</span>
        </label>
        <input
          id="project-name"
          className="ds-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          aria-describedby="project-name-error"
        />
        {errors.name?.map((error) => <p className="ds-danger-text mt-1 text-xs" id="project-name-error" key={error}>{error}</p>)}
      </div>
      <div>
        <label className="ds-label mb-1" htmlFor="project-description">
          Description
        </label>
        <textarea
          id="project-description"
          className="ds-input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div>
        <label className="ds-label mb-1" htmlFor="project-color">
          Color
        </label>
        <div className="flex gap-2">
          <input
            id="project-color"
            className="ds-color-input"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
          />
          <input
            className="ds-input uppercase"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            pattern="^#[0-9A-Fa-f]{6}$"
            aria-label="Hex color"
          />
        </div>
        {errors.color?.map((error) => <p className="ds-danger-text mt-1 text-xs" key={error}>{error}</p>)}
      </div>
      {message && <p className="ds-alert" role="alert">{message}</p>}
      <div className="flex gap-2">
        <button className="ds-button ds-button-primary" disabled={saving} type="submit">
          {saving ? "Saving..." : project ? "Save changes" : "Create project"}
        </button>
        {onCancel && <button className="ds-button ds-button-secondary" onClick={onCancel} type="button">Cancel</button>}
      </div>
    </form>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    const queryId = Number(new URLSearchParams(window.location.search).get("project"));
    api.getProjects()
      .then((items) => {
        setProjects(items);
        const validQueryId = items.some((item) => item.id === queryId);
        setSelectedId(validQueryId ? queryId : items[0]?.id ?? null);
      })
      .catch(() => setError("Unable to load your projects."))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (selectedId === null) {
      window.history.replaceState(null, "", "/dashboard");
      return;
    }
    window.history.replaceState(null, "", `/dashboard?project=${selectedId}`);
  }, [selectedId]);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId), [projects, selectedId]);

  async function saveProject(project: Project) {
    setProjects((current) => {
      const exists = current.some((item) => item.id === project.id);
      return exists ? current.map((item) => item.id === project.id ? project : item) : [...current, project];
    });
    setSelectedId(project.id);
    setCreating(false);
    setEditing(false);
    setFeedback("Project saved.");
  }

  async function removeProject() {
    if (!selected || deletePending) return;
    setDeletePending(true);
    try {
      await api.deleteProject(selected.id);
      const remaining = projects.filter((project) => project.id !== selected.id);
      setProjects(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setFeedback("Project deleted.");
    } catch {
      setFeedback("Unable to delete this project.");
    } finally {
      setDeletePending(false);
      setDeleteDialogOpen(false);
    }
  }

  async function moveProject(direction: -1 | 1) {
    if (!selected) return;
    const index = projects.findIndex((project) => project.id === selected.id);
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    const next = [...projects];
    [next[index], next[target]] = [next[target], next[index]];
    setProjects(next);
    try {
      await api.reorderProjects(next.map((project) => project.id));
      setFeedback("Project order updated.");
    } catch {
      setProjects(projects);
      setFeedback("Unable to update project order.");
    }
  }

  if (authLoading || !user) return null;

  return (
    <main className="ds-shell">
      <header className="ds-topbar">
        <div className="ds-topbar-inner mx-auto flex max-w-7xl items-center justify-between gap-4 px-6">
          <p className="ds-brand">Taskly<span className="ds-brand-dot">.</span></p>
          <div className="flex min-w-0 items-center gap-3">
            <span className="ds-user">{user.name}</span>
            <button className="ds-button ds-button-ghost" onClick={async () => { await logout(); router.replace("/login"); }}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="ds-sidebar">
          <div className="mb-5 flex items-center justify-between gap-2">
            <h1 className="ds-sidebar-title">Projects</h1>
            <button className="ds-button ds-button-ghost" onClick={() => { setCreating(true); setEditing(false); }}>
              + New
            </button>
          </div>
          {loading && <p className="ds-meta">Loading projects...</p>}
          {error && <p className="ds-alert" role="alert">{error}</p>}
          {!loading && !error && projects.length === 0 && <p className="ds-copy">No projects yet. Create one to get started.</p>}
          <div className="grid gap-1">
            {projects.map((project, index) => (
              <div className={`ds-project-row ${project.id === selectedId ? "is-selected" : ""}`} key={project.id}>
                <button className="ds-project-select flex items-center gap-2 p-3" onClick={() => { setSelectedId(project.id); setCreating(false); setEditing(false); }}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? "#94A3B8" }} aria-hidden="true" />
                  <span className="truncate">{project.name}</span>
                </button>
                <div className="ds-project-actions flex pr-1">
                  <button className="ds-icon-button" aria-label={`Move ${project.name} up`} disabled={index === 0} onClick={() => { setSelectedId(project.id); void moveProject(-1); }}>↑</button>
                  <button className="ds-icon-button" aria-label={`Move ${project.name} down`} disabled={index === projects.length - 1} onClick={() => { setSelectedId(project.id); void moveProject(1); }}>↓</button>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section className="ds-workspace">
          {creating && <><h2 className="ds-page-title mb-6">New project</h2><ProjectForm onSaved={saveProject} onCancel={() => setCreating(false)} /></>}
          {!creating && editing && selected && <><h2 className="ds-page-title mb-6">Edit project</h2><ProjectForm project={selected} onSaved={saveProject} onCancel={() => setEditing(false)} /></>}
          {!creating && !editing && !selected && <div className="ds-empty"><h2 className="ds-empty-title">Choose a project</h2><p className="ds-copy mt-2">Create your first project to start organizing work.</p></div>}
          {!creating && !editing && selected && <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0"><div className="flex items-center gap-3"><span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: selected.color ?? "#7F8894" }} aria-hidden="true" /><h2 className="ds-page-title">{selected.name}</h2></div><p className="ds-copy mt-3">{selected.description || "No description yet."}</p></div>
              <div className="flex gap-2"><button className="ds-button ds-button-secondary" onClick={() => setEditing(true)}>Edit</button><button className="ds-button ds-button-danger" onClick={() => setDeleteDialogOpen(true)}>Delete</button></div>
            </div>
            <TaskWorkspace key={selected.id} projectId={selected.id} />
          </div>}
          {feedback && <p className={`ds-feedback mt-5 ${feedback.startsWith("Unable") ? "ds-feedback-error" : ""}`} role="status">{feedback}</p>}
        </section>
      </div>
      {deleteDialogOpen && selected && <div className="ds-modal-overlay fixed inset-0 z-10 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="ds-modal"><h2 className="ds-modal-title" id="delete-title">Delete &quot;{selected.name}&quot;?</h2><p className="ds-copy mt-2">This action cannot be undone.</p><div className="mt-6 flex flex-wrap justify-end gap-2"><button className="ds-button ds-button-secondary" onClick={() => setDeleteDialogOpen(false)} disabled={deletePending}>Cancel</button><button className="ds-button ds-button-danger-solid" onClick={removeProject} disabled={deletePending}>{deletePending ? "Deleting..." : "Delete project"}</button></div></div>
      </div>}
    </main>
  );
}
