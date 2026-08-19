import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type ExportFormat = "md" | "txt" | "pdf" | "docx" | "html";

export type ExportTemplateOptions = {
  headerText?: string | null;
  footerText?: string | null;
  includeMetadata?: number | boolean | null;
  includeTableOfContents?: number | boolean | null;
  fontSize?: string | null;
  fontFamily?: string | null;
  lineSpacing?: string | null;
  pageMargins?: string | null;
  colorScheme?: string | null;
};

interface ExportOptions {
  content: string;
  filename: string;
  title?: string;
  docType?: string;
  repoUrl?: string;
  generatedAt?: Date;
  template?: ExportTemplateOptions;
}

function isTemplateFlagEnabled(value: number | boolean | null | undefined, fallback = true): boolean {
  if (value === null || value === undefined) return fallback;
  return value === true || value === 1;
}

function getTemplatedContent(options: ExportOptions): string {
  const sourceContent = isTemplateFlagEnabled(options.template?.includeMetadata)
    ? options.content.trim()
    : options.content.replace(/^<!--[\s\S]*?-->\s*/, "").trim();
  const header = options.template?.headerText?.trim();
  const footer = options.template?.footerText?.trim();
  const tableOfContents = isTemplateFlagEnabled(options.template?.includeTableOfContents, false)
    ? buildMarkdownTableOfContents(sourceContent)
    : "";
  return [header, tableOfContents, sourceContent, footer].filter(Boolean).join("\n\n");
}

