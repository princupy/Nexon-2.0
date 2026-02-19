import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { createAfkModeId } from "../../constants/component-ids";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildV2ActionRow,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
  buildBotContainerResponse,
} from "../../ui/component-v2/container-response";

function normalizeReason(input: string): string {
  const value = input.trim();
  if (!value) {
    return "AFK";
  }

  return value.slice(0, 180);
}

const afkCommand: PrefixCommand = {
  name: "afk",
  aliases: ["away"],
  description: "Sets your AFK mode (server or global) with reason.",
  usage: "afk [reason] | afk off",
  usages: ["afk", "afk <reason>", "afk off"],
  guildOnly: true,
  category: "General",
  group: "extra",
  async execute({ client, message, args }) {
    const avatarUrl = getClientAvatarUrl(client);
    const subCommand = args[0]?.toLowerCase();

    if (subCommand === "off" || subCommand === "remove" || subCommand === "disable") {
      const removedRows = await client.afkService.clearEffectiveAfkOnMessage({
        guildId: message.guildId,
        userId: message.author.id,
      });

      if (!removedRows.length) {
        await message.reply(
          buildBotContainerResponse({
            avatarUrl,
            title: "AFK",
            body: "You do not have any active AFK status right now.",
          }),
        );
        return;
      }

      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "AFK",
          body: "Your AFK status has been removed successfully.",
        }),
      );
      return;
    }

    const reason = normalizeReason(args.join(" "));

    client.afkService.createPendingSelection({
      guildId: message.guildId,
      userId: message.author.id,
      reason,
    });

    const serverButton = new ButtonBuilder()
      .setCustomId(createAfkModeId("server", message.guildId, message.author.id))
      .setLabel("Server AFK")
      .setStyle(ButtonStyle.Secondary);

    const globalButton = new ButtonBuilder()
      .setCustomId(createAfkModeId("global", message.guildId, message.author.id))
      .setLabel("Global AFK")
      .setStyle(ButtonStyle.Primary);

    const cancelButton = new ButtonBuilder()
      .setCustomId(createAfkModeId("cancel", message.guildId, message.author.id))
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const setupBlock = [
      "### Setup",
      `> **User:** <@${message.author.id}>`,
      `> **Reason:** ${reason}`,
      "> **Mode Required:** Choose one option below to apply AFK.",
    ].join("\n");

    const modeBlock = [
      "### Mode Options",
      "- **Server AFK:** Active only in this server.",
      "- **Global AFK:** Active across all servers where bot is present.",
    ].join("\n");

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: ["## AFK Setup", "Choose AFK mode to activate your status."],
          accessory: {
            type: "thumbnail",
            url: message.author.displayAvatarURL({
              extension: "png",
              size: 512,
            }),
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(setupBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(modeBlock))
      .addSeparatorComponents(buildV2Separator())
      .addActionRowComponents(buildV2ActionRow(serverButton, globalButton, cancelButton).toJSON())
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Selection expires automatically after a short time."),
      );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};

export default afkCommand;
