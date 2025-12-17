// ------------------ PLAYER ITEMS INIT ------------------
if (!window.player.items) window.player.items = {};

const defaultItems = {
  berries:  { razz:5, nanab:3, pinap:2, silver:1, golden:0 },
  balls:    { pokeball:10, greatball:5, ultraball:2, masterball:0 },
  stones:   { fire:1, water:0, leaf:1, thunder:0, moon:0, sun:0 },
  evolveItems: {
    rareCandy:3,
    kingsRock:1,
    metalCoat:0,
    dragonScale:0,
    upgrade:0,
    sinnohStone:0,
    unovaStone:0
  }
};
const itemColors = {
  berries: '#FF6384',     // pinkish
  balls: '#36A2EB',       // blue
  stones: '#FFCE56',      // yellow
  evolveItems: '#9CCC65'  // green
};

// Merge defaults with existing items
for (let group in defaultItems) {
  if (!window.player.items[group]) window.player.items[group] = {};
  Object.keys(defaultItems[group]).forEach(item => {
    if (window.player.items[group][item] === undefined) {
      window.player.items[group][item] = defaultItems[group][item];
    }
  });
}

// ------------------ PLAYER UI UPDATE ------------------
function safeUpdatePlayerDisplay() {
  if (typeof updatePlayerDisplay === "function") return updatePlayerDisplay();

  const pd = document.getElementById("playerDisplay");
  if (pd) {
    pd.textContent = `Lv: ${window.player.level} | Coins: ${window.player.coins} | Stardust: ${window.player.stardust}`;
  }
}

let activeBagCategory = null; // currently selected category

function renderBagItems() {
  const bagArea = document.getElementById('itemsDisplay');
  if (!bagArea) return;

  const categoryContainer = document.getElementById('itemCategories');
  if (!categoryContainer) return;

  categoryContainer.innerHTML = "";

  Object.keys(window.player.items).forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'itemCategoryBtn';
    btn.textContent = type.replace(/([A-Z])/g, " $1").toUpperCase();

    if (activeBagCategory === type) {
      btn.style.background = '#ffae00';
      btn.style.color = '#000';
    } else {
      btn.style.background = itemColors[type] || '#2196F3';
      btn.style.color = '#fff';
    }

    btn.onclick = () => {
      activeBagCategory = type;
      renderBagCategoryItems(type);
      renderBagItems(); // update highlight
    };

    categoryContainer.appendChild(btn);
  });

  if (!activeBagCategory) {
    bagArea.style.display = 'none'; // hide items until category clicked
  }
}


function renderBagCategoryItems(type) {
  const area = document.getElementById('itemsDisplay');
  if (!area) return;

  const items = window.player.items[type];
  if (!items) return;

  area.innerHTML = "";
  area.style.display = 'grid'; // show items when category selected

  const grid = document.createElement('div');
  grid.className = 'item-buttons-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
  grid.style.gap = '4px';

  let hasItems = false;
  Object.keys(items).forEach(item => {
    const qty = items[item];
    if (qty <= 0) return;

    hasItems = true;
    const btn = document.createElement('button');
    btn.className = 'itemButton';
    btn.textContent = `${item} x${qty}`;
    btn.style.background = itemColors[type] || '#ccc';
    btn.style.color = '#000';
    btn.style.border = '2px solid #333';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '1px 1px 0 #555';

    btn.onclick = () => useItem(type, item);

    grid.appendChild(btn);
  });

  if (!hasItems) {
    area.textContent = "No items";
  } else {
    area.appendChild(grid);
  }
}

// ------------------ USE ITEM ------------------
function useItem(itemType, itemName, targetPokemon = null) {
  // Default to active Pokémon in the party if none provided
  if (!targetPokemon) {
    targetPokemon = window.activePokemon || window.player?.party?.[window.player.activeIndex];
  }

  if (!targetPokemon) return appendBattleLog("No Pokémon to use berry on.");

  const inv = window.player.items[itemType];
  if (!inv || inv[itemName] === undefined || inv[itemName] <= 0) {
    return alert("You don't have this item!");
  }
  switch (itemType) {
    case "berries":
      handleBerry(itemName, targetPokemon);
      break;

    case "balls":
      if (window.isCatching) return;
      if (typeof window.catchPokemon === "function") window.catchPokemon(itemName);
      else appendBattleLog(`Tried to use ${itemName}, but catch function not found.`);
      break;

    case "stones":
    case "evolveItems":
      if (itemName === "rareCandy") {
        targetPokemon.level = (targetPokemon.level || 1) + 1;
        appendBattleLog(`${targetPokemon.pokemon_name} gained +1 level! (Lv ${targetPokemon.level})`);
        if (typeof recalcPokemonStats === "function") recalcPokemonStats(targetPokemon);
        if (typeof updateBattleScreen === "function") updateBattleScreen(targetPokemon, true);
      } else {
        if (typeof evolvePokemonWithItem === "function") evolvePokemonWithItem(itemName, targetPokemon);
        else appendBattleLog(`Tried to use ${itemName}, but evolve function not found.`);
      }
      break;

    case "special":
      if (itemName === "stardust") appendBattleLog("Stardust used!");
      break;
  }

  inv[itemName]--;
  updateItemsDisplay();
  safeUpdatePlayerDisplay();
}

