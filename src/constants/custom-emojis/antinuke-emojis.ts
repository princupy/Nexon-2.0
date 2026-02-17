// Replace these IDs with your actual server custom emoji IDs.
export const antinukeEmojis = {
  brand: "<:icons8firewall48:1473333596189364337>",
  shield: "<:icons8usershield48:1457046411861426272>",
  check: "<:icons8tick48:1457047062888583179>",
  cross: "<:icons8cross48:1457049292576391384>",
  warn: "<:icons8warning48:1457049663982010555>",
  bolt: "<:icons8bolt48:1473332882830528666>",
  owner: "<:icons8crown48:1473332543511199846>",
  moon: "<:icons8moonandstars48:1473333084098138162>",
} as const;

export type AntinukeEmojiKey = keyof typeof antinukeEmojis;
