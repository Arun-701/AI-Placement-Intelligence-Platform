const parseMultipart = (body, contentType) => {
  const boundaryMatch = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Multipart boundary is missing.");
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = [];
  let cursor = 0;
  while (cursor < body.length) {
    const start = body.indexOf(boundary, cursor);
    if (start < 0) break;
    const headerStart = start + boundary.length + 2;
    const next = body.indexOf(boundary, headerStart);
    if (next < 0) break;
    const part = body.subarray(headerStart, next - 2);
    const separator = part.indexOf(Buffer.from("\r\n\r\n"));
    if (separator >= 0) {
      const headers = part.subarray(0, separator).toString("utf8");
      const content = part.subarray(separator + 4);
      const disposition = headers.match(/content-disposition:\s*([^\r\n]+)/i)?.[1] || "";
      const name = disposition.match(/name="([^"]+)"/i)?.[1] || "";
      const filename = disposition.match(/filename="([^"]*)"/i)?.[1] || "";
      parts.push({ name, filename, content, contentType: headers.match(/content-type:\s*([^\r\n]+)/i)?.[1] || "" });
    }
    cursor = next;
  }
  return parts;
};

module.exports = { parseMultipart };
