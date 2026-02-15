import {
  GREET_EDITOR_BUTTON_ID_REGEX,
  parseGreetEditorButtonId,
} from "../../constants/component-ids";
import {
  buildBotContainerResponse,
  getClientAvatarUrl,
} from "../../ui/component-v2/container-response";
import {
  buildGreetEditorVariablesPanel,
  createGreetEditorSessionKey,
  serializeGreetTemplateDraft,
} from "../../services/welcome/greet-editor.service";
import type { ButtonComponentHandler } from "../../types/component";

const greetEditorButtonHandler: ButtonComponentHandler = {
  id: GREET_EDITOR_BUTTON_ID_REGEX,
  async execute(interaction, client) {
    const parsed = parseGreetEditorButtonId(interaction.customId);
    if (!parsed) {
      return;
    }

    if (!interaction.inGuild() || interaction.guildId !== parsed.guildId) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "This editor session belongs to a different server.",
          ephemeral: true,
        }),
      );
      return;
    }

    if (interaction.user.id !== parsed.userId) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "Only the user who started this editor can use these buttons.",
          ephemeral: true,
        }),
      );
      return;
    }

    const sessionKey = createGreetEditorSessionKey(parsed.guildId, parsed.userId);
    const session = client.greetEditorSessions.get(sessionKey);
    if (!session) {
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "This setup session has expired. Run `greet setup` again.",
          ephemeral: true,
        }),
      );
      return;
    }

    if (parsed.action === "variables") {
      await interaction.reply(
        buildGreetEditorVariablesPanel({
          avatarUrl: getClientAvatarUrl(client),
        }),
      );
      return;
    }

    if (parsed.action === "cancel") {
      client.greetEditorSessions.delete(sessionKey);
      await interaction.update(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: "Setup cancelled. No changes were saved.",
          addSeparator: true,
          footerText: "Run `greet setup` anytime to start again.",
        }),
      );
      return;
    }

    const existingConfig = await client.repositories.greetConfig.getByGuildId(
      parsed.guildId,
    );
    if (!existingConfig?.channel_id) {
      const prefix = await client.prefixService.getGuildPrefix(parsed.guildId);
      await interaction.reply(
        buildBotContainerResponse({
          avatarUrl: getClientAvatarUrl(client),
          title: "Welcome Editor",
          body: `Set the welcome channel first using \`${prefix}greet channel #channel\`, then submit again.`,
          ephemeral: true,
        }),
      );
      return;
    }

    await client.repositories.greetConfig.upsertByGuildId({
      guild_id: parsed.guildId,
      enabled: true,
      style: session.style,
      message_template: serializeGreetTemplateDraft(session.draft),
    });

    client.greetEditorSessions.delete(sessionKey);

    await interaction.update(
      buildBotContainerResponse({
        avatarUrl: getClientAvatarUrl(client),
        title: "Welcome Setup Saved",
        body: [
          "Welcome configuration has been saved successfully.",
          "",
          `- Channel: <#${existingConfig.channel_id}>`,
          `- Style: **${session.style}**`,
          "- Template: **Advanced Container**",
        ].join("\n"),
        addSeparator: true,
        footerText: "Use `greet test` to preview the final welcome message.",
      }),
    );
  },
};

export default greetEditorButtonHandler;
