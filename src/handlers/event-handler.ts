import path from "node:path";
import { logger } from "../core/logger";
import { loadDefaultExports } from "../loaders/module-loader";
import type { NexonClient } from "../core/nexon-client";
import type { NexonEvent } from "../types/event";

function resolveEventsDirectory(customDirectory?: string): string {
  return customDirectory ?? path.join(__dirname, "..", "events");
}

export async function loadEvents(
  client: NexonClient,
  eventsDirectory?: string,
): Promise<void> {
  const baseDirectory = resolveEventsDirectory(eventsDirectory);
  const events = await loadDefaultExports<NexonEvent>(baseDirectory);

  for (const event of events) {
    if (!event || typeof event.name !== "string" || typeof event.execute !== "function") {
      logger.warn("Skipped invalid event module.");
      continue;
    }

    const execute = event.execute as (
      clientArg: NexonClient,
      ...args: unknown[]
    ) => Promise<void> | void;

    const runner = (...args: unknown[]): void => {
      void Promise.resolve(execute(client, ...args)).catch((error) => {
        logger.error(`Unhandled error inside "${event.name}" event.`, error);
      });
    };

    if (event.once) {
      client.once(event.name, (...args) => runner(...args));
      continue;
    }

    client.on(event.name, (...args) => runner(...args));
  }

  logger.info(`Bound ${events.length} event handler(s).`);
}
