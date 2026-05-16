import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Copy, Download, Trash2, Package, RefreshCw, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RegenerateModal from "@/components/RegenerateModal";
import BatchRegenerateModal from "@/components/BatchRegenerateModal";

export default function History() {
  const { user } = useAuth();
  const { data: generations = [], isLoading, refetch } = trpc.documents.list.useQuery(
    undefined,
    { enabled: !!user }
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<any>(null);
  const [batchRegenerateOpen, setBatchRegenerateOpen] = useState(false);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = (content: string, docType: string, format: "md" | "txt") => {
    const element = document.createElement("a");
    const sanitizedType = docType.replace(/_/g, "-").toLowerCase();
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${sanitizedType}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`Downloaded as .${format}`);
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === generations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(generations.map(g => g.id)));
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one document");
      return;
    }

    setIsExporting(true);
    try {
      // Dynamically import JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const selectedGenerations = generations.filter(g => selectedIds.has(g.id));
      
      selectedGenerations.forEach((gen) => {
        const sanitizedType = gen.docType.replace(/_/g, "-").toLowerCase();
        const fileName = `${sanitizedType}-${new Date(gen.createdAt).toISOString().split('T')[0]}.md`;
        zip.file(fileName, gen.content);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const element = document.createElement("a");
      element.href = URL.createObjectURL(blob);
      element.download = `repo-scribe-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success(`Exported ${selectedIds.size} document(s) as ZIP`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(error.message || "Failed to export documents");
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) {
    return (
      <>
        <Header />
        <div className="flex-1 min-h-screen flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <h2 className="text-xl font-serif mb-4">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your generation history.
            </p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="flex-1 min-h-screen flex items-center justify-center">
          <Spinner />
        </div>
        <Footer />
      </>
    );
  }

  if (generations.length === 0) {
    return (
      <>
        <Header />
        <div className="flex-1 min-h-screen flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <h2 className="text-xl font-serif mb-4">No Generations Yet</h2>
            <p className="text-muted-foreground">
              Generate your first document to see it here.
            </p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="flex-1 min-h-screen bg-background py-12">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-serif mb-2 text-foreground">Generation History</h1>
          <p className="text-muted-foreground mb-8">
            Your saved document generations ({generations.length})
          </p>

          {/* Bulk Export Section */}
          {generations.length > 0 && (
            <Card className="p-6 mb-8 bg-accent/5 border-accent/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === generations.length && generations.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                  </span>
                  {selectedIds.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setBatchRegenerateOpen(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Zap className="w-4 h-4" />
                      Batch Regenerate
                    </Button>
                    <Button
                      onClick={handleBulkExport}
                      disabled={isExporting}
                      className="flex items-center gap-2 bg-accent text-accent-foreground hover:opacity-90"
                    >
                      <Package className="w-4 h-4" />
                      {isExporting ? "Exporting..." : `Export ${selectedIds.size} as ZIP`}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Generations List */}
          <div className="space-y-4">
            {generations.map((gen) => (
              <Card key={gen.id} className="p-6 border border-border hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(gen.id)}
                    onChange={() => toggleSelection(gen.id)}
                    className="w-5 h-5 rounded border-border cursor-pointer mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-serif text-lg text-foreground">
                        {gen.docType.replace(/_/g, " ")}
                      </h3>
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                        {gen.tone}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Repository: <code className="text-accent">{gen.repoName}</code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Generated {formatDistanceToNow(new Date(gen.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(gen.content)}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(gen.content, gen.docType, "md")}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    .md
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(gen.content, gen.docType, "txt")}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    .txt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedGeneration(gen);
                      setRegenerateOpen(true);
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
      {selectedGeneration && (
        <RegenerateModal
          open={regenerateOpen}
          onOpenChange={setRegenerateOpen}
          generation={selectedGeneration}
          onRegenerated={() => refetch()}
        />
      )}
      <BatchRegenerateModal
        open={batchRegenerateOpen}
        onOpenChange={setBatchRegenerateOpen}
        selectedCount={selectedIds.size}
        generationIds={Array.from(selectedIds)}
        onRegenerationComplete={() => {
          refetch();
          setSelectedIds(new Set());
          setBatchRegenerateOpen(false);
        }}
      />
      <Footer />
    </>
  );
}
