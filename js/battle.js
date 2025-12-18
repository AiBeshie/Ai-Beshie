let attackInProgress = false;

// ------------------ PLAYER INIT ------------------
function initPlayer() {
  if (!window.player) {
    window.player = {
      level: 1,
      exp: 0,
      coins: 50,
      stardust: 500,
      party: [],
      items: {},
      activeIndex: 0
    };
  } else if (window.player.activeIndex == null || window.player.activeIndex >= window.player.party.length) {
    window.player.activeIndex = 0;
  }

  // Initialize Pokémon EXP and battle stats for party
  window.player.party.forEach(poke => {
    poke.exp = poke.exp || 0;
    poke.expToNext = getPokemonExpToNext(poke.level || 1);
    ensureBattleStats(poke);
  });
}

// ------------------ EXP FUNCTIONS ------------------
function expToLevel(level) {
  return 5 + level * level * 5; // quadratic growth
}

function getPokemonExpToNext(level) {
  return expToLevel(level);
}

// ------------------ ENSURE BATTLE STATS ------------------
// ------------------ ENSURE BATTLE STATS (SAFE) ------------------
function ensureBattleStats(pokemon) {
  if (!pokemon.staTotal) applyTalentModifiers(pokemon); // ensures staTotal is set

  // Only set maxHP if not defined, don't overwrite currentHP
  if (pokemon.maxHP == null) pokemon.maxHP = Math.floor(pokemon.staTotal * 2);
  if (pokemon.currentHP == null) pokemon.currentHP = pokemon.maxHP; // first init only

  // ENERGY
  if (pokemon.max_energy == null) pokemon.max_energy = 100;
  if (pokemon.currentEnergy == null) pokemon.currentEnergy = 0; // start at 0

  if (pokemon.current_cp == null) calculateCP(pokemon);
}


// ------------------ SYNC HP ------------------
function syncCurrentHP(pokemon) {
  const playerHPBar = document.getElementById("playerHPBar");
  const enemyHPBar = document.getElementById("enemyHPBar");
  const playerHPText = document.getElementById("playerHP");
  const playerHPMax = document.getElementById("playerHPMax");
  const enemyHPText = document.getElementById("enemyHP");
  const enemyHPMax = document.getElementById("enemyHPMax");

  if (!pokemon) return;

  const pctHP = Math.max(0.01, (pokemon.currentHP / pokemon.maxHP) * 100); // min 1% to show bar
  if (pokemon.isPlayer && playerHPBar) {
    playerHPBar.style.width = pctHP + "%";
    playerHPBar.className = "hp-bar-inner " + (pctHP > 50 ? "hp-green" : pctHP > 20 ? "hp-yellow" : "hp-red");
    if (playerHPText) playerHPText.textContent = pokemon.currentHP;
    if (playerHPMax) playerHPMax.textContent = pokemon.maxHP;
  } else if (!pokemon.isPlayer && enemyHPBar) {
    enemyHPBar.style.width = pctHP + "%";
    enemyHPBar.className = "hp-bar-inner " + (pctHP > 50 ? "hp-green" : pctHP > 20 ? "hp-yellow" : "hp-red");
    if (enemyHPText) enemyHPText.textContent = pokemon.currentHP;
    if (enemyHPMax) enemyHPMax.textContent = pokemon.maxHP;
  }
}

// ------------------ CLEAR SPRITE ------------------
function clearSprite(isPlayer, name = "") {
  const spriteImg = document.getElementById(isPlayer ? "playerSprite" : "wildSprite");
  if (!spriteImg) return;

  spriteImg.src = "";
  spriteImg.alt = "";
  spriteImg.className = "";

  const elements = {
    nameEl: document.getElementById(isPlayer ? "activeName" : "wildName"),
    levelEl: document.getElementById(isPlayer ? "activeLevel" : "wildLevel"),
    hpEl: document.getElementById(isPlayer ? "playerHP" : "enemyHP"),
    hpMaxEl: document.getElementById(isPlayer ? "playerHPMax" : "enemyHPMax"),
    cpEl: document.getElementById(isPlayer ? "playerCP" : "wildCP"),
    hpBarInner: document.getElementById(isPlayer ? "playerHPBar" : "enemyHPBar"),
    energyBar: document.getElementById(isPlayer ? "playerEnergyBar" : "enemyEnergyBar"),
    energyText: document.getElementById(isPlayer ? "playerEnergy" : "enemyEnergy"),
    maxEnergyText: document.getElementById(isPlayer ? "playerMaxEnergy" : "enemyMaxEnergy")
  };

  if (elements.nameEl) elements.nameEl.textContent = name;
  if (elements.levelEl) elements.levelEl.textContent = "";
  if (elements.hpEl) elements.hpEl.textContent = "";
  if (elements.hpMaxEl) elements.hpMaxEl.textContent = "";
  if (elements.cpEl) elements.cpEl.textContent = "";
  if (elements.hpBarInner) {
    elements.hpBarInner.style.width = "0%";
    elements.hpBarInner.className = "hp-bar-inner hp-red";
  }
  if (elements.energyBar) elements.energyBar.style.width = "0%";
  if (elements.energyText) elements.energyText.textContent = "";
  if (elements.maxEnergyText) elements.maxEnergyText.textContent = "";
}

