import {
  AuditLogEvent,
  processAntinukeEnforcement,
} from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeChannelDeleteEvent: NexonEvent<"channelDelete"> = {
  name: "channelDelete",
  async execute(client, channel) {
    if (!("guild" in channel)) {
      return;
    }

    await processAntinukeEnforcement({
      client,
      guild: channel.guild,
      auditLogType: AuditLogEvent.ChannelDelete,
      actionLabel: "Channel Delete",
      reason: `Antinuke triggered due to channel deletion (${channel.id}).`,
      featureKey: "channel_delete",
      targetId: channel.id,
    });
  },
};

export default antinukeChannelDeleteEvent;
