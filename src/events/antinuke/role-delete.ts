import { AuditLogEvent, processAntinukeEnforcement } from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeRoleDeleteEvent: NexonEvent<"roleDelete"> = {
  name: "roleDelete",
  async execute(client, role) {
    await processAntinukeEnforcement({
      client,
      guild: role.guild,
      auditLogType: AuditLogEvent.RoleDelete,
      actionLabel: "Role Delete",
      reason: `Antinuke triggered due to role deletion (${role.id}).`,
      featureKey: "role_delete",
      targetId: role.id,
    });
  },
};

export default antinukeRoleDeleteEvent;
