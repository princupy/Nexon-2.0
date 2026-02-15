import { ButtonBuilder, ButtonStyle, type Guild, type GuildMember } from "discord.js";
import {
  createGreetSetupId,
} from "../../constants/component-ids";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";
import {
  buildWelcomeContainerMessage,
  getGreetPlaceholderGuide,
} from "../../services/welcome/greet-message.service";
import { parseStoredGreetTemplate } from "../../services/welcome/greet-editor.service";

async function resolveGuildTextChannel(guild: Guild, channelId: string) {
  const channel =
    guild.channels.cache.get(channelId) ??
    (await guild.channels.fetch(channelId).catch(() => null));

  if (!channel?.isTextBased() || channel.isDMBased()) {
    return null;
  }

  return channel;
}

async function resolveTargetMember(
  message: Parameters<PrefixCommand["execute"]>[0]["message"],
  rawValue?: string,
): Promise<GuildMember | null> {
  const mentionTarget = message.mentions.members?.first();
  if (mentionTarget) {
    return mentionTarget;
  }

  if (!rawValue) {
    return message.member;
  }

  const memberId = rawValue.replace(/[<@!>]/g, "");
  if (!/^\d+$/.test(memberId)) {
    return message.member;
  }

  return message.guild.members.fetch(memberId).catch(() => null);
}

function hasMessageTemplate(template: string | null): boolean {
  return Boolean(template?.trim());
}

