import {
  ANTINUKE_WHITELIST_SELECT_ID_REGEX,
  parseAntinukeWhitelistSelectId,
} from "../../constants/component-ids";
import {
  ANTINUKE_FEATURE_DEFINITIONS,
  normalizeAntinukeFeatureKeys,
  resolveAntinukeFeatureLabel,
} from "../../constants/antinuke-features";
import { hasAntinukeCommandAccess } from "../../services/antinuke/antinuke-command.utils";
import { sendAntinukeLogCard } from "../../services/antinuke/antinuke-log.service";
import type { SelectMenuComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function formatFeatureList(features: readonly string[]): string {
  return features
    .map((feature) => `- ${resolveAntinukeFeatureLabel(feature)}`)
    .join("\n");
}

const antinukeWhitelistSelectHandler: SelectMenuComponentHandler = {
  id: ANTINUKE_WHITELIST_SELECT_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseAntinukeWhitelistSelectId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Antinuke Whitelist",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.isStringSelectMenu()) {
      return;
    }

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This whitelist panel belongs to a different server.");
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await replyError("Unable to resolve guild context for this panel.");
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await replyError("Only the panel owner can use this selector.");
      return;
    }

    const allowed = await hasAntinukeCommandAccess({
      client,
      guildId: parsed.guildId,
      guildOwnerId: guild.ownerId,
      userId: interaction.user.id,
    });

    if (!allowed) {
      await replyError("Only server owner or configured extra owner can use this action.");
      return;
    }

    const selectedFeatures = normalizeAntinukeFeatureKeys(interaction.values);
    if (!selectedFeatures.length) {
      await replyError("Please select at least one valid feature.");
      return;
    }

    const previous = await client.antinukeService.getWhitelistEntry(
      parsed.guildId,
      parsed.targetUserId,
    );

    const baselineFeatures = previous?.features.length
      ? previous.features
      : previous
        ? ANTINUKE_FEATURE_DEFINITIONS.map((feature) => feature.key)
        : [];

    const mergedFeatures = new Set<string>([
      ...baselineFeatures,
      ...selectedFeatures,
    ]);

    const row = await client.antinukeService.addWhitelistUser(
      parsed.guildId,
      parsed.targetUserId,
      interaction.user.id,
      [...mergedFeatures],
    );

    const addedNow = selectedFeatures.filter(
      (feature) => !baselineFeatures.includes(feature),
    );

    await interaction.update(
      buildBotContainerResponse({
        avatarUrl,
        title: "Antinuke Whitelist",
        body: [
          previous
            ? `Updated whitelist scopes for <@${parsed.targetUserId}>.`
            : `Added <@${parsed.targetUserId}> to antinuke whitelist.`,
          addedNow.length
            ? `Newly Added: **${addedNow.length}** feature(s)`
            : "No new feature was added (already selected earlier).",
          "",
          "### Active Whitelist Features",
          formatFeatureList(row.features),
        ].join("\n"),
      }),
    );

    await sendAntinukeLogCard({
      client,
      guild,
      requestedById: interaction.user.id,
      createChannelIfMissing: false,
      title: "Antinuke Whitelist Update",
      bodyLines: [
        `Moderator: <@${interaction.user.id}> (\`${interaction.user.id}\`)`,
        `Target: <@${parsed.targetUserId}> (\`${parsed.targetUserId}\`)`,
        previous ? "Action: Updated whitelist feature scopes" : "Action: Added new whitelist entry",
        `Features Count: ${row.features.length}`,
        ...row.features.map((feature) => `- ${resolveAntinukeFeatureLabel(feature)}`),
      ],
    });
  },
};

export default antinukeWhitelistSelectHandler;
