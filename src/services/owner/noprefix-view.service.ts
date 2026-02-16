import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  type Guild,
  type User,
} from "discord.js";
import {
  createNoPrefixAddConfirmId,
  createNoPrefixAddSelectId,
  createNoPrefixListNavId,
} from "../../constants/component-ids";
import type { NexonClient } from "../../core/nexon-client";
import {
  formatNoPrefixExpiry,
  formatNoPrefixRemaining,
  getNoPrefixDurationOptions,
  getNoPrefixTierLabel,
  mergeNoPrefixExpiry,
  type NoPrefixDurationOption,
} from "./noprefix-duration.service";
import type { NoPrefixUserRow } from "../supabase/repositories/noprefix-user.repository";
import {
  buildBotContainerResponse,
  buildV2ActionRow,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

const LIST_PAGE_SIZE = 4;

function toRelativeTimestamp(timestamp: number | null): string {
  if (!timestamp || Number.isNaN(timestamp)) {
    return "Unknown";
  }

  return `<t:${Math.floor(timestamp / 1000)}:R>`;
}

function resolveUserAvatarUrl(user: User | null): string | null {
  if (!user) {
    return null;
  }

  return user.displayAvatarURL({
    extension: "png",
    size: 1024,
  });
}

async function resolveUser(client: NexonClient, userId: string): Promise<User | null> {
  const cached = client.users.cache.get(userId);
  if (cached) {
    return cached;
  }

  return client.users.fetch(userId).catch(() => null);
}

function buildUserProfileLink(username: string, userId: string): string {
  const safeName = username.replace(/\]/g, "");
  return `[${safeName}](https://discord.com/users/${userId})`;
}

async function resolveListEntryView(
  client: NexonClient,
  guild: Guild,
  entry: NoPrefixUserRow,
): Promise<{
  username: string;
  accountCreated: string;
  joinedServer: string | null;
  thumbnailUrl: string;
}> {
  const [targetUser, targetMember] = await Promise.all([
    resolveUser(client, entry.user_id),
    guild.members.fetch(entry.user_id).catch(() => null),
  ]);

  const fallbackAvatar = getClientAvatarUrl(client);

  return {
    username: targetUser?.username ?? `Unknown (${entry.user_id})`,
    accountCreated: targetUser
      ? toRelativeTimestamp(targetUser.createdTimestamp)
      : "Unknown",
    joinedServer: targetMember?.joinedTimestamp
      ? toRelativeTimestamp(targetMember.joinedTimestamp)
      : null,
    thumbnailUrl: resolveUserAvatarUrl(targetUser) ?? fallbackAvatar,
  };
}

export function buildNoPrefixDurationPromptMessage(input: {
  client: NexonClient;
  guildId: string;
  requesterId: string;
  targetUserId: string;
}) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(
      createNoPrefixAddSelectId(
        input.guildId,
        input.requesterId,
        input.targetUserId,
      ),
    )
    .setPlaceholder("Select no-prefix duration")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      getNoPrefixDurationOptions().map((option) => ({
        label: option.label,
        value: option.key,
        description: option.description,
      })),
    );

  return buildBotContainerResponse({
    avatarUrl: getClientAvatarUrl(input.client),
    title: "No Prefix Add",
    body: [
      `Target User: <@${input.targetUserId}>`,
      "Choose access duration from dropdown.",
      "If the user already has no-prefix access, a confirmation prompt will appear.",
    ].join("\n"),
    addSeparator: true,
    footerText: `Requested by <@${input.requesterId}>`,
    actionRows: [[selectMenu]],
  });
}

export function buildNoPrefixMergeConfirmationMessage(input: {
  client: NexonClient;
  guildId: string;
  requesterId: string;
  targetUserId: string;
  duration: NoPrefixDurationOption;
  existingEntry: NoPrefixUserRow;
}) {
  const mergedExpiry = mergeNoPrefixExpiry(
    input.existingEntry.expires_at,
    input.duration.durationMs,
  );

  const continueButton = new ButtonBuilder()
    .setCustomId(
      createNoPrefixAddConfirmId(
        "continue",
        input.guildId,
        input.requesterId,
        input.targetUserId,
        input.duration.key,
      ),
    )
    .setLabel("Continue")
    .setStyle(ButtonStyle.Primary);

  const cancelButton = new ButtonBuilder()
    .setCustomId(
      createNoPrefixAddConfirmId(
        "cancel",
        input.guildId,
        input.requesterId,
        input.targetUserId,
        input.duration.key,
      ),
    )
    .setLabel("Cancel")
    .setStyle(ButtonStyle.Secondary);

  return buildBotContainerResponse({
    avatarUrl: getClientAvatarUrl(input.client),
    title: "Already Active",
    body: [
      `<@${input.targetUserId}> already has no-prefix enabled.`,
      `Current Expiry: ${formatNoPrefixExpiry(input.existingEntry.expires_at)}`,
      "Continue will add selected duration on top of remaining time.",
      `Selected: ${input.duration.label} | After Merge: ${formatNoPrefixExpiry(mergedExpiry)}`,
    ].join("\n"),
    actionRows: [[continueButton, cancelButton]],
  });
}

