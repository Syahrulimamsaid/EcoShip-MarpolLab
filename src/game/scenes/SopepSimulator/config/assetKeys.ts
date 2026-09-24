/** Central asset map for the SOPEP simulator. Step modules only refer to the
 * keys below; file paths stay confined to the preloader. */
export const SOPEP_ASSET_KEYS = {
    background: "sopep.bg.mainDeck",
    pipeLeak: "sopep.env.pipeLeak",
    scupper: "sopep.env.scupper",
    fuelDrum: "sopep.env.fuelDrum",
    lifebuoy: "sopep.env.lifebuoy",
    spillMedium: "sopep.spill.medium",
    hotspot: "sopep.ui.hotspot",
    hotspotPulse: "sopep.ui.hotspotPulse",
    hotspotActive: "sopep.ui.hotspotActive",
    hotspotChecked: "sopep.ui.hotspotChecked",
    statusUnchecked: "sopep.ui.statusUnchecked",
    statusChecked: "sopep.ui.statusChecked",
    badgeLocation: "sopep.ui.badgeLokasi",
    badgeIncident: "sopep.ui.badgeInsiden",
    badgeStatus: "sopep.ui.badgeStatus",
} as const;

export const SOPEP_STEP1_ASSETS: Array<[string, string]> = [
    [SOPEP_ASSET_KEYS.background, "assets/soped/simulator/1/background/sopep.bg.mainDeck.png"],
    [SOPEP_ASSET_KEYS.pipeLeak, "assets/soped/simulator/1/deck/sopep.env.pipeLeak.png"],
    [SOPEP_ASSET_KEYS.scupper, "assets/soped/simulator/1/deck/sopep.env.scupper.png"],
    [SOPEP_ASSET_KEYS.fuelDrum, "assets/soped/simulator/1/deck/sopep.env.fuelDrum.png"],
    [SOPEP_ASSET_KEYS.lifebuoy, "assets/soped/simulator/1/deck/sopep.env.lifebuoy.png"],
    [SOPEP_ASSET_KEYS.spillMedium, "assets/soped/simulator/1/spill/sopep.spill.medium.png"],
    [SOPEP_ASSET_KEYS.hotspot, "assets/soped/simulator/1/ui/sopep.ui.hotspot.png"],
    [SOPEP_ASSET_KEYS.hotspotPulse, "assets/soped/simulator/1/ui/sopep.ui.hotspotPulse.png"],
    [SOPEP_ASSET_KEYS.hotspotActive, "assets/soped/simulator/1/ui/sopep.ui.hotspotActive.png"],
    [SOPEP_ASSET_KEYS.hotspotChecked, "assets/soped/simulator/1/ui/sopep.ui.checklistDone.png"],
    [SOPEP_ASSET_KEYS.statusUnchecked, "assets/soped/simulator/1/ui/sopep.ui.checklistEmpty.png"],
    [SOPEP_ASSET_KEYS.statusChecked, "assets/soped/simulator/1/ui/sopep.ui.checklistDone.png"],
    [SOPEP_ASSET_KEYS.badgeLocation, "assets/soped/simulator/1/ui/sopep.ui.badgeLokasi.png"],
    [SOPEP_ASSET_KEYS.badgeIncident, "assets/soped/simulator/1/ui/sopep.ui.badgeInsiden.png"],
    [SOPEP_ASSET_KEYS.badgeStatus, "assets/soped/simulator/1/ui/sopep.ui.badgeStatus.png"],
];

/** Assets audited from `assets/soped/simulator/2`. */
export const SOPEP_STEP2_ASSET_KEYS = {
    background: "sopep2.bg.bridgeRadio",
    officer: "sopep2.char.officerRadio",
    vhfRadio: "sopep2.eq.vhfRadio",
    radioMic: "sopep2.eq.radioMic",
    map: "sopep2.ui.mapPosition",
    shipMarker: "sopep2.icon.shipMarker",
    positionMarker: "sopep2.icon.positionMarker",
    compass: "sopep2.prop.compass",
    badgeMayday: "sopep2.ui.badgeMayday",
    iconCalendar: "sopep2.icon.calendar",
    iconLocation: "sopep2.icon.location",
    iconIncident: "sopep2.icon.incident",
    iconQuantity: "sopep2.icon.quantity",
    iconCause: "sopep2.icon.cause",
    iconAction: "sopep2.icon.action",
    iconAssistance: "sopep2.icon.assistance",
    iconAdditional: "sopep2.icon.additional",
} as const;

export const SOPEP_STEP2_ASSETS: Array<[string, string]> = [
    [SOPEP_STEP2_ASSET_KEYS.background, "assets/soped/simulator/2/background/sopep.bg.bridge_radio.png"],
    [SOPEP_STEP2_ASSET_KEYS.officer, "assets/soped/simulator/2/character/sopep.char.officer_radio.png"],
    [SOPEP_STEP2_ASSET_KEYS.vhfRadio, "assets/soped/simulator/2/equipment/sopep.eq.vhf_radio.png"],
    [SOPEP_STEP2_ASSET_KEYS.radioMic, "assets/soped/simulator/2/equipment/sopep.eq.radio_mic.png"],
    [SOPEP_STEP2_ASSET_KEYS.map, "assets/soped/simulator/2/ui/sopep.ui.map_position.png"],
    [SOPEP_STEP2_ASSET_KEYS.shipMarker, "assets/soped/simulator/2/icons/sopep.icon.ship_marker.png"],
    [SOPEP_STEP2_ASSET_KEYS.positionMarker, "assets/soped/simulator/2/icons/sopep.icon.position_marker.png"],
    [SOPEP_STEP2_ASSET_KEYS.compass, "assets/soped/simulator/2/props/sopep.prop.compass.png"],
    [SOPEP_STEP2_ASSET_KEYS.badgeMayday, "assets/soped/simulator/2/ui/sopep.ui.badge_mayday.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconCalendar, "assets/soped/simulator/2/icons/sopep.icon.calendar.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconLocation, "assets/soped/simulator/2/icons/sopep.icon.location.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconIncident, "assets/soped/simulator/2/icons/sopep.icon.incident.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconQuantity, "assets/soped/simulator/2/icons/sopep.icon.quantity.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconCause, "assets/soped/simulator/2/icons/sopep.icon.cause.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconAction, "assets/soped/simulator/2/icons/sopep.icon.action.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconAssistance, "assets/soped/simulator/2/icons/sopep.icon.assistance.png"],
    [SOPEP_STEP2_ASSET_KEYS.iconAdditional, "assets/soped/simulator/2/icons/sopep.icon.additional.png"],
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
