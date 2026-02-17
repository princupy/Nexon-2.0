import { AuditLogEvent, processAntinukeEnforcement } from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeNightmodeRoleCreateEvent: NexonEvent<"roleCreate"> = {
  name: "roleCreate",
  async execute(client, role) {
    await processAntinukeEnforcement({
      client,
      guild: role.guild,
      auditLogType: AuditLogEvent.RoleCreate,
      actionLabel: "Nightmode Role Create",
      reason: `Nightmode antinuke triggered due to role creation (${role.id}).`,
      featureKey: "nightmode_role_create",
      targetId: role.id,
      requiresNightmode: true,
    });
  },
};

export default antinukeNightmodeRoleCreateEvent;
