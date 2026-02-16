import { ButtonBuilder, ButtonStyle } from "discord.js";
import { env } from "../../config/env";
import type { NexonClient } from "../../core/nexon-client";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function resolveSupportLink(): string {
  return env.SUPPORT_SERVER_INVITE_URL;
}

export function buildBlacklistedWarningMessage(input: {
  client: NexonClient;
  userId: string;
  ephemeral?: boolean;
}) {
  const contactButton = new ButtonBuilder()
    .setLabel("Contact Support")
    .setStyle(ButtonStyle.Link)
    .setURL(resolveSupportLink());

  return buildBotContainerResponse({
    avatarUrl: getClientAvatarUrl(input.client),
    title: "Access Blocked",
    body: [
      `<@${input.userId}>, you are blacklisted from using this bot.`,
      "Please contact the bot owner from the support server button below.",
    ].join("\n"),
    actionRows: [[contactButton]],
    ...(input.ephemeral !== undefined ? { ephemeral: input.ephemeral } : {}),
  });
}
