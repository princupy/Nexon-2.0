import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function parseUserIdToken(rawValue?: string): string | null {
  if (!rawValue) {
    return null;
  }

  const mentionMatch = /^<@!?(\d+)>$/.exec(rawValue.trim());
  if (mentionMatch?.[1]) {
    return mentionMatch[1];
  }

  const normalized = rawValue.replace(/[<@!>]/g, "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
}

function resolveTargetUserId(
  message: Parameters<PrefixCommand["execute"]>[0]["message"],
  rawValue?: string,
): string {
  const parsed = parseUserIdToken(rawValue);
  if (parsed) {
    return parsed;
  }

  return message.mentions.users.first()?.id ?? message.author.id;
}

const avatarCommand: PrefixCommand = {
  name: "avatar",
  aliases: ["av", "pfp"],
  description: "Shows user avatar card with direct profile links.",
  usage: "avatar [@user|userId]",
  usages: ["avatar", "avatar <@user|userId>"],
  guildOnly: true,
  category: "General",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const targetUserId = resolveTargetUserId(message, args[0]);
    const targetUser = await client.users.fetch(targetUserId).catch(() => null);

    if (!targetUser) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Avatar",
          body: [
            `Unable to find user with ID \`${targetUserId}\`.`,
            `Usage: \`${prefix}avatar <@user|userId>\``,
          ].join("\n"),
        }),
      );
      return;
    }

    const guildMember = await message.guild.members.fetch(targetUser.id).catch(() => null);

    const globalAvatarUrl = targetUser.displayAvatarURL({
      extension: "png",
      size: 4096,
    });

    const guildAvatarUrl = guildMember?.avatarURL({
      extension: "png",
      size: 4096,
    }) ?? null;

    const galleryItems = [
      new MediaGalleryItemBuilder().setURL(globalAvatarUrl),
      ...(guildAvatarUrl && guildAvatarUrl !== globalAvatarUrl
        ? [new MediaGalleryItemBuilder().setURL(guildAvatarUrl)]
        : []),
    ];

    const profileBlock = [
      "### Profile",
      `> **User:** ${targetUser.username}`,
      `> **Mention:** <@${targetUser.id}>`,
      `> **ID:** ${targetUser.id}`,
      `> **Server Avatar:** ${guildAvatarUrl ? "Available" : "Not set"}`,
      `> **Global Avatar:** [Open Avatar](${globalAvatarUrl})`,
      ...(guildAvatarUrl && guildAvatarUrl !== globalAvatarUrl
        ? [`> **Guild Avatar:** [Open Guild Avatar](${guildAvatarUrl})`]
        : []),
    ].join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: ["## Avatar", "Clean avatar card with quick profile links."],
          accessory: {
            type: "thumbnail",
            url: globalAvatarUrl,
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(profileBlock))
      .addSeparatorComponents(buildV2Separator())
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(...galleryItems),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Requested by <@${message.author.id}>`),
      );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};

export default avatarCommand;
