export const COMPONENT_IDS = {
  pingRefresh: "nexon:ping:refresh",
} as const;

export type HelpGroup = "main" | "extra";
export type HelpNavigationAction = "home" | "prev" | "next";
export type BotInfoNavigationAction = "home" | "prev" | "next";
export type GreetSetupAction = "normal" | "colored" | "cancel";
export type GreetEditorButtonAction = "submit" | "variables" | "cancel";
export type NoPrefixListAction = "prev" | "next";
export type BlacklistListAction = "prev" | "next";
export type NoPrefixAddConfirmAction = "continue" | "cancel";
export type AfkModeAction = "server" | "global" | "cancel";
export type BannerViewType = "user" | "server";

const HELP_NAV_PREFIX = "nexon:help:nav";
const HELP_SELECT_PREFIX = "nexon:help:select";
const BOTINFO_NAV_PREFIX = "nexon:botinfo:nav";
const GREET_SETUP_PREFIX = "nexon:greet:setup";
const GREET_EDITOR_SELECT_PREFIX = "nexon:greet:editor:select";
const GREET_EDITOR_BUTTON_PREFIX = "nexon:greet:editor";
const NOPREFIX_LIST_NAV_PREFIX = "nexon:noprefix:list";
const BLACKLIST_LIST_NAV_PREFIX = "nexon:blacklist:list";
const NOPREFIX_ADD_SELECT_PREFIX = "nexon:noprefix:add:select";
const NOPREFIX_ADD_CONFIRM_PREFIX = "nexon:noprefix:add:confirm";
const ANTINUKE_WHITELIST_SELECT_PREFIX = "nexon:an:wl:s";
const AFK_MODE_PREFIX = "nexon:afk:m";
const BANNER_VIEW_SELECT_PREFIX = "nexon:banner:select";

export const HELP_NAV_ID_REGEX =
  /^nexon:help:nav:(home|prev|next):(main|extra):([a-z0-9_-]+):(\d+):(\d+):(\d+)$/;

export const HELP_SELECT_ID_REGEX =
  /^nexon:help:select:(main|extra):(\d+):(\d+)$/;

export const BOTINFO_NAV_ID_REGEX =
  /^nexon:botinfo:nav:(home|prev|next):(\d+):(\d+):(\d+)$/;

export const GREET_SETUP_ID_REGEX =
  /^nexon:greet:setup:(normal|colored|cancel):(\d+):(\d+)$/;

export const NOPREFIX_LIST_NAV_ID_REGEX =
  /^nexon:noprefix:list:(prev|next):(\d+):(\d+):(\d+)$/;

export const BLACKLIST_LIST_NAV_ID_REGEX =
  /^nexon:blacklist:list:(prev|next):(\d+):(\d+):(\d+)$/;

export const NOPREFIX_ADD_SELECT_ID_REGEX =
  /^nexon:noprefix:add:select:(\d+):(\d+):(\d+)$/;

export const NOPREFIX_ADD_CONFIRM_ID_REGEX =
  /^nexon:noprefix:add:confirm:(c|x):(\d+):(\d+):(\d+):([a-z0-9_]+)$/;

export const ANTINUKE_WHITELIST_SELECT_ID_REGEX =
  /^nexon:an:wl:s:(\d+):(\d+):(\d+)$/;

export const AFK_MODE_ID_REGEX =
  /^nexon:afk:m:(s|g|x):(\d+):(\d+)$/;

export const BANNER_VIEW_SELECT_ID_REGEX =
  /^nexon:banner:select:(\d+):(\d+):(\d+)$/;

export function createHelpNavId(
  action: HelpNavigationAction,
  group: HelpGroup,
  categoryKey: string,
  page: number,
  guildId: string,
  userId: string,
): string {
  return `${HELP_NAV_PREFIX}:${action}:${group}:${categoryKey}:${page}:${guildId}:${userId}`;
}

export function parseHelpNavId(customId: string): {
  action: HelpNavigationAction;
  group: HelpGroup;
  categoryKey: string;
  page: number;
  guildId: string;
  userId: string;
} | null {
  const match = HELP_NAV_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as HelpNavigationAction;
  const group = match[2] as HelpGroup;
  const categoryKey = match[3];
  const page = Number.parseInt(match[4] ?? "", 10);
  const guildId = match[5];
  const userId = match[6];

  if (!action || !group || !categoryKey || Number.isNaN(page) || !guildId || !userId) {
    return null;
  }

  return {
    action,
    group,
    categoryKey,
    page,
    guildId,
    userId,
  };
}

