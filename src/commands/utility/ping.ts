import type { PrefixCommand } from "../../types/prefix-command";
import { getClientAvatarUrl } from "../../ui/component-v2/container-response";
import { buildStatusCardMessage } from "../../ui/component-v2/status-card";

const pingPrefixCommand: PrefixCommand = {
  name: "ping",
  description: "Displays current bot latency and Discord gateway ping.",
  usage: "ping",
  usages: ["ping"],
  guildOnly: true,
  category: "Utility",
  group: "extra",
  async execute({ client, message }) {
    await message.reply(
      buildStatusCardMessage({
        botLatency: Date.now() - message.createdTimestamp,
        apiPing: Math.round(client.ws.ping),
        botAvatarUrl: getClientAvatarUrl(client),
        refreshedById: message.author.id,
      }),
    );
  },
};

export default pingPrefixCommand;
