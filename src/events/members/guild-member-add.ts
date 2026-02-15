import { logger } from "../../core/logger";
import {
  buildWelcomeContainerMessage,
} from "../../services/welcome/greet-message.service";
import type { NexonEvent } from "../../types/event";

const guildMemberAddEvent: NexonEvent<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  async execute(client, member) {
    if (member.user.bot) {
      return;
    }

    const config = await client.repositories.greetConfig.getByGuildId(member.guild.id);
    if (!config?.enabled || !config.channel_id || !config.message_template) {
      return;
    }

    const channel =
      member.guild.channels.cache.get(config.channel_id) ??
      (await member.guild.channels.fetch(config.channel_id).catch(() => null));

    if (!channel?.isTextBased() || channel.isDMBased()) {
      return;
    }

    try {
      const sent = await channel.send(
        buildWelcomeContainerMessage({
          member,
          template: config.message_template,
          style: config.style,
        }),
      );

      if (config.auto_delete_seconds !== null && config.auto_delete_seconds > 0) {
        setTimeout(() => {
          void sent.delete().catch(() => undefined);
        }, config.auto_delete_seconds * 1000);
      }
    } catch (error) {
      logger.error(
        `Failed to send welcome message in guild ${member.guild.id}.`,
        error,
      );
    }
  },
};

export default guildMemberAddEvent;
