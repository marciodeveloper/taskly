"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FolderPlus,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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
    <form className="ds-form grid gap-4" onSubmit={submit}>
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
        <label className="ds-label mb-1" htmlFor="project-description">Description</label>
        <textarea id="project-description" className="ds-input" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div>
        <label className="ds-label mb-1" htmlFor="project-color">Color</label>
        <div className="flex gap-2">
          <input id="project-color" className="ds-color-input" type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} />
          <input className="ds-input uppercase" value={color} onChange={(event) => setColor(event.target.value)} pattern="^#[0-9A-Fa-f]{6}$" aria-label="Hex color" />
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mobileSidebarCloseRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => mobileSidebarCloseRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileSidebarOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileSidebarOpen]);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId), [projects, selectedId]);
  const initials = useMemo(() => user?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U", [user?.name]);

  function startCreatingProject() {
    setCreating(true);
    setEditing(false);
    setMobileSidebarOpen(false);
  }

  function selectProject(projectId: number) {
    setSelectedId(projectId);
    setCreating(false);
    setEditing(false);
    setMobileSidebarOpen(false);
  }

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

  async function moveProject(projectId: number, direction: -1 | 1) {
    const index = projects.findIndex((project) => project.id === projectId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= projects.length) return;
    const previous = projects;
    const next = [...projects];
    [next[index], next[target]] = [next[target], next[index]];
    setProjects(next);
    try {
      await api.reorderProjects(next.map((project) => project.id));
      setFeedback("Project order updated.");
    } catch {
      setProjects(previous);
      setFeedback("Unable to update project order.");
    }
  }

  if (authLoading || !user) return null;

  return (
    <main className="ds-shell">
      <header className="ds-topbar">
        <div className="ds-topbar-inner mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              className="ds-icon-button ds-mobile-sidebar-trigger lg:hidden"
              aria-controls="project-navigation"
              aria-expanded={mobileSidebarOpen}
              aria-label="Open project navigation"
              onClick={() => setMobileSidebarOpen(true)}
              type="button"
            >
              <Menu className="ds-icon" aria-hidden="true" />
            </button>
            <p className="ds-brand">Taskly<span className="ds-brand-dot">.</span></p>
            {selected && <span className="ds-topbar-context hidden md:inline" aria-hidden="true">/ {selected.name}</span>}
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="ds-user-chip">
              <span className="ds-avatar" aria-hidden="true">{initials}</span>
              <span className="ds-user hidden sm:inline">{user.name}</span>
            </div>
            <button className="ds-button ds-button-ghost ds-button-compact" onClick={async () => { await logout(); router.replace("/login"); }}>
              <LogOut className="ds-icon-sm" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {mobileSidebarOpen && (
        <button
          className="ds-mobile-sidebar-backdrop lg:hidden"
          aria-label="Close project navigation"
          onClick={() => setMobileSidebarOpen(false)}
          type="button"
        />
      )}

      <div className={`ds-dashboard-grid mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8 ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
        <aside
          id="project-navigation"
          className={`ds-sidebar ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileSidebarOpen ? "is-mobile-open" : ""}`}
          aria-label="Project navigation"
        >
          <div className="ds-sidebar-header mb-4 flex items-center justify-between gap-2">
            <h1 className="ds-sidebar-title ds-sidebar-label">Projects</h1>
            <div className="flex items-center gap-1">
              <button
                className="ds-button ds-button-ghost ds-button-compact ds-sidebar-new"
                onClick={startCreatingProject}
                title="New project"
                type="button"
              >
                <Plus className="ds-icon-sm" aria-hidden="true" />
                <span className="ds-sidebar-label">New</span>
              </button>
              <button
                className="ds-icon-button ds-sidebar-collapse hidden lg:inline-grid"
                aria-label={sidebarCollapsed ? "Expand project navigation" : "Collapse project navigation"}
                aria-expanded={!sidebarCollapsed}
                onClick={() => setSidebarCollapsed((current) => !current)}
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                type="button"
              >
                {sidebarCollapsed
                  ? <PanelLeftOpen className="ds-icon-sm" aria-hidden="true" />
                  : <PanelLeftClose className="ds-icon-sm" aria-hidden="true" />}
              </button>
              <button
                ref={mobileSidebarCloseRef}
                className="ds-icon-button ds-sidebar-mobile-close lg:hidden"
                aria-label="Close project navigation"
                onClick={() => setMobileSidebarOpen(false)}
                type="button"
              >
                <X className="ds-icon" aria-hidden="true" />
              </button>
            </div>
          </div>
          {loading && <p className="ds-meta ds-sidebar-label">Loading projects...</p>}
          {error && <p className="ds-alert ds-sidebar-label" role="alert">{error}</p>}
          {!loading && !error && projects.length === 0 && (
            <div className="ds-empty ds-sidebar-empty px-2 py-5">
              <FolderPlus className="mx-auto mb-2 h-5 w-5 ds-accent-text" aria-hidden="true" />
              <p className="ds-copy ds-sidebar-label">No projects yet.</p>
              <button className="ds-button ds-button-primary ds-button-compact mt-3" onClick={startCreatingProject} title="Create project">
                <Plus className="ds-icon-sm" aria-hidden="true" />
                <span className="ds-sidebar-label">Create project</span>
              </button>
            </div>
          )}
          <div className="ds-sidebar-project-list grid gap-1.5">
            {projects.map((project, index) => {
              const isSelected = project.id === selectedId;
              return (
                <div className={`ds-project-row ${isSelected ? "is-selected" : ""}`} key={project.id}>
                  <button
                    className="ds-project-select flex items-center gap-2.5 p-3"
                    aria-current={isSelected ? "page" : undefined}
                    aria-label={sidebarCollapsed ? project.name : undefined}
                    data-tooltip={sidebarCollapsed ? project.name : undefined}
                    onClick={() => selectProject(project.id)}
                    title={sidebarCollapsed ? project.name : undefined}
                    type="button"
                  >
                    <span className="ds-project-dot h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? "#94A3B8" }} aria-hidden="true" />
                    <span className="ds-project-label truncate">{project.name}</span>
                  </button>
                  <div className="ds-project-actions flex pr-1">
                    <button className="ds-icon-button" aria-label={`Move ${project.name} up`} disabled={index === 0} onClick={() => void moveProject(project.id, -1)} type="button">
                      <ChevronUp className="ds-icon-sm" aria-hidden="true" />
                    </button>
                    <button className="ds-icon-button" aria-label={`Move ${project.name} down`} disabled={index === projects.length - 1} onClick={() => void moveProject(project.id, 1)} type="button">
                      <ChevronDown className="ds-icon-sm" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="ds-workspace">
          {creating && <><h2 className="ds-page-title mb-6">New project</h2><ProjectForm onSaved={saveProject} onCancel={() => setCreating(false)} /></>}
          {!creating && editing && selected && <><h2 className="ds-page-title mb-6">Edit project</h2><ProjectForm project={selected} onSaved={saveProject} onCancel={() => setEditing(false)} /></>}
          {!creating && !editing && !selected && (
            <div className="ds-empty py-16">
              <FolderPlus className="mx-auto mb-3 h-6 w-6 ds-accent-text" aria-hidden="true" />
              <h2 className="ds-empty-title">Choose a project</h2>
              <p className="ds-copy mt-2">Create your first project to start organizing work.</p>
              <button className="ds-button ds-button-primary mt-5" onClick={startCreatingProject}>
                <Plus className="ds-icon" aria-hidden="true" />
                New project
              </button>
            </div>
          )}
          {!creating && !editing && selected && (
            <div className="min-w-0">
              <div className="ds-workspace-header flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white/5" style={{ backgroundColor: selected.color ?? "#7F8894" }} aria-hidden="true" />
                    <h2 className="ds-page-title">{selected.name}</h2>
                  </div>
                  <p className="ds-copy mt-2 max-w-2xl">{selected.description || "No description yet."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="ds-action-button" onClick={() => setEditing(true)}>
                    <Pencil className="ds-icon-sm" aria-hidden="true" />
                    Edit
                  </button>
                  <button className="ds-action-button is-danger" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="ds-icon-sm" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
              <TaskWorkspace key={selected.id} projectId={selected.id} />
            </div>
          )}
          {feedback && <p className={`ds-feedback mt-5 ${feedback.startsWith("Unable") ? "ds-feedback-error" : ""}`} role="status">{feedback}</p>}
        </section>
      </div>

      {deleteDialogOpen && selected && (
        <div className="ds-modal-overlay fixed inset-0 z-10 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="ds-modal">
            <h2 className="ds-modal-title" id="delete-title">Delete &quot;{selected.name}&quot;?</h2>
            <p className="ds-copy mt-2">This action cannot be undone.</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button className="ds-button ds-button-secondary" onClick={() => setDeleteDialogOpen(false)} disabled={deletePending}>Cancel</button>
              <button className="ds-button ds-button-danger-solid" onClick={removeProject} disabled={deletePending}>
                <Trash2 className="ds-icon-sm" aria-hidden="true" />
                {deletePending ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
