import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Edit2, Save, X, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import ExportMenu from "./ExportMenu";

interface EditableDocumentViewerProps {
  generationId: number;
  content: string;
  metadata: any;
  docType: string;
  tone: string;
  length: string;
  onReset: () => void;
}

export default function EditableDocumentViewer({
  generationId,
  content,
  metadata,
  docType,
  tone,
  length,
  onReset,
}: EditableDocumentViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateMutation = trpc.documents.updateGeneration.useMutation();

  const sanitizedDocType = docType.replace(/_/g, "-").toLowerCase();

  const handleEditChange = (newContent: string) => {
    setEditedContent(newContent);
    setHasChanges(newContent !== content);
  };

  const handleSaveEdits = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        generationId,
        content: editedContent,
      });
      toast.success("Document updated successfully!");
      setIsEditing(false);
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update document");
    }
  };

  const handleDiscardEdits = () => {
    setEditedContent(content);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleCopyToClipboard = async () => {
    try {
      const textToCopy = isEditing ? editedContent : content;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = (format: "md" | "txt") => {
    const element = document.createElement("a");
    const textToDownload = isEditing ? editedContent : content;
    const file = new Blob([textToDownload], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${sanitizedDocType}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`Downloaded as .${format}`);
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/generate?repo=${encodeURIComponent(
      metadata?.repoUrl || ""
    )}&docType=${docType}&tone=${tone}&length=${length}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Shareable link copied to clipboard!");
  };

  const handleEmailShare = () => {
    const subject = `Check out this ${docType.replace(/_/g, " ")} for ${metadata?.repoName}`;
    const body = `I generated a ${docType.replace(/_/g, " ")} for ${metadata?.repoName} using The Repo Scribe.\n\nYou can regenerate it here: ${window.location.origin}/generate?repo=${encodeURIComponent(
      metadata?.repoUrl || ""
    )}&docType=${docType}&tone=${tone}&length=${length}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-light mb-2">
            {docType.replace(/_/g, " ")}
            {hasChanges && <span className="text-sm text-accent ml-2">● Unsaved</span>}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>📦 {metadata?.repoName || "Repository"}</span>
            <span>•</span>
            <span>🎭 {tone}</span>
            <span>•</span>
            <span>📏 {length}</span>
            <span>•</span>
            <span>⏰ {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
              <Button
                onClick={handleCopyToClipboard}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
              <ExportMenu generationId={generationId} docType={sanitizedDocType} />
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </Button>
              <Button
                onClick={handleEmailShare}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                📧 Email
              </Button>
              <Button
                onClick={onReset}
                variant="outline"
                size="sm"
              >
                Generate Another
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleSaveEdits}
                disabled={!hasChanges || updateMutation.isPending}
                className="flex items-center gap-2 bg-accent text-accent-foreground hover:opacity-90"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleDiscardEdits}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Discard
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Document Content Card */}
      <Card className="paper-card p-8 md:p-12">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => handleEditChange(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm border border-border rounded-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Edit your document here..."
          />
        ) : (
          <div className="doc-output max-w-none">
            <Streamdown>{editedContent}</Streamdown>
          </div>
        )}

        {/* Footer Disclaimer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="text-xs text-muted-foreground italic leading-relaxed">
            This document is an AI-generated template provided for informational purposes only.
            It is not a substitute for professional legal advice. Always have a qualified attorney
            review any legal document before use. The Repo Scribe assumes no liability for the use
            or misuse of this generated content.
          </div>
        </div>
      </Card>
    </div>
  );
}
