import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { asNode, parseKV } from "../kv";

// Every ability, item, and overridden hero must have localization tokens, or the
// game renders the raw "#DOTA_Tooltip_..." token in the tooltip — a silent
// content bug that looks like a UI bug (/kv-authoring). This is the coverage
// sweep across all three KV files against addon_english.txt.

const root = process.cwd();
const read = (p: string) => parseKV(readFileSync(resolve(root, p), "utf8"));

const abilities = asNode(read("game/scripts/npc/npc_abilities_custom.txt")["DOTAAbilities"], "abilities");
const heroes = asNode(read("game/scripts/npc/npc_heroes_custom.txt")["DOTAHeroes"], "heroes");
const tokens = asNode(asNode(read("game/resource/addon_english.txt")["lang"], "lang")["Tokens"], "Tokens");

describe("localization coverage", () => {
    it("every custom ability has name + description tokens", () => {
        const missing: string[] = [];
        for (const ability of Object.keys(abilities)) {
            if (tokens[`DOTA_Tooltip_ability_${ability}`] === undefined) missing.push(`${ability} (name)`);
            if (tokens[`DOTA_Tooltip_ability_${ability}_Description`] === undefined) {
                missing.push(`${ability} (description)`);
            }
        }
        expect(missing).toEqual([]);
    });

    it("every overridden hero has a name token under its base name", () => {
        for (const hero of Object.keys(heroes)) {
            expect(tokens[hero], `missing loc token for ${hero}`).toBeDefined();
        }
    });

    it("names the game and both teams", () => {
        expect(tokens["addon_game_name"]).toBe("Pudge Wars");
        expect(tokens["pudge_wars_team_radiant"]).toBeDefined();
        expect(tokens["pudge_wars_team_dire"]).toBeDefined();
    });
});
