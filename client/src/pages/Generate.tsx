import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import DocumentViewer from "@/components/DocumentViewer";
import EditableDocumentViewer from "@/components/EditableDocumentViewer";
import { trpc } from "@/lib/trpc";
import { z } from "zod";

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

const repoUrlSchema = z.string().url().regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/);

export default function Generate() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [repoUrl, setRepoUrl] = useState("");
  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>("README");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Professional");
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [repoMetadata, setRepoMetadata] = useState<any>(null);

  const generateMutation = trpc.documents.generate.useMutation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate repo URL
    try {
      repoUrlSchema.parse(repoUrl);
    } catch {
      toast.error("Invalid GitHub repository URL. Use: https://github.com/owner/repo");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        repoUrl,
        docType,
        tone,
        length,
      });

      setGeneratedContent(result.content);
      setRepoMetadata(result.metadata);
      setGenerationId(result.generationId);
      toast.success("Document generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1">
        <div className="container max-w-5xl mx-auto px-4 py-12">
          {/* Legal Disclaimer */}
          <div className="mb-8">
            <LegalDisclaimer />
          </div>

          {!generatedContent ? (
            <>
              {/* Form Section */}
              <div className="space-y-8">
                <div>
                  <h1 className="text-4xl font-light mb-2">
                    Generate a <span className="text-accent font-normal">Document</span>
                  </h1>
                  <p className="text-muted-foreground">
                    Provide your GitHub repository details and customize your document preferences.
                  </p>
                </div>

                <Card className="paper-card p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Repository URL Input */}
                    <div className="space-y-2">
                      <Label htmlFor="repo-url" className="text-sm font-semibold">
                        GitHub Repository URL
                      </Label>
                      <Input
                        id="repo-url"
                        type="url"
                        placeholder="https://github.com/owner/repository"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        disabled={isGenerating}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a public repository. Example: https://github.com/vercel/next.js
                      </p>
                    </div>

                    {/* Three-Column Grid for Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Document Type */}
                      <div className="space-y-2">
                        <Label htmlFor="doc-type" className="text-sm font-semibold">
                          Document Type
                        </Label>
                        <Select value={docType} onValueChange={(v) => setDocType(v as any)}>
                          <SelectTrigger id="doc-type" disabled={isGenerating}>
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
                        <Label htmlFor="tone" className="text-sm font-semibold">
                          Tone
                        </Label>
                        <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                          <SelectTrigger id="tone" disabled={isGenerating}>
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
                        <Label htmlFor="length" className="text-sm font-semibold">
                          Length
                        </Label>
                        <Select value={length} onValueChange={(v) => setLength(v as any)}>
                          <SelectTrigger id="length" disabled={isGenerating}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short (~500-700 words)</SelectItem>
                            <SelectItem value="medium">Medium (~1000-1500 words)</SelectItem>
                            <SelectItem value="long">Long (~2000-3000 words)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isGenerating || !repoUrl}
                      className="btn-vintage-primary w-full py-3 text-base"
                    >
                      {isGenerating ? (
                        <>
                          <Spinner className="w-4 h-4 mr-2" />
                          Drafting...
                        </>
                      ) : (
                        "Generate Document"
                      )}
                    </Button>
                  </form>
                </Card>
              </div>
            </>
          ) : (
            generationId ? (
              <EditableDocumentViewer
                generationId={generationId}
                content={generatedContent}
                metadata={repoMetadata}
                docType={docType}
                tone={tone}
                length={length}
                onReset={() => {
                  setGeneratedContent(null);
                  setGenerationId(null);
                  setRepoUrl("");
                }}
              />
            ) : (
              <DocumentViewer
                content={generatedContent}
                metadata={repoMetadata}
                docType={docType}
                tone={tone}
                length={length}
                onReset={() => {
                  setGeneratedContent(null);
                  setRepoUrl("");
                }}
              />
            )
          )
        }
        </div>
      </main>

      <Footer />
    </div>
  );
}
