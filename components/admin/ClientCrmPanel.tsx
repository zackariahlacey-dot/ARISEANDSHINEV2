"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProfileTag, removeProfileTag, updateProfileFields,
  listProfileSubscriptions, adminPauseSubscription, adminResumeSubscription, adminCancelSubscription,
  listClientTasks, addClientTask, toggleClientTask, deleteClientTask,
  listClientEmailHistory,
  type ClientTask, type AdminSubscriptionRow, type EmailHistoryRow,
} from "@/app/actions/clientCrmActions";
import { useToast } from "@/components/admin/Toast";
import {
  Plus, X, Loader2, Pause, Play, Trash2, Check, Clock,
  Tag, Mail, Repeat, BellOff, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const LIFECYCLE_COLOR: Record<string, string> = {
  vip:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  active:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  lapsed:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  churned: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  lead:    "bg-sky-500/15 text-sky-400 border-sky-500/30",
};

export function ClientCrmPanel({
  profileId,
  initialTags,
  initialDnc,
  initialLifecycle,
  email,
  onChange,
}: {
  profileId: string;
  initialTags: string[];
  initialDnc: boolean;
  initialLifecycle: string;
  email: string | null;
  onChange?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const [dnc,  setDnc]  = useState<boolean>(!!initialDnc);
  const [stage, setStage] = useState<string>(initialLifecycle || "lead");
  const [newTag, setNewTag] = useState("");
  const [busy, setBusy] = useState(false);

  const subsQuery = useQuery({
    queryKey: ["crm", "subscriptions", profileId],
    queryFn: () => listProfileSubscriptions(profileId),
    enabled: !!profileId,
  });

  const tasksQuery = useQuery({
    queryKey: ["crm", "tasks", profileId],
    queryFn: () => listClientTasks(profileId),
    enabled: !!profileId,
  });

  const emailsQuery = useQuery({
    queryKey: ["crm", "emails", email ?? ""],
    queryFn: () => listClientEmailHistory(email),
    enabled: !!email,
  });

  function bump() {
    queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
    onChange?.();
  }

  async function handleAddTag() {
    const t = newTag.trim();
    if (!t) return;
    setBusy(true);
    const r = await addProfileTag(profileId, t);
    setBusy(false);
    if (r.ok && r.tags) { setTags(r.tags); setNewTag(""); bump(); }
    else toast(r.error ?? "Failed", "error");
  }
  async function handleRemoveTag(t: string) {
    setBusy(true);
    const r = await removeProfileTag(profileId, t);
    setBusy(false);
    if (r.ok && r.tags) { setTags(r.tags); bump(); }
    else toast(r.error ?? "Failed", "error");
  }
  async function handleToggleDnc() {
    const next = !dnc;
    setDnc(next);
    const r = await updateProfileFields(profileId, { do_not_contact: next });
    if (!r.ok) { setDnc(!next); toast(r.error ?? "Failed", "error"); }
    else { toast(next ? "DNC enabled" : "DNC disabled"); bump(); }
  }
  async function handleStageChange(next: string) {
    const prev = stage;
    setStage(next);
    const r = await updateProfileFields(profileId, { lifecycle_stage: next as any });
    if (!r.ok) { setStage(prev); toast(r.error ?? "Failed", "error"); }
    else bump();
  }

  return (
    <div className="space-y-3">
      {/* ── Lifecycle + DNC ──────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lifecycle</span>
          <button
            onClick={handleToggleDnc}
            className={cn(
              "flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border transition-all",
              dnc ? "bg-red-500/15 border-red-500/35 text-red-400" : "bg-white/[0.03] border-white/[0.08] text-zinc-500",
            )}
          >
            <BellOff size={11} /> {dnc ? "Do Not Contact" : "Contact OK"}
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {["lead", "active", "lapsed", "churned", "vip"].map(s => (
            <button
              key={s}
              onClick={() => handleStageChange(s)}
              className={cn(
                "px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all",
                stage === s ? LIFECYCLE_COLOR[s] : "border-white/[0.08] text-zinc-600 hover:text-zinc-300",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tags ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Tag size={11} className="text-zinc-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tags</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {tags.length === 0 && <span className="text-[11px] italic text-zinc-600">No tags yet</span>}
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              {t}
              <button onClick={() => handleRemoveTag(t)} className="hover:text-red-400">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddTag()}
            placeholder="Add tag…"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={handleAddTag}
            disabled={busy || !newTag.trim()}
            className="px-3 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Subscriptions ────────────────────────────────────────── */}
      <SubscriptionsBlock subs={subsQuery.data ?? []} loading={subsQuery.isLoading} refetch={() => subsQuery.refetch()} />

      {/* ── Tasks ────────────────────────────────────────────────── */}
      <TasksBlock
        profileId={profileId}
        tasks={tasksQuery.data ?? []}
        loading={tasksQuery.isLoading}
        refetch={() => tasksQuery.refetch()}
      />

      {/* ── Email history ────────────────────────────────────────── */}
      {email && (
        <EmailHistoryBlock rows={emailsQuery.data ?? []} loading={emailsQuery.isLoading} />
      )}
    </div>
  );
}

function SubscriptionsBlock({ subs, loading, refetch }: { subs: AdminSubscriptionRow[]; loading: boolean; refetch: () => void }) {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(subId: string, fn: (id: string) => Promise<{ ok: boolean; error?: string }>, label: string) {
    setBusyId(subId);
    const r = await fn(subId);
    setBusyId(null);
    if (r.ok) { toast(`${label} ✅`); refetch(); }
    else toast(r.error ?? "Failed", "error");
  }

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center gap-1.5">
        <Repeat size={11} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Monthly Plans</span>
      </div>
      {loading ? (
        <div className="px-3 py-3 flex justify-center"><Loader2 size={14} className="animate-spin text-amber-500" /></div>
      ) : subs.length === 0 ? (
        <p className="px-3 py-3 text-[11px] italic text-zinc-600">No subscriptions on file.</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {subs.map(s => (
            <li key={s.id} className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-100 truncate">{s.plan_name}</p>
                  <p className="text-[11px] text-zinc-500">${s.plan_price}/mo · {s.payment_method} · since {format(parseISO(s.signup_date + "T12:00:00"), "MMM d, yyyy")}</p>
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0",
                  s.status === "active"    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : s.status === "paused"   ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                  : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                )}>
                  {s.status}
                </span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {s.status === "active" && (
                  <button
                    onClick={() => act(s.id, adminPauseSubscription, "Paused")}
                    disabled={busyId === s.id}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400"
                  >
                    {busyId === s.id ? <Loader2 size={10} className="animate-spin" /> : <><Pause size={10} /> Pause</>}
                  </button>
                )}
                {s.status === "paused" && (
                  <button
                    onClick={() => act(s.id, adminResumeSubscription, "Resumed")}
                    disabled={busyId === s.id}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  >
                    {busyId === s.id ? <Loader2 size={10} className="animate-spin" /> : <><Play size={10} /> Resume</>}
                  </button>
                )}
                {s.status !== "cancelled" && (
                  <button
                    onClick={() => {
                      if (!confirm(`Cancel ${s.plan_name}? This will also cancel future monthly bookings.`)) return;
                      act(s.id, adminCancelSubscription, "Cancelled");
                    }}
                    disabled={busyId === s.id}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TasksBlock({
  profileId, tasks, loading, refetch,
}: {
  profileId: string;
  tasks: ClientTask[];
  loading: boolean;
  refetch: () => void;
}) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setBusy(true);
    const r = await addClientTask(profileId, { title, due_date: due || null });
    setBusy(false);
    if (r.ok) { toast("Task added"); setTitle(""); setDue(""); setAdding(false); refetch(); }
    else toast(r.error ?? "Failed", "error");
  }
  async function handleToggle(id: string) {
    const r = await toggleClientTask(id);
    if (r.ok) refetch(); else toast(r.error ?? "Failed", "error");
  }
  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    const r = await deleteClientTask(id);
    if (r.ok) refetch(); else toast(r.error ?? "Failed", "error");
  }

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="text-zinc-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Follow-ups</span>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[10px] font-black text-amber-400">
            <Plus size={10} /> Add
          </button>
        )}
      </div>
      {loading ? (
        <div className="px-3 py-3 flex justify-center"><Loader2 size={14} className="animate-spin text-amber-500" /></div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {tasks.map(t => {
            const done = !!t.completed_at;
            const overdue = !done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
            return (
              <li key={t.id} className="px-3 py-2 flex items-center gap-2">
                <button
                  onClick={() => handleToggle(t.id)}
                  className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                    done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "border-white/[0.15] text-transparent",
                  )}
                >
                  <Check size={11} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", done ? "line-through text-zinc-600" : "text-zinc-100")}>{t.title}</p>
                  {t.due_date && (
                    <p className={cn("text-[10px]", overdue ? "text-red-400" : "text-zinc-500")}>
                      <Clock size={9} className="inline mr-0.5" />
                      {format(parseISO(t.due_date + "T12:00:00"), "MMM d, yyyy")}
                      {overdue && " · overdue"}
                    </p>
                  )}
                </div>
                <button onClick={() => handleDelete(t.id)} className="text-zinc-500 hover:text-red-400">
                  <Trash2 size={11} />
                </button>
              </li>
            );
          })}
          {tasks.length === 0 && !adding && <li className="px-3 py-2.5 text-[11px] italic text-zinc-600">No follow-ups.</li>}
        </ul>
      )}
      {adding && (
        <div className="px-3 py-2.5 border-t border-white/[0.04] bg-white/[0.02] space-y-1.5">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (e.g. 'Send Spring promo')"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
            autoFocus
          />
          <div className="flex gap-1.5">
            <input
              type="date"
              value={due}
              onChange={e => setDue(e.target.value)}
              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
            />
            <button onClick={() => { setAdding(false); setTitle(""); setDue(""); }} className="px-3 rounded-lg border border-white/[0.08] text-zinc-400 text-[10px] font-black uppercase tracking-wider">Cancel</button>
            <button onClick={handleAdd} disabled={busy || !title.trim()} className="px-3 rounded-lg bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 disabled:opacity-40">
              {busy ? <Loader2 size={10} className="animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailHistoryBlock({ rows, loading }: { rows: EmailHistoryRow[]; loading: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center gap-1.5">
        <Mail size={11} className="text-zinc-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Email Activity</span>
      </div>
      {loading ? (
        <div className="px-3 py-3 flex justify-center"><Loader2 size={14} className="animate-spin text-amber-500" /></div>
      ) : rows.length === 0 ? (
        <p className="px-3 py-3 text-[11px] italic text-zinc-600">No tracked emails.</p>
      ) : (
        <ul className="divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
          {rows.map(r => (
            <li key={r.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-200 truncate flex-1">{r.subject ?? "(no subject)"}</span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0",
                  r.event === "delivered" ? "bg-emerald-500/15 text-emerald-400"
                  : r.event === "opened"  ? "bg-sky-500/15 text-sky-400"
                  : r.event === "clicked" ? "bg-amber-500/15 text-amber-400"
                  : r.event === "bounced" ? "bg-red-500/15 text-red-400"
                  : "bg-zinc-500/15 text-zinc-400"
                )}>
                  {r.event}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">{format(new Date(r.created_at), "MMM d, h:mm a")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