export function buildNoPrefixUpdateResultMessage(input: {
  client: NexonClient;
  targetUserId: string;
  row: NoPrefixUserRow;
  actionLabel: string;
}) {
  return buildBotContainerResponse({
    avatarUrl: getClientAvatarUrl(input.client),
    title: "No Prefix Updated",
    body: [
      `${input.actionLabel} for <@${input.targetUserId}>.`,
      "",
      "### Access Summary",
      "Status: **Enabled**",
      `Expiry: ${formatNoPrefixExpiry(input.row.expires_at)}`,
      `Remaining: ${formatNoPrefixRemaining(input.row.expires_at)}`,
      `Tier: **${getNoPrefixTierLabel(input.row)}**`,
    ].join("\n"),
  });
}

export async function buildNoPrefixStatusMessage(input: {
  client: NexonClient;
  guild: Guild;
  targetUserId: string;
  entry: NoPrefixUserRow | null;
}) {
  const targetUser = await resolveUser(input.client, input.targetUserId);
  const addedByUser = input.entry?.added_by
    ? await resolveUser(input.client, input.entry.added_by)
    : null;

  const avatarUrl =
    resolveUserAvatarUrl(targetUser) ??
    getClientAvatarUrl(input.client);

  const userBlock = [
    "**User**",
    `_${targetUser?.username ?? "Unknown"}_`,
    `User Mention: <@${input.targetUserId}>`,
    `ID: ${input.targetUserId}`,
  ].join("\n");

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## No Prefix Status"),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Detailed no-prefix access card"),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(userBlock));

  if (input.entry) {
    const addedByBlock = [
      "**Added By**",
      `_${addedByUser?.username ?? "Unknown"}_`,
      `Mention: ${input.entry.added_by ? `<@${input.entry.added_by}>` : "Unknown"}`,
    ].join("\n");

    const expiryBlock = [
      "**Expiry**",
      `Expiry Time: ${formatNoPrefixExpiry(input.entry.expires_at)}`,
      `Duration: ${formatNoPrefixRemaining(input.entry.expires_at)}`,
    ].join("\n");

    const tierBlock = [
      "**Tier**",
      `**${getNoPrefixTierLabel(input.entry)}**`,
    ].join("\n");

    container
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(addedByBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(expiryBlock))
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(tierBlock));
  } else {
    const statusBlock = [
      "**Status**",
      "**DISABLED**",
    ].join("\n");

    container
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(statusBlock));
  }

  container
    .addSeparatorComponents(buildV2Separator())
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(avatarUrl),
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("Nexon No-Prefix System"),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}
export async function buildNoPrefixListMessage(input: {
  client: NexonClient;
  guild: Guild;
  requesterId: string;
  page: number;
}) {
  const entries = await input.client.ownerControlService.listNoPrefixUsers();
  const pageCount = Math.max(1, Math.ceil(entries.length / LIST_PAGE_SIZE));
  const currentPage = Math.min(Math.max(input.page, 0), pageCount - 1);
  const startIndex = currentPage * LIST_PAGE_SIZE;
  const pageEntries = entries.slice(startIndex, startIndex + LIST_PAGE_SIZE);

  const entryViews = await Promise.all(
    pageEntries.map((entry) => resolveListEntryView(input.client, input.guild, entry)),
  );

  const container = new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: [
          "## No-Prefix Users",
          entries.length
            ? "Detailed no-prefix user registry"
            : "No users currently have no-prefix access.",
        ],
        accessory: {
          type: "thumbnail",
          url: getClientAvatarUrl(input.client),
        },
      }),
    )
    .addSeparatorComponents(buildV2Separator());

  if (!entryViews.length) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("No users found."),
    );
  } else {
    for (const [index, view] of entryViews.entries()) {
      const rowNumber = startIndex + index + 1;
      const source = pageEntries[index];
      if (!source) {
        continue;
      }

      const lines = [
        `### ${rowNumber}. ${buildUserProfileLink(view.username, source.user_id)}`,
        `Account Created: ${view.accountCreated}`,
      ];

      if (view.joinedServer) {
        lines.push(`Joined Server: ${view.joinedServer}`);
      }

      lines.push(`Expires: ${formatNoPrefixExpiry(source.expires_at)}`);

      container.addSectionComponents(
        buildV2Section({
          text: [lines.join("\n")],
          accessory: {
            type: "thumbnail",
            url: view.thumbnailUrl,
          },
        }),
      );

      if (index < entryViews.length - 1) {
        container.addSeparatorComponents(buildV2Separator());
      }
    }
  }

  const previousButton = new ButtonBuilder()
    .setCustomId(
      createNoPrefixListNavId(
        "prev",
        currentPage,
        input.guild.id,
        input.requesterId,
      ),
    )
    .setLabel("Previous")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === 0 || entries.length === 0);

  const nextButton = new ButtonBuilder()
    .setCustomId(
      createNoPrefixListNavId(
        "next",
        currentPage,
        input.guild.id,
        input.requesterId,
      ),
    )
    .setLabel("Next")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage >= pageCount - 1 || entries.length === 0);

  container
    .addSeparatorComponents(buildV2Separator())
    .addActionRowComponents(buildV2ActionRow(previousButton, nextButton).toJSON())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Page ${currentPage + 1}/${pageCount} - ${entries.length} total users`,
      ),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}



