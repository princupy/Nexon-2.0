import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import {
  MessageFlags,
  StringSelectMenuBuilder,
  type User,
} from "discord.js";
import {
  BANNER_VIEW_SELECT_ID_REGEX,
  createBannerViewSelectId,
  parseBannerViewSelectId,
  type BannerViewType,
} from "../../constants/component-ids";
import type { SelectMenuComponentHandler } from "../../types/component";
import {
  buildBotContainerResponse,
  buildV2ActionRow,
  buildV2Section,
  buildV2Separator,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";

function buildUserProfileLink(username: string, userId: string): string {
  const safeName = username.replace(/\]/g, "");
  return `[${safeName}](https://discord.com/users/${userId})`;
}

function buildBannerTypeSelectMenu(input: {
  guildId: string;
  requesterId: string;
  targetUserId: string;
  selectedType: BannerViewType;
}): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId(
      createBannerViewSelectId(
        input.guildId,
        input.requesterId,
        input.targetUserId,
      ),
    )
    .setPlaceholder("Select Banner Type")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      {
        label: "User Banner",
        value: "user",
        description: "Show global Discord profile banner",
        default: input.selectedType === "user",
      },
      {
        label: "Server Banner",
        value: "server",
        description: "Show this server profile banner",
        default: input.selectedType === "server",
      },
    );
}

function buildBannerViewerResponse(input: {
  user: User;
  selectedType: BannerViewType;
  guildId: string;
  requesterId: string;
  clientAvatarUrl: string;
  userBannerUrl: string | null;
  userAccentHex: string;
  serverBannerUrl: string | null;
  hasGuildMember: boolean;
}) {
  const selectMenu = buildBannerTypeSelectMenu({
    guildId: input.guildId,
    requesterId: input.requesterId,
    targetUserId: input.user.id,
    selectedType: input.selectedType,
  });

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## Banner Viewer"),
    )
    .addSeparatorComponents(buildV2Separator())
    .addSectionComponents(
      buildV2Section({
        text: [
          [
            "### Target",
            buildUserProfileLink(input.user.username, input.user.id),
            `ID: ${input.user.id}`,
          ].join("\n"),
        ],
        accessory: {
          type: "thumbnail",
          url:
            input.user.displayAvatarURL({
              extension: "png",
              size: 1024,
            }) ?? input.clientAvatarUrl,
        },
      }),
    )
    .addSeparatorComponents(buildV2Separator())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "Choose what you want to view from dropdown.",
      ),
    )
    .addActionRowComponents(buildV2ActionRow(selectMenu).toJSON())
    .addSeparatorComponents(buildV2Separator());

  if (input.selectedType === "user") {
    if (!input.userBannerUrl) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### User Banner",
            "No global Discord profile banner is set.",
            `Accent Color: ${input.userAccentHex}`,
          ].join("\n"),
        ),
      );

      return {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      } as const;
    }

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### User Banner",
            "Showing global Discord profile banner.",
            `Accent Color: ${input.userAccentHex}`,
            `[Open Banner](${input.userBannerUrl})`,
          ].join("\n"),
        ),
      )
      .addSeparatorComponents(buildV2Separator())
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(input.userBannerUrl),
        ),
      );

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    } as const;
  }

  if (!input.hasGuildMember) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### Server Banner",
          "User is not currently available in this server.",
        ].join("\n"),
      ),
    );

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    } as const;
  }

  if (!input.serverBannerUrl) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### Server Banner",
          "No server profile banner is set for this user.",
        ].join("\n"),
      ),
    );

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    } as const;
  }

  container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### Server Banner",
          "Showing this server profile banner.",
          `[Open Banner](${input.serverBannerUrl})`,
        ].join("\n"),
      ),
    )
    .addSeparatorComponents(buildV2Separator())
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(input.serverBannerUrl),
      ),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  } as const;
}

const bannerViewSelectHandler: SelectMenuComponentHandler = {
  id: BANNER_VIEW_SELECT_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseBannerViewSelectId(interaction.customId);
    if (!parsed) {
      return;
    }

    const avatarUrl = getClientAvatarUrl(client);

    const replyError = async (message: string): Promise<void> => {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl,
          title: "Banner Viewer",
          body: message,
          ephemeral: true,
        }),
      );
    };

    if (!interaction.isStringSelectMenu()) {
      return;
    }

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await replyError("This panel belongs to a different server.");
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await replyError("Only the panel owner can use this dropdown.");
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await replyError("Guild context is unavailable for this panel.");
      return;
    }

    const selected = interaction.values[0];
    if (selected !== "user" && selected !== "server") {
      await replyError("Please choose a valid banner type.");
      return;
    }

    const targetUser = await client.users.fetch(parsed.targetUserId).catch(() => null);
    if (!targetUser) {
      await interaction.update(
        buildBotContainerResponse({
          avatarUrl,
          title: "Banner Viewer",
          body: "Target user is no longer available.",
        }),
      );
      return;
    }

    const fetchedUser = await targetUser.fetch(true).catch(() => targetUser);
    const userBannerUrl = fetchedUser.bannerURL({
      extension: "png",
      size: 4096,
    }) ?? null;

    const targetMember = await guild.members.fetch(parsed.targetUserId).catch(() => null);
    const serverBannerUrl = targetMember?.bannerURL({
      extension: "png",
      size: 4096,
    }) ?? null;

    await interaction.update(
      buildBannerViewerResponse({
        user: fetchedUser,
        selectedType: selected,
        guildId: parsed.guildId,
        requesterId: parsed.userId,
        clientAvatarUrl: avatarUrl,
        userBannerUrl,
        userAccentHex: fetchedUser.hexAccentColor ?? "None",
        serverBannerUrl,
        hasGuildMember: Boolean(targetMember),
      }),
    );
  },
};

export default bannerViewSelectHandler;
