/**
 * A small Valve KeyValues parser — pure, zero engine globals.
 *
 * KV files are the engine's data layer and are stringly-typed and unvalidated:
 * a typo'd key is a default you did not choose, and a duplicate key silently
 * overrides (see /kv-authoring). This parser exists so the KV structural tests
 * can read the real `.txt` files on Node and assert them against the catalog in
 * `shop.ts` and the localization tokens — turning a class of silent KV bugs into
 * a red test on a laptop.
 *
 * It handles the subset these files use: quoted (and bare) `"key" "value"`
 * pairs, `{ }` blocks nested arbitrarily deep, and `//` line comments. Last
 * duplicate key wins, matching the engine.
 */

export type KVValue = string | KVNode;
export interface KVNode {
    [key: string]: KVValue;
}

type Token = { kind: "str"; value: string } | { kind: "open" } | { kind: "close" };

function tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
            i++;
            continue;
        }
        if (ch === "/" && text[i + 1] === "/") {
            while (i < n && text[i] !== "\n") i++;
            continue;
        }
        if (ch === "{") {
            tokens.push({ kind: "open" });
            i++;
            continue;
        }
        if (ch === "}") {
            tokens.push({ kind: "close" });
            i++;
            continue;
        }
        if (ch === '"') {
            i++;
            let s = "";
            while (i < n && text[i] !== '"') {
                s += text[i];
                i++;
            }
            i++; // closing quote
            tokens.push({ kind: "str", value: s });
            continue;
        }
        // bare token: up to the next whitespace, brace, or quote
        let s = "";
        while (i < n && !' \t\r\n{}"'.includes(text[i])) {
            s += text[i];
            i++;
        }
        tokens.push({ kind: "str", value: s });
    }
    return tokens;
}

/** Parse a KV document into a nested object. Throws on structurally broken input. */
export function parseKV(text: string): KVNode {
    const tokens = tokenize(text);
    let pos = 0;

    function parseBlock(): KVNode {
        const node: KVNode = {};
        while (pos < tokens.length) {
            const t = tokens[pos];
            if (t.kind === "close") {
                pos++;
                return node;
            }
            if (t.kind !== "str") throw new Error(`KV: expected a key, got ${t.kind}`);
            const key = t.value;
            pos++;
            const next = tokens[pos];
            if (next === undefined) throw new Error(`KV: key "${key}" has no value`);
            if (next.kind === "open") {
                pos++;
                node[key] = parseBlock(); // last duplicate wins, as the engine does
            } else if (next.kind === "str") {
                pos++;
                node[key] = next.value;
            } else {
                throw new Error(`KV: unexpected "}" after key "${key}"`);
            }
        }
        return node;
    }

    return parseBlock();
}

/** Narrow a KVValue to a block, or throw — for tests that expect a block. */
export function asNode(value: KVValue | undefined, context: string): KVNode {
    if (value === undefined || typeof value === "string") {
        throw new Error(`KV: expected a block at ${context}`);
    }
    return value;
}
