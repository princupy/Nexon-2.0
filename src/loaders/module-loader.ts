import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { logger } from "../core/logger";

const VALID_SCRIPT_EXTENSIONS = new Set([
  ".ts",
  ".js",
  ".mts",
  ".mjs",
  ".cts",
  ".cjs",
]);

async function walkDirectory(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const filePaths: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...(await walkDirectory(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name);
    if (!VALID_SCRIPT_EXTENSIONS.has(extension) || entry.name.endsWith(".d.ts")) {
      continue;
    }

    filePaths.push(entryPath);
  }

  return filePaths;
}

export async function loadDefaultExports<T>(directory: string): Promise<T[]> {
  const filePaths = await walkDirectory(directory);
  const modules: T[] = [];

  for (const filePath of filePaths) {
    const fileUrl = pathToFileURL(filePath).href;
    const imported = await import(fileUrl);
    let candidate: unknown = imported;

    // Handle both ESM default export and nested CJS transpiled default export.
    while (
      candidate &&
      typeof candidate === "object" &&
      "default" in candidate &&
      Object.keys(candidate as Record<string, unknown>).every(
        (key) => key === "default" || key === "__esModule",
      )
    ) {
      candidate = (candidate as { default: unknown }).default;
    }

    const defaultExport = candidate as T;

    if (defaultExport === undefined || defaultExport === null) {
      logger.warn(`Skipped module without export: ${filePath}`);
      continue;
    }

    modules.push(defaultExport);
  }

  return modules;
}