function buildMarkdownTableOfContents(content: string): string {
  const entries = content
    .split("\n")
    .map((line) => line.match(/^(#{1,3})\s+(.+?)\s*$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => {
      const level = match[1].length;
      const title = match[2].replace(/[*_`]/g, "").trim();
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      return `${"  ".repeat(Math.max(0, level - 1))}- [${title}](#${slug})`;
    });

  return entries.length > 0 ? `## Table of Contents\n\n${entries.join("\n")}` : "";
}

function getTemplateStyle(template?: ExportTemplateOptions) {
  const fontFamilies: Record<string, string> = {
    "sans-serif": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    monospace: "'Courier New', monospace",
  };
  const headingColors: Record<string, string> = {
    default: "#8b4513",
    professional: "#1f2937",
    minimal: "#333333",
    vintage: "#981518",
  };
  const fontSizes: Record<string, string> = { small: "14px", normal: "16px", large: "18px" };
  const requestedMargin = template?.pageMargins?.replace(/[^0-9.a-z%\s.]/gi, "").trim();

  return {
    fontFamily: fontFamilies[template?.fontFamily ?? ""] ?? fontFamilies["sans-serif"],
    fontSize: fontSizes[template?.fontSize ?? ""] ?? fontSizes.normal,
    lineSpacing: template?.lineSpacing && ["1", "1.5", "2"].includes(template.lineSpacing)
      ? template.lineSpacing
      : "1.6",
    margin: requestedMargin || "20px",
    headingColor: headingColors[template?.colorScheme ?? ""] ?? headingColors.default,
  };
}

function getTemplateTypography(template?: ExportTemplateOptions) {
  const pdfFonts: Record<string, StandardFonts> = {
    serif: StandardFonts.TimesRoman,
    monospace: StandardFonts.Courier,
    "sans-serif": StandardFonts.Helvetica,
  };
  const docxFonts: Record<string, string> = {
    serif: "Times New Roman",
    monospace: "Courier New",
    "sans-serif": "Arial",
  };
  const fontSizes: Record<string, number> = { small: 10, normal: 11, large: 13 };
  const lineSpacing: Record<string, number> = { "1": 240, "1.5": 360, "2": 480 };
  const colors: Record<string, [number, number, number]> = {
    default: [0.55, 0.27, 0.07],
    professional: [0.12, 0.16, 0.22],
    minimal: [0.2, 0.2, 0.2],
    vintage: [0.596, 0.082, 0.094],
  };
  const marginInches = Number.parseFloat(template?.pageMargins ?? "1") || 1;
  const bodySize = fontSizes[template?.fontSize ?? ""] ?? 11;

  return {
    pdfFont: pdfFonts[template?.fontFamily ?? ""] ?? StandardFonts.Helvetica,
    docxFont: docxFonts[template?.fontFamily ?? ""] ?? "Arial",
    bodySize,
    docxSize: bodySize * 2,
    docxLineSpacing: lineSpacing[template?.lineSpacing ?? ""] ?? 360,
    lineHeight: bodySize * (template?.lineSpacing === "2" ? 2 : template?.lineSpacing === "1" ? 1 : 1.5),
    pageMarginPoints: Math.max(24, Math.min(144, marginInches * 72)),
    pageMarginTwips: Math.max(720, Math.min(2880, Math.round(marginInches * 1440))),
    headingColor: colors[template?.colorScheme ?? ""] ?? colors.default,
  };
}

/**
 * Export document as Markdown
 */
export function exportAsMarkdown(options: ExportOptions): Buffer {
  return Buffer.from(getTemplatedContent(options), "utf-8");
}

/**
 * Export document as plain text
 */
export function exportAsText(options: ExportOptions): Buffer {
  const content = getTemplatedContent(options);
  // Remove markdown formatting for plain text
  let text = content
    .replace(/^#+\s+/gm, "") // Remove headings
    .replace(/\*\*/g, "") // Remove bold
    .replace(/\*/g, "") // Remove italics
    .replace(/`/g, "") // Remove code formatting
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Convert links to plain text
    .replace(/^[-*]\s+/gm, "• "); // Convert lists

  return Buffer.from(text, "utf-8");
}

/**
 * Export document as HTML
 */
export function exportAsHTML(options: ExportOptions): Buffer {
  const { title, docType, repoUrl, generatedAt, template } = options;
  const content = getTemplatedContent(options);
  const templateStyle = getTemplateStyle(template);

  // Convert markdown to HTML (basic implementation)
  let html = escapeHtml(content)
    .replace(/^### (.*?)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*?)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*?)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*?)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  const metadata = isTemplateFlagEnabled(template?.includeMetadata)
    ? [
        title ? `<p><strong>Document Type:</strong> ${escapeHtml(title)}</p>` : "",
        docType ? `<p><strong>Generated for:</strong> ${escapeHtml(docType)}</p>` : "",
        repoUrl ? `<p><strong>Repository:</strong> <a href="${escapeHtml(repoUrl)}">${escapeHtml(repoUrl)}</a></p>` : "",
        generatedAt ? `<p><strong>Generated:</strong> ${generatedAt.toLocaleString()}</p>` : "",
      ].filter(Boolean).join("")
    : "";

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || "Document")}</title>
  <style>
    body {
      font-family: ${templateStyle.fontFamily};
      font-size: ${templateStyle.fontSize};
      line-height: ${templateStyle.lineSpacing};
      max-width: 900px;
      margin: 0 auto;
      padding: ${templateStyle.margin};
      color: #333;
      background: #f9f9f9;
    }
    .metadata {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
      border-left: 4px solid #8b4513;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1, h2, h3 {
      color: ${templateStyle.headingColor};
      margin-top: 20px;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    a {
      color: ${templateStyle.headingColor};
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
  </style>
</head>
<body>
  ${metadata ? `<div class="metadata">${metadata}</div>` : ""}
  <div class="content">
    <p>${html}</p>
  </div>
</body>
</html>`;

  return Buffer.from(fullHtml, "utf-8");
}

/**
 * Export document as DOCX (Word format)
 */
export async function exportAsDocx(options: ExportOptions): Promise<Buffer> {
  const { title, docType, repoUrl, generatedAt, template } = options;
  const content = getTemplatedContent(options);
  const typography = getTemplateTypography(template);

  // Parse markdown into paragraphs
  const lines = content.split("\n");
  const paragraphs: Paragraph[] = [];

  // Add metadata header
  if (title) {
    paragraphs.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
      })
    );
  }

  if (isTemplateFlagEnabled(template?.includeMetadata) && (docType || repoUrl || generatedAt)) {
    const metadataText = [
      docType ? `Document Type: ${docType}` : "",
      repoUrl ? `Repository: ${repoUrl}` : "",
      generatedAt ? `Generated: ${generatedAt.toLocaleString()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    paragraphs.push(
      new Paragraph({
        text: metadataText,
      })
    );
    paragraphs.push(new Paragraph(""));
  }

  // Parse content lines
  for (const line of lines) {
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^#+\s+/, ""),
          heading: HeadingLevel.HEADING_1,
        })
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^#+\s+/, ""),
          heading: HeadingLevel.HEADING_2,
        })
      );
    } else if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^#+\s+/, ""),
          heading: HeadingLevel.HEADING_3,
        })
      );
    } else if (line.trim() === "") {
      paragraphs.push(new Paragraph(""));
    } else {
      paragraphs.push(new Paragraph(line));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: typography.docxFont, size: typography.docxSize },
          paragraph: { spacing: { line: typography.docxLineSpacing } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: typography.pageMarginTwips,
              right: typography.pageMarginTwips,
              bottom: typography.pageMarginTwips,
              left: typography.pageMarginTwips,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Export document as PDF
 */
export async function exportAsPDF(options: ExportOptions): Promise<Buffer> {
  const { title, docType, repoUrl, generatedAt, template } = options;
  const content = getTemplatedContent(options);
  const typography = getTemplateTypography(template);

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // Letter size
  const font = await pdfDoc.embedFont(typography.pdfFont);
  const { height } = page.getSize();

  let yPosition = height - typography.pageMarginPoints;
  const margin = typography.pageMarginPoints;
  const maxWidth = 612 - margin * 2;

  // Add title
  if (title) {
    page.drawText(title, {
      x: margin,
      y: yPosition,
      size: typography.bodySize + 13,
      font,
      color: rgb(...typography.headingColor),
    });
    yPosition -= 40;
  }

  // Add metadata
  const metadata = isTemplateFlagEnabled(template?.includeMetadata)
    ? [
        docType ? `Document Type: ${docType}` : "",
        repoUrl ? `Repository: ${repoUrl}` : "",
        generatedAt ? `Generated: ${generatedAt.toLocaleString()}` : "",
      ].filter(Boolean).join(" | ")
    : "";

  if (metadata) {
    page.drawText(metadata, {
      x: margin,
      y: yPosition,
      size: Math.max(8, typography.bodySize - 1),
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= 30;
  }

  // Add content (basic line wrapping)
  const lines = content.split("\n");
  for (const line of lines) {
    if (yPosition < margin) {
      // Create new page if needed
      page = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: typography.bodySize,
        font,
        maxWidth,
      });
    } else {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: typography.bodySize,
        font,
        maxWidth,
      });
    }
    yPosition -= typography.lineHeight;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Helper: Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    md: "text/markdown",
    txt: "text/plain",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    html: "text/html",
  };
  return mimeTypes[format] || "application/octet-stream";
}

/**
 * Get file extension for export format
 */
export function getFileExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    md: ".md",
    txt: ".txt",
    pdf: ".pdf",
    docx: ".docx",
    html: ".html",
  };
  return extensions[format] || "";
}
