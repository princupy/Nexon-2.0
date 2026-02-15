import path from "node:path";
import { logger } from "../core/logger";
import { loadDefaultExports } from "../loaders/module-loader";
import type { NexonClient } from "../core/nexon-client";
import {
  matchesComponentId,
  type ButtonComponentHandler,
  type ModalComponentHandler,
  type SelectMenuComponentHandler,
} from "../types/component";

type IdBasedHandler = { id: string | RegExp };

function resolveComponentsDirectory(customDirectory?: string): string {
  return customDirectory ?? path.join(__dirname, "..", "components");
}

function registerByMatcher<T extends IdBasedHandler>(
  exactMap: Map<string, T>,
  regexList: T[],
  handler: T,
): void {
  if (typeof handler.id === "string") {
    exactMap.set(handler.id, handler);
    return;
  }

  regexList.push(handler);
}

function resetComponentCollections(client: NexonClient): void {
  client.buttonHandlers.clear();
  client.buttonRegexHandlers.length = 0;

  client.selectMenuHandlers.clear();
  client.selectMenuRegexHandlers.length = 0;

  client.modalHandlers.clear();
  client.modalRegexHandlers.length = 0;
}

function findHandlerById<T extends IdBasedHandler>(
  customId: string,
  exactMap: Map<string, T>,
  regexList: T[],
): T | undefined {
  const exact = exactMap.get(customId);
  if (exact) {
    return exact;
  }

  return regexList.find((handler) => matchesComponentId(handler.id, customId));
}

export async function loadComponentHandlers(
  client: NexonClient,
  componentsDirectory?: string,
): Promise<void> {
  const baseDirectory = resolveComponentsDirectory(componentsDirectory);

  const [buttonHandlers, selectMenuHandlers, modalHandlers] = await Promise.all([
    loadDefaultExports<ButtonComponentHandler>(path.join(baseDirectory, "buttons")),
    loadDefaultExports<SelectMenuComponentHandler>(
      path.join(baseDirectory, "select-menus"),
    ),
    loadDefaultExports<ModalComponentHandler>(path.join(baseDirectory, "modals")),
  ]);

  resetComponentCollections(client);

  for (const handler of buttonHandlers) {
    registerByMatcher(client.buttonHandlers, client.buttonRegexHandlers, handler);
  }

  for (const handler of selectMenuHandlers) {
    registerByMatcher(
      client.selectMenuHandlers,
      client.selectMenuRegexHandlers,
      handler,
    );
  }

  for (const handler of modalHandlers) {
    registerByMatcher(client.modalHandlers, client.modalRegexHandlers, handler);
  }

  logger.info(
    `Loaded ${buttonHandlers.length} button, ${selectMenuHandlers.length} select-menu and ${modalHandlers.length} modal handler(s).`,
  );
}

export function findButtonHandler(
  client: NexonClient,
  customId: string,
): ButtonComponentHandler | undefined {
  return findHandlerById(customId, client.buttonHandlers, client.buttonRegexHandlers);
}

export function findSelectMenuHandler(
  client: NexonClient,
  customId: string,
): SelectMenuComponentHandler | undefined {
  return findHandlerById(
    customId,
    client.selectMenuHandlers,
    client.selectMenuRegexHandlers,
  );
}

export function findModalHandler(
  client: NexonClient,
  customId: string,
): ModalComponentHandler | undefined {
  return findHandlerById(customId, client.modalHandlers, client.modalRegexHandlers);
}
