import {
  ContainerBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import {
  createHelpNavId,
  createHelpSelectId,
} from "../../constants/component-ids";
import type {
  PrefixCommand,
  PrefixCommandHelpItem,
  PrefixCommandGroup,
} from "../../types/prefix-command";
import {
  buildV2ActionRow,
  buildV2Section,
  buildV2Separator,
} from "../../ui/component-v2/container-response";

const HELP_PAGE_SIZE = 5;

const GROUP_LABELS: Record<PrefixCommandGroup, string> = {
  main: "Main Commands",
  extra: "Extra Commands",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  welcome: "Welcome onboarding and greeting configuration commands.",
  config: "Server configuration commands, including prefix management.",
  utility: "Utility and diagnostic commands for server operations.",
  general: "General purpose commands.",
};

export interface HelpCategory {
  key: string;
  label: string;
  group: PrefixCommandGroup;
  description: string;
  commands: HelpDisplayCommand[];
}

export interface HelpCatalog {
  mainCategories: HelpCategory[];
  extraCategories: HelpCategory[];
  totalCommands: number;
}

interface HelpDisplayCommand {
  name: string;
  description: string;
  usage?: string | undefined;
  usages?: string[] | undefined;
  aliases?: string[] | undefined;
  sortGroupKey: string;
  sortOrder: number;
}

function normalizeCategoryKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return normalized || "general";
}

function resolveCommandGroup(command: PrefixCommand): PrefixCommandGroup {
  return command.group === "main" ? "main" : "extra";
}

function resolveCategoryLabel(command: PrefixCommand): string {
  const label = command.category?.trim();
  return label && label.length > 0 ? label : "General";
}

function resolveCategoryDescription(key: string, label: string): string {
  return (
    CATEGORY_DESCRIPTIONS[key] ??
    `${label} commands for the Nexon command panel.`
  );
}

function getUniqueCommands(commands: Iterable<PrefixCommand>): PrefixCommand[] {
  const unique = new Map<string, PrefixCommand>();

  for (const command of commands) {
    const key = command.name.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, command);
    }
  }

  return [...unique.values()];
}

function mapHelpItemToDisplayCommand(
  command: PrefixCommand,
  item: PrefixCommandHelpItem,
  index: number,
): HelpDisplayCommand {
  const usages = item.usages?.filter((entry) => entry.trim().length > 0);

  return {
    name: item.title.trim(),
    description: item.description,
    usage: item.usage?.trim(),
    usages,
    aliases: item.aliases,
    sortGroupKey: command.name.toLowerCase(),
    sortOrder: index,
  };
}

function mapCommandToDisplayCommands(command: PrefixCommand): HelpDisplayCommand[] {
  const helpItems = command.helpItems?.filter(
    (item) => item.title.trim().length > 0 && item.description.trim().length > 0,
  );

  if (helpItems?.length) {
    return helpItems.map((item, index) =>
      mapHelpItemToDisplayCommand(command, item, index),
    );
  }

  return [
    {
      name: command.name,
      description: command.description,
      usage: command.usage,
      usages: command.usages,
      aliases: command.aliases,
      sortGroupKey: command.name.toLowerCase(),
      sortOrder: 0,
    },
  ];
}

function renderCategoryList(categories: HelpCategory[]): string {
  if (!categories.length) {
    return "> 1. None";
  }

  return categories.map((category, index) => `> ${index + 1}. ${category.label}`).join("\n");
}

function trimText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function buildCategorySelect(input: {
  group: PrefixCommandGroup;
  guildId: string;
  ownerId: string;
  placeholder: string;
  categories: HelpCategory[];
  selectedCategoryKey?: string | undefined;
}): StringSelectMenuBuilder {
  const select = new StringSelectMenuBuilder()
    .setCustomId(createHelpSelectId(input.group, input.guildId, input.ownerId))
    .setPlaceholder(input.placeholder)
    .setMinValues(1)
    .setMaxValues(1);

  if (!input.categories.length) {
    select
      .setDisabled(true)
      .addOptions({
        label: "No categories available",
        value: "none",
        description: "No commands were found for this group.",
      });
    return select;
  }

  select.addOptions(
    input.categories.map((category) => ({
      label: trimText(category.label, 100),
      value: category.key,
      description: trimText(category.description, 100),
      default: category.key === input.selectedCategoryKey,
    })),
  );

  return select;
}

