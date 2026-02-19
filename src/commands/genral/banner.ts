import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import {
  createBannerViewSelectId,
  type BannerViewType,
} from "../../constants/component-ids";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  buildV2ActionRow,
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

function buildUserProfileLink(username: string, userId: string): string {
  const safeName = username.replace(/\]/g, "");
  return `[${safeName}](https://discord.com/users/${userId})`;
}

function buildBannerTypeSelectMenu(input: {
  guildId: string;
  requesterId: string;
  targetUserId: string;
  selectedType?: BannerViewType;
}): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId(
      createBannerViewSelectId(
        input.guildId,
        input.requesterId,
        input.targetUserId,
      ),
    )
    .setPlaceholder("Select Banner Type")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      {
        label: "User Banner",
        value: "user",
        description: "Show global Discord profile banner",
        default: input.selectedType === "user",
      },
      {
        label: "Server Banner",
        value: "server",
        description: "Show this server profile banner",
        default: input.selectedType === "server",
      },
    );
}

const bannerCommand: PrefixCommand = {
  name: "banner",
  aliases: ["bnr"],
  description: "Opens banner viewer with dropdown for user or server banner.",
  usage: "banner [@user|userId]",
  usages: ["banner", "banner <@user|userId>"],
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
          title: "Banner Viewer",
          body: [
            `Unable to find user with ID \`${targetUserId}\`.`,
            `Usage: \`${prefix}banner <@user|userId>\``,
          ].join("\n"),
        }),
      );
      return;
    }

    const selectMenu = buildBannerTypeSelectMenu({
      guildId: message.guildId,
      requesterId: message.author.id,
      targetUserId: targetUser.id,
    });

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## Banner Viewer"),
      )
      .addSeparatorComponents(buildV2Separator())
      .addSectionComponents(
        buildV2Section({
          text: [
            [
              "### Target",
              buildUserProfileLink(targetUser.username, targetUser.id),
              `ID: ${targetUser.id}`,
            ].join("\n"),
          ],
          accessory: {
            type: "thumbnail",
            url:
              targetUser.displayAvatarURL({
                extension: "png",
                size: 1024,
              }) ?? getClientAvatarUrl(client),
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Choose what you want to view from dropdown.",
        ),
      )
      .addActionRowComponents(buildV2ActionRow(selectMenu).toJSON());

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};

export default bannerCommand;
