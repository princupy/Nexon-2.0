import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags, type GuildMember } from "discord.js";
import type { GreetContainerStyle } from "../supabase/repositories/greet-config.repository";
import { buildV2Section, buildV2Separator } from "../../ui/component-v2/container-response";

const DEFAULT_SERVER_ICON = "https://cdn.discordapp.com/embed/avatars/0.png";

const PLACEHOLDER_DEFINITIONS = [
  ["{user}", "Mentions the user (e.g. @UserName)."],
  ["{user_avatar}", "The user's avatar URL."],
  ["{user_name}", "The user's username."],
  ["{user_id}", "The user's ID."],
  ["{user_nick}", "The user's nickname in this server."],
  [
    "{user_joindate}",
    "The date the user joined this server (Month Day, Year).",
  ],
  [
    "{user_createdate}",
    "The account creation date (Month Day, Year).",
  ],
  ["{server_name}", "The server name."],
  ["{server_id}", "The server ID."],
  ["{server_membercount}", "The server's member count."],
  ["{server_icon}", "The server icon URL."],
] as const;

interface ParsedTemplateDraft {
  message_content: string;
  title: string;
  description: string;
  color: string;
  footer_text: string;
  author_name: string;
  author_icon: string;
  thumbnail: string;
  image: string;
}

function getDefaultTemplateDraft(): ParsedTemplateDraft {
  return {
    message_content: "",
    title: "Welcome",
    description: "",
    color: "",
    footer_text: "",
    author_name: "",
    author_icon: "",
    thumbnail: "",
    image: "",
  };
}

function parseStoredGreetTemplate(template: string | null): ParsedTemplateDraft | null {
  if (!template) {
    return null;
  }

  try {
    const parsed = JSON.parse(template) as {
      type?: string;
      draft?: Partial<ParsedTemplateDraft>;
    };

    if (parsed.type !== "container" || typeof parsed.draft !== "object") {
      return null;
    }

    return {
      ...getDefaultTemplateDraft(),
      ...parsed.draft,
    };
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function toSmallIconUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (
      parsed.hostname.endsWith("discordapp.com") ||
      parsed.hostname.endsWith("discord.com")
    ) {
      parsed.searchParams.set("size", "24");
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

function normalizeIconUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !isHttpUrl(trimmed)) {
    return "";
  }

  return toSmallIconUrl(trimmed);
}

function formatIndiaTimestamp(date: Date): string {
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted} IST`;
}

export function getGreetPlaceholderGuide(): string {
  return [
    "### Available Placeholders",
    ...PLACEHOLDER_DEFINITIONS.map(
      ([token, description]) => `- \`${token}\` - ${description}`,
    ),
  ].join("\n");
}

export function applyGreetPlaceholders(
  template: string,
  member: GuildMember,
): string {
  const placeholderMap: Record<string, string> = {
    "{user}": `<@${member.id}>`,
    "{user_avatar}": member.user.displayAvatarURL({
      extension: "png",
      size: 512,
    }),
    "{user_name}": member.user.username,
    "{user_id}": member.id,
    "{user_nick}": member.nickname ?? member.user.username,
    "{user_joindate}": member.joinedAt ? formatDate(member.joinedAt) : "Unknown",
    "{user_createdate}": formatDate(member.user.createdAt),
    "{server_name}": member.guild.name,
    "{server_id}": member.guild.id,
    "{server_membercount}": member.guild.memberCount.toString(),
    "{server_icon}":
      member.guild.iconURL({ extension: "png", size: 512 }) ?? DEFAULT_SERVER_ICON,
  };

  let rendered = template;
  for (const [token, value] of Object.entries(placeholderMap)) {
    rendered = rendered.split(token).join(value);
  }

  return rendered;
}

export function buildWelcomeContainerMessage(input: {
  member: GuildMember;
  template: string;
  style: GreetContainerStyle;
}) {
  const sentAtIndia = formatIndiaTimestamp(new Date());

  const advancedDraft = parseStoredGreetTemplate(input.template);
  const renderedMessage = applyGreetPlaceholders(
    advancedDraft?.message_content ?? input.template,
    input.member,
  );
  const renderedTitle = applyGreetPlaceholders(
    advancedDraft?.title || "Welcome",
    input.member,
  );
  const renderedDescription = applyGreetPlaceholders(
    advancedDraft?.description ?? "",
    input.member,
  );
  const renderedFooterText = applyGreetPlaceholders(
    advancedDraft?.footer_text ?? "",
    input.member,
  );
  const renderedThumbnail = applyGreetPlaceholders(
    advancedDraft?.thumbnail ?? "",
    input.member,
  ).trim();
  const renderedColor = applyGreetPlaceholders(
    advancedDraft?.color ?? "",
    input.member,
  );
  const renderedAuthorName = applyGreetPlaceholders(
    advancedDraft?.author_name ?? "",
    input.member,
  ).trim();
  const renderedAuthorIcon = applyGreetPlaceholders(
    advancedDraft?.author_icon ?? "",
    input.member,
  );
  const renderedImage = applyGreetPlaceholders(
    advancedDraft?.image ?? "",
    input.member,
  );
  const imageUrl = renderedImage.trim();

  let footerText = renderedFooterText.trim();

  const authorIcon = normalizeIconUrl(renderedAuthorIcon);

  const headerSection = buildV2Section({
    text: [renderedTitle || "Welcome"],
    ...(renderedThumbnail
      ? {
          accessory: {
            type: "thumbnail" as const,
            url: renderedThumbnail,
          },
        }
      : {}),
  });

  const container = new ContainerBuilder().addSectionComponents(headerSection);

  if (renderedAuthorName || authorIcon) {
    container.addSeparatorComponents(buildV2Separator());

    if (authorIcon) {
      container.addSectionComponents(
        buildV2Section({
          text: [`-# Author: ${renderedAuthorName || "Set"}`],
          accessory: {
            type: "thumbnail",
            url: authorIcon,
          },
        }),
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Author: ${renderedAuthorName}`),
      );
    }
  }

  const bodyLines: string[] = [];
  if (renderedMessage.trim()) {
    bodyLines.push(renderedMessage);
  }

  if (renderedDescription.trim()) {
    bodyLines.push(renderedDescription);
  }

  if (bodyLines.length > 0) {
    container
      .addSeparatorComponents(buildV2Separator())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(bodyLines.join("\n")));
  }

  if (imageUrl && isHttpUrl(imageUrl)) {
    container
      .addSeparatorComponents(buildV2Separator())
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(imageUrl),
        ),
      );
  }

  if (footerText) {
    container.addSeparatorComponents(buildV2Separator());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${footerText} | ${sentAtIndia}`,
      ),
    );
  } else {
    container.addSeparatorComponents(buildV2Separator());
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${sentAtIndia}`),
    );
  }

  if (input.style === "colored") {
    const cleaned = renderedColor.trim().replace("#", "");
    const parsedColor = Number.parseInt(cleaned, 16);
    if (!Number.isNaN(parsedColor) && parsedColor >= 0 && parsedColor <= 0xffffff) {
      container.setAccentColor(parsedColor);
    } else {
      container.setAccentColor(0x2d8b57);
    }
  }

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: {
      parse: [],
      users: [input.member.id],
      roles: [],
      repliedUser: false,
    },
  } as const;
}
