import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, AlertCircle } from "lucide-react";

const TONES = ["Formal", "Professional", "Friendly", "Casual", "Laid-back", "Deadpool-cool"] as const;
const LENGTHS = ["short", "medium", "long"] as const;
const DOC_TYPES = [
  "README",
  "LICENSE",
  "CODE_OF_CONDUCT",
  "CONTRIBUTING",
  "SECURITY",
  "PRIVACY",
  "TERMS_OF_SERVICE",
] as const;

interface BatchRegenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  generationIds: number[];
  onRegenerationComplete: () => void;
}

interface RegenerationResult {
  id: number;
  success: boolean;
  error?: string;
}

export default function BatchRegenerateModal({
  open,
  onOpenChange,
  selectedCount,
  generationIds,
  onRegenerationComplete,
}: BatchRegenerateModalProps) {
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>("README");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Professional");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("medium");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RegenerationResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const batchRegenerateMutation = trpc.documents.batchRegenerate.useMutation();

  const handleBatchRegenerate = async () => {
    if (generationIds.length === 0) {
      toast.error("No items selected");
      return;
    }

    setIsRegenerating(true);
    setProgress(0);
    setResults([]);
    setShowResults(false);

    try {
      const result = await batchRegenerateMutation.mutateAsync({
        generationIds,
        docType,
        tone,
        length,
      });

      setResults(result.results);
      setShowResults(true);
      setProgress(100);

      const successCount = result.results.filter((r) => r.success).length;
      const failureCount = result.results.filter((r) => !r.success).length;

      if (failureCount === 0) {
        toast.success(`Successfully regenerated ${successCount} document${successCount !== 1 ? "s" : ""}!`);
      } else {
        toast.warning(
          `Regenerated ${successCount} document${successCount !== 1 ? "s" : ""}, ${failureCount} failed`
        );
      }

      onRegenerationComplete();
    } catch (error: any) {
      toast.error(error.message || "Batch regeneration failed");
    } finally {
      setIsRegenerating(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Batch Regenerate Documents</DialogTitle>
          <DialogDescription>
            Apply new parameters to {selectedCount} selected document{selectedCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-4">
            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="batchDocType" className="text-sm font-medium">
                Document Type
              </Label>
              <Select value={docType} onValueChange={(value: any) => setDocType(value)}>
                <SelectTrigger id="batchDocType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="batchTone" className="text-sm font-medium">
                Tone
              </Label>
              <Select value={tone} onValueChange={(value: any) => setTone(value)}>
                <SelectTrigger id="batchTone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Length */}
            <div className="space-y-2">
              <Label htmlFor="batchLength" className="text-sm font-medium">
                Length
              </Label>
              <Select value={length} onValueChange={(value: any) => setLength(value)}>
                <SelectTrigger id="batchLength">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (500-700 words)</SelectItem>
                  <SelectItem value="medium">Medium (1000-1500 words)</SelectItem>
                  <SelectItem value="long">Long (2000-3000 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
              <p className="font-medium">Note:</p>
              <p>Each document will be regenerated with these parameters, creating new history entries.</p>
            </div>

            {/* Progress Bar */}
            {isRegenerating && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Regenerating...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Results Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{successCount}</div>
                <div className="text-xs text-green-600">Successful</div>
              </div>
              {failureCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{failureCount}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
              )}
            </div>

            {/* Results List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    result.success
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Generation {result.id}</div>
                    {result.error && (
                      <div className="text-xs opacity-75 truncate">{result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setShowResults(false);
              setResults([]);
            }}
            disabled={isRegenerating}
          >
            {showResults ? "Close" : "Cancel"}
          </Button>
          {!showResults && (
            <Button
              onClick={handleBatchRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2"
            >
              {isRegenerating && <Spinner className="w-4 h-4" />}
              {isRegenerating ? "Regenerating..." : "Regenerate All"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
