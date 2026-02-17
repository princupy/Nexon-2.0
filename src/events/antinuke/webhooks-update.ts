import {
  AuditLogEvent,
  processAntinukeEnforcement,
} from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeWebhooksUpdateEvent: NexonEvent<"webhooksUpdate"> = {
  name: "webhooksUpdate",
  async execute(client, channel) {
    await processAntinukeEnforcement({
      client,
      guild: channel.guild,
      auditLogType: AuditLogEvent.WebhookCreate,
      actionLabel: "Webhook Create",
      reason: `Antinuke triggered due to webhook creation in channel (${channel.id}).`,
      featureKey: "webhook_create",
    });

    await processAntinukeEnforcement({
      client,
      guild: channel.guild,
      auditLogType: AuditLogEvent.WebhookDelete,
      actionLabel: "Webhook Delete",
      reason: `Antinuke triggered due to webhook deletion in channel (${channel.id}).`,
      featureKey: "webhook_delete",
    });
  },
};

export default antinukeWebhooksUpdateEvent;