// ------------------ BERRY EFFECTS ------------------
function handleBerry(berry, pokemon) {
  if (!pokemon) return appendBattleLog("No Pokémon to use berry on.");

  const maxHP = (pokemon.base_stamina || 0) + (pokemon.ivs?.stamina || 0);

  switch (berry) {
    case "razz":
      pokemon.currentHP = Math.min((pokemon.currentHP || 0) + 20, maxHP);
      appendBattleLog(`${pokemon.pokemon_name} healed 20 HP!`);
      break;

    case "nanab":
      appendBattleLog("Wild Pokémon slowed down!");
      break;

    case "pinap":
      appendBattleLog("Candy reward will double!");
      break;

    case "silver":
      pokemon.currentHP = Math.min((pokemon.currentHP || 0) + 50, maxHP);
      appendBattleLog(`${pokemon.pokemon_name} healed 50 HP!`);
      break;

    case "golden":
      pokemon.currentHP = maxHP;
      appendBattleLog(`${pokemon.pokemon_name} fully healed!`);
      break;
  }

  if (typeof updateBattleScreen === "function") updateBattleScreen(pokemon, true);
}

// ------------------ SHOP ITEMS ------------------
const shopItems = [
  // Berries
  { type:"berries", name:"razz", cost:50 },
  { type:"berries", name:"nanab", cost:70 },
  { type:"berries", name:"pinap", cost:100 },
  { type:"berries", name:"silver", cost:150 },
  { type:"berries", name:"golden", cost:500 },

  // Balls
  { type:"balls", name:"pokeball", cost:100 },
  { type:"balls", name:"greatball", cost:300 },
  { type:"balls", name:"ultraball", cost:500 },
  { type:"balls", name:"masterball", cost:10000 },

  // Stones
  { type:"stones", name:"fire", cost:300 },
  { type:"stones", name:"water", cost:300 },
  { type:"stones", name:"leaf", cost:300 },
  { type:"stones", name:"thunder", cost:300 },
  { type:"stones", name:"moon", cost:300 },
  { type:"stones", name:"sun", cost:300 },

  // Evolve items
  { type:"evolveItems", name:"rareCandy", cost:1000 },
  { type:"evolveItems", name:"kingsRock", cost:500 },
  { type:"evolveItems", name:"metalCoat", cost:500 },
  { type:"evolveItems", name:"dragonScale", cost:500 },
  { type:"evolveItems", name:"upgrade", cost:500 },
  { type:"evolveItems", name:"sinnohStone", cost:800 },
  { type:"evolveItems", name:"unovaStone", cost:800 }
];

// ------------------ SHOP DISPLAY ------------------
function updateShopDisplay() {
  const shop = document.getElementById("shopItems");
  if (!shop) return;

  shop.innerHTML = "";
  const categories = {};

  shopItems.forEach(i => {
    if (!categories[i.type]) categories[i.type] = [];
    categories[i.type].push(i);
  });

  for (let type in categories) {
    const typeDiv = document.createElement("div");
    typeDiv.className = "item-category";

    const header = document.createElement("strong");
    header.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    typeDiv.appendChild(header);

    const gridDiv = document.createElement("div");
    gridDiv.className = "item-buttons-grid";

    categories[type].forEach(item => {
      const btn = document.createElement("button");
      btn.className = "shopButton";
      btn.textContent = `${item.name} - ${item.cost} coins`;
      btn.onclick = () => buyItem(item.type, item.name, item.cost);

      gridDiv.appendChild(btn);
    });

    if (gridDiv.children.length > 0) {
      typeDiv.appendChild(gridDiv);
      shop.appendChild(typeDiv);
    }
  }
}

// ------------------ BUY ITEM ------------------
function buyItem(type, name, cost) {
  if (window.player.coins < cost) return alert("Not enough coins!");

  window.player.coins -= cost;
  window.player.items[type] = window.player.items[type] || {};
  window.player.items[type][name] = (window.player.items[type][name] || 0) + 1;

  updateItemsDisplay();
  updateShopDisplay();
  safeUpdatePlayerDisplay();
}

// ------------------ HEAL ALL POKEMON ------------------
function healAllPokemon() {
  if (!window.player?.party?.length) return;

  window.player.party.forEach(poke => {
    poke.currentHP = Math.floor((poke.staTotal || 10) * 2);
    poke.currentEnergy = poke.max_energy || 100;
    if ('isFainted' in poke) poke.isFainted = false;
    if ('status' in poke) poke.status = null;
    if (typeof updateBattleScreen === "function") updateBattleScreen(poke, true);
  });

  updatePartyDisplay();
  appendBattleLog("All Pokémon have been fully healed and revived!", "player");
}

// ------------------ FALLBACK BATTLE LOG ------------------
if (typeof appendBattleLog !== "function") {
  window.appendBattleLog = function(text) {
    const msg = document.getElementById("battleMessage");
    if (!msg) return;
    msg.textContent += (msg.textContent ? "\n" : "") + text;
    msg.scrollTop = msg.scrollHeight;
  };
}

// ------------------ INIT ------------------
function initItemsModule() {
  updateItemsDisplay();
  updateShopDisplay();
  safeUpdatePlayerDisplay();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initItemsModule);
} else {
  initItemsModule();
}
