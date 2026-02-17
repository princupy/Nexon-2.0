import { AuditLogEvent, processAntinukeEnforcement } from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeEmojiDeleteEvent: NexonEvent<"emojiDelete"> = {
  name: "emojiDelete",
  async execute(client, emoji) {
    await processAntinukeEnforcement({
      client,
      guild: emoji.guild,
      auditLogType: AuditLogEvent.EmojiDelete,
      actionLabel: "Emoji Delete",
      reason: `Antinuke triggered due to emoji deletion (${emoji.id ?? "unknown"}).`,
      featureKey: "emoji_delete",
      ...(emoji.id ? { targetId: emoji.id } : {}),
    });
  },
};

export default antinukeEmojiDeleteEvent;
