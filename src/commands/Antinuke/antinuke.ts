import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import { ANTINUKE_FEATURE_DEFINITIONS } from "../../constants/antinuke-features";
import { antinukeEmojis } from "../../constants/custom-emojis/antinuke-emojis";
import { ensureAntinukeCommandAccess } from "../../services/antinuke/antinuke-command.utils";
import {
  ensureAntinukeLogChannel,
  sendAntinukeLogCard,
} from "../../services/antinuke/antinuke-log.service";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function resolveToggle(enabled: boolean): string {
  return enabled
    ? `${antinukeEmojis.check} ON`
    : `${antinukeEmojis.cross} OFF`;
}

function resolveFeatureToggle(input: {
  protectionEnabled: boolean;
  nightmodeEnabled: boolean;
  nightmodeOnly?: boolean;
}): string {
  if (!input.protectionEnabled) {
    return `${antinukeEmojis.cross} OFF (Protection disabled)`;
  }

  if (input.nightmodeOnly && !input.nightmodeEnabled) {
    return `${antinukeEmojis.cross} OFF (Nightmode disabled)`;
  }

  return `${antinukeEmojis.check} ON`;
}

const antinukeCommand: PrefixCommand = {
  name: "antinuke",
  aliases: ["an", "security"],
  description: "Manages antinuke defense mode and core protection status.",
  usage: "antinuke [status|enable|disable]",
  usages: [
    "antinuke",
    "antinuke status",
    "antinuke enable",
    "antinuke disable",
  ],
  helpItems: [
    {
      title: "antinuke",
      description: "Shows antinuke overview panel and security shortcuts.",
      usages: ["antinuke"],
    },
    {
      title: "antinuke status",
      description: "Shows detailed antinuke feature status and punishment mode.",
      usages: ["antinuke status"],
    },
    {
      title: "antinuke enable",
      description: "Enables server antinuke protection.",
      usages: ["antinuke enable"],
    },
    {
      title: "antinuke disable",
      description: "Disables server antinuke protection.",
      usages: ["antinuke disable"],
    },
  ],
  guildOnly: true,
  category: "Antinuke",
  group: "main",
  async execute({ client, message, args, prefix }) {
    const guildId = message.guildId;
    if (!guildId) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);
    const subCommand = args[0]?.toLowerCase();

    if (!(await ensureAntinukeCommandAccess({ client, message, title: "Nexon Security" }))) {
      return;
    }

    if (subCommand === "enable") {
      await client.antinukeService.setEnabled(guildId, true, message.author.id);
      const logChannel = await ensureAntinukeLogChannel({
        client,
        guild: message.guild,
        requestedById: message.author.id,
      });

      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Nexon Security",
          body: [
            `${antinukeEmojis.check} Antinuke protection is now **enabled** for this server.`,
            `Log Channel: ${logChannel ? `<#${logChannel.id}>` : "Not available (check permissions)"}`,
          ].join("\n"),
        }),
      );

      await sendAntinukeLogCard({
        client,
        guild: message.guild,
        requestedById: message.author.id,
        createChannelIfMissing: true,
        title: "Antinuke Configuration Update",
        bodyLines: [
          `Moderator: <@${message.author.id}> (\`${message.author.id}\`)`,
          "Action: Protection enabled",
          `Log Channel: ${logChannel ? `<#${logChannel.id}>` : "Unavailable"}`,
        ],
      });
      return;
    }

    if (subCommand === "disable") {
      await client.antinukeService.setEnabled(guildId, false, message.author.id);
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Nexon Security",
          body: `${antinukeEmojis.cross} Antinuke protection is now **disabled** for this server.`,
        }),
      );

      await sendAntinukeLogCard({
        client,
        guild: message.guild,
        requestedById: message.author.id,
        createChannelIfMissing: false,
        title: "Antinuke Configuration Update",
        bodyLines: [
          `Moderator: <@${message.author.id}> (\`${message.author.id}\`)`,
          "Action: Protection disabled",
        ],
      });
      return;
    }

    const config = await client.antinukeService.getConfig(guildId);
    const whitelistUsers = await client.antinukeService.listWhitelistUsers(guildId);

    const protectionEnabled = config.enabled;
    const nightmodeEnabled = config.nightmodeEnabled;
    const extraOwnerLabel = config.extraOwnerId ? `<@${config.extraOwnerId}>` : "Not set";

    if (subCommand === "status") {
      const logChannelLabel = config.logChannelId
        ? `<#${config.logChannelId}>`
        : "Not configured";

      const featureLines = ANTINUKE_FEATURE_DEFINITIONS.map((feature) => {
        const status = resolveFeatureToggle({
          protectionEnabled,
          nightmodeEnabled,
          nightmodeOnly: feature.nightmodeOnly,
        });
        return `- ${feature.label}: ${status}`;
      });

      const container = new ContainerBuilder()
        .addSectionComponents(
          buildV2Section({
            text: [
              `## ${antinukeEmojis.brand} Antinuke Status`,
              "Detailed protection matrix with enabled features and punishment policy.",
            ],
            accessory: {
              type: "thumbnail",
              url: avatarUrl,
            },
          }),
        )
        .addSeparatorComponents(buildV2Separator())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Live Controls",
              `- Protection: ${resolveToggle(protectionEnabled)}`,
              `- Nightmode: ${resolveToggle(nightmodeEnabled)}`,
              `- Extra Owner: ${extraOwnerLabel}`,
              `- Whitelisted Users: **${whitelistUsers.length}**`,
              `- Log Channel: ${logChannelLabel}`,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(buildV2Separator())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Feature Matrix",
              ...featureLines,
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(buildV2Separator())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              "### Punishment Policy",
              `- Primary Action: **Auto Ban** ${antinukeEmojis.bolt}`,
              "- Fallback Action: **Kick** (if ban is not possible)",
              "- Trusted Bypass: Server Owner, Bot Owners, Extra Owner, Whitelisted Users",
              "- Trigger Source: Guild Audit Logs",
            ].join("\n"),
          ),
        )
        .addSeparatorComponents(buildV2Separator())
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Use \`${prefix}antinuke enable\` or \`${prefix}antinuke disable\` to toggle protection.`,
          ),
        );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
      return;
    }

    if (subCommand) {
      await message.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Nexon Security",
          body: `Unknown option: \`${subCommand}\`. Try \`${prefix}antinuke\`.`,
        }),
      );
      return;
    }

    const statusLabel = protectionEnabled ? "Enabled" : "Disabled";
    const nightmodeLabel = nightmodeEnabled ? "Enabled" : "Disabled";

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: [
            `## ${antinukeEmojis.brand} Nexon Security`,
            "Antinuke Defense Mode protects your server from harmful admin abuse with smart detection, instant response, and security control commands.",
          ],
          accessory: {
            type: "thumbnail",
            url: avatarUrl,
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Core Functionalities",
            `${antinukeEmojis.shield} Auto-ban malicious admin actions instantly.`,
            `${antinukeEmojis.owner} Whitelist trusted users and set an extra owner.`,
            `${antinukeEmojis.bolt} Blocks suspicious webhook creation/deletion and unverified bot adds.`,
            "",
            "### Live Status",
            `- Protection: **${statusLabel}**`,
            `- Nightmode: **${nightmodeLabel}**`,
            `- Whitelisted Users: **${whitelistUsers.length}**`,
            `- Extra Owner: ${extraOwnerLabel}`,
            `- Log Channel: ${config.logChannelId ? `<#${config.logChannelId}>` : "Not configured"}`,
          ].join("\n"),
        ),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Configuration Panel",
            `- Status: \`${prefix}antinuke status\``,
            `- Enable Protection: \`${prefix}antinuke enable\``,
            `- Disable Protection: \`${prefix}antinuke disable\``,
            `- Whitelist User: \`${prefix}whitelist <@user|userId>\``,
            `- Remove Whitelist: \`${prefix}unwhitelist <@user|userId>\``,
            `- View Whitelist: \`${prefix}whitelisted\``,
            `- Reset Whitelist: \`${prefix}whitelist reset\``,
            `- Extra Owner: \`${prefix}extraowner set|view|reset\``,
            `- Nightmode: \`${prefix}nightmode enable|disable\``,
          ].join("\n"),
        ),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${antinukeEmojis.brand} Nexon - Your 24/7 Security Partner.`,
        ),
      );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};

export default antinukeCommand;
