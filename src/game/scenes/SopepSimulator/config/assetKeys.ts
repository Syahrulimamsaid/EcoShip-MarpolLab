/** Central asset map for the SOPEP simulator. Step modules only refer to the
 * keys below; file paths stay confined to the preloader. */
export const SOPEP_ASSET_KEYS = {
    background: "sopep.bg.mainDeck",
    hotspot: "sopep.ui.hotspot",
    hotspotPulse: "sopep.ui.hotspotPulse",
    hotspotActive: "sopep.ui.hotspotActive",
    hotspotChecked: "sopep.ui.hotspotChecked",
    statusUnchecked: "sopep.ui.statusUnchecked",
    statusChecked: "sopep.ui.statusChecked",
} as const;

export const SOPEP_STEP1_ASSETS: Array<[string, string]> = [
    [SOPEP_ASSET_KEYS.background, "assets/soped/simulator/1/background/sopep.bg.mainDeck.png"],
    [SOPEP_ASSET_KEYS.hotspot, "assets/soped/simulator/1/ui/sopep.ui.hotspot.png"],
    [SOPEP_ASSET_KEYS.hotspotPulse, "assets/soped/simulator/1/ui/sopep.ui.hotspotPulse.png"],
    [SOPEP_ASSET_KEYS.hotspotActive, "assets/soped/simulator/1/ui/sopep.ui.hotspotActive.png"],
    [SOPEP_ASSET_KEYS.hotspotChecked, "assets/soped/simulator/1/ui/sopep.ui.checklistDone.png"],
    [SOPEP_ASSET_KEYS.statusUnchecked, "assets/soped/simulator/1/ui/sopep.ui.checklistEmpty.png"],
    [SOPEP_ASSET_KEYS.statusChecked, "assets/soped/simulator/1/ui/sopep.ui.checklistDone.png"],
];

/** Assets audited from `assets/soped/simulator/2`. */
export const SOPEP_STEP2_ASSET_KEYS = {
    map: "sopep2.ui.mapPosition",
    badgeMayday: "sopep2.ui.badgeMayday",
} as const;

export const SOPEP_STEP2_ASSETS: Array<[string, string]> = [
    [SOPEP_STEP2_ASSET_KEYS.map, "assets/soped/simulator/2/ui/sopep.ui.map_position.png"],
    [SOPEP_STEP2_ASSET_KEYS.badgeMayday, "assets/soped/simulator/2/ui/sopep.ui.badge_mayday.png"],
];

/** Assets audited from `assets/soped/simulator/3`. Only files that Step 3
 * actually renders are registered; the rack, door, lifebuoy, railing and stairs are already part
 * of the background illustration, and the `ui/` PNGs are baked-in copies of
 * panels that are rebuilt as live UI. */
const step3Equipment = (name: string, stateName: string) => ({
    normal: `sopep3.eq.${name}`,
    drag: `sopep3.eq.${name}.drag`,
    placed: `sopep3.eq.${name}.placed`,
    files: [
        [`sopep3.eq.${name}`, `assets/soped/simulator/3/equipment/sopep.eq.${name}.png`],
        [`sopep3.eq.${name}.drag`, `assets/soped/simulator/3/states/sopep.eq.${stateName}_drag.png`],
        [`sopep3.eq.${name}.placed`, `assets/soped/simulator/3/states/sopep.eq.${stateName}_placed.png`],
    ] as Array<[string, string]>,
});

const STEP3_EQUIPMENT = {
    oilBoom: step3Equipment("oilBoom", "oilBoom"),
    absorbentPad: step3Equipment("absorbentPad", "absorbentPad"),
    absorbentRoll: step3Equipment("absorbentRoll", "absorbentRoll"),
    scupperPlug: step3Equipment("scupperPlug", "scupperPlug"),
    collectionContainer: step3Equipment("collectionContainer", "collection"),
    dispersant: step3Equipment("dispersant", "dispersant"),
    ppeSet: step3Equipment("ppeSet", "ppe"),
    toolkit: step3Equipment("toolkit", "toolkit"),
};

export const SOPEP_STEP3_ASSET_KEYS = {
    background: "sopep3.bg.mainDeckPrep",
    equipment: STEP3_EQUIPMENT,
} as const;

