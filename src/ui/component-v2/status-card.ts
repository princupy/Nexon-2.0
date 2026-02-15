import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { COMPONENT_IDS } from "../../constants/component-ids";
import {
  buildV2ActionRow,
  buildV2Section,
  buildV2Separator,
} from "./container-response";

interface StatusCardInput {
  apiPing: number;
  botLatency: number;
  botAvatarUrl: string;
  refreshedById: string;
  refreshedAt?: Date;
}

export function buildStatusCardMessage(input: StatusCardInput) {
  const refreshedAt = input.refreshedAt ?? new Date();
  const unixTime = Math.floor(refreshedAt.getTime() / 1000);

  const headerSection = buildV2Section({
    text: [
      "## Nexon Latency",
      "Real-time connection metrics.",
    ],
    accessory: {
      type: "thumbnail",
      url: input.botAvatarUrl,
    },
  });

  const refreshRow = buildV2ActionRow(
    new ButtonBuilder()
      .setCustomId(COMPONENT_IDS.pingRefresh)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Primary),
  );

  const container = new ContainerBuilder()
    .addSectionComponents(headerSection)
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Measurements\n- Bot Round-Trip: **${input.botLatency}ms**\n- Discord Gateway Ping: **${input.apiPing}ms**`,
      ),
    )
    .addActionRowComponents(refreshRow.toJSON())
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Requested by <@${input.refreshedById}>  |  Last refresh <t:${unixTime}:R>`,
      ),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}
