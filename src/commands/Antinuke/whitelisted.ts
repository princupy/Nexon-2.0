import { resolveAntinukeFeatureLabel } from "../../constants/antinuke-features";
import { ensureAntinukeCommandAccess } from "../../services/antinuke/antinuke-command.utils";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const whitelistedCommand: PrefixCommand = {
  name: "whitelisted",
  aliases: ["wllist"],
  description: "Shows users trusted by antinuke whitelist.",
  usage: "whitelisted",
  usages: ["whitelisted"],
  guildOnly: true,
  category: "Antinuke",
  group: "main",
  async execute({ client, message }) {
    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);
    if (!(await ensureAntinukeCommandAccess({ client, message, title: "Antinuke Whitelisted" }))) {
      return;
    }

    const users = await client.antinukeService.listWhitelistUsers(guildId);

    if (!users.length) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelisted",
          body: "No users are currently whitelisted in this server.",
        }),
      );
      return;
    }

    const lines = users.slice(0, 20).map((entry, index) => {
      const createdAtUnix = entry.created_at
        ? Math.floor(new Date(entry.created_at).getTime() / 1000)
        : null;

      const createdAtLabel = createdAtUnix
        ? `<t:${createdAtUnix}:R>`
        : "Unknown";

      const addedBy = entry.added_by ? `<@${entry.added_by}>` : "Unknown";
      const features = entry.features.length
        ? entry.features.map((feature) => resolveAntinukeFeatureLabel(feature)).join(", ")
        : "All Features";

      return [
        `**${index + 1}.** <@${entry.user_id}>`,
        `- Added by: ${addedBy}`,
        `- Added: ${createdAtLabel}`,
        `- Features: ${features}`,
      ].join("\n");
    });

    const overflowCount = Math.max(0, users.length - lines.length);

    await message.reply(
      buildBotContainerResponse({
        avatarUrl,
        title: "Antinuke Whitelisted",
        body: [
          `Total trusted users: **${users.length}**`,
          "",
          ...lines,
          ...(overflowCount > 0 ? [`...and ${overflowCount} more user(s).`] : []),
        ].join("\n\n"),
      }),
    );
  },
};

export default whitelistedCommand;
