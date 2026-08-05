/**
 * Physical shop pads (spec 013): one glowing circle behind each spawn line.
 * The pad is where SHOPPING VISIBLY HAPPENS — harness bots walk here before
 * buying, so a viewer sees the trip, the stop, the gold popup, the run back.
 *
 * The pad is presentation + a proximity answer; the purchase rules stay in
 * `lib/shop.ts`. (Humans keep universal shop — the map has no native shop
 * trigger entity; recorded follow-up in the spec.)
 */
import { SHOP_PAD_RADIUS, SHOP_PAD_X } from "../config";
import { sideForTeam } from "../lib/battleLines";
import { Marker } from "../lib/markers";
import { e2eEnabled } from "./e2eFlags";

/** VPK-verified 2026-07-29: `rune_regeneration` under `particles/generic_gameplay`. */
const PAD_FX = "particles/generic_gameplay/rune_regeneration.vpcf";
/** VPK-verified 2026-08-05: `range_display` under `particles/ui_mouseactions`. CP1.x = radius. */
const RING_FX = "particles/ui_mouseactions/range_display.vpcf";
/** VPK-verified 2026-08-05: the fountain shopkeeper models (radiant / dire). */
const KEEPER_MODEL: Record<number, string> = {
    [-1]: "models/heroes/shopkeeper/shopkeeper.vmdl",
    [1]: "models/heroes/shopkeeper_dire/shopkeeper_dire.vmdl",
};

export class ShopPads {
    private drawn = false;

    constructor() {
        // Draw at the horn, NOT here-and-now. This constructor runs at
        // Activate, while the server sits in INIT ~15 s before the first
        // client connects — and a particle create is networked only to the
        // clients connected at that instant, so pads drawn from the
        // constructor render for NOBODY, silently (2026-08-03 smoke: every
        // [SHOP] marker green, zero pad FX on any frame). GAME_IN_PROGRESS is
        // the same timing the frame-verified gift FX use.
        ListenToGameEvent(
            "game_rules_state_change",
            () => {
                if (GameRules.State_Get() === GameState.GAME_IN_PROGRESS) this.draw();
            },
            undefined,
        );
    }

    private draw(): void {
        if (this.drawn) return;
        this.drawn = true;
        for (const side of [-1, 1]) {
            const pos = GetGroundPosition(Vector(side * SHOP_PAD_X, 0, 0), undefined);
            // The shopkeeper is the landmark — models always render (unlike
            // particles, which can silently no-op under raw CP driving).
            // Faces the court center so it reads as "come buy here".
            SpawnEntityFromTableSynchronous("prop_dynamic", {
                model: KEEPER_MODEL[side],
                origin: `${pos.x} ${pos.y} ${pos.z}`,
                angles: `0 ${side < 0 ? 0 : 180} 0`,
                DefaultAnim: "idle",
            });
            // Ground ring marking the exact buy radius.
            const ring = ParticleManager.CreateParticle(
                RING_FX,
                ParticleAttachment.CUSTOMORIGIN,
                undefined,
            );
            ParticleManager.SetParticleControl(ring, 0, pos);
            ParticleManager.SetParticleControl(ring, 1, Vector(SHOP_PAD_RADIUS, 0, 0));
            ParticleManager.ReleaseParticleIndex(ring);
            // A ring of glows reads as a ZONE at video scale, not a dot.
            for (const [ox, oy] of [
                [0, 0],
                [200, 200],
                [200, -200],
                [-200, 200],
                [-200, -200],
            ]) {
                const p = ParticleManager.CreateParticle(
                    PAD_FX,
                    ParticleAttachment.CUSTOMORIGIN,
                    undefined,
                );
                ParticleManager.SetParticleControl(p, 0, (pos + Vector(ox, oy, 0)) as Vector);
                ParticleManager.ReleaseParticleIndex(p);
            }
        }
        if (e2eEnabled()) print(Marker.shopPadsDrawn(2));
    }

    /** The pad position for a team, or undefined for spectator-ish teams. */
    public static padFor(team: DotaTeam): Vector | undefined {
        const side = sideForTeam(team);
        if (side === undefined) return undefined;
        return Vector(side * SHOP_PAD_X, 0, 0);
    }

    /** Standing close enough to buy? */
    public static onPad(hero: CDOTA_BaseNPC): boolean {
        const pad = ShopPads.padFor(hero.GetTeamNumber());
        if (!pad) return false;
        return ((hero.GetAbsOrigin() - pad) as Vector).Length2D() <= SHOP_PAD_RADIUS;
    }
}
