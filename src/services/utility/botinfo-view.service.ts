import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import {
  createBotInfoNavId,
} from "../../constants/component-ids";
import type { NexonClient } from "../../core/nexon-client";
import {
  buildV2ActionRow,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

export const BOTINFO_TOTAL_PAGES = 3;

export interface BotInfoPageMessageInput {
  client: NexonClient;
  guildId: string;
  ownerId: string;
  page: number;
}

function clampPage(page: number): number {
  return Math.min(Math.max(page, 0), BOTINFO_TOTAL_PAGES - 1);
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

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function formatBytesToMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

async function resolveDeveloperInfo(client: NexonClient): Promise<{
  name: string;
  mention: string;
  discordProfileUrl: string;
}> {
  const fallbackId = [...client.botOwnerIds][0] ?? client.user?.id ?? "";
  let developerId = fallbackId;
  let name = "Unknown";

  const application = await client.application?.fetch().catch(() => null);
  const owner = application?.owner;

  if (owner) {
    if ("members" in owner) {
      const first = owner.members.first();
      if (first) {
        developerId = first.id;
        name = first.user.username;
      }
    } else {
      developerId = owner.id;
      name = owner.username;
    }
  }

  if (!developerId) {
    developerId = fallbackId;
  }

  if (name === "Unknown" && developerId) {
    const user =
      client.users.cache.get(developerId) ??
      (await client.users.fetch(developerId).catch(() => null));

    if (user) {
      name = user.username;
    }
  }

  const mention = developerId ? `<@${developerId}>` : "Unknown";
  const discordProfileUrl = developerId
    ? `https://discord.com/users/${developerId}`
    : "https://discord.com";

  return {
    name,
    mention,
    discordProfileUrl,
  };
}

async function resolveProjectRootWithSource(): Promise<string> {
  const candidates = [process.cwd()];

  for (const candidate of candidates) {
    try {
      await access(path.join(candidate, "src"));
      return candidate;
    } catch {
      // Continue checking candidates.
    }
  }

  return process.cwd();
}

async function countSourceStats(basePath: string): Promise<{
  folderCount: number;
  fileCount: number;
}> {
  const sourceRoot = path.join(basePath, "src");

  let folderCount = 0;
  let fileCount = 0;

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        folderCount += 1;
        await walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        fileCount += 1;
      }
    }
  }

  try {
    await walk(sourceRoot);
  } catch {
    return {
      folderCount: 0,
      fileCount: 0,
    };
  }

  return {
    folderCount,
    fileCount,
  };
}

async function readDependencyList(basePath: string): Promise<string[]> {
  const packageJsonPath = path.join(basePath, "package.json");

  try {
    const raw = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const dependencyNames = Object.keys(parsed.dependencies ?? {});
    const devDependencyNames = Object.keys(parsed.devDependencies ?? {});

    return [...dependencyNames, ...devDependencyNames];
  } catch {
    return [];
  }
}

function buildNavigationRow(input: {
  page: number;
  guildId: string;
  ownerId: string;
}) {
  const page = clampPage(input.page);

  const previousButton = new ButtonBuilder()
    .setCustomId(createBotInfoNavId("prev", page, input.guildId, input.ownerId))
    .setLabel("Previous")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 0);

  const nextButton = new ButtonBuilder()
    .setCustomId(createBotInfoNavId("next", page, input.guildId, input.ownerId))
    .setLabel("Next")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= BOTINFO_TOTAL_PAGES - 1);

  const homeButton = new ButtonBuilder()
    .setCustomId(createBotInfoNavId("home", page, input.guildId, input.ownerId))
    .setLabel("Home")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);

  return buildV2ActionRow(previousButton, nextButton, homeButton);
}

async function buildPageOne(input: BotInfoPageMessageInput): Promise<ContainerBuilder> {
  const guildCount = input.client.guilds.cache.size;
  const usersTotal = input.client.guilds.cache.reduce(
    (total, guild) => total + guild.memberCount,
    0,
  );
  const usersCached = input.client.guilds.cache.reduce(
    (total, guild) => total + guild.members.cache.size,
    0,
  );

  const avatarUrl = getClientAvatarUrl(input.client);
  const createdAt = input.client.user?.createdTimestamp ?? null;
  const createdAtText = createdAt
    ? `<t:${Math.floor(createdAt / 1000)}:F>`
    : "Unknown";

  return new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: ["## Bot Info"],
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
          `**Name:** ${input.client.user?.username ?? "Nexon"}`,
          `**Bot ID:** ${input.client.user?.id ?? "Unknown"}`,
          `**Created:** ${createdAtText}`,
          `**Guilds:** ${guildCount}`,
          `**Users (Total):** ${usersTotal.toLocaleString("en-US")}`,
          `**Users (Cached):** ${usersCached.toLocaleString("en-US")}`,
          `**Latency:** ${Math.round(input.client.ws.ping)}ms`,
          `**Uptime:** ${formatUptime(input.client.uptime)}`,
        ].join("\n"),
      ),
    );
}

async function buildPageTwo(input: BotInfoPageMessageInput): Promise<ContainerBuilder> {
  const developer = await resolveDeveloperInfo(input.client);
  const avatarUrl = getClientAvatarUrl(input.client);

  return new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: ["## Developer"],
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
          `**Developer:** ${developer.mention}`,
          `**Discord Profile:** [Open Profile](${developer.discordProfileUrl})`,
          "**Instagram:** [Open Instagram](https://instagram.com)",
          "",
          `This bot is maintained by **${developer.name}**.`,
        ].join("\n"),
      ),
    );
}

async function buildPageThree(input: BotInfoPageMessageInput): Promise<ContainerBuilder> {
  const avatarUrl = getClientAvatarUrl(input.client);
  const projectRoot = await resolveProjectRootWithSource();
  const [sourceStats, dependencyList] = await Promise.all([
    countSourceStats(projectRoot),
    readDependencyList(projectRoot),
  ]);

  const topDependencies = dependencyList.slice(0, 5);
  const dependencyLines = topDependencies.length
    ? topDependencies.map((dependency, index) => `${index + 1}. \`${dependency}\``)
    : ["1. No dependencies found"];

  return new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: ["## Live Technical Stats"],
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
          `**Node.js:** ${process.version}`,
          `**Memory (RSS):** ${formatBytesToMb(process.memoryUsage().rss)}`,
          `**Dependencies:** ${dependencyList.length}`,
          `**Source Folders:** ${sourceStats.folderCount}`,
          `**Source Files:** ${sourceStats.fileCount}`,
          `**Updated:** <t:${Math.floor(Date.now() / 1000)}:T>`,
          "",
          "**Libraries**",
          ...dependencyLines,
        ].join("\n"),
      ),
    );
}

export async function buildBotInfoPageMessage(
  input: BotInfoPageMessageInput,
) {
  const page = clampPage(input.page);

  let container: ContainerBuilder;
  if (page === 0) {
    container = await buildPageOne(input);
  } else if (page === 1) {
    container = await buildPageTwo(input);
  } else {
    container = await buildPageThree(input);
  }

  const helperText =
    page === 0
      ? "Use Next for developer and technical pages."
      : page === 1
        ? "Use Next for technical page or Home to return."
        : "Use Home to return to overview page.";

  container
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Page ${page + 1}/${BOTINFO_TOTAL_PAGES}\n${helperText}`),
    )
    .addSeparatorComponents(buildV2Separator())
    .addActionRowComponents(
      buildNavigationRow({
        page,
        guildId: input.guildId,
        ownerId: input.ownerId,
      }).toJSON(),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Panel owner: <@${input.ownerId}>`),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}
