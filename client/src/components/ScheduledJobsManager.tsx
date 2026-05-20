import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Play, Pause, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

interface ScheduledJob {
  id: number;
  name: string;
  description?: string;
  cronExpression: string;
  status: "active" | "paused" | "completed" | "failed";
  nextRun?: Date;
  lastRun?: Date;
  executionCount: number;
  createdAt: Date;
}

const CRON_PRESETS = [
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 9 AM", value: "0 9 * * *" },
  { label: "Weekly on Monday", value: "0 0 * * 1" },
  { label: "Weekly on Sunday", value: "0 0 * * 0" },
  { label: "Every Monday-Friday", value: "0 0 * * 1-5" },
  { label: "Monthly on 1st", value: "0 0 1 * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
];

export default function ScheduledJobsManager() {
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cronExpression: "0 0 * * 0",
    notifyOnSuccess: true,
    notifyOnFailure: true,
  });

  const listQuery = trpc.scheduledJobs.list.useQuery();
  const createMutation = trpc.scheduledJobs.create.useMutation();
  const pauseMutation = trpc.scheduledJobs.pause.useMutation();
  const resumeMutation = trpc.scheduledJobs.resume.useMutation();
  const deleteMutation = trpc.scheduledJobs.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a job name");
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...formData,
        generationIds: [], // Will be set from History page
        docType: "README",
        tone: "Professional",
        length: "medium",
      });
      toast.success("Scheduled job created");
      setShowCreateDialog(false);
      setFormData({
        name: "",
        description: "",
        cronExpression: "0 0 * * 0",
        notifyOnSuccess: true,
        notifyOnFailure: true,
      });
      listQuery.refetch();
    } catch (error) {
      toast.error("Failed to create job");
    }
  };

  const handlePause = async (job: ScheduledJob) => {
    try {
      await pauseMutation.mutateAsync({ jobId: job.id });
      toast.success("Job paused");
      listQuery.refetch();
    } catch (error) {
      toast.error("Failed to pause job");
    }
  };

  const handleResume = async (job: ScheduledJob) => {
    try {
      await resumeMutation.mutateAsync({ jobId: job.id });
      toast.success("Job resumed");
      listQuery.refetch();
    } catch (error) {
      toast.error("Failed to resume job");
    }
  };

  const handleDelete = async (job: ScheduledJob) => {
    if (!confirm(`Delete scheduled job "${job.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ jobId: job.id });
      toast.success("Job deleted");
      listQuery.refetch();
    } catch (error) {
      toast.error("Failed to delete job");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Scheduled Regenerations</h2>
          <p className="text-sm text-muted-foreground">
            Automatically regenerate documents on a schedule
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {listQuery.data && listQuery.data.length > 0 ? (
        <div className="grid gap-4">
          {listQuery.data.map((job: any) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{job.name}</CardTitle>
                    {job.description && (
                      <CardDescription>{job.description}</CardDescription>
                    )}
                  </div>
                  <Badge className={getStatusColor(job.status)}>
                    {job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Cron Expression</label>
                    <p className="text-muted-foreground">{job.cronExpression}</p>
                  </div>
                  {job.nextRun && (
                    <div>
                      <label className="font-medium flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Next Run
                      </label>
                      <p className="text-muted-foreground">
                        {format(new Date(job.nextRun), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {job.lastRun && (
                    <div>
                      <label className="font-medium flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Last Run
                      </label>
                      <p className="text-muted-foreground">
                        {format(new Date(job.lastRun), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="font-medium">Executions</label>
                    <p className="text-muted-foreground">{job.executionCount}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedJob(job);
                      setShowDetailsDialog(true);
                    }}
                  >
                    Details
                  </Button>
                  {job.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePause(job)}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResume(job)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(job)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No scheduled jobs yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              Create your first schedule
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Scheduled Regeneration</DialogTitle>
            <DialogDescription>
              Set up automatic document regeneration on a schedule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Job Name</Label>
              <Input
                id="name"
                placeholder="e.g., Weekly Legal Review Update"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what this schedule does"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="h-20"
              />
            </div>

            <div>
              <Label htmlFor="cron">Schedule (Cron Expression)</Label>
              <Select
                value={formData.cronExpression}
                onValueChange={(value) =>
                  setFormData({ ...formData, cronExpression: value })
                }
              >
                <SelectTrigger id="cron">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Current: {formData.cronExpression}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notifySuccess"
                  checked={formData.notifyOnSuccess}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifyOnSuccess: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="notifySuccess" className="font-normal">
                  Notify on successful completion
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notifyFailure"
                  checked={formData.notifyOnFailure}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifyOnFailure: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="notifyFailure" className="font-normal">
                  Notify on failure
                </Label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                Create Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedJob?.name}</DialogTitle>
            <DialogDescription>
              {selectedJob?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Badge className={getStatusColor(selectedJob?.status || "")}>
                  {selectedJob?.status}
                </Badge>
              </div>
              <div>
                <Label>Total Executions</Label>
                <p className="text-lg font-semibold">
                  {selectedJob?.executionCount}
                </p>
              </div>
            </div>

            {selectedJob?.lastRun && (
              <div>
                <Label>Last Run</Label>
                <p className="text-sm">
                  {format(new Date(selectedJob.lastRun), "PPpp")}
                </p>
              </div>
            )}

            {selectedJob?.nextRun && (
              <div>
                <Label>Next Scheduled Run</Label>
                <p className="text-sm">
                  {format(new Date(selectedJob.nextRun), "PPpp")}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