function getCategoryCollection(
  catalog: HelpCatalog,
  group: PrefixCommandGroup,
): HelpCategory[] {
  return group === "main" ? catalog.mainCategories : catalog.extraCategories;
}

function resolveUsageLines(prefix: string, command: HelpDisplayCommand): string[] {
  const list = command.usages?.filter((entry) => entry.trim().length > 0);

  if (list?.length) {
    return list.map(
      (entry, index) => `${index + 1}. \`${prefix}${entry.trim()}\``,
    );
  }

  const usage = command.usage?.trim() || command.name;
  return [`1. \`${prefix}${usage}\``];
}

function resolveAliases(command: HelpDisplayCommand): string {
  if (!command.aliases?.length) {
    return "None";
  }

  return command.aliases.map((alias) => `\`${alias}\``).join(", ");
}

function buildCommandDetails(
  command: HelpDisplayCommand,
  number: number,
  prefix: string,
): string {
  const usageBlock = resolveUsageLines(prefix, command).join("\n");

  return [
    `### ${number}. ${command.name}`,
    `Usage:\n${usageBlock}`,
    `Aliases: ${resolveAliases(command)}`,
    `Details: ${command.description}`,
  ].join("\n");
}

export function buildHelpCatalog(commands: Iterable<PrefixCommand>): HelpCatalog {
  const uniqueCommands = getUniqueCommands(commands);

  const grouped: Record<PrefixCommandGroup, Map<string, HelpCategory>> = {
    main: new Map<string, HelpCategory>(),
    extra: new Map<string, HelpCategory>(),
  };
  let totalCommands = 0;

  for (const command of uniqueCommands) {
    const group = resolveCommandGroup(command);
    const label = resolveCategoryLabel(command);
    const key = normalizeCategoryKey(label);
    const displayCommands = mapCommandToDisplayCommands(command);
    totalCommands += displayCommands.length;

    const category = grouped[group].get(key);
    if (category) {
      category.commands.push(...displayCommands);
      continue;
    }

    grouped[group].set(key, {
      key,
      label,
      group,
      description: resolveCategoryDescription(key, label),
      commands: displayCommands,
    });
  }

  const sortCategories = (categories: HelpCategory[]) => {
    categories.sort((a, b) => a.label.localeCompare(b.label));

    for (const category of categories) {
      category.commands.sort((a, b) => {
        const byGroup = a.sortGroupKey.localeCompare(b.sortGroupKey);
        if (byGroup !== 0) {
          return byGroup;
        }

        const byOrder = a.sortOrder - b.sortOrder;
        if (byOrder !== 0) {
          return byOrder;
        }

        return a.name.localeCompare(b.name);
      });
    }
  };

  const mainCategories = [...grouped.main.values()];
  const extraCategories = [...grouped.extra.values()];

  sortCategories(mainCategories);
  sortCategories(extraCategories);

  return {
    mainCategories,
    extraCategories,
    totalCommands,
  };
}

export function findHelpCategory(
  catalog: HelpCatalog,
  group: PrefixCommandGroup,
  categoryKey: string,
): HelpCategory | null {
  const categories = getCategoryCollection(catalog, group);
  return categories.find((category) => category.key === categoryKey) ?? null;
}

export function findHelpCategoryByToken(
  catalog: HelpCatalog,
  token: string,
): HelpCategory | null {
  const normalizedToken = normalizeCategoryKey(token);
  const allCategories = [...catalog.mainCategories, ...catalog.extraCategories];

  for (const category of allCategories) {
    if (
      category.key === normalizedToken ||
      normalizeCategoryKey(category.label) === normalizedToken
    ) {
      return category;
    }
  }

  return null;
}

