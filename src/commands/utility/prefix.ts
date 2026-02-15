import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  MessageFlags,
  PermissionFlagsBits,
  type PermissionsBitField,
} from "discord.js";
import { DEFAULT_PREFIX } from "../../constants/prefix";
import { PrefixValidationError } from "../../services/prefix/prefix-service";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function canManagePrefix(memberPermissions: PermissionsBitField | null): boolean {
  if (!memberPermissions) {
    return false;
  }

  return (
    memberPermissions.has(PermissionFlagsBits.Administrator) ||
    memberPermissions.has(PermissionFlagsBits.ManageGuild)
  );
}

const prefixCommand: PrefixCommand = {
  name: "prefix",
  aliases: ["setprefix"],
  description: "Views or updates the server prefix.",
  usage: "prefix [set <newPrefix> | reset]",
  usages: [
    "prefix",
    "prefix set <newPrefix>",
    "prefix reset",
  ],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const sendResponse = async (details: string): Promise<void> => {
      const unixTime = Math.floor(Date.now() / 1000);
      const headerSection = buildV2Section({
        text: ["## Nexon Prefix", "Prefix management for this server."],
        accessory: {
          type: "thumbnail",
          url: getClientAvatarUrl(client),
        },
      });

      const container = new ContainerBuilder()
        .addSectionComponents(headerSection)
        .addSeparatorComponents(buildV2Separator())
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(details))
        .addSeparatorComponents(buildV2Separator())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Requested by <@${message.author.id}>  |  Generated <t:${unixTime}:R>`,
          ),
        );

      await message.reply(
        {
          flags: MessageFlags.IsComponentsV2,
          components: [container],
        },
      );
    };

    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    const action = args[0]?.toLowerCase();

    if (!action) {
      const currentPrefix = await client.prefixService.getGuildPrefix(guildId);
      await sendResponse(
        `### Current Prefix\n- Active Prefix: \`${currentPrefix}\`\n- Set Prefix: \`${prefix}prefix set <newPrefix>\`\n- Reset Prefix: \`${prefix}prefix reset\``,
      );
      return;
    }

    const memberPermissions = message.member?.permissions ?? null;
    if (!canManagePrefix(memberPermissions)) {
      await sendResponse(
        "### Access Required\n- You need `Manage Server` or `Administrator` to change or reset the prefix.",
      );
      return;
    }

    if (action === "set") {
      const requestedPrefix = args[1];
      if (!requestedPrefix) {
        await sendResponse(`### Usage\n- Command: \`${prefix}prefix set <newPrefix>\``);
        return;
      }

      try {
        const updatedPrefix = await client.prefixService.setGuildPrefix(
          guildId,
          requestedPrefix,
        );
        await sendResponse(
          `### Prefix Updated\n- New Prefix: \`${updatedPrefix}\``,
        );
      } catch (error) {
        if (error instanceof PrefixValidationError) {
          await sendResponse(`### Validation Error\n- ${error.message}`);
          return;
        }

        throw error;
      }

      return;
    }

    if (action === "reset") {
      const resetPrefix = await client.prefixService.resetGuildPrefix(guildId);
      await sendResponse(
        `### Prefix Reset\n- Active Prefix: \`${resetPrefix}\``,
      );
      return;
    }

    await sendResponse(
      `### Unknown Action\n- Valid: \`${prefix}prefix\`, \`${prefix}prefix set <newPrefix>\`, \`${prefix}prefix reset\`\n- Default Prefix: \`${DEFAULT_PREFIX}\``,
    );
  },
};

export default prefixCommand;
