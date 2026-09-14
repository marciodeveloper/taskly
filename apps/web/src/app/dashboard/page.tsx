"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="project-name">
          Name <span className="text-red-600">*</span>
        </label>
        <input
          id="project-name"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          aria-describedby="project-name-error"
        />
        {errors.name?.map((error) => <p className="mt-1 text-xs text-red-600" id="project-name-error" key={error}>{error}</p>)}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="project-description">
          Description
        </label>
        <textarea
          id="project-description"
          className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="project-color">
          Color
        </label>
        <div className="flex gap-2">
          <input
            id="project-color"
            className="h-10 w-14 rounded border border-slate-300"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value.toUpperCase())}
          />
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 uppercase focus:ring-2 focus:ring-indigo-500"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            pattern="^#[0-9A-Fa-f]{6}$"
            aria-label="Hex color"
          />
        </div>
        {errors.color?.map((error) => <p className="mt-1 text-xs text-red-600" key={error}>{error}</p>)}
      </div>
      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      <div className="flex gap-2">
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60" disabled={saving} type="submit">
          {saving ? "Saving..." : project ? "Save changes" : "Create project"}
        </button>
        {onCancel && <button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50" onClick={onCancel} type="button">Cancel</button>}
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
  const [deleting, setDeleting] = useState(false);
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
    if (!selected) return;
    setDeleting(true);
    try {
      await api.deleteProject(selected.id);
      const remaining = projects.filter((project) => project.id !== selected.id);
      setProjects(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setFeedback("Project deleted.");
    } catch {
      setFeedback("Unable to delete this project.");
    } finally {
      setDeleting(false);
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
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <p className="text-xl font-bold tracking-tight text-slate-900">Taskly</p>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>{user.name}</span>
            <button className="font-semibold text-indigo-600 hover:underline" onClick={async () => { await logout(); router.replace("/login"); }}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="font-bold text-slate-900">Projects</h1>
            <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" onClick={() => { setCreating(true); setEditing(false); }}>
              + New
            </button>
          </div>
          {loading && <p className="text-sm text-slate-500">Loading projects...</p>}
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!loading && !error && projects.length === 0 && <p className="text-sm text-slate-500">No projects yet. Create one to get started.</p>}
          <div className="grid gap-2">
            {projects.map((project, index) => (
              <div className={`flex items-center gap-1 rounded-lg ${project.id === selectedId ? "bg-indigo-50" : "hover:bg-slate-50"}`} key={project.id}>
                <button className="flex min-w-0 flex-1 items-center gap-2 p-3 text-left text-sm font-medium text-slate-700" onClick={() => { setSelectedId(project.id); setCreating(false); setEditing(false); }}>
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? "#94A3B8" }} aria-hidden="true" />
                  <span className="truncate">{project.name}</span>
                </button>
                <div className="flex pr-2">
                  <button className="p-1 text-xs text-slate-500 disabled:opacity-30" aria-label={`Move ${project.name} up`} disabled={index === 0} onClick={() => { setSelectedId(project.id); void moveProject(-1); }}>↑</button>
                  <button className="p-1 text-xs text-slate-500 disabled:opacity-30" aria-label={`Move ${project.name} down`} disabled={index === projects.length - 1} onClick={() => { setSelectedId(project.id); void moveProject(1); }}>↓</button>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          {creating && <><h2 className="mb-5 text-2xl font-bold text-slate-900">New project</h2><ProjectForm onSaved={saveProject} onCancel={() => setCreating(false)} /></>}
          {!creating && editing && selected && <><h2 className="mb-5 text-2xl font-bold text-slate-900">Edit project</h2><ProjectForm project={selected} onSaved={saveProject} onCancel={() => setEditing(false)} /></>}
          {!creating && !editing && !selected && <div className="py-16 text-center"><h2 className="text-2xl font-bold text-slate-900">Choose a project</h2><p className="mt-2 text-slate-500">Create your first project to start organizing work.</p></div>}
          {!creating && !editing && selected && <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex items-center gap-3"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: selected.color ?? "#94A3B8" }} aria-hidden="true" /><h2 className="text-3xl font-bold text-slate-900">{selected.name}</h2></div><p className="mt-3 text-slate-600">{selected.description || "No description yet."}</p></div>
              <div className="flex gap-2"><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setEditing(true)}>Edit</button><button className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onClick={() => setDeleting(true)}>Delete</button></div>
            </div>
            <div className="mt-16 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Tasks will appear here later.</div>
          </div>}
          {feedback && <p className="mt-5 text-sm font-medium text-emerald-700" role="status">{feedback}</p>}
        </section>
      </div>
      {deleting && selected && <div className="fixed inset-0 z-10 grid place-items-center bg-slate-900/40 p-6" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold text-slate-900" id="delete-title">Delete &quot;{selected.name}&quot;?</h2><p className="mt-2 text-slate-600">This action cannot be undone.</p><div className="mt-6 flex justify-end gap-2"><button className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700" onClick={() => setDeleting(false)}>Cancel</button><button className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700" onClick={removeProject} disabled={deleting}>{deleting ? "Deleting..." : "Delete project"}</button></div></div>
      </div>}
    </main>
  );
}
