const sanitizeHeader = (value) => String(value || "").replace(/^\uFEFF/, "").trim();

const escapeCsvCell = (value) => {
  const normalized = value === undefined || value === null ? "" : String(value);
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }
  return normalized;
};

export const stringifyCsv = (rows, headers) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const resolvedHeaders =
    Array.isArray(headers) && headers.length
      ? headers
      : safeRows.length
        ? Object.keys(safeRows[0])
        : [];

  const lines = [resolvedHeaders.map(escapeCsvCell).join(",")];
  for (const row of safeRows) {
    const nextLine = resolvedHeaders.map((header) => escapeCsvCell(row?.[header])).join(",");
    lines.push(nextLine);
  }

  return lines.join("\n");
};

export const parseCsv = (csvText = "") => {
  const text = String(csvText || "");
  if (!text.trim()) {
    return [];
  }

  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      currentCell = "";
      if (currentRow.some((cell) => String(cell || "").trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length || currentRow.length) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => String(cell || "").trim() !== "")) {
      rows.push(currentRow);
    }
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map(sanitizeHeader);
  return rows.slice(1).map((cells) =>
    headers.reduce((accumulator, header, columnIndex) => {
      accumulator[header] = cells[columnIndex] === undefined ? "" : String(cells[columnIndex]).trim();
      return accumulator;
    }, {})
  );
};
