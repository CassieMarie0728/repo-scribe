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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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

interface RegenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generation: {
    id: number;
    repoUrl: string;
    repoName: string;
    docType: string;
    tone: string;
    length: string;
  };
  onRegenerated: () => void;
}

export default function RegenerateModal({
  open,
  onOpenChange,
  generation,
  onRegenerated,
}: RegenerateModalProps) {
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>(
    (generation.docType as any) || "README"
  );
  const [tone, setTone] = useState<(typeof TONES)[number]>(
    (generation.tone as any) || "Professional"
  );
  const [length, setLength] = useState<(typeof LENGTHS)[number]>(
    (generation.length as any) || "medium"
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  const regenerateMutation = trpc.documents.regenerate.useMutation();

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerateMutation.mutateAsync({
        generationId: generation.id,
        docType,
        tone,
        length,
      });

      toast.success("Document regenerated successfully!");
      onOpenChange(false);
      onRegenerated();
    } catch (error: any) {
      toast.error(error.message || "Failed to regenerate document");
    } finally {
      setIsRegenerating(false);
    }
  };

  const hasChanges =
    docType !== generation.docType ||
    tone !== generation.tone ||
    length !== generation.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Regenerate Document</DialogTitle>
          <DialogDescription>
            Adjust the parameters to regenerate {generation.repoName} with new settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="docType" className="text-sm font-medium">
              Document Type
            </Label>
            <Select value={docType} onValueChange={(value: any) => setDocType(value)}>
              <SelectTrigger id="docType">
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
            <Label htmlFor="tone" className="text-sm font-medium">
              Tone
            </Label>
            <Select value={tone} onValueChange={(value: any) => setTone(value)}>
              <SelectTrigger id="tone">
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
            <Label htmlFor="length" className="text-sm font-medium">
              Length
            </Label>
            <Select value={length} onValueChange={(value: any) => setLength(value)}>
              <SelectTrigger id="length">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (500-700 words)</SelectItem>
                <SelectItem value="medium">Medium (1000-1500 words)</SelectItem>
                <SelectItem value="long">Long (2000-3000 words)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Original Parameters Display */}
          <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Original:</strong> {generation.docType.replace(/_/g, " ")} • {generation.tone} •{" "}
              {generation.length}
            </p>
            {hasChanges && (
              <p className="text-accent">
                <strong>New:</strong> {docType.replace(/_/g, " ")} • {tone} • {length}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRegenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating || !hasChanges}
            className="flex items-center gap-2"
          >
            {isRegenerating && <Spinner className="w-4 h-4" />}
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
