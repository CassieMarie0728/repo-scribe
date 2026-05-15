import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface DocumentViewerProps {
  content: string;
  metadata: any;
  docType: string;
  tone: string;
  length: string;
  onReset: () => void;
}

export default function DocumentViewer({
  content,
  metadata,
  docType,
  tone,
  length,
  onReset,
}: DocumentViewerProps) {
  const [copied, setCopied] = useState(false);

  const sanitizedDocType = docType.replace(/_/g, "-").toLowerCase();
  const fullContent = content;

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = (format: "md" | "txt") => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${sanitizedDocType}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`Downloaded as .${format}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-light mb-2">
            {docType.replace(/_/g, " ")}
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
          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button
            onClick={() => handleDownload("md")}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download .md
          </Button>
          <Button
            onClick={() => handleDownload("txt")}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download .txt
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
          >
            Generate Another
          </Button>
        </div>
      </div>

      {/* Document Content Card */}
      <Card className="paper-card p-8 md:p-12">
        <div className="doc-output prose prose-sm max-w-none">
          <Streamdown>{content}</Streamdown>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            This document is an AI-generated template provided for informational purposes only.
            It is not a substitute for professional legal advice. Always have a qualified attorney
            review any legal document before use. The Repo Scribe assumes no liability for the use
            or misuse of this generated content.
          </p>
        </div>
      </Card>
    </div>
  );
}
