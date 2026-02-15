import { env } from "./config/env";
import { NexonClient } from "./core/nexon-client";
import { logger } from "./core/logger";
import { loadComponentHandlers } from "./handlers/component-handler";
import { loadEvents } from "./handlers/event-handler";
import { loadPrefixCommands } from "./handlers/prefix-command-handler";

async function bootstrap(): Promise<void> {
  const client = new NexonClient();

  await loadPrefixCommands(client);
  await loadComponentHandlers(client);
  await loadEvents(client);
  await client.login(env.DISCORD_TOKEN);
}

void bootstrap().catch((error) => {
  logger.error("Failed to bootstrap Nexon.", error);
  process.exitCode = 1;
});
