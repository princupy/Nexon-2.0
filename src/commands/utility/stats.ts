import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function formatBytes(value: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatUptime(ms: number | null): string {
  if (!ms || ms <= 0) {
    return "Unknown";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || parts.length > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

const statsCommand: PrefixCommand = {
  name: "stats",
  aliases: ["runtime"],
  description: "Displays runtime and performance stats for Nexon.",
  usage: "stats",
  usages: ["stats"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message }) {
    const avatarUrl = getClientAvatarUrl(client);
    const processMemory = process.memoryUsage();
    const uniqueCommandCount = new Set(client.prefixCommands.values()).size;

    const buttonHandlerCount =
      client.buttonHandlers.size + client.buttonRegexHandlers.length;
    const selectHandlerCount =
      client.selectMenuHandlers.size + client.selectMenuRegexHandlers.length;
    const modalHandlerCount =
      client.modalHandlers.size + client.modalRegexHandlers.length;

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: ["## Nexon Stats", "Runtime health and handler metrics."],
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
            "### Runtime",
            `- Uptime: **${formatUptime(client.uptime)}**`,
            `- WebSocket Ping: **${Math.round(client.ws.ping)}ms**`,
            `- Node: **${process.version}**`,
            `- Platform: **${process.platform} (${process.arch})**`,
          ].join("\n"),
        ),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Memory",
            `- RSS: **${formatBytes(processMemory.rss)}**`,
            `- Heap Used: **${formatBytes(processMemory.heapUsed)}**`,
            `- Heap Total: **${formatBytes(processMemory.heapTotal)}**`,
            `- External: **${formatBytes(processMemory.external)}**`,
          ].join("\n"),
        ),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Handlers",
            `- Commands: **${uniqueCommandCount}**`,
            `- Buttons: **${buttonHandlerCount}**`,
            `- Select Menus: **${selectHandlerCount}**`,
            `- Modals: **${modalHandlerCount}**`,
          ].join("\n"),
        ),
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

export default statsCommand;
