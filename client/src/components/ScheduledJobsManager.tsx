import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Pause, Play, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const DOC_TYPES = [
  "README",
  "LICENSE",
  "CODE_OF_CONDUCT",
  "CONTRIBUTING",
  "SECURITY",
  "PRIVACY",
  "TERMS_OF_SERVICE",
] as const;
const TONES = ["Formal", "Professional", "Friendly", "Casual", "Laid-back", "Deadpool-cool"] as const;
const LENGTHS = ["short", "medium", "long"] as const;
const CRON_PRESETS = [
  { label: "Daily at midnight UTC", value: "0 0 0 * * *" },
  { label: "Daily at 9:00 UTC", value: "0 0 9 * * *" },
  { label: "Weekly on Monday at midnight UTC", value: "0 0 0 * * 1" },
  { label: "Weekly on Sunday at midnight UTC", value: "0 0 0 * * 0" },
  { label: "Weekdays at 9:00 UTC", value: "0 0 9 * * 1-5" },
  { label: "Monthly on the 1st at midnight UTC", value: "0 0 0 1 * *" },
  { label: "Every 6 hours", value: "0 0 */6 * * *" },
  { label: "Every 12 hours", value: "0 0 */12 * * *" },
] as const;

type JobStatus = "active" | "paused" | "completed" | "failed";

interface ScheduledJob {
  id: number;
  name: string;
  description?: string | null;
  generationIds: string;
  docType: string;
  tone: string;
  length: string;
  cronExpression: string;
  scheduleCronTaskUid?: string | null;
  status: JobStatus;
  nextRun?: Date | null;
  lastRun?: Date | null;
  executionCount: number;
}

