import { AuditLogEvent, processAntinukeEnforcement } from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeNightmodeChannelCreateEvent: NexonEvent<"channelCreate"> = {
  name: "channelCreate",
  async execute(client, channel) {
    await processAntinukeEnforcement({
      client,
      guild: channel.guild,
      auditLogType: AuditLogEvent.ChannelCreate,
      actionLabel: "Nightmode Channel Create",
      reason: `Nightmode antinuke triggered due to channel creation (${channel.id}).`,
      featureKey: "nightmode_channel_create",
      targetId: channel.id,
      requiresNightmode: true,
    });
  },
};

export default antinukeNightmodeChannelCreateEvent;
