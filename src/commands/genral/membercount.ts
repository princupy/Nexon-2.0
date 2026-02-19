import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags, type PresenceStatus } from "discord.js";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function countPresence(input: {
  statuses: PresenceStatus[];
}): {
  online: number;
  dnd: number;
  idle: number;
  offline: number;
} {
  let online = 0;
  let dnd = 0;
  let idle = 0;

  for (const status of input.statuses) {
    if (status === "online") {
      online += 1;
      continue;
    }

    if (status === "dnd") {
      dnd += 1;
      continue;
    }

    if (status === "idle") {
      idle += 1;
    }
  }

  const tracked = online + dnd + idle;
  const offline = Math.max(0, input.statuses.length - tracked);

  return {
    online,
    dnd,
    idle,
    offline,
  };
}

const membercountCommand: PrefixCommand = {
  name: "membercount",
  aliases: ["mc"],
  description: "Shows total member analytics for the current server.",
  usage: "membercount",
  usages: ["membercount"],
  guildOnly: true,
  category: "General",
  group: "extra",
  async execute({ client, message }) {
    const guild = message.guild;
    const members = await guild.members.fetch({ withPresences: true }).catch(
      async () => guild.members.fetch(),
    );

    const totalMembers = members.size > 0 ? members.size : guild.memberCount;
    const totalBots = members.filter((member) => member.user.bot).size;
    const totalHumans = members.filter((member) => !member.user.bot).size;

    const presence = countPresence({
      statuses: [...members.values()].map(
        (member) => member.presence?.status ?? "offline",
      ),
    });

    const primaryThumbnail = getClientAvatarUrl(client);
    const secondaryThumbnail =
      guild.iconURL({ extension: "png", size: 1024 }) ?? primaryThumbnail;

    const guildBlock = [`### Guild: ${guild.name}`].join("\n");

    const countBlock = [
      "### Count Stats",
      `> <:icons8people48:1458361570684964927> Total Members: ${totalMembers.toLocaleString("en-US")}`,
      `> <:icons8collaboratormale48:1458189548281663540> Total Humans: ${totalHumans.toLocaleString("en-US")}`,
      `> <:icons8chatbot48:1457046154473767117> Total Bots: ${totalBots.toLocaleString("en-US")}`,
    ].join("\n");

    const presenceBlock = [
      "### Presence Stats",
      `> <:online:1458378634078322790> Online: ${presence.online.toLocaleString("en-US")}`,
      `> <:Dnd:1458378894280360068> DND: ${presence.dnd.toLocaleString("en-US")}`,
      `> <:Viktor_idel:1458378771886379072> Idle: ${presence.idle.toLocaleString("en-US")}`,
      `> <:offline:1458378944876249213> Offline: ${presence.offline.toLocaleString("en-US")}`,
    ].join("\n");

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("## Member Statistics"),
      )
      .addSeparatorComponents(buildV2Separator())
      .addSectionComponents(
        buildV2Section({
          text: [guildBlock],
          accessory: {
            type: "thumbnail",
            url: primaryThumbnail,
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addSectionComponents(
        buildV2Section({
          text: [countBlock],
          accessory: {
            type: "thumbnail",
            url: secondaryThumbnail,
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(presenceBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Live member presence breakdown"),
      );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
};

export default membercountCommand;
