import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Copy, Download, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

export default function History() {
  const { user } = useAuth();
  const { data: generations = [], isLoading } = trpc.documents.list.useQuery(
    undefined,
    { enabled: !!user }
  );

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-serif mb-4">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to view your generation history.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-serif mb-4">No Generations Yet</h2>
          <p className="text-muted-foreground">
            Generate your first document to see it here.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <h1 className="text-4xl font-serif mb-2 text-foreground">Generation History</h1>
        <p className="text-muted-foreground mb-8">
          Your saved document generations ({generations.length})
        </p>

        <div className="space-y-4">
          {generations.map((gen) => (
            <Card key={gen.id} className="p-6 border border-border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
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
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
