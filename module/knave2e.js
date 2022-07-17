// Import Modules
import { Knave2eActor } from "./actor/actor.js";
import { Knave2eActorSheet } from "./actor/actor-sheet.js";
import { Knave2eHirelingSheet } from "./actor/hireling-sheet.js";
import { Knave2eCreatureSheet } from "./actor/creature-sheet.js";
import { Knave2eStorageSheet } from "./actor/storage-sheet.js";

import { Knave2eItem } from "./item/item.js";
import { Knave2eItemSheet } from "./item/item-sheet.js";

import {
  registerSettings
} from "./settings.js";

Hooks.once('init', async function () {

  game.knave2e = {
    Knave2eActor,
    Knave2eItem,
    rollItemMacro,
    rollStatMacro
  };

  registerSettings();


  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d100",
    decimals: 2
  };

  // Define custom Entity classes
  CONFIG.Actor.documentClass = Knave2eActor;
  CONFIG.Item.documentClass = Knave2eItem;


  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);

  Actors.registerSheet("knave2e", Knave2eActorSheet, {
    types: ['character'],
    makeDefault: true
  });
  Actors.registerSheet("knave2e", Knave2eHirelingSheet, {
    types: ['hireling'],
    makeDefault: false
  });
  Actors.registerSheet("knave2e", Knave2eCreatureSheet, {
    types: ['creature'],
    makeDefault: false
  });
  Actors.registerSheet("knave2e", Knave2eStorageSheet, {
    types: ['storage'],
    makeDefault: false
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("knave2e", Knave2eItemSheet, { makeDefault: true });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function () {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase();
  });

  CONFIG.Combat.initiative = {
    formula: "-1d20+@stats.dexterity.value",
    decimals: 2
  };

  // preloadHandlebarsTemplates();
});

/**
 * Set default values for new actors' tokens
 */
 Hooks.on("preCreateActor", (document, createData, options, userId) => {
  let disposition = CONST.TOKEN_DISPOSITIONS.NEUTRAL;

  if (createData.type == "creature") {
    disposition = CONST.TOKEN_DISPOSITIONS.HOSTILE
  }

  // Set wounds, advantage, and display name visibility
  mergeObject(createData,
    {
      "token.bar1": { "attribute": "health" },        // Default Bar 1 to Health 
      "token.bar2": { "stat": "strength" },      // Default Bar 2 to Insanity
      "token.displayName": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,     // Default display name to be on owner hover
      "token.displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,     // Default display bars to be on owner hover
      "token.disposition": disposition,                               // Default disposition to neutral
      "token.name": createData.name                                   // Set token name to actor name
    })


  if (createData.type == "character") {
    createData.token.vision = true;
    createData.token.actorLink = true;
  }
})

// async function preloadHandlebarsTemplates() {
//   const templatePaths = [
//       "systems/knave2e/templates/item/item-card.html"
//   ];
//   return loadTemplates(templatePaths);
// }


Hooks.once("ready", async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createKnave2eMacro(data, slot));
});



/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createKnave2eMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  let command = `game.knave2e.rollItemMacro("${item.name}");`;


  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: {
        "knave2e.itemMacro": true
      }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}


/**
 * Roll Macro from a Weapon.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  return actor.rollItem(item.id);
}


/**
 * Roll Stat.
 * @param {string} statName
 * @return {Promise}
 */
function rollStatMacro() {
  var selected = canvas.tokens.controlled;
  const speaker = ChatMessage.getSpeaker();

  if (selected.length == 0) {
    selected = game.actors.tokens[speaker.token];
  }

  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const stat = actor ? Object.entries(actor.data.data.stats) : null;


  // if (stat == null) {
  //   ui.notifications.info("Stat not found on token");
  //   return;
  // }


  return actor.rollStatSelect(stat);
}