const greetCommand: PrefixCommand = {
  name: "greet",
  description: "Configures welcome messages for this server.",
  usage: "greet",
  usages: [
    "greet setup",
    "greet channel #channel",
    "greet edit <message>",
    "greet autodelete <seconds|off>",
    "greet test [@user]",
    "greet config",
    "greet reset",
  ],
  helpItems: [
    {
      title: "greet setup",
      description:
        "Starts interactive welcome setup and lets you choose the container style.",
      usages: ["greet setup"],
    },
    {
      title: "greet channel",
      description: "Sets the channel where welcome messages are sent.",
      usages: ["greet channel #channel"],
    },
    {
      title: "greet edit",
      description: "Updates the welcome message template for this server.",
      usages: ["greet edit <message>"],
    },
    {
      title: "greet autodelete",
      description:
        "Configures auto-delete for welcome messages, or disables auto-delete.",
      usages: ["greet autodelete <seconds|off>"],
    },
    {
      title: "greet test",
      description: "Sends a welcome preview for the mentioned member or yourself.",
      usages: ["greet test [@user]"],
    },
    {
      title: "greet config",
      description: "Displays the current welcome configuration.",
      usages: ["greet config"],
    },
    {
      title: "greet reset",
      description: "Resets all welcome configuration values to defaults.",
      usages: ["greet reset"],
    },
  ],
  guildOnly: true,
  adminOnly: true,
  category: "Welcome",
  group: "extra",
  async execute({ client, message, args, prefix }) {
    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);
    const placeholderGuide = getGreetPlaceholderGuide();
    const subCommand = args[0]?.toLowerCase();

    const sendPanel = async (title: string, body: string): Promise<void> => {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title,
          body,
        }),
      );
    };

    if (!subCommand) {
      await sendPanel(
        "Welcome Configuration",
        [
          "### Commands",
          `- \`${prefix}greet setup\` - Start setup and choose container style.`,
          `- \`${prefix}greet channel #channel\` - Set the welcome channel.`,
          `- \`${prefix}greet edit <message>\` - Set welcome message content.`,
          `- \`${prefix}greet autodelete <seconds|off>\` - Configure auto delete.`,
          `- \`${prefix}greet test [@user]\` - Send a test welcome message.`,
          `- \`${prefix}greet config\` - Show current welcome configuration.`,
          `- \`${prefix}greet reset\` - Clear welcome configuration.`,
        ].join("\n"),
      );
      return;
    }

    if (subCommand === "setup") {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Welcome Message Setup",
          body: [
            "Choose the welcome container style for your server:",
            "",
            "**Normal Container**",
            "Clean container without accent color.",
            "",
            "**Colored Container**",
            "Container with accent color for higher visibility.",
            "",
            "After selecting style, configure the channel and welcome content.",
          ].join("\n"),
          addSeparator: true,
          footerText: "Click a button below to continue setup.",
          actionRows: [
            [
              new ButtonBuilder()
                .setCustomId(createGreetSetupId("normal", guildId, message.author.id))
                .setLabel("Normal Container")
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(createGreetSetupId("colored", guildId, message.author.id))
                .setLabel("Colored Container")
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId(createGreetSetupId("cancel", guildId, message.author.id))
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger),
            ],
          ],
        }),
      );
      return;
    }

    if (subCommand === "channel") {
      const mentionedChannel = message.mentions.channels.first();
      const rawChannel = args[1]?.replace(/[<#>]/g, "");
      const channelId = mentionedChannel?.id ?? rawChannel;

      if (!channelId) {
        await sendPanel(
          "Welcome Channel",
          `Usage: \`${prefix}greet channel #channel\``,
        );
        return;
      }

      const channel = await resolveGuildTextChannel(message.guild, channelId);
      if (!channel) {
        await sendPanel(
          "Welcome Channel",
          "Please provide a valid text channel from this server.",
        );
        return;
      }

      await client.repositories.greetConfig.upsertByGuildId({
        guild_id: guildId,
        channel_id: channel.id,
        enabled: true,
      });

      await sendPanel(
        "Welcome Channel Updated",
        `Welcome messages will be sent in <#${channel.id}>.`,
      );
      return;
    }

    if (subCommand === "edit") {
      const template = args.slice(1).join(" ").trim();
      if (!template) {
        await sendPanel(
          "Welcome Message Template",
          [`Usage: \`${prefix}greet edit <message>\``, "", placeholderGuide].join(
            "\n",
          ),
        );
        return;
      }

      if (template.length > 1800) {
        await sendPanel(
          "Welcome Message Template",
          "Please keep the message under 1800 characters.",
        );
        return;
      }

      await client.repositories.greetConfig.upsertByGuildId({
        guild_id: guildId,
        message_template: template,
        enabled: true,
      });

      await sendPanel(
        "Welcome Message Updated",
        ["Your welcome template has been saved.", "", placeholderGuide].join("\n"),
      );
      return;
    }

    if (subCommand === "autodelete") {
      const rawValue = args[1]?.toLowerCase();
      if (!rawValue) {
        await sendPanel(
          "Welcome Auto Delete",
          `Usage: \`${prefix}greet autodelete <seconds|off>\`\nAllowed range: 5 to 86400 seconds.`,
        );
        return;
      }

      const disableValues = new Set(["off", "disable", "none", "0"]);
      let autoDeleteSeconds: number | null = null;

      if (!disableValues.has(rawValue)) {
        const seconds = Number.parseInt(rawValue, 10);
        if (!Number.isInteger(seconds) || seconds < 5 || seconds > 86_400) {
          await sendPanel(
            "Welcome Auto Delete",
            "Please use a value between 5 and 86400 seconds, or `off`.",
          );
          return;
        }

        autoDeleteSeconds = seconds;
      }

      await client.repositories.greetConfig.upsertByGuildId({
        guild_id: guildId,
        auto_delete_seconds: autoDeleteSeconds,
      });

      await sendPanel(
        "Welcome Auto Delete Updated",
        autoDeleteSeconds === null
          ? "Auto delete is now disabled."
          : `Welcome messages will auto delete after **${autoDeleteSeconds}** seconds.`,
      );
      return;
    }

    if (subCommand === "config") {
      const config = await client.repositories.greetConfig.getByGuildId(guildId);
      if (!config) {
        await sendPanel(
          "Welcome Configuration",
          [
            "No welcome configuration is set yet.",
            `Run \`${prefix}greet setup\` to start.`,
          ].join("\n"),
        );
        return;
      }

      const parsedTemplate = parseStoredGreetTemplate(config.message_template);
      const templatePreview = parsedTemplate
        ? [
            "Advanced Container Template",
            `Message Content: ${parsedTemplate.message_content || "(empty)"}`,
            `Title: ${parsedTemplate.title || "(empty)"}`,
            `Description: ${parsedTemplate.description || "(empty)"}`,
            `Color: ${parsedTemplate.color || "(empty)"}`,
          ].join(" | ")
        : config.message_template
          ? config.message_template
          : "";

      await sendPanel(
        "Welcome Configuration",
        [
          "### Current Settings",
          `- Enabled: **${config.enabled ? "Yes" : "No"}**`,
          `- Style: **${config.style}**`,
          `- Channel: ${
            config.channel_id ? `<#${config.channel_id}>` : "**Not set**"
          }`,
          `- Auto Delete: ${
            config.auto_delete_seconds === null
              ? "**Disabled**"
              : `**${config.auto_delete_seconds}s**`
          }`,
          `- Message Template: ${
            templatePreview
              ? `\`${templatePreview.slice(0, 180)}${
                  templatePreview.length > 180 ? "..." : ""
                }\``
              : "**Not set**"
          }`,
          "",
          placeholderGuide,
        ].join("\n"),
      );
      return;
    }

    if (subCommand === "test") {
      const config = await client.repositories.greetConfig.getByGuildId(guildId);
      const missingSteps: string[] = [];

      if (!config?.channel_id) {
        missingSteps.push(`- Set channel first: \`${prefix}greet channel #channel\``);
      }

      if (!hasMessageTemplate(config?.message_template ?? null)) {
        missingSteps.push(
          `- Set message first: \`${prefix}greet edit <message>\` or \`${prefix}greet setup\``,
        );
      }

      if (missingSteps.length > 0) {
        await sendPanel(
          "Welcome Test",
          ["Cannot run test yet.", ...missingSteps].join("\n"),
        );
        return;
      }

      if (!config?.channel_id) {
        return;
      }

      const messageTemplate = config.message_template ?? "";
      if (!hasMessageTemplate(messageTemplate)) {
        return;
      }

      const targetMember = await resolveTargetMember(message, args[1]);
      if (!targetMember) {
        await sendPanel(
          "Welcome Test",
          "Could not find the target member for test.",
        );
        return;
      }

      const channel = await resolveGuildTextChannel(message.guild, config.channel_id);
      if (!channel) {
        await sendPanel(
          "Welcome Test",
          "Configured welcome channel is missing or not a text channel.",
        );
        return;
      }

      const sent = await channel.send(
        buildWelcomeContainerMessage({
          member: targetMember,
          template: messageTemplate,
          style: config.style,
        }),
      );

      if (config.auto_delete_seconds !== null && config.auto_delete_seconds > 0) {
        setTimeout(() => {
          void sent.delete().catch(() => undefined);
        }, config.auto_delete_seconds * 1000);
      }

      await sendPanel(
        "Welcome Test Sent",
        `Preview sent successfully in <#${channel.id}> for <@${targetMember.id}>.`,
      );
      return;
    }

    if (subCommand === "reset") {
      await client.repositories.greetConfig.resetByGuildId(guildId);
      await sendPanel(
        "Welcome Configuration Reset",
        "All welcome settings have been reset to defaults.",
      );
      return;
    }

    await sendPanel(
      "Unknown Subcommand",
      `Unknown option: \`${subCommand}\`.\nRun \`${prefix}greet\` to view available commands.`,
    );
  },
};

export default greetCommand;
