import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateDocument, fetchRepoMetadata } from "../lib/generate.functions";
import { getUserGenerations } from "../db";

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
});