export function createHelpSelectId(
  group: HelpGroup,
  guildId: string,
  userId: string,
): string {
  return `${HELP_SELECT_PREFIX}:${group}:${guildId}:${userId}`;
}

export function parseHelpSelectId(customId: string): {
  group: HelpGroup;
  guildId: string;
  userId: string;
} | null {
  const match = HELP_SELECT_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const group = match[1] as HelpGroup;
  const guildId = match[2];
  const userId = match[3];

  if (!group || !guildId || !userId) {
    return null;
  }

  return {
    group,
    guildId,
    userId,
  };
}

export function createBotInfoNavId(
  action: BotInfoNavigationAction,
  page: number,
  guildId: string,
  userId: string,
): string {
  return `${BOTINFO_NAV_PREFIX}:${action}:${page}:${guildId}:${userId}`;
}

export function parseBotInfoNavId(customId: string): {
  action: BotInfoNavigationAction;
  page: number;
  guildId: string;
  userId: string;
} | null {
  const match = BOTINFO_NAV_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as BotInfoNavigationAction;
  const page = Number.parseInt(match[2] ?? "", 10);
  const guildId = match[3];
  const userId = match[4];

  if (!action || Number.isNaN(page) || !guildId || !userId) {
    return null;
  }

  return {
    action,
    page,
    guildId,
    userId,
  };
}

export function createGreetSetupId(
  action: GreetSetupAction,
  guildId: string,
  userId: string,
): string {
  return `${GREET_SETUP_PREFIX}:${action}:${guildId}:${userId}`;
}

export function parseGreetSetupId(customId: string): {
  action: GreetSetupAction;
  guildId: string;
  userId: string;
} | null {
  const match = GREET_SETUP_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as GreetSetupAction;
  const guildId = match[2];
  const userId = match[3];

  if (!action || !guildId || !userId) {
    return null;
  }

  return {
    action,
    guildId,
    userId,
  };
}

export const GREET_EDITOR_SELECT_ID_REGEX =
  /^nexon:greet:editor:select:(\d+):(\d+)$/;

export const GREET_EDITOR_BUTTON_ID_REGEX =
  /^nexon:greet:editor:(submit|variables|cancel):(\d+):(\d+)$/;

export function createNoPrefixListNavId(
  action: NoPrefixListAction,
  page: number,
  guildId: string,
  userId: string,
): string {
  return `${NOPREFIX_LIST_NAV_PREFIX}:${action}:${page}:${guildId}:${userId}`;
}

export function parseNoPrefixListNavId(customId: string): {
  action: NoPrefixListAction;
  page: number;
  guildId: string;
  userId: string;
} | null {
  const match = NOPREFIX_LIST_NAV_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as NoPrefixListAction;
  const page = Number.parseInt(match[2] ?? "", 10);
  const guildId = match[3];
  const userId = match[4];

  if (!action || Number.isNaN(page) || !guildId || !userId) {
    return null;
  }

  return {
    action,
    page,
    guildId,
    userId,
  };
}

export function createBlacklistListNavId(
  action: BlacklistListAction,
  page: number,
  guildId: string,
  userId: string,
): string {
  return `${BLACKLIST_LIST_NAV_PREFIX}:${action}:${page}:${guildId}:${userId}`;
}

export function parseBlacklistListNavId(customId: string): {
  action: BlacklistListAction;
  page: number;
  guildId: string;
  userId: string;
} | null {
  const match = BLACKLIST_LIST_NAV_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as BlacklistListAction;
  const page = Number.parseInt(match[2] ?? "", 10);
  const guildId = match[3];
  const userId = match[4];

  if (!action || Number.isNaN(page) || !guildId || !userId) {
    return null;
  }

  return {
    action,
    page,
    guildId,
    userId,
  };
}

export function createBannerViewSelectId(
  guildId: string,
  userId: string,
  targetUserId: string,
): string {
  return `${BANNER_VIEW_SELECT_PREFIX}:${guildId}:${userId}:${targetUserId}`;
}

export function parseBannerViewSelectId(customId: string): {
  guildId: string;
  userId: string;
  targetUserId: string;
} | null {
  const match = BANNER_VIEW_SELECT_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const guildId = match[1];
  const userId = match[2];
  const targetUserId = match[3];

  if (!guildId || !userId || !targetUserId) {
    return null;
  }

  return {
    guildId,
    userId,
    targetUserId,
  };
}

