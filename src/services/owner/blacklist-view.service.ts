import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type Guild,
  type User,
} from "discord.js";
import { createBlacklistListNavId } from "../../constants/component-ids";
import type { NexonClient } from "../../core/nexon-client";
import type { BlacklistUserRow } from "../supabase/repositories/blacklist-user.repository";
import {
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

function formatStoredTimestamp(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const timestamp = Date.parse(value);
  return toRelativeTimestamp(Number.isNaN(timestamp) ? null : timestamp);
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
  entry: BlacklistUserRow,
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

export async function buildBlacklistListMessage(input: {
  client: NexonClient;
  guild: Guild;
  requesterId: string;
  page: number;
}) {
  const entries = await input.client.ownerControlService.listBlacklistedUsers();
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
          "## Blacklisted Users",
          entries.length
            ? "Detailed blacklist registry"
            : "No users are blacklisted right now.",
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
        `Mention: <@${source.user_id}>`,
        `Account Created: ${view.accountCreated}`,
      ];

      if (view.joinedServer) {
        lines.push(`Joined Server: ${view.joinedServer}`);
      }

      lines.push(`Blacklisted: ${formatStoredTimestamp(source.created_at)}`);
      lines.push(`Added By: ${source.added_by ? `<@${source.added_by}>` : "Unknown"}`);

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
      createBlacklistListNavId(
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
      createBlacklistListNavId(
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