// ================= HP BAR UPDATE =================
function updateHPBar(isPlayer, currentHP, maxHP) {
  const hpBar = document.getElementById(isPlayer ? "playerHPBar" : "enemyHPBar");
  const hpText = document.getElementById(isPlayer ? "playerHP" : "enemyHP");
  const hpMaxText = document.getElementById(isPlayer ? "playerHPMax" : "enemyHPMax");

  if (!hpBar || !hpText || !hpMaxText) return;

  const pct = Math.max(0, Math.min(1, currentHP / maxHP)) * 100;
  hpBar.style.width = pct + "%";

  // Color based on HP %
  if (pct > 50) hpBar.className = "hp-bar-inner hp-green";
  else if (pct > 20) hpBar.className = "hp-bar-inner hp-yellow";
  else hpBar.className = "hp-bar-inner hp-red";

  // Update labels outside the bar
  hpText.textContent = currentHP;
  hpMaxText.textContent = maxHP;
}

// ------------------ UPDATE BATTLE SCREEN ------------------
function updateBattleScreen(pokemon, isPlayer = true) {
  if (!pokemon) {
    clearSprite(isPlayer, isPlayer ? "No Pokémon" : "No Wild Pokémon");
    return;
  }

  ensureBattleStats(pokemon);

  const spriteImg = document.getElementById(isPlayer ? "playerSprite" : "wildSprite");
  const nameEl = document.getElementById(isPlayer ? "activeName" : "wildName");
  const levelEl = document.getElementById(isPlayer ? "activeLevel" : "wildLevel");
  const cpEl = document.getElementById(isPlayer ? "playerCP" : "wildCP");
  const energyBar = document.getElementById(isPlayer ? "playerEnergyBar" : "enemyEnergyBar");

  if (isPlayer) resetPlayerSpritePosition();
  else resetWildSpritePosition();

  // -------- HP BAR & LABEL --------
  updateHPBar(isPlayer, pokemon.currentHP, pokemon.maxHP);

  // -------- ENERGY BAR --------
  const maxEnergy = pokemon.max_energy || 100;
  const currentEnergy = Math.max(0, Math.min(pokemon.currentEnergy, maxEnergy));
  const pctEnergy = (currentEnergy / maxEnergy) * 100;
  const energyBarEl = energyBar;
  if (energyBarEl) {
    energyBarEl.style.width = pctEnergy + "%";
    energyBarEl.textContent = ""; // no label inside
  }

  // -------- SPRITE --------
  if (spriteImg) {
    spriteImg.src = getPokemonSprite(pokemon.pokemon_id, pokemon.shiny);
    spriteImg.className = "";
    if (pokemon.shiny && pokemon.currentHP > 0) spriteImg.classList.add("shiny", "glow", "starburst");
    if (pokemon.currentHP <= 0) spriteImg.classList.add("fainted", "fainted-animate");
  }

  // -------- NAME, LEVEL, CP --------
  if (nameEl) nameEl.textContent = pokemon.shiny ? `✨ ${pokemon.pokemon_name}` : pokemon.pokemon_name;
  if (levelEl) levelEl.textContent = pokemon.level || 1;
  if (cpEl) cpEl.textContent = `CP: ${pokemon.current_cp || 0}`;

  // -------- PLAYER MOVES --------
  if (isPlayer) {
    const allMoves = [...(pokemon.fast_moves || []), ...(pokemon.charged_moves || [])];
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`move${i}`);
      if (!btn) continue;

      const moveName = allMoves[i];
      if (!moveName) {
        btn.textContent = "—";
        btn.disabled = true;
        continue;
      }

      const moveData = window.movesDB.find(m => m.name === moveName);
      if (moveData) {
        btn.textContent = moveData.category === "Fast"
          ? `${moveData.name} (+${moveData.energyGain})`
          : `${moveData.name} (-${moveData.energy})`;
        btn.disabled = (moveData.category === "Charge" && currentEnergy < moveData.energy) || pokemon.currentHP <= 0;
      } else {
        btn.textContent = moveName;
        btn.disabled = pokemon.currentHP <= 0;
      }
    }
  }
}