export function buildHelpHomeMessage(input: {
  avatarUrl: string;
  prefix: string;
  ownerId: string;
  guildId: string;
  catalog: HelpCatalog;
}) {
  const mainSelect = buildCategorySelect({
    group: "main",
    guildId: input.guildId,
    ownerId: input.ownerId,
    placeholder: "Select Main Category",
    categories: input.catalog.mainCategories,
  });

  const extraSelect = buildCategorySelect({
    group: "extra",
    guildId: input.guildId,
    ownerId: input.ownerId,
    placeholder: "Select Extra Category",
    categories: input.catalog.extraCategories,
  });

  const container = new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: [
          "## Nexon Help",
          "Nexon is an all-in-one Discord bot built with a fully container-based interface and modular command architecture.",
        ],
        accessory: {
          type: "thumbnail",
          url: input.avatarUrl,
        },
      }),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Server Details\nPrefix: \`${input.prefix}\`\nTotal Commands: **${input.catalog.totalCommands}**`,
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### Main Commands",
          renderCategoryList(input.catalog.mainCategories),
          "",
          "### Extra Commands",
          renderCategoryList(input.catalog.extraCategories),
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Select a category from Main or Extra to view detailed commands.",
      ),
    )
    .addActionRowComponents(buildV2ActionRow(mainSelect).toJSON())
    .addActionRowComponents(buildV2ActionRow(extraSelect).toJSON())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Panel owner: <@${input.ownerId}>`),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}

export function buildHelpCategoryMessage(input: {
  avatarUrl: string;
  prefix: string;
  ownerId: string;
  guildId: string;
  catalog: HelpCatalog;
  group: PrefixCommandGroup;
  categoryKey: string;
  page: number;
}) {
  const category = findHelpCategory(input.catalog, input.group, input.categoryKey);
  if (!category) {
    return buildHelpHomeMessage(input);
  }

  const pageCount = Math.max(
    1,
    Math.ceil(category.commands.length / HELP_PAGE_SIZE),
  );
  const currentPage = Math.min(Math.max(input.page, 0), pageCount - 1);
  const startIndex = currentPage * HELP_PAGE_SIZE;
  const pagedCommands = category.commands.slice(
    startIndex,
    startIndex + HELP_PAGE_SIZE,
  );

  const previousButton = new ButtonBuilder()
    .setCustomId(
      createHelpNavId(
        "prev",
        category.group,
        category.key,
        currentPage,
        input.guildId,
        input.ownerId,
      ),
    )
    .setLabel("Previous")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === 0);

  const nextButton = new ButtonBuilder()
    .setCustomId(
      createHelpNavId(
        "next",
        category.group,
        category.key,
        currentPage,
        input.guildId,
        input.ownerId,
      ),
    )
    .setLabel("Next")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage >= pageCount - 1);

  const homeButton = new ButtonBuilder()
    .setCustomId(
      createHelpNavId(
        "home",
        category.group,
        category.key,
        currentPage,
        input.guildId,
        input.ownerId,
      ),
    )
    .setLabel("Home")
    .setStyle(ButtonStyle.Primary);

  const mainSelect = buildCategorySelect({
    group: "main",
    guildId: input.guildId,
    ownerId: input.ownerId,
    placeholder: "Switch Main Category",
    categories: input.catalog.mainCategories,
    selectedCategoryKey: category.group === "main" ? category.key : undefined,
  });

  const extraSelect = buildCategorySelect({
    group: "extra",
    guildId: input.guildId,
    ownerId: input.ownerId,
    placeholder: "Switch Extra Category",
    categories: input.catalog.extraCategories,
    selectedCategoryKey: category.group === "extra" ? category.key : undefined,
  });

  const container = new ContainerBuilder()
    .addSectionComponents(
      buildV2Section({
        text: [
          "## Nexon Help",
          `Group: **${GROUP_LABELS[category.group]}**\nSelected: **${category.label}**\n${category.description}`,
        ],
        accessory: {
          type: "thumbnail",
          url: input.avatarUrl,
        },
      }),
    )
    .addSeparatorComponents(buildV2Separator());

  if (!pagedCommands.length) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("No commands were found in this category."),
    );
  } else {
    for (const [index, command] of pagedCommands.entries()) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          buildCommandDetails(command, startIndex + index + 1, input.prefix),
        ),
      );

      if (index < pagedCommands.length - 1) {
        container.addSeparatorComponents(buildV2Separator());
      }
    }
  }

  container
    .addSeparatorComponents(buildV2Separator())
    .addActionRowComponents(
      buildV2ActionRow(previousButton, nextButton, homeButton).toJSON(),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Page **${currentPage + 1}/${pageCount}**`),
    )
    .addActionRowComponents(buildV2ActionRow(mainSelect).toJSON())
    .addActionRowComponents(buildV2ActionRow(extraSelect).toJSON())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Panel owner: <@${input.ownerId}>`),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}
