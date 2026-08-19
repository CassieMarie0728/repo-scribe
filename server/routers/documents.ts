import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateDocument, fetchRepoMetadata } from "../lib/generate.functions";
import { getDefaultTemplate, getUserGenerations, updateGeneration, getGenerationsByIds } from "../db";
import { exportAsMarkdown, exportAsText, exportAsHTML, exportAsPDF, exportAsDocx, getMimeType, getFileExtension, type ExportFormat } from "../lib/export";

const DOC_TYPES = [
  "README",
  "LICENSE",
  "CODE_OF_CONDUCT",
  "CONTRIBUTING",
  "SECURITY",
  "PRIVACY",
  "TERMS_OF_SERVICE",
] as const;

const TONES = [
  "Formal",
  "Professional",
  "Friendly",
  "Casual",
  "Laid-back",
  "Deadpool-cool",
] as const;

const LENGTHS = ["short", "medium", "long"] as const;
const EXPORT_FORMATS = ["md", "txt", "pdf", "docx", "html"] as const;

export const documentsRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        repoUrl: z.string().url().regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/),
        docType: z.enum(DOC_TYPES),
        tone: z.enum(TONES),
        length: z.enum(LENGTHS),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Fetch repository metadata from GitHub
        const repoMetadata = await fetchRepoMetadata(input.repoUrl);

        // Generate document using LLM
        const result = await generateDocument(
          {
            repoUrl: input.repoUrl,
            docType: input.docType,
            tone: input.tone,
            length: input.length,
            repoMetadata,
          },
          ctx.user.id
        );

        return result;
      } catch (error: any) {
        console.error("[Documents] Generation error:", error);
        throw new Error(error.message || "Failed to generate document");
      }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      const generations = await getUserGenerations(ctx.user.id);
      return generations;
    } catch (error) {
      console.error("[Documents] List error:", error);
      return [];
    }
  }),

  updateGeneration: protectedProcedure
    .input(
      z.object({
        generationId: z.number().int().positive(),
        content: z.string().min(1).max(500_000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await updateGeneration(input.generationId, ctx.user.id, input.content);
        return { success: true };
      } catch (error: any) {
        console.error("[Documents] Update error:", error);
        throw new Error(error.message || "Failed to update document");
      }
    }),

  bulkExport: protectedProcedure
    .input(
      z.object({
        generationIds: z.array(z.number().int().positive()).min(1).max(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const generations = await getGenerationsByIds(input.generationIds, ctx.user.id);
        return generations.map(g => ({
          id: g.id,
          docType: g.docType,
          repoUrl: g.repoUrl,
          content: g.content,
          createdAt: g.createdAt,
        }));
      } catch (error: any) {
        console.error("[Documents] Bulk export error:", error);
        throw new Error(error.message || "Failed to export documents");
      }
    }),

  regenerate: protectedProcedure
    .input(
      z.object({
        generationId: z.number().int().positive(),
        docType: z.enum(DOC_TYPES),
        tone: z.enum(TONES),
        length: z.enum(LENGTHS),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const [original] = await getGenerationsByIds([input.generationId], ctx.user.id);
        if (!original) {
          throw new Error("Generation not found");
        }

        const repoMetadata = await fetchRepoMetadata(original.repoUrl);

        const result = await generateDocument(
          {
            repoUrl: original.repoUrl,
            docType: input.docType,
            tone: input.tone,
            length: input.length,
            repoMetadata,
          },
          ctx.user.id
        );

        return result;
      } catch (error: any) {
        console.error("[Documents] Regeneration error:", error);
        throw new Error(error.message || "Failed to regenerate document");
      }
    }),

  batchRegenerate: protectedProcedure
    .input(
      z.object({
        generationIds: z.array(z.number().positive()).min(1).max(50),
        docType: z.enum(DOC_TYPES),
        tone: z.enum(TONES),
        length: z.enum(LENGTHS),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.generationIds.length === 0) {
        throw new Error("No generation IDs provided");
      }
      if (input.generationIds.length > 50) {
        throw new Error("Cannot regenerate more than 50 documents at once");
      }

      const results = [];

      for (const generationId of input.generationIds) {
        try {
          const [original] = await getGenerationsByIds([generationId], ctx.user.id);
          if (!original) {
            results.push({
              id: generationId,
              success: false,
              error: "Generation not found",
            });
            continue;
          }

          const repoMetadata = await fetchRepoMetadata(original.repoUrl);

          await generateDocument(
            {
              repoUrl: original.repoUrl,
              docType: input.docType,
              tone: input.tone,
              length: input.length,
              repoMetadata,
            },
            ctx.user.id
          );

          results.push({
            id: generationId,
            success: true,
          });
        } catch (error: any) {
          console.error(`[Documents] Batch regeneration error for ID ${generationId}:`, error);
          results.push({
            id: generationId,
            success: false,
            error: error.message || "Failed to regenerate",
          });
        }
      }

      return { results };
    }),

  exportGeneration: protectedProcedure
    .input(
      z.object({
        generationId: z.number().int().positive(),
        format: z.enum(EXPORT_FORMATS),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const [generation] = await getGenerationsByIds([input.generationId], ctx.user.id);
        if (!generation) {
          throw new Error("Generation not found");
        }

        const template = await getDefaultTemplate(ctx.user.id);
        let buffer: Buffer;
        const exportOptions = {
          content: generation.content,
          filename: `${generation.docType}-${Date.now()}`,
          title: generation.docType,
          docType: generation.docType,
          repoUrl: generation.repoUrl,
          generatedAt: generation.createdAt,
          template: template ?? undefined,
        };

        switch (input.format) {
          case "md":
            buffer = exportAsMarkdown(exportOptions);
            break;
          case "txt":
            buffer = exportAsText(exportOptions);
            break;
          case "html":
            buffer = exportAsHTML(exportOptions);
            break;
          case "pdf":
            buffer = await exportAsPDF(exportOptions);
            break;
          case "docx":
            buffer = await exportAsDocx(exportOptions);
            break;
          default:
            throw new Error(`Unsupported export format: ${input.format}`);
        }

        return {
          data: buffer.toString("base64"),
          mimeType: getMimeType(input.format),
          extension: getFileExtension(input.format),
        };
      } catch (error: any) {
        console.error("[Documents] Export error:", error);
        throw new Error(error.message || "Failed to export document");
      }
    }),

  exportBatch: protectedProcedure
    .input(
      z.object({
        generationIds: z.array(z.number().int().positive()).min(1).max(50),
        format: z.enum(EXPORT_FORMATS),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const generations = await getGenerationsByIds(input.generationIds, ctx.user.id);
        if (generations.length === 0) {
          throw new Error("No generations found");
        }

        const template = await getDefaultTemplate(ctx.user.id);
        const exports = [];
        for (const generation of generations) {
          const exportOptions = {
            content: generation.content,
            filename: `${generation.docType}-${Date.now()}`,
            title: generation.docType,
            docType: generation.docType,
            repoUrl: generation.repoUrl,
            generatedAt: generation.createdAt,
            template: template ?? undefined,
          };

          let buffer: Buffer;
          switch (input.format) {
            case "md":
              buffer = exportAsMarkdown(exportOptions);
              break;
            case "txt":
              buffer = exportAsText(exportOptions);
              break;
            case "html":
              buffer = exportAsHTML(exportOptions);
              break;
            case "pdf":
              buffer = await exportAsPDF(exportOptions);
              break;
            case "docx":
              buffer = await exportAsDocx(exportOptions);
              break;
            default:
              throw new Error(`Unsupported export format: ${input.format}`);
          }

          exports.push({
            filename: `${generation.docType}${getFileExtension(input.format)}`,
            data: buffer.toString("base64"),
          });
        }

        return {
          exports,
          mimeType: getMimeType(input.format),
        };
      } catch (error: any) {
        console.error("[Documents] Batch export error:", error);
        throw new Error(error.message || "Failed to export documents");
      }
    }),
});