// ------------------ DEAL DAMAGE / HEAL ------------------
function dealDamage(target, dmg) {
  if (!target) return;
  target.currentHP = Math.max(0, target.currentHP - dmg);
  updateBattleScreen(target, target.isPlayer);
}

function healPokemon(target, amount) {
  if (!target) return;
  target.currentHP = Math.min(target.maxHP, target.currentHP + amount);
  updateBattleScreen(target, target.isPlayer);
}s


// ------------------ PLAYER & WILD TURN ------------------
// Wild encounter
function encounterWild() {
  resetWildSpritePosition(); 
  const player = window.player.party[window.player.activeIndex];
  if (!player) return;
  const route = window.currentRoute;
  if (!route || !route.wildPokemon?.length) return;

  let rand = Math.random();
  let chosen = route.wildPokemon[0];
  for (let i = 0; i < route.wildPokemon.length; i++) {
    if (rand < route.wildPokemon[i].rate) {
      chosen = route.wildPokemon[i];
      break;
    }
    rand -= route.wildPokemon[i].rate;
  }

  const base = window.pokemonDB.find(p => p.pokemon_name === chosen.name);
  if (!base) return;

  const [lvlMin, lvlMax] = route.levelRange || [1, 1];
  const level = Math.floor(Math.random() * (lvlMax - lvlMin + 1)) + lvlMin;
  const ivs = generateIVs();
  const isShiny = Math.random() < 0.05;

  const wild = {
    ...base,
    level,
    ivs,
    currentEnergy: 0,
    max_energy: 100,
    fast_moves: base.fast_moves || [],
    charged_moves: base.charged_moves || [],
    shiny: isShiny,
    talents: [],
  };

  assignTalents(wild);
  applyTalentModifiers(wild);

  wild.maxHP = Math.floor(wild.staTotal * 2);
  wild.currentHP = wild.maxHP;

  calculateCP(wild);
  wild.exp = wild.exp || 0;
  wild.expToNext = getPokemonExpToNext(wild.level);

  window.currentWild = wild;

  updateBattleScreen(player, true);
  updateBattleScreen(wild, false);
  renderParty();
  appendBattleLog(`A wild ${isShiny ? "✨ " : ""}${wild.pokemon_name} appeared!`);
}

