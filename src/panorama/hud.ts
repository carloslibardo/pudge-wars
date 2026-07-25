// Root bootstrap for the "Hud" CustomUIElement (layout/custom_game/hud.xml).
//
// Panorama has no module system: every included .js file shares one global
// scope, so each file wraps its logic in an IIFE to avoid name collisions.
// The compiled output of this file is included by hud.xml's <scripts> block.
(function () {
    $.Msg("[UI] Hud loaded");

    const rows = $("#ScoreRows");
    const title = $("#ScoreTitle") as LabelPanel;

    // Score is per TEAM in Pudge Wars (the win condition is a team total), so
    // the net table is keyed by team number. Radiant = 2, Dire = 3.
    const TEAM_NAMES: Record<string, string> = {
        "2": "Radiant",
        "3": "Dire",
    };

    function refresh(): void {
        const table = CustomNetTables.GetAllTableValues("pudge_wars_score");
        rows.RemoveAndDeleteChildren();
        let total = 0;
        for (const entry of table) {
            const kills = entry.value.kills;
            total += kills;
            const name = TEAM_NAMES[entry.key] ?? `Team ${entry.key}`;
            const label = $.CreatePanel("Label", rows, `ScoreRow${entry.key}`);
            label.AddClass("Score__Row");
            label.text = `${name}  ${kills}`;
        }
        title.text = total > 0 ? "SCORE" : "SCORE — first to 10 kills";
    }

    // Net tables hold STATE, not one-shot events, so a UI that finishes loading
    // late can still read the current value. Subscribe, then read once now.
    CustomNetTables.SubscribeNetTableListener("pudge_wars_score", () => refresh());
    refresh();
})();
