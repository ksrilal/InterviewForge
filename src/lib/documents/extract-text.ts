// Converts an uploaded file to plain text once, before it's ever sent to an
// AI model - avoids re-sending binary/raw content on every call and keeps
// token usage proportional to the actual text, not the file size.
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  // Markdown and plain text are already text - no conversion needed.
  return buffer.toString("utf-8").trim();
}
