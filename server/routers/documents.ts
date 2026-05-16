import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateDocument, fetchRepoMetadata } from "../lib/generate.functions";
import { getUserGenerations, updateGeneration, getGenerationsByIds } from "../db";

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
        generationId: z.number(),
        content: z.string(),
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
        generationIds: z.array(z.number()),
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
        generationId: z.number(),
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
});
