import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  PermissionsBitField,
  type Client,
} from "discord.js";
import { env } from "../../config/env";
import type { PrefixCommand } from "../../types/prefix-command";
import {
  buildV2ActionRow,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function buildInviteUrl(applicationId: string): string {
  const permissions = new PermissionsBitField([
    PermissionFlagsBits.Administrator,
  ]);

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", applicationId);
  url.searchParams.set("scope", "bot applications.commands");
  url.searchParams.set("permissions", permissions.bitfield.toString());

  return url.toString();
}

async function resolveApplicationId(client: Client): Promise<string | null> {
  const existingId = client.application?.id ?? client.user?.id;
  if (existingId) {
    return existingId;
  }

  const fetched = await client.application?.fetch().catch(() => null);
  return fetched?.id ?? client.user?.id ?? null;
}

const inviteCommand: PrefixCommand = {
  name: "invite",
  aliases: ["inv"],
  description: "Generates Nexon bot invite links.",
  usage: "invite",
  usages: ["invite"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message }) {
    const applicationId = await resolveApplicationId(client);
    if (!applicationId) {
      return;
    }

    const inviteUrl = buildInviteUrl(applicationId);

    const inviteButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Invite Nexon")
      .setURL(inviteUrl);

    const supportButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel("Support Server")
      .setURL(env.SUPPORT_SERVER_INVITE_URL);

    const container = new ContainerBuilder()
      .addSectionComponents(
        buildV2Section({
          text: [
            "## Nexon Invite",
            "Add Nexon with administrator permissions and join support from the buttons below.",
          ],
          accessory: {
            type: "thumbnail",
            url: getClientAvatarUrl(client),
          },
        }),
      )
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Access",
            "- Invite button uses this bot client ID automatically.",
            "- Required Permission: **Administrator**.",
          ].join("\n"),
        ),
      )
      .addSeparatorComponents(buildV2Separator())
      .addActionRowComponents(buildV2ActionRow(inviteButton, supportButton).toJSON())
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

export default inviteCommand;