export function createAfkModeId(
  action: AfkModeAction,
  guildId: string,
  userId: string,
): string {
  const actionToken = action === "server"
    ? "s"
    : action === "global"
      ? "g"
      : "x";

  return `${AFK_MODE_PREFIX}:${actionToken}:${guildId}:${userId}`;
}

export function parseAfkModeId(customId: string): {
  action: AfkModeAction;
  guildId: string;
  userId: string;
} | null {
  const match = AFK_MODE_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const actionToken = match[1];
  const action: AfkModeAction = actionToken === "s"
    ? "server"
    : actionToken === "g"
      ? "global"
      : "cancel";

  const guildId = match[2];
  const userId = match[3];

  if (!action || !guildId || !userId) {
    return null;
  }

  return {
    action,
    guildId,
    userId,
  };
}

export function createAntinukeWhitelistSelectId(
  guildId: string,
  userId: string,
  targetUserId: string,
): string {
  return `${ANTINUKE_WHITELIST_SELECT_PREFIX}:${guildId}:${userId}:${targetUserId}`;
}

export function parseAntinukeWhitelistSelectId(customId: string): {
  guildId: string;
  userId: string;
  targetUserId: string;
} | null {
  const match = ANTINUKE_WHITELIST_SELECT_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const guildId = match[1];
  const userId = match[2];
  const targetUserId = match[3];

  if (!guildId || !userId || !targetUserId) {
    return null;
  }

  return {
    guildId,
    userId,
    targetUserId,
  };
}

export function createNoPrefixAddSelectId(
  guildId: string,
  userId: string,
  targetUserId: string,
): string {
  return `${NOPREFIX_ADD_SELECT_PREFIX}:${guildId}:${userId}:${targetUserId}`;
}

export function parseNoPrefixAddSelectId(customId: string): {
  guildId: string;
  userId: string;
  targetUserId: string;
} | null {
  const match = NOPREFIX_ADD_SELECT_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const guildId = match[1];
  const userId = match[2];
  const targetUserId = match[3];

  if (!guildId || !userId || !targetUserId) {
    return null;
  }

  return {
    guildId,
    userId,
    targetUserId,
  };
}

export function createNoPrefixAddConfirmId(
  action: NoPrefixAddConfirmAction,
  guildId: string,
  userId: string,
  targetUserId: string,
  durationKey: string,
): string {
  const actionToken = action === "continue" ? "c" : "x";
  return `${NOPREFIX_ADD_CONFIRM_PREFIX}:${actionToken}:${guildId}:${userId}:${targetUserId}:${durationKey}`;
}

export function parseNoPrefixAddConfirmId(customId: string): {
  action: NoPrefixAddConfirmAction;
  guildId: string;
  userId: string;
  targetUserId: string;
  durationKey: string;
} | null {
  const match = NOPREFIX_ADD_CONFIRM_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const actionToken = match[1];
  const action: NoPrefixAddConfirmAction = actionToken === "c" ? "continue" : "cancel";
  const guildId = match[2];
  const userId = match[3];
  const targetUserId = match[4];
  const durationKey = match[5];

  if (!action || !guildId || !userId || !targetUserId || !durationKey) {
    return null;
  }

  return {
    action,
    guildId,
    userId,
    targetUserId,
    durationKey,
  };
}

export function createGreetEditorSelectId(
  guildId: string,
  userId: string,
): string {
  return `${GREET_EDITOR_SELECT_PREFIX}:${guildId}:${userId}`;
}

export function createGreetEditorButtonId(
  action: GreetEditorButtonAction,
  guildId: string,
  userId: string,
): string {
  return `${GREET_EDITOR_BUTTON_PREFIX}:${action}:${guildId}:${userId}`;
}

export function parseGreetEditorSelectId(customId: string): {
  guildId: string;
  userId: string;
} | null {
  const match = GREET_EDITOR_SELECT_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const guildId = match[1];
  const userId = match[2];
  if (!guildId || !userId) {
    return null;
  }

  return {
    guildId,
    userId,
  };
}

export function parseGreetEditorButtonId(customId: string): {
  action: GreetEditorButtonAction;
  guildId: string;
  userId: string;
} | null {
  const match = GREET_EDITOR_BUTTON_ID_REGEX.exec(customId);
  if (!match) {
    return null;
  }

  const action = match[1] as GreetEditorButtonAction;
  const guildId = match[2];
  const userId = match[3];
  if (!action || !guildId || !userId) {
    return null;
  }

  return {
    action,
    guildId,
    userId,
  };
}
