import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import JSZip from "jszip";

interface Generation {
  id: number;
  repoName?: string | null;
  docType: string;
  content: string;
}

interface BatchExportProps {
  selectedIds: number[];
  generations: Generation[];
  onClose: () => void;
  isOpen: boolean;
}

type ExportFormat = "md" | "txt" | "pdf" | "docx" | "html";

export function BatchExportByFormat({
  selectedIds,
  generations,
  onClose,
  isOpen,
}: BatchExportProps) {
  const [format, setFormat] = useState<ExportFormat>("md");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportMutation = trpc.documents.exportGeneration.useMutation();

  const handleBatchExport = async () => {
    if (selectedIds.length === 0) {
      toast.error("No documents selected");
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const selectedGenerations = generations.filter((g) =>
        selectedIds.includes(g.id)
      );

      for (let i = 0; i < selectedGenerations.length; i++) {
        const gen = selectedGenerations[i];
        const progressPercent = Math.round(((i + 1) / selectedGenerations.length) * 100);
        setProgress(progressPercent);

        try {
          const result = await exportMutation.mutateAsync({
            generationId: gen.id,
            format,
          });

          const filename = `${safeFilenamePart(gen.repoName || "document")}_${safeFilenamePart(gen.docType)}.${getFileExtension(format)}`;
          const binary = atob(result.data);
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          zip.file(filename, bytes);
        } catch (error) {
          console.error(`Failed to export ${gen.docType}:`, error);
          toast.error(`Failed to export ${gen.docType}`);
        }
      }

      // Generate ZIP file
      const zipData = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipData);
      const link = document.createElement("a");
      link.href = url;
      link.download = `repo-scribe-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `Exported ${selectedGenerations.length} documents as ${format.toUpperCase()}`
      );
      onClose();
    } catch (error) {
      console.error("Batch export failed:", error);
      toast.error("Batch export failed");
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Export by Format</DialogTitle>
          <DialogDescription>
            Export {selectedIds.length} document{selectedIds.length !== 1 ? "s" : ""} in your chosen format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="format">Export Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="md">Markdown (.md)</SelectItem>
                <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                <SelectItem value="html">HTML (.html)</SelectItem>
                <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                <SelectItem value="docx">Word (.docx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting...</span>
                <span className="font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchExport}
              disabled={isExporting || selectedIds.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export as ZIP
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getFileExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    md: "md",
    txt: "txt",
    pdf: "pdf",
    docx: "docx",
    html: "html",
  };
  return extensions[format];
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "document";
}
