import { UserFlagsBitField } from "discord.js";
import {
  AuditLogEvent,
  processAntinukeEnforcement,
} from "../../services/antinuke/antinuke-enforcer.service";
import type { NexonEvent } from "../../types/event";

const antinukeUnverifiedBotAddEvent: NexonEvent<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  async execute(client, member) {
    if (!member.user.bot) {
      return;
    }

    const fetchedUser = await member.user.fetch(true).catch(() => member.user);
    const isVerifiedBot = fetchedUser.flags?.has(
      UserFlagsBitField.Flags.VerifiedBot,
    ) ?? false;

    if (isVerifiedBot) {
      return;
    }

    await processAntinukeEnforcement({
      client,
      guild: member.guild,
      auditLogType: AuditLogEvent.BotAdd,
      actionLabel: "Unverified Bot Add",
      reason: `Antinuke triggered because unverified bot (${member.user.id}) was added.`,
      featureKey: "unverified_bot_add",
      targetId: member.user.id,
    });
  },
};

export default antinukeUnverifiedBotAddEvent;
