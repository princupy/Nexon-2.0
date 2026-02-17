import { AuditLogEvent, processAntinukeEnforcement } from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeGuildMemberRemoveEvent: NexonEvent<"guildMemberRemove"> = {
  name: "guildMemberRemove",
  async execute(client, member) {
    await processAntinukeEnforcement({
      client,
      guild: member.guild,
      auditLogType: AuditLogEvent.MemberKick,
      actionLabel: "Member Kick",
      reason: `Antinuke triggered due to suspicious kick (${member.id}).`,
      featureKey: "member_kick",
      targetId: member.id,
    });
  },
};

export default antinukeGuildMemberRemoveEvent;
