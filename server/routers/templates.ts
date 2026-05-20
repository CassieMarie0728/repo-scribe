import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getTemplatesByUserId,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate,
  getDefaultTemplate,
} from "../db";

export const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getTemplatesByUserId(ctx.user.id);
  }),

  getDefault: protectedProcedure.query(async ({ ctx }) => {
    return await getDefaultTemplate(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getTemplateById(input.templateId, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        headerText: z.string().optional(),
        footerText: z.string().optional(),
        includeMetadata: z.boolean().default(true),
        includeTableOfContents: z.boolean().default(false),
        fontSize: z.enum(["small", "normal", "large"]).default("normal"),
        fontFamily: z.enum(["sans-serif", "serif", "monospace"]).default("sans-serif"),
        lineSpacing: z.enum(["1", "1.5", "2"]).default("1.5"),
        pageMargins: z.string().default("1in"),
        colorScheme: z.enum(["default", "professional", "minimal", "vintage"]).default("default"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createTemplate({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        headerText: input.headerText,
        footerText: input.footerText,
        includeMetadata: input.includeMetadata ? 1 : 0,
        includeTableOfContents: input.includeTableOfContents ? 1 : 0,
        fontSize: input.fontSize,
        fontFamily: input.fontFamily,
        lineSpacing: input.lineSpacing,
        pageMargins: input.pageMargins,
        colorScheme: input.colorScheme,
        isDefault: 0,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        headerText: z.string().optional(),
        footerText: z.string().optional(),
        includeMetadata: z.boolean().optional(),
        includeTableOfContents: z.boolean().optional(),
        fontSize: z.enum(["small", "normal", "large"]).optional(),
        fontFamily: z.enum(["sans-serif", "serif", "monospace"]).optional(),
        lineSpacing: z.enum(["1", "1.5", "2"]).optional(),
        pageMargins: z.string().optional(),
        colorScheme: z.enum(["default", "professional", "minimal", "vintage"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {};
      
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.headerText !== undefined) updates.headerText = input.headerText;
      if (input.footerText !== undefined) updates.footerText = input.footerText;
      if (input.includeMetadata !== undefined) updates.includeMetadata = input.includeMetadata ? 1 : 0;
      if (input.includeTableOfContents !== undefined) updates.includeTableOfContents = input.includeTableOfContents ? 1 : 0;
      if (input.fontSize !== undefined) updates.fontSize = input.fontSize;
      if (input.fontFamily !== undefined) updates.fontFamily = input.fontFamily;
      if (input.lineSpacing !== undefined) updates.lineSpacing = input.lineSpacing;
      if (input.pageMargins !== undefined) updates.pageMargins = input.pageMargins;
      if (input.colorScheme !== undefined) updates.colorScheme = input.colorScheme;

      return await updateTemplate(input.templateId, ctx.user.id, updates as any);
    }),

  delete: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteTemplate(input.templateId, ctx.user.id);
    }),

  setDefault: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await setDefaultTemplate(input.templateId, ctx.user.id);
    }),
});