// ------------------ ANIMATE ATTACK ------------------
function animateAttack(attackerId, targetId, move, callback) {
  if (attackInProgress) return;
  attackInProgress = true;

  const attacker = document.getElementById(attackerId);
  const target = document.getElementById(targetId);
  const gbaScreen = document.getElementById("gbaScreen");
  if (!attacker || !target || !gbaScreen) {
    attackInProgress = false;
    if (callback) callback();
    return;
  }

  const deltaX = target.offsetLeft - attacker.offsetLeft;
  const deltaY = target.offsetTop - attacker.offsetTop;

  try {
    if (move.category === "Fast") {
      const moveX = deltaX * 0.3;
      const moveY = deltaY * 0.3;
      const duration = 200;

      attacker.style.transition = `transform ${duration/1000}s ease-out`;
      attacker.style.transform = `translate(${moveX}px, ${moveY}px)`;

      setTimeout(() => {
        attacker.style.transform = `translate(0,0)`;
        target.classList.add("hit-shake");
        setTimeout(() => target.classList.remove("hit-shake"), 200);

        attackInProgress = false;
        if (callback) callback();
      }, duration);
      return;
    }

    // Charge attack
    const trail = document.createElement("div");
    trail.style.position = "absolute";
    trail.style.width = "60px";
    trail.style.height = "20px";
    trail.style.background = "linear-gradient(90deg, rgba(255,255,0,0.8), rgba(255,0,0,0.8))";
    trail.style.borderRadius = "10px";
    trail.style.left = attacker.offsetLeft + attacker.offsetWidth / 2 + "px";
    trail.style.top = attacker.offsetTop + attacker.offsetHeight / 2 - 10 + "px";
    trail.style.pointerEvents = "none";
    trail.style.zIndex = "999";
    gbaScreen.appendChild(trail);

    const duration = 500;

    attacker.style.transition = `transform ${duration/1000}s ease-out`;
    attacker.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.2)`;

    trail.animate([
      { transform: `translate(0px,0px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${deltaX}px, ${deltaY}px) rotate(30deg)`, opacity: 0.7 }
    ], { duration, easing: "ease-out" });

    setTimeout(() => {
      target.classList.add("hit-shake", "hit-flash");
      setTimeout(() => {
        target.classList.remove("hit-shake", "hit-flash");
      }, 300);

      gbaScreen.classList.add("screen-shake");
      setTimeout(() => gbaScreen.classList.remove("screen-shake"), 300);

      attacker.style.transform = `translate(0,0) scale(1)`;
      trail.remove();

      attackInProgress = false;
      if (callback) callback();
    }, duration);

  } catch(e) {
    console.error("Attack error:", e);
    attackInProgress = false;
    if (callback) callback();
  }
}




// ==================== PLAYER TURN ====================
function playerTurn(action, options = {}) {
  const active = window.player.party[window.player.activeIndex];
  const wild = window.currentWild;
  if (!active) return;

  if (action === "attack" && wild) {
    const allMoves = [...(active.fast_moves || []), ...(active.charged_moves || [])];
    const moveName = allMoves[options.moveIndex];
    if (!moveName) return;

    const move = window.movesDB.find(m => m.name === moveName);
    if (!move) return;
    if (move.category === "Charge" && (active.currentEnergy || 0) < move.energy) return;

    animateAttack("playerSprite", "wildSprite", move, () => {
      const result = calculateDamage(active, wild, moveName);
      wild.currentHP = Math.max(0, wild.currentHP - result.damage);
      applyMoveEnergy(active, move);

      updateBattleScreen(active, true);
      updateBattleScreen(wild, false);
      appendBattleLog(`${active.pokemon_name} used ${moveName}! ${result.log}`, "player");

      if (wild.currentHP <= 0) {
        appendBattleLog(`${wild.pokemon_name} fainted!`, "player");
        wild.currentEnergy = 0;

        const baseExp = 10 + wild.level * 2;
        const playerExp = Math.floor(baseExp * 0.5);
        const pokemonExp = baseExp;

        window.player.exp = (window.player.exp || 0) + playerExp;
        appendBattleLog(`You gained ${playerExp} EXP!`, "player");
        checkPlayerLevelUp();
        levelUpPokemon(active, pokemonExp);

        const coins = Math.floor(Math.random() * 10 + 5);
        window.player.coins += coins;
        appendBattleLog(`You got ${coins} coins!`, "player");

        setTimeout(() => clearSprite(false, "No Wild Pokémon"), 900);
        window.currentWild = null;
        return;
      }

      setTimeout(wildTurn, 500);
    });
  }

  if (action === "flee" && wild) {
    appendBattleLog(`You fled from the wild ${wild.pokemon_name}!`, "player");
    setTimeout(() => clearSprite(false, "No Wild Pokémon"), 300);
    window.currentWild = null;
  }
}

// ==================== WILD TURN ====================
function wildTurn() {
  const active = window.player.party[window.player.activeIndex];
  const wild = window.currentWild;
  if (!active || !wild) return;

  const allMoves = [...(wild.fast_moves || []), ...(wild.charged_moves || [])];
  if (!allMoves.length) return;

  let moveName = allMoves[Math.floor(Math.random() * allMoves.length)];
  let move = window.movesDB.find(m => m.name === moveName);

  if (move?.category === "Charge" && (wild.currentEnergy || 0) < move.energy) {
    moveName = wild.fast_moves[Math.floor(Math.random() * wild.fast_moves.length)] || moveName;
    move = window.movesDB.find(m => m.name === moveName);
  }
  if (!move) return;

  animateAttack("wildSprite", "playerSprite", move, () => {
    const result = calculateDamage(wild, active, moveName);
    active.currentHP = Math.max(0, active.currentHP - result.damage);
    applyMoveEnergy(wild, move);

    updateBattleScreen(active, true);
    updateBattleScreen(wild, false);
    appendBattleLog(`${wild.pokemon_name} used ${moveName}! ${result.log}`, "wild");

    if (active.currentHP <= 0) {
      appendBattleLog(`${active.pokemon_name} fainted!`, "wild");
      active.currentEnergy = 0;
      setTimeout(() => clearSprite(true, "No Pokémon"), 900);

      const nextIndex = window.player.party.findIndex(p => p.currentHP > 0);
      if (nextIndex >= 0) {
        window.player.activeIndex = nextIndex;
        updateBattleScreen(window.player.party[nextIndex], true);
        appendBattleLog(`${window.player.party[nextIndex].pokemon_name} is now your active Pokémon!`, "player");
      }
    }
  });
}




function resetSpritePosition(spriteId, mode = "auto", mobilePos, pcPos) {
  const sprite = document.getElementById(spriteId);
  if (!sprite) return;

  // Reset classes & styles
  sprite.className = "";
  sprite.style.transition = "none";
  sprite.style.position = "absolute";
  sprite.style.opacity = "1";
  sprite.style.zIndex = "5";

  // Detect file if auto
  if (mode === "auto") {
    const path = window.location.pathname;
    mode = path.includes("index-m") ? "mobile" : "pc";
  }

  // Choose position & scale
  const pos = mode === "mobile" ? mobilePos : pcPos;

  const flip = pos.flip ? -1 : 1; // flip horizontally if pos.flip is true

  sprite.style.top = pos.top;
  sprite.style.left = pos.left;
  sprite.style.transform = `translate(-50%, 0) scaleX(${flip}) scale(${pos.scale}) rotate(0deg)`;

  // Apply smooth transition after positioning
  requestAnimationFrame(() => {
    sprite.style.transition = "transform 0.5s ease, opacity 0.5s ease";
  });
}

// Usage for wild sprite (facing right by default)
function resetWildSpritePosition(mode = "auto") {
  resetSpritePosition("wildSprite", mode, 
    { top: "2%", left: "82%", scale: 1.8, flip: false },   // mobile
    { top: "10px", left: "165%", scale: 1, flip: false }   // PC
  );
}

// Usage for player sprite (facing left)
function resetPlayerSpritePosition(mode = "auto") {
  resetSpritePosition("playerSprite", mode, 
    { top: "60%", left: "18%", scale: 1.8, flip: true },  // mobile
    { top: "10px", left: "20%", scale: 1, flip: true }    // PC
  );
}


// ------------------ APPEND LOG ------------------
function appendBattleLog(message, source = "player") {
  const logBox = document.getElementById("battleMessage");
  if (!logBox) return;

  const entry = document.createElement("div");
  const color = source === "player" ? "green" : source === "wild" ? "red" : "white";
  entry.innerHTML = `<span style="color:${color}">${message}</span>`;
  logBox.appendChild(entry);
  logBox.scrollTop = logBox.scrollHeight;
}

// ------------------ LEVEL UP HELPERS ------------------
function checkPlayerLevelUp() {
  while (window.player.exp >= expToLevel(window.player.level)) {
    window.player.exp -= expToLevel(window.player.level);
    window.player.level++;
    appendBattleLog(`Player leveled up! Now Lv ${window.player.level}`, "player");
    document.getElementById("playerDisplay").textContent =
      `Lv: ${window.player.level} | EXP: ${window.player.exp} | Coins: ${window.player.coins}`;
  }
}



// ================= INITIALIZE HP =================
// Call this after your player/enemy Pokémon are set
function initBattleHP() {
  const player = window.player?.party[window.player.activeIndex];
  const enemy = window.currentEnemy;

  if (player) {
    if (player.currentHP == null) player.currentHP = player.maxHP;
    updateHPBar(true, player.currentHP, player.maxHP);
  }

  if (enemy) {
    if (enemy.currentHP == null) enemy.currentHP = enemy.maxHP;
    updateHPBar(false, enemy.currentHP, enemy.maxHP);
  }
}

// ================= EXAMPLE USAGE =================
// After loading a wild encounter or starting a battle:
initBattleHP();

// ================= HP DURING BATTLE =================
// When player/enemy takes damage:
function dealDamage(isPlayer, dmg) {
  const target = isPlayer ? window.player.party[window.player.activeIndex] : window.currentEnemy;
  if (!target) return;

  target.currentHP = Math.max(0, target.currentHP - dmg);
  updateHPBar(isPlayer, target.currentHP, target.maxHP);
}

// When healing:
function healPokemon(isPlayer, amount) {
  const target = isPlayer ? window.player.party[window.player.activeIndex] : window.currentEnemy;
  if (!target) return;

  target.currentHP = Math.min(target.maxHP, target.currentHP + amount);
  updateHPBar(isPlayer, target.currentHP, target.maxHP);
}


function levelUpPokemon(pokemon, expGain) {
  pokemon.exp = (pokemon.exp || 0) + expGain;
  if (!pokemon.expToNext) pokemon.expToNext = getPokemonExpToNext(pokemon.level);

  while (pokemon.exp >= pokemon.expToNext) {
    pokemon.exp -= pokemon.expToNext;
    pokemon.level++;
    pokemon.expToNext = getPokemonExpToNext(pokemon.level);
    appendBattleLog(`${pokemon.pokemon_name} leveled up! Now Lv ${pokemon.level}`, "player");

    applyTalentModifiers(pokemon);
    calculateCP(pokemon);
    syncCurrentHP(pokemon);
    updateBattleScreen(pokemon, true);
  }
}
