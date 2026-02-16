import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import {
  buildV2Section,
  buildV2Separator,
} from "./container-response";

export interface NoPrefixLogCardInput {
  avatarUrl: string;
  action: string;
  guildLabel: string;
  userLabel: string;
  moderatorLabel: string;
  previousExpiry: string;
  updatedExpiry: string;
  durationLabel: string;
  note?: string;
  loggedAtUnix: number;
}

export function buildNoPrefixLogCardMessage(input: NoPrefixLogCardInput) {
  const contextLines = [
    `- Guild: ${input.guildLabel}`,
    `- User: ${input.userLabel}`,
    `- Moderator: ${input.moderatorLabel}`,
  ].join("\n");

  const expiryLines = [
    `- Previous Expiry: ${input.previousExpiry}`,
    `- Updated Expiry: ${input.updatedExpiry}`,
    `- Duration: ${input.durationLabel}`,
  ].join("\n");

  const container = new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: [
          "## No Prefix Logs",
          `Action: **${input.action}**`,
        ],
        accessory: {
          type: "thumbnail",
          url: input.avatarUrl,
        },
      }),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### Context\n${contextLines}`),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### Expiry\n${expiryLines}`),
    );

  if (input.note) {
    container
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Note\n${input.note}`),
      );
  }

  container
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Logged At: <t:${input.loggedAtUnix}:F> (<t:${input.loggedAtUnix}:R>)`,
      ),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}
