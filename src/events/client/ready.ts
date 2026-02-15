import { logger } from "../../core/logger";
import type { NexonEvent } from "../../types/event";

const readyEvent: NexonEvent<"clientReady"> = {
  name: "clientReady",
  once: true,
  execute(client) {
    logger.info(`Nexon online as ${client.user?.tag ?? "unknown-user"}`);
  },
};

export default readyEvent;
