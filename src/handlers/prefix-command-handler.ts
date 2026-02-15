import path from "node:path";
import { logger } from "../core/logger";
import { loadDefaultExports } from "../loaders/module-loader";
import type { NexonClient } from "../core/nexon-client";
import type { PrefixCommand } from "../types/prefix-command";

function resolvePrefixCommandsDirectory(customDirectory?: string): string {
  return customDirectory ?? path.join(__dirname, "..", "commands");
}

function isValidPrefixCommand(command: PrefixCommand): boolean {
  if (!command || typeof command.execute !== "function") {
    return false;
  }

  return Boolean(command.name?.trim());
}

export async function loadPrefixCommands(
  client: NexonClient,
  prefixCommandsDirectory?: string,
): Promise<void> {
  const baseDirectory = resolvePrefixCommandsDirectory(prefixCommandsDirectory);
  const modules = await loadDefaultExports<PrefixCommand>(baseDirectory);

  client.prefixCommands.clear();

  for (const command of modules) {
    if (!isValidPrefixCommand(command)) {
      logger.warn("Skipped invalid prefix command module.");
      continue;
    }

    const names = [command.name.toLowerCase(), ...(command.aliases ?? [])];
    for (const name of names) {
      const normalized = name.toLowerCase();
      if (!normalized) {
        continue;
      }

      if (client.prefixCommands.has(normalized)) {
        logger.warn(`Duplicate prefix command key skipped: ${normalized}`);
        continue;
      }

      client.prefixCommands.set(normalized, command);
    }
  }

  logger.info(`Loaded ${modules.length} prefix command module(s).`);
}
