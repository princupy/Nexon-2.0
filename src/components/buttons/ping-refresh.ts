import { COMPONENT_IDS } from "../../constants/component-ids";
import type { ButtonComponentHandler } from "../../types/component";
import { getClientAvatarUrl } from "../../ui/component-v2/container-response";
import { buildStatusCardMessage } from "../../ui/component-v2/status-card";

const pingRefreshButton: ButtonComponentHandler = {
  id: COMPONENT_IDS.pingRefresh,
  async execute(interaction, client) {
    await interaction.update(
      buildStatusCardMessage({
        botLatency: Date.now() - interaction.createdTimestamp,
        apiPing: Math.round(client.ws.ping),
        botAvatarUrl: getClientAvatarUrl(client),
        refreshedById: interaction.user.id,
      }),
    );
  },
};

export default pingRefreshButton;
