import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { asNode, parseKV, type KVNode } from "../kv";
import { SHOP_ITEMS } from "../shop";

// These tests read the REAL KV/loc files and assert them against the catalog in
// shop.ts. They turn a class of silent KV bugs — a drifted cost, a missing shop
// flag, an item with no tooltip — into a red test on a laptop, instead of a
// wrong number a player notices in a live match (see /kv-authoring).

const root = process.cwd();
const items = asNode(
    parseKV(readFileSync(resolve(root, "game/scripts/npc/npc_items_custom.txt"), "utf8"))[
        "DOTAAbilities"
    ],
    "items root",
);
const tokens = asNode(
    asNode(parseKV(readFileSync(resolve(root, "game/resource/addon_english.txt"), "utf8"))["lang"], "lang")[
        "Tokens"
    ],
    "Tokens",
);

const HOOK_BONUS_KEYS = ["bonus_range", "bonus_speed", "bonus_damage"];
const STAT_BONUS_KEYS = ["bonus_movespeed", "bonus_health", "bonus_health_regen"];

describe("shop KV matches the catalog", () => {
    it("has exactly the catalog's items and no stray pudge items", () => {
        const kvNames = Object.keys(items);
        const catalogNames = SHOP_ITEMS.map(i => i.name).sort();
        expect(kvNames.sort()).toEqual(catalogNames);
    });

    for (const item of SHOP_ITEMS) {
        describe(item.name, () => {
            const block = asNode(items[item.name], item.name);

            it("costs exactly what the catalog says", () => {
                expect(block["ItemCost"]).toBe(String(item.cost));
            });

            it("is purchasable and points at the item module", () => {
                expect(block["ItemPurchasable"]).toBe("1");
                expect(block["ScriptFile"]).toBe("abilities/pudge_items");
                expect(block["BaseClass"]).toBe("item_lua");
            });

            it("carries a bonus matching its kind", () => {
                const values = asNode(block["AbilityValues"], `${item.name}.AbilityValues`);
                const keys = item.kind === "hook" ? HOOK_BONUS_KEYS : STAT_BONUS_KEYS;
                const present = keys.filter(k => values[k] !== undefined);
                expect(present.length).toBeGreaterThan(0);
            });

            it("has name + description localization tokens", () => {
                expect(tokens[`DOTA_Tooltip_ability_${item.name}`]).toBeDefined();
                expect(tokens[`DOTA_Tooltip_ability_${item.name}_Description`]).toBeDefined();
            });
        });
    }
});
