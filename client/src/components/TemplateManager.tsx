import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Settings } from "lucide-react";

interface Template {
  id: number;
  name: string;
  description?: string;
  isDefault: number;
  fontSize: string;
  fontFamily: string;
  lineSpacing: string;
  colorScheme: string;
}

export function TemplateManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    headerText: "",
    footerText: "",
    includeMetadata: true,
    includeTableOfContents: false,
    fontSize: "normal" as const,
    fontFamily: "sans-serif" as const,
    lineSpacing: "1.5" as const,
    pageMargins: "1in",
    colorScheme: "default" as const,
  });

  const { data: templates = [], refetch } = trpc.templates.list.useQuery();
  const createMutation = trpc.templates.create.useMutation();
  const updateMutation = trpc.templates.update.useMutation();
  const deleteMutation = trpc.templates.delete.useMutation();
  const setDefaultMutation = trpc.templates.setDefault.useMutation();

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          templateId: editingId,
          ...formData,
        });
        toast.success("Template updated");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Template created");
      }
      refetch();
      resetForm();
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteMutation.mutateAsync({ templateId });
      toast.success("Template deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleSetDefault = async (templateId: number) => {
    try {
      await setDefaultMutation.mutateAsync({ templateId });
      toast.success("Default template updated");
      refetch();
    } catch (error) {
      toast.error("Failed to set default template");
    }
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      description: template.description || "",
      headerText: "",
      footerText: "",
      includeMetadata: true,
      includeTableOfContents: false,
      fontSize: (template.fontSize || "normal") as any,
      fontFamily: (template.fontFamily || "sans-serif") as any,
      lineSpacing: (template.lineSpacing || "1.5") as any,
      pageMargins: "1in",
      colorScheme: (template.colorScheme || "default") as any,
    });
    setIsOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      headerText: "",
      footerText: "",
      includeMetadata: true,
      includeTableOfContents: false,
      fontSize: "normal",
      fontFamily: "sans-serif",
      lineSpacing: "1.5",
      pageMargins: "1in",
      colorScheme: "default",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Export Templates</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Template" : "Create New Template"}
              </DialogTitle>
              <DialogDescription>
                Customize export formatting options
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., GitHub-Ready"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fontSize">Font Size</Label>
                  <Select
                    value={formData.fontSize}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        fontSize: value as any,
                      })
                    }
                  >
                    <SelectTrigger id="fontSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Select
                    value={formData.fontFamily}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        fontFamily: value as any,
                      })
                    }
                  >
                    <SelectTrigger id="fontFamily">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans-serif">Sans Serif</SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="monospace">Monospace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="lineSpacing">Line Spacing</Label>
                  <Select
                    value={formData.lineSpacing}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        lineSpacing: value as any,
                      })
                    }
                  >
                    <SelectTrigger id="lineSpacing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                      <SelectItem value="2">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="colorScheme">Color Scheme</Label>
                  <Select
                    value={formData.colorScheme}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        colorScheme: value as any,
                      })
                    }
                  >
                    <SelectTrigger id="colorScheme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="vintage">Vintage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="headerText">Header Text (optional)</Label>
                <Textarea
                  id="headerText"
                  value={formData.headerText}
                  onChange={(e) =>
                    setFormData({ ...formData, headerText: e.target.value })
                  }
                  placeholder="Text to prepend to every export"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="footerText">Footer Text (optional)</Label>
                <Textarea
                  id="footerText"
                  value={formData.footerText}
                  onChange={(e) =>
                    setFormData({ ...formData, footerText: e.target.value })
                  }
                  placeholder="Text to append to every export"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeMetadata"
                    checked={formData.includeMetadata}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        includeMetadata: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="includeMetadata">Include Metadata</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTableOfContents"
                    checked={formData.includeTableOfContents}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        includeTableOfContents: checked === true,
                      })
                    }
                  />
                  <Label htmlFor="includeTableOfContents">
                    Include Table of Contents
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Update" : "Create"} Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates yet</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition"
            >
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {template.name}
                  {template.isDefault === 1 && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {template.isDefault === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetDefault(template.id)}
                    disabled={setDefaultMutation.isPending}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(template as Template)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(template.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
