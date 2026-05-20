import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface ExportMenuProps {
  generationId: number;
  docType: string;
  disabled?: boolean;
}

export default function ExportMenu({ generationId, docType, disabled }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const exportMutation = trpc.documents.export.useMutation();

  const handleExport = async (format: "md" | "txt" | "pdf" | "docx" | "html") => {
    setIsExporting(true);
    try {
      const result = await exportMutation.mutateAsync({
        generationId,
        format,
      });

      // Convert base64 to blob
      const binaryString = atob(result.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.mimeType });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${docType}${result.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to export document");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          className="flex items-center gap-2"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("md")} disabled={isExporting}>
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("txt")} disabled={isExporting}>
          Plain Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("html")} disabled={isExporting}>
          HTML (.html)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={isExporting}>
          PDF (.pdf)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("docx")} disabled={isExporting}>
          Word (.docx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
