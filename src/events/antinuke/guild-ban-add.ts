import { AuditLogEvent, processAntinukeEnforcement } from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeGuildBanAddEvent: NexonEvent<"guildBanAdd"> = {
  name: "guildBanAdd",
  async execute(client, ban) {
    await processAntinukeEnforcement({
      client,
      guild: ban.guild,
      auditLogType: AuditLogEvent.MemberBanAdd,
      actionLabel: "Member Ban",
      reason: `Antinuke triggered due to member ban (${ban.user.id}).`,
      featureKey: "member_ban",
      targetId: ban.user.id,
    });
  },
};

export default antinukeGuildBanAddEvent;