const statusClass: Record<JobStatus, string> = {
  active: "border-emerald-800/20 bg-emerald-100 text-emerald-900",
  paused: "border-amber-800/20 bg-amber-100 text-amber-900",
  failed: "border-[#981518]/20 bg-red-100 text-[#981518]",
  completed: "border-stone-700/20 bg-stone-100 text-stone-800",
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function ScheduledJobsManager() {
  const utils = trpc.useUtils();
  const jobsQuery = trpc.scheduledJobs.list.useQuery();
  const historyQuery = trpc.documents.list.useQuery();
  const createMutation = trpc.scheduledJobs.create.useMutation();
  const pauseMutation = trpc.scheduledJobs.pause.useMutation();
  const resumeMutation = trpc.scheduledJobs.resume.useMutation();
  const deleteMutation = trpc.scheduledJobs.delete.useMutation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cronExpression: "0 0 0 * * 0",
    docType: "README" as (typeof DOC_TYPES)[number],
    tone: "Professional" as (typeof TONES)[number],
    length: "medium" as (typeof LENGTHS)[number],
  });

  const history = historyQuery.data ?? [];
  const selectedCount = selectedIds.size;
  const selectedHistory = useMemo(
    () => history.filter((generation) => selectedIds.has(generation.id)),
    [history, selectedIds]
  );

  const resetCreateForm = () => {
    setFormData({
      name: "",
      description: "",
      cronExpression: "0 0 0 * * 0",
      docType: "README",
      tone: "Professional",
      length: "medium",
    });
    setSelectedIds(new Set());
  };

  const toggleGeneration = (generationId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(generationId)) next.delete(generationId);
      else if (next.size >= 50) {
        toast.error("A scheduled regeneration can target at most 50 History items.");
        return current;
      } else next.add(generationId);
      return next;
    });
  };

  const createSchedule = async () => {
    if (!formData.name.trim()) {
      toast.error("Give this schedule a name so future-you knows what it does.");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Select at least one History item to regenerate.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...formData,
        description: formData.description.trim() || undefined,
        generationIds: Array.from(selectedIds),
      });
      await utils.scheduledJobs.list.invalidate();
      toast.success("Schedule created. Execution results will appear in this app’s job history.");
      resetCreateForm();
      setIsCreateOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "Could not create the schedule."));
    }
  };

  const changeJobStatus = async (job: ScheduledJob, action: "pause" | "resume") => {
    try {
      if (action === "pause") await pauseMutation.mutateAsync({ jobId: job.id });
      else await resumeMutation.mutateAsync({ jobId: job.id });
      await utils.scheduledJobs.list.invalidate();
      toast.success(action === "pause" ? "Schedule paused." : "Schedule resumed.");
    } catch (error) {
      toast.error(errorMessage(error, `Could not ${action} this schedule.`));
    }
  };

  const removeJob = async (job: ScheduledJob) => {
    if (!window.confirm(`Delete scheduled regeneration “${job.name}”? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ jobId: job.id });
      await utils.scheduledJobs.list.invalidate();
      toast.success("Schedule deleted.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete this schedule."));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl text-[#1A1A1A]">Scheduled Regenerations</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Choose saved History items, set replacement parameters, and let the live app run the batch on a durable UTC schedule.
          </p>
        </div>
        <Button className="bg-[#981518] hover:bg-[#7e1013]" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Schedule
        </Button>
      </div>

      <div className="rounded-md border border-[#981518]/20 bg-[#981518]/5 p-3 text-sm text-stone-700">
        <strong className="font-display text-[#981518]">Heads up:</strong> schedules use UTC and require the published app. Every completion or failure is recorded in the job’s execution history; this release does not fake an email channel it cannot honestly deliver through.
      </div>

      {jobsQuery.isLoading ? (
        <p className="text-sm text-stone-600">Loading schedules…</p>
      ) : (jobsQuery.data ?? []).length === 0 ? (
        <Card className="border-stone-300 bg-white/70">
          <CardContent className="py-10 text-center text-sm text-stone-600">
            No scheduled regenerations yet. Pick some History items and make the paperwork refresh itself for once.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(jobsQuery.data ?? []).map((job) => {
            const typedJob = job as ScheduledJob;
            const sourceCount = typedJob.generationIds.split(",").filter(Boolean).length;
            const requiresRecreation = !typedJob.scheduleCronTaskUid;
            return (
              <Card key={typedJob.id} className="border-stone-300 bg-white/70">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="font-display text-xl">{typedJob.name}</CardTitle>
                      {typedJob.description && <CardDescription>{typedJob.description}</CardDescription>}
                    </div>
                    <Badge variant="outline" className={statusClass[requiresRecreation ? "failed" : typedJob.status]}>
                      {requiresRecreation ? "recreate required" : typedJob.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="font-semibold text-stone-800">Targets</p><p className="text-stone-600">{sourceCount} history item{sourceCount === 1 ? "" : "s"}</p></div>
                    <div><p className="font-semibold text-stone-800">Replacement</p><p className="text-stone-600">{typedJob.docType} · {typedJob.tone} · {typedJob.length}</p></div>
                    <div><p className="font-semibold text-stone-800">UTC cron</p><p className="font-mono text-xs text-stone-600">{typedJob.cronExpression}</p></div>
                    <div><p className="font-semibold text-stone-800">Executions</p><p className="text-stone-600">{typedJob.executionCount}</p></div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                    {typedJob.nextRun && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Next: {format(new Date(typedJob.nextRun), "PPp")}</span>}
                    {typedJob.lastRun && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Last: {format(new Date(typedJob.lastRun), "PPp")}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typedJob.status === "active" ? (
                      <Button size="sm" variant="outline" disabled={pauseMutation.isPending || requiresRecreation} onClick={() => changeJobStatus(typedJob, "pause")}><Pause className="mr-1 h-4 w-4" /> Pause</Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={resumeMutation.isPending || requiresRecreation} onClick={() => changeJobStatus(typedJob, "resume")}><Play className="mr-1 h-4 w-4" /> Resume</Button>
                    )}
                    <Button size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => removeJob(typedJob)}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Create Scheduled Regeneration</DialogTitle>
            <DialogDescription>Choose the source documents and the parameters used for every fresh version.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="schedule-name">Schedule name</Label><Input id="schedule-name" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} placeholder="Weekly legal review" /></div>
              <div className="space-y-2"><Label htmlFor="schedule-cron">Schedule (UTC)</Label><Select value={formData.cronExpression} onValueChange={(cronExpression) => setFormData({ ...formData, cronExpression })}><SelectTrigger id="schedule-cron"><SelectValue /></SelectTrigger><SelectContent>{CRON_PRESETS.map((preset) => <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="schedule-description">Description <span className="text-stone-500">(optional)</span></Label><Textarea id="schedule-description" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} placeholder="What this schedule exists to keep fresh." /></div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label>Document type</Label><Select value={formData.docType} onValueChange={(docType) => setFormData({ ...formData, docType: docType as typeof formData.docType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DOC_TYPES.map((value) => <SelectItem key={value} value={value}>{value.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Tone</Label><Select value={formData.tone} onValueChange={(tone) => setFormData({ ...formData, tone: tone as typeof formData.tone })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TONES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Length</Label><Select value={formData.length} onValueChange={(length) => setFormData({ ...formData, length: length as typeof formData.length })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LENGTHS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><Label>History targets</Label><p className="text-xs text-stone-600">{selectedCount} selected of up to 50. Only your own saved generations can be scheduled.</p></div>{history.length > 0 && <Button size="sm" variant="outline" onClick={() => setSelectedIds(selectedCount === Math.min(history.length, 50) ? new Set() : new Set(history.slice(0, 50).map((generation) => generation.id)))}>{selectedCount === Math.min(history.length, 50) ? "Clear all" : "Select up to 50"}</Button>}</div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-stone-300 bg-stone-50 p-2">
                {historyQuery.isLoading ? <p className="p-3 text-sm text-stone-600">Loading History…</p> : history.length === 0 ? <p className="p-3 text-sm text-stone-600">No saved generations yet. Create a document first, then schedule it here.</p> : history.map((generation) => <label key={generation.id} className="flex cursor-pointer items-start gap-3 rounded p-2 hover:bg-white"><Checkbox checked={selectedIds.has(generation.id)} onCheckedChange={() => toggleGeneration(generation.id)} /><span className="min-w-0"><span className="block truncate font-medium text-stone-800">{generation.repoName || generation.repoUrl}</span><span className="block text-xs text-stone-600">{generation.docType} · {generation.tone} · {format(new Date(generation.createdAt), "PP")}</span></span></label>)}
              </div>
              {selectedHistory.length > 0 && <p className="text-xs text-stone-600">Selected: {selectedHistory.map((generation) => generation.repoName || generation.repoUrl).join(", ")}</p>}
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button className="bg-[#981518] hover:bg-[#7e1013]" disabled={createMutation.isPending || selectedCount === 0} onClick={createSchedule}>{createMutation.isPending ? "Creating…" : `Create schedule (${selectedCount})`}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
