import { logger } from "../../core/logger";
import { startNoPrefixExpiryNotifier } from "../../services/owner/noprefix-expiry-notifier.service";
import type { NexonEvent } from "../../types/event";

const readyEvent: NexonEvent<"clientReady"> = {
  name: "clientReady",
  once: true,
  execute(client) {
    logger.info(`Nexon online as ${client.user?.tag ?? "unknown-user"}`);
    startNoPrefixExpiryNotifier(client);
  },
};

export default readyEvent;