export const SOPEP_STEP3_ASSETS: Array<[string, string]> = [
    [SOPEP_STEP3_ASSET_KEYS.background, "assets/soped/simulator/3/background/sopep.bg.mainDeck_prep.png"],
    ...Object.values(STEP3_EQUIPMENT).flatMap((item) => item.files),
];

/** Assets audited from `assets/soped/simulator/4`. The background is a full
 * composite of the controlled deck; the panels and callouts are rebuilt as live
 * UI, so the baked `ui/info*` and `ui/panel*` PNGs are intentionally not loaded. */
export const SOPEP_STEP4_ASSET_KEYS = {
    background: "sopep4.bg.mainDeckControl",
    drainCover: "sopep4.eq.drainCover",
    hotspot: "sopep4.ui.hotspot",
    hotspotActive: "sopep4.ui.hotspotActive",
    hotspotPulse: "sopep4.ui.hotspotPulse",
} as const;

export const SOPEP_STEP4_ASSETS: Array<[string, string]> = [
    [SOPEP_STEP4_ASSET_KEYS.background, "assets/soped/simulator/4/background/sopep.bg.mainDeck_control.png"],
    [SOPEP_STEP4_ASSET_KEYS.drainCover, "assets/soped/simulator/4/equipment/sopep.eq.drainCover.png"],
    [SOPEP_STEP4_ASSET_KEYS.hotspot, "assets/soped/simulator/4/ui/sopep.ui.hotspot.png"],
    [SOPEP_STEP4_ASSET_KEYS.hotspotActive, "assets/soped/simulator/4/ui/sopep.ui.hotspotActive.png"],
    [SOPEP_STEP4_ASSET_KEYS.hotspotPulse, "assets/soped/simulator/4/ui/sopep.ui.hotspotPulse.png"],
];

/** Assets audited from `assets/soped/simulator/5`. Panels, buttons and the
 * breadcrumb/progress PNGs are baked UI, so they are rebuilt live; only the
 * icons, check marks and the three dummy documentation photo cards are used. */
export const SOPEP_STEP5_ASSET_KEYS = {
    iconAttachment: "sopep5.icon.attachment",
    iconCalendar: "sopep5.icon.calendar",
    iconClock: "sopep5.icon.clock",
    iconDescription: "sopep5.icon.description",
    iconDocument: "sopep5.icon.document",
    iconIncident: "sopep5.icon.incident",
    iconLocation: "sopep5.icon.location",
    iconReport: "sopep5.icon.report",
    checkDone: "sopep5.ui.checkDone",
    checkEmpty: "sopep5.ui.checkEmpty",
    fileCards: ["sopep5.ui.fileCard_1", "sopep5.ui.fileCard_2", "sopep5.ui.fileCard_3"],
} as const;

const S5 = SOPEP_STEP5_ASSET_KEYS;
export const SOPEP_STEP5_ASSETS: Array<[string, string]> = [
    [S5.iconAttachment, "assets/soped/simulator/5/icons/sopep.icon.attachment.png"],
    [S5.iconCalendar, "assets/soped/simulator/5/icons/sopep.icon.calendar.png"],
    [S5.iconClock, "assets/soped/simulator/5/icons/sopep.icon.clock.png"],
    [S5.iconDescription, "assets/soped/simulator/5/icons/sopep.icon.description.png"],
    [S5.iconDocument, "assets/soped/simulator/5/icons/sopep.icon.document.png"],
    [S5.iconIncident, "assets/soped/simulator/5/icons/sopep.icon.incident.png"],
    [S5.iconLocation, "assets/soped/simulator/5/icons/sopep.icon.location.png"],
    [S5.iconReport, "assets/soped/simulator/5/icons/sopep.icon.report.png"],
    [S5.checkDone, "assets/soped/simulator/5/ui/sopep.ui.checkDone.png"],
    [S5.checkEmpty, "assets/soped/simulator/5/ui/sopep.ui.checkEmpty.png"],
    ...S5.fileCards.map((key, index): [string, string] => [key, `assets/soped/simulator/5/ui/sopep.ui.fileCard_${index + 1}.png`]),
];
