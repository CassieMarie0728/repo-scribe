import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { PDFDocument, rgb } from "pdf-lib";

export type ExportFormat = "md" | "txt" | "pdf" | "docx" | "html";

interface ExportOptions {
  content: string;
  filename: string;
  title?: string;
  docType?: string;
  repoUrl?: string;
  generatedAt?: Date;
}

/**
 * Export document as Markdown
 */
export function exportAsMarkdown(options: ExportOptions): Buffer {
  const { content } = options;
  return Buffer.from(content, "utf-8");
}

/**
 * Export document as plain text
 */
export function exportAsText(options: ExportOptions): Buffer {
  const { content } = options;
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
  const { content, title, docType, repoUrl, generatedAt } = options;

  // Convert markdown to HTML (basic implementation)
  let html = content
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

  const metadata = [
    title ? `<p><strong>Document Type:</strong> ${escapeHtml(title)}</p>` : "",
    docType ? `<p><strong>Generated for:</strong> ${escapeHtml(docType)}</p>` : "",
    repoUrl ? `<p><strong>Repository:</strong> <a href="${escapeHtml(repoUrl)}">${escapeHtml(repoUrl)}</a></p>` : "",
    generatedAt ? `<p><strong>Generated:</strong> ${generatedAt.toLocaleString()}</p>` : "",
  ]
    .filter(Boolean)
    .join("");

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || "Document")}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
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
      color: #8b4513;
      margin-top: 20px;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    a {
      color: #8b4513;
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
  <div class="metadata">
    ${metadata}
  </div>
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
  const { content, title, docType, repoUrl, generatedAt } = options;

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

  if (docType || repoUrl || generatedAt) {
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
    sections: [
      {
        properties: {},
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
  const { content, title, docType, repoUrl, generatedAt } = options;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { height } = page.getSize();

  let yPosition = height - 50;
  const margin = 50;
  const maxWidth = 512;

  // Add title
  if (title) {
    page.drawText(title, {
      x: margin,
      y: yPosition,
      size: 24,
      color: rgb(0.55, 0.27, 0.07), // Vintage brown
    });
    yPosition -= 40;
  }

  // Add metadata
  const metadata = [
    docType ? `Document Type: ${docType}` : "",
    repoUrl ? `Repository: ${repoUrl}` : "",
    generatedAt ? `Generated: ${generatedAt.toLocaleString()}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  if (metadata) {
    page.drawText(metadata, {
      x: margin,
      y: yPosition,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= 30;
  }

  // Add content (basic line wrapping)
  const lines = content.split("\n");
  for (const line of lines) {
    if (yPosition < margin) {
      // Create new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      newPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: 11,
        maxWidth,
      });
    } else {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: 11,
        maxWidth,
      });
    }
    yPosition -= 15;
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
