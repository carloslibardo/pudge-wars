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

/** VPK-verified 2026-07-29: `rune_regeneration` under `particles/generic_gameplay`. */
const PAD_FX = "particles/generic_gameplay/rune_regeneration.vpcf";

export class ShopPads {
    constructor() {
        for (const side of [-1, 1]) {
            const pos = GetGroundPosition(Vector(side * SHOP_PAD_X, 0, 0), undefined);
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
