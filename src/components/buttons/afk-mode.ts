import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import {
  AFK_MODE_ID_REGEX,
  parseAfkModeId,
} from "../../constants/component-ids";
import type { ButtonComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function formatUnixFromIso(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.floor(timestamp / 1000);
}

function buildAfkEnabledCard(input: {
  scope: "global" | "server";
  userId: string;
  reason: string;
  setUnix: number | null;
  userAvatarUrl: string;
}) {
  const scopeLabel = input.scope === "global" ? "Global AFK" : "Server AFK";

  const container = new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: [
          `## ${scopeLabel} Enabled`,
          `AFK is active for <@${input.userId}>.`,
        ],
        accessory: {
          type: "thumbnail",
          url: input.userAvatarUrl,
        },
      }),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "**Reason**",
          input.reason,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "**Set At**",
          input.setUnix
            ? `<t:${input.setUnix}:F> (<t:${input.setUnix}:R>)`
            : "Just now",
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("AFK system"));

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}

const afkModeButtonHandler: ButtonComponentHandler = {
  id: AFK_MODE_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseAfkModeId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "AFK Setup",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This AFK panel belongs to a different server.");
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await replyError("Only the panel owner can use these AFK options.");
      return;
    }

    if (parsed.action === "cancel") {
      client.afkService.clearPendingSelection(parsed.guildId, parsed.userId);

      await interaction.update(
        buildBotContainerResponse({
          avatarUrl,
          title: "AFK Setup",
          body: "AFK setup cancelled. No status was applied.",
        }),
      );
      return;
    }

    const pending = client.afkService.consumePendingSelection(parsed.guildId, parsed.userId);
    if (!pending) {
      await interaction.update(
        buildBotContainerResponse({
          avatarUrl,
          title: "AFK Setup",
          body: "This setup has expired. Run `afk` command again.",
        }),
      );
      return;
    }

    const scope = parsed.action === "global" ? "global" : "server";

    const row = await client.afkService.setAfk({
      scope,
      guildId: parsed.guildId,
      userId: parsed.userId,
      reason: pending.reason,
    });

    const setUnix = formatUnixFromIso(row.updated_at) ?? formatUnixFromIso(row.created_at);

    await interaction.update(
      buildAfkEnabledCard({
        scope,
        userId: parsed.userId,
        reason: row.reason ?? "AFK",
        setUnix,
        userAvatarUrl:
          interaction.user.displayAvatarURL({
            extension: "png",
            size: 1024,
          }) ?? avatarUrl,
      }),
    );
  },
};

export default afkModeButtonHandler;
