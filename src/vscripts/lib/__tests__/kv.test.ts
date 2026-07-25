import { describe, expect, it } from "vitest";
import { asNode, parseKV } from "../kv";

describe("parseKV", () => {
    it("parses nested blocks and quoted pairs", () => {
        const doc = parseKV(`
            "DOTAAbilities"
            {
                // a comment
                "pudge_meat_hook"
                {
                    "AbilityCastRange" "1100"
                    "AbilityValues"
                    {
                        "hook_damage" "100 150 200 250"
                    }
                }
            }
        `);
        const abilities = asNode(doc["DOTAAbilities"], "root");
        const hook = asNode(abilities["pudge_meat_hook"], "hook");
        expect(hook["AbilityCastRange"]).toBe("1100");
        const values = asNode(hook["AbilityValues"], "values");
        expect(values["hook_damage"]).toBe("100 150 200 250");
    });

    it("lets the last duplicate key win, as the engine does", () => {
        const doc = parseKV(`"a" "1" "a" "2"`);
        expect(doc["a"]).toBe("2");
    });

    it("strips // line comments", () => {
        const doc = parseKV(`"k" "v" // trailing\n"k2" "v2"`);
        expect(doc).toEqual({ k: "v", k2: "v2" });
    });
});
