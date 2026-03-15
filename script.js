'use strict';

const dom = {
  menuScreen: document.getElementById('menuScreen'),
  gameScreen: document.getElementById('gameScreen'),
  playButton: document.getElementById('playButton'),
  openSettingsButton: document.getElementById('openSettingsButton'),
  pauseButton: document.getElementById('pauseButton'),
  settingsButtonInGame: document.getElementById('settingsButtonInGame'),
  levelUpOverlay: document.getElementById('levelUpOverlay'),
  settingsOverlay: document.getElementById('settingsOverlay'),
  pauseOverlay: document.getElementById('pauseOverlay'),
  gameOverOverlay: document.getElementById('gameOverOverlay'),
  closeSettingsButton: document.getElementById('closeSettingsButton'),
  resumeButton: document.getElementById('resumeButton'),
  pauseSettingsButton: document.getElementById('pauseSettingsButton'),
  restartButton: document.getElementById('restartButton'),
  backToMenuButton: document.getElementById('backToMenuButton'),
  controlJoystickButton: document.getElementById('controlJoystickButton'),
  controlKeyboardButton: document.getElementById('controlKeyboardButton'),
  screenshakeToggle: document.getElementById('screenshakeToggle'),
  helpersToggle: document.getElementById('helpersToggle'),
  settingsHelpBox: document.getElementById('settingsHelpBox'),
  timerText: document.getElementById('timerText'),
  levelText: document.getElementById('levelText'),
  scoreText: document.getElementById('scoreText'),
  waveText: document.getElementById('waveText'),
  healthText: document.getElementById('healthText'),
  xpText: document.getElementById('xpText'),
  healthFill: document.getElementById('healthFill'),
  xpFill: document.getElementById('xpFill'),
  upgradeChoices: document.getElementById('upgradeChoices'),
  finalTime: document.getElementById('finalTime'),
  finalScore: document.getElementById('finalScore'),
  finalLevel: document.getElementById('finalLevel'),
  finalKills: document.getElementById('finalKills'),
  finalWave: document.getElementById('finalWave'),
  toastContainer: document.getElementById('toastContainer'),
  gameCanvas: document.getElementById('gameCanvas'),
  joystickArea: document.getElementById('joystickArea'),
  joystickBase: document.getElementById('joystickBase'),
  joystickStick: document.getElementById('joystickStick'),
  helperBadge: document.getElementById('helperBadge'),
  dashButton: document.getElementById('dashButton'),
  specialButton: document.getElementById('specialButton'),
  weaponChips: [...document.querySelectorAll('.weapon-chip')]
};

const ctx = dom.gameCanvas.getContext('2d', { alpha: false });

const SETTINGS_KEY = 'neon-arena-premium-settings-v2';
const HIGHSCORE_KEY = 'neon-arena-premium-highscore-v2';

const settings = {
  controlMode: 'joystick',
  screenshake: true,
  showHelpers: true
};

const CONFIG = {
  world: {
    width: 2300,
    height: 1500,
    padding: 140
  },
  player: {
    radius: 22,
    maxHealth: 100,
    speed: 310,
    dashSpeed: 760,
    dashDuration: 0.18,
    dashCooldown: 3.2,
    xpPickupRadius: 110,
    invuln: 0.45,
    regen: 0,
    critChance: 0,
    critMultiplier: 1.8,
    skillCooldown: 14,
    baseArmor: 0,
    magnetRange: 110
  },
  wave: {
    duration: 28,
    ramp: 0.013,
    baseSpawnInterval: 1.05,
    minSpawnInterval: 0.16
  },
  xp: {
    base: 12,
    growth: 1.23
  },
  combatTextLife: 0.8,
  grid: 76,
  mobileCameraBiasPortrait: 120,
  mobileCameraBiasLandscape: 36
};

const ENEMY_TYPES = {
  basic: { hp: 28, speed: 96, radius: 18, damage: 11, xp: 4, score: 8, color: '#ff7ea5' },
  fast: { hp: 18, speed: 156, radius: 14, damage: 8, xp: 5, score: 10, color: '#ffd56f' },
  tank: { hp: 82, speed: 62, radius: 27, damage: 20, xp: 10, score: 22, color: '#73f2b4' },
  sniper: { hp: 36, speed: 68, radius: 17, damage: 12, xp: 8, score: 18, color: '#8e8cff', shootCooldown: 2.6, preferred: 320 },
  dasher: { hp: 34, speed: 108, radius: 16, damage: 13, xp: 7, score: 16, color: '#62e8ff', dashCooldown: 3 },
  splitter: { hp: 44, speed: 84, radius: 19, damage: 10, xp: 7, score: 17, color: '#ffb18b', splitInto: 2 }
};

const WEAPONS = {
  pulse: {
    name: 'Pulse',
    color: '#76ebff',
    cooldown: 0.46,
    damage: 14,
    range: 380,
    speed: 720,
    size: 7,
    pierce: 0,
    spread: 0,
    shots: 1
  },
  burst: {
    name: 'Burst',
    color: '#8b97ff',
    cooldown: 0.7,
    damage: 12,
    range: 350,
    speed: 760,
    size: 6,
    pierce: 0,
    spread: 0.18,
    shots: 3
  },
  beam: {
    name: 'Beam',
    color: '#7effc1',
    cooldown: 0.95,
    damage: 22,
    range: 430,
    speed: 920,
    size: 8,
    pierce: 1,
    spread: 0,
    shots: 1
  }
};

const UPGRADES = [
  { id: 'damage', title: 'Pulse renforcé', desc: '+20% dégâts principaux.', tag: 'Offense', apply: g => g.player.damageMul += 0.2 },
  { id: 'speed', title: 'Propulseurs', desc: '+10% vitesse de déplacement.', tag: 'Mobilité', apply: g => g.player.speedMul += 0.1 },
  { id: 'attackspeed', title: 'Cadence', desc: '-10% temps entre les tirs.', tag: 'Offense', apply: g => g.player.attackSpeedMul += 0.11 },
  { id: 'multishot', title: 'Projectile bonus', desc: '+1 projectile sur Pulse/Beam.', tag: 'Arme', apply: g => g.player.extraProjectiles += 1 },
  { id: 'pierce', title: 'Perçage', desc: 'Les tirs traversent +1 ennemi.', tag: 'Arme', apply: g => g.player.extraPierce += 1 },
  { id: 'health', title: 'Surcouche HP', desc: '+20 PV max et soin de 20.', tag: 'Défense', apply: g => { g.player.maxHealth += 20; g.player.health = Math.min(g.player.maxHealth, g.player.health + 20); } },
  { id: 'regen', title: 'Nano-régénération', desc: '+1.6 PV/s.', tag: 'Défense', apply: g => g.player.regen += 1.6 },
  { id: 'armor', title: 'Blindage léger', desc: '-8% dégâts reçus.', tag: 'Défense', apply: g => g.player.armor = Math.min(0.55, g.player.armor + 0.08) },
  { id: 'orbit', title: 'Lames orbitale', desc: 'Ajoute une lame qui tourne autour du héros.', tag: 'Skill', apply: g => g.player.orbitals += 1 },
  { id: 'aura', title: 'Aura ionique', desc: 'Zone de dégâts autour du joueur.', tag: 'Skill', apply: g => g.player.auraDps += 7 },
  { id: 'magnet', title: 'Aimant XP', desc: 'Portée de ramassage augmentée.', tag: 'Confort', apply: g => g.player.magnetRange += 45 },
  { id: 'crit', title: 'Surcharge critique', desc: '+12% crit et critiques plus forts.', tag: 'Offense', apply: g => { g.player.critChance += 0.12; g.player.critMultiplier += 0.2; } },
  { id: 'dash', title: 'Dash agile', desc: 'Recharge de dash plus rapide.', tag: 'Mobilité', apply: g => g.player.dashCooldownMul *= 0.85 },
  { id: 'skill', title: 'Skill accéléré', desc: 'Recharge de compétence plus rapide.', tag: 'Skill', apply: g => g.player.skillCooldownMul *= 0.86 },
  { id: 'burstunlock', title: 'Burst calibré', desc: 'Améliore Burst : +1 projectile.', tag: 'Arme', apply: g => g.player.burstBonus += 1 },
  { id: 'beamunlock', title: 'Beam intense', desc: 'Beam inflige davantage de dégâts.', tag: 'Arme', apply: g => g.player.beamBonusDamage += 10 }
];

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function distSq(ax, ay, bx, by) { const dx = bx - ax; const dy = by - ay; return dx * dx + dy * dy; }
function normalize(x, y) { const len = Math.hypot(x, y) || 1; return { x: x / len, y: y / len }; }
function formatTime(s) { const sec = Math.floor(s % 60).toString().padStart(2, '0'); const min = Math.floor(s / 60).toString().padStart(2, '0'); return `${min}:${sec}`; }
function chance(p) { return Math.random() < p; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pulse(a) { return 0.5 + Math.sin(a) * 0.5; }

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    settings.controlMode = data.controlMode === 'keyboard' ? 'keyboard' : 'joystick';
    settings.screenshake = data.screenshake !== false;
    settings.showHelpers = data.showHelpers !== false;
  } catch (err) {
    console.warn('settings load failed', err);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('settings save failed', err);
  }
}

function syncSettingsUI() {
  dom.controlJoystickButton.classList.toggle('is-active', settings.controlMode === 'joystick');
  dom.controlKeyboardButton.classList.toggle('is-active', settings.controlMode === 'keyboard');
  dom.screenshakeToggle.checked = settings.screenshake;
  dom.helpersToggle.checked = settings.showHelpers;
  dom.joystickArea.classList.toggle('hidden-visibility', settings.controlMode !== 'joystick');
  dom.helperBadge.classList.toggle('hidden-visibility', !settings.showHelpers);
  dom.settingsHelpBox.classList.toggle('hidden-visibility', !settings.showHelpers);
}

function setScreen(name) {
  dom.menuScreen.classList.toggle('active', name === 'menu');
  dom.gameScreen.classList.toggle('active', name === 'game');
}

function showToast(text, life = 1900) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  dom.toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
  }, life - 260);
  setTimeout(() => el.remove(), life);
}

function vibrate(pattern) {
  if (!navigator.vibrate) return;
  navigator.vibrate(pattern);
}

class InputManager {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.moveX = 0;
    this.moveY = 0;
    this.pointerId = null;
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 0;
    this.bindEvents();
    this.resizeJoystick();
  }

  bindEvents() {
    window.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      this.keys.add(key);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
      if (key === 'p') this.game.togglePause();
      if (key === 'e') this.game.triggerSpecial();
      if (key === 'shift' || key === ' ') this.game.tryDash();
      if (key === '1') this.game.setWeapon('pulse');
      if (key === '2') this.game.setWeapon('burst');
      if (key === '3') this.game.setWeapon('beam');
      if (key === 'enter' && this.game.state === 'gameover') this.game.restart();
    });

    window.addEventListener('keyup', e => {
      this.keys.delete(e.key.toLowerCase());
    });

    const start = e => {
      if (settings.controlMode !== 'joystick') return;
      const rect = dom.joystickBase.getBoundingClientRect();
      this.pointerId = e.pointerId;
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.radius = rect.width * 0.33;
      dom.joystickArea.setPointerCapture?.(e.pointerId);
      this.updatePointer(e.clientX, e.clientY);
    };

    const move = e => {
      if (e.pointerId !== this.pointerId) return;
      this.updatePointer(e.clientX, e.clientY);
    };

    const end = e => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.moveX = 0;
      this.moveY = 0;
      dom.joystickStick.style.transform = 'translate(-50%, -50%)';
    };

    dom.joystickArea.addEventListener('pointerdown', start);
    dom.joystickArea.addEventListener('pointermove', move);
    dom.joystickArea.addEventListener('pointerup', end);
    dom.joystickArea.addEventListener('pointercancel', end);

    dom.dashButton.addEventListener('pointerdown', e => { e.preventDefault(); this.game.tryDash(); });
    dom.specialButton.addEventListener('pointerdown', e => { e.preventDefault(); this.game.triggerSpecial(); });

    window.addEventListener('resize', () => this.resizeJoystick());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resizeJoystick(), 60));
  }

  resizeJoystick() {
    const rect = dom.joystickBase.getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;
    this.radius = rect.width * 0.33;
  }

  updatePointer(clientX, clientY) {
    const dx = clientX - this.centerX;
    const dy = clientY - this.centerY;
    const len = Math.hypot(dx, dy);
    const maxLen = this.radius;
    const factor = len > maxLen ? maxLen / len : 1;
    const x = dx * factor;
    const y = dy * factor;
    this.moveX = clamp(x / maxLen, -1, 1);
    this.moveY = clamp(y / maxLen, -1, 1);
    dom.joystickStick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  getMoveVector() {
    if (settings.controlMode === 'keyboard') {
      let x = 0;
      let y = 0;
      if (this.keys.has('q') || this.keys.has('a')) x -= 1;
      if (this.keys.has('d')) x += 1;
      if (this.keys.has('z') || this.keys.has('w')) y -= 1;
      if (this.keys.has('s')) y += 1;
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      return normalize(x, y);
    }
    if (Math.abs(this.moveX) < 0.02 && Math.abs(this.moveY) < 0.02) return { x: 0, y: 0 };
    return normalize(this.moveX, this.moveY);
  }
}

class Camera {
  constructor(game) {
    this.game = game;
    this.x = 0;
    this.y = 0;
    this.shakeTime = 0;
    this.shakePower = 0;
  }

  getTargetBiasY() {
    const portrait = this.game.height >= this.game.width;
    if (!this.game.isMobile) return portrait ? 10 : 0;
    return portrait ? CONFIG.mobileCameraBiasPortrait : CONFIG.mobileCameraBiasLandscape;
  }

  update(dt, targetX, targetY) {
    const biasY = this.getTargetBiasY();
    this.x = lerp(this.x, targetX, 0.12);
    this.y = lerp(this.y, targetY + biasY, 0.12);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
  }

  shake(power) {
    if (!settings.screenshake) return;
    this.shakePower = Math.max(this.shakePower, power);
    this.shakeTime = Math.max(this.shakeTime, 0.18);
  }

  begin(ctx, width, height) {
    let offsetX = 0;
    let offsetY = 0;
    if (this.shakeTime > 0) {
      offsetX = rand(-this.shakePower, this.shakePower);
      offsetY = rand(-this.shakePower, this.shakePower);
      this.shakePower *= 0.92;
    }
    ctx.save();
    ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
    ctx.translate(-this.x, -this.y);
  }

  end(ctx) {
    ctx.restore();
  }
}

class Game {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.isMobile = matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
    this.input = new InputManager(this);
    this.camera = new Camera(this);
    this.lastTime = 0;
    this.state = 'menu';
    this.running = false;
    this.raf = 0;
    this.highScore = this.loadHighScore();
    this.bindUI();
    this.resize();
    this.loop = this.loop.bind(this);
    this.resetRun();
    this.renderStaticMenuHint();
    requestAnimationFrame(this.loop);
  }

  bindUI() {
    dom.playButton.addEventListener('click', () => this.start());
    dom.openSettingsButton.addEventListener('click', () => this.openSettings());
    dom.settingsButtonInGame.addEventListener('click', () => this.openSettings());
    dom.pauseButton.addEventListener('click', () => this.togglePause());
    dom.closeSettingsButton.addEventListener('click', () => this.closeSettings());
    dom.resumeButton.addEventListener('click', () => this.resume());
    dom.pauseSettingsButton.addEventListener('click', () => {
      dom.pauseOverlay.classList.add('hidden');
      dom.settingsOverlay.classList.remove('hidden');
    });
    dom.restartButton.addEventListener('click', () => this.restart());
    dom.backToMenuButton.addEventListener('click', () => this.backToMenu());
    dom.controlJoystickButton.addEventListener('click', () => {
      settings.controlMode = 'joystick';
      saveSettings();
      syncSettingsUI();
      showToast('Joystick tactile activé.');
    });
    dom.controlKeyboardButton.addEventListener('click', () => {
      settings.controlMode = 'keyboard';
      saveSettings();
      syncSettingsUI();
      showToast('Clavier AZERTY activé.');
    });
    dom.screenshakeToggle.addEventListener('change', e => {
      settings.screenshake = e.target.checked;
      saveSettings();
      syncSettingsUI();
    });
    dom.helpersToggle.addEventListener('change', e => {
      settings.showHelpers = e.target.checked;
      saveSettings();
      syncSettingsUI();
    });
    dom.weaponChips.forEach(btn => btn.addEventListener('click', () => this.setWeapon(btn.dataset.weapon)));

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 60));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
  }

  loadHighScore() {
    try {
      return Number(localStorage.getItem(HIGHSCORE_KEY) || 0);
    } catch {
      return 0;
    }
  }

  saveHighScore() {
    try {
      localStorage.setItem(HIGHSCORE_KEY, String(this.highScore));
    } catch {}
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    dom.gameCanvas.width = Math.round(this.width * dpr);
    dom.gameCanvas.height = Math.round(this.height * dpr);
    dom.gameCanvas.style.width = `${this.width}px`;
    dom.gameCanvas.style.height = `${this.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.isMobile = matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;
    this.input.resizeJoystick();
  }

  resetRun() {
    this.player = {
      x: CONFIG.world.width / 2,
      y: CONFIG.world.height / 2,
      radius: CONFIG.player.radius,
      health: CONFIG.player.maxHealth,
      maxHealth: CONFIG.player.maxHealth,
      speedMul: 1,
      damageMul: 1,
      attackSpeedMul: 1,
      extraProjectiles: 0,
      extraPierce: 0,
      healthFlash: 0,
      invuln: 0,
      dashTime: 0,
      dashCooldown: 0,
      dashCooldownMul: 1,
      skillCooldown: 0,
      skillCooldownMul: 1,
      auraDps: 0,
      orbitals: 0,
      regen: CONFIG.player.regen,
      armor: CONFIG.player.baseArmor,
      magnetRange: CONFIG.player.magnetRange,
      critChance: CONFIG.player.critChance,
      critMultiplier: CONFIG.player.critMultiplier,
      burstBonus: 0,
      beamBonusDamage: 0,
      currentWeapon: 'pulse',
      aimAngle: 0
    };

    this.camera = new Camera(this);
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;

    this.survivalTime = 0;
    this.wave = 1;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.score = 0;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = CONFIG.xp.base;
    this.pendingLevelUps = 0;
    this.attackCooldown = 0;
    this.enemyBullets = [];
    this.playerBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.damageTexts = [];
    this.rings = [];
    this.skillWaves = [];
    this.starfield = this.makeStarfield();
    this.setWeapon(this.player.currentWeapon, false);
    this.spawnOpeningEnemies();
    this.updateHUD();
  }

  renderStaticMenuHint() {
    syncSettingsUI();
  }

  start() {
    this.resetRun();
    this.running = true;
    this.state = 'playing';
    setScreen('game');
    dom.pauseOverlay.classList.add('hidden');
    dom.settingsOverlay.classList.add('hidden');
    dom.gameOverOverlay.classList.add('hidden');
    dom.levelUpOverlay.classList.add('hidden');
    this.lastTime = performance.now();
    showToast('Nouvelle partie. Bonne survie.');
  }

  restart() {
    this.start();
  }

  backToMenu() {
    this.state = 'menu';
    this.running = false;
    setScreen('menu');
    dom.gameOverOverlay.classList.add('hidden');
    dom.pauseOverlay.classList.add('hidden');
    dom.settingsOverlay.classList.add('hidden');
  }

  openSettings() {
    dom.settingsOverlay.classList.remove('hidden');
  }

  closeSettings() {
    dom.settingsOverlay.classList.add('hidden');
    if (this.state === 'paused') dom.pauseOverlay.classList.remove('hidden');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    dom.pauseOverlay.classList.remove('hidden');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.lastTime = performance.now();
    dom.pauseOverlay.classList.add('hidden');
    dom.settingsOverlay.classList.add('hidden');
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  setWeapon(id, show = true) {
    if (!WEAPONS[id]) return;
    this.player.currentWeapon = id;
    dom.weaponChips.forEach(btn => btn.classList.toggle('active', btn.dataset.weapon === id));
    if (show && this.state === 'playing') showToast(`Arme active : ${WEAPONS[id].name}`);
  }

  tryDash() {
    if (this.state !== 'playing') return;
    if (this.player.dashCooldown > 0 || this.player.dashTime > 0) return;
    const dir = this.input.getMoveVector();
    if (dir.x === 0 && dir.y === 0) return;
    this.player.dashTime = CONFIG.player.dashDuration;
    this.player.dashDir = dir;
    this.player.dashCooldown = CONFIG.player.dashCooldown * this.player.dashCooldownMul;
    this.camera.shake(6);
    this.spawnBurst(this.player.x, this.player.y, '#7cf0ff', 10, 5, 90);
    vibrate(12);
  }

  triggerSpecial() {
    if (this.state !== 'playing') return;
    if (this.player.skillCooldown > 0) return;
    this.player.skillCooldown = CONFIG.player.skillCooldown * this.player.skillCooldownMul;
    this.skillWaves.push({ x: this.player.x, y: this.player.y, radius: 20, maxRadius: 240, life: 0.55, damage: 26 + this.level * 1.6, hit: new Set() });
    this.spawnBurst(this.player.x, this.player.y, '#88f7c4', 18, 7, 130);
    this.camera.shake(8);
    showToast('Pulse Nova déclenchée');
    vibrate([18, 28, 18]);
  }

  spawnOpeningEnemies() {
    for (let i = 0; i < 8; i++) this.spawnEnemy();
  }

  enemyTypeForDifficulty() {
    const d = this.wave + this.survivalTime * CONFIG.wave.ramp;
    const pool = [{ id: 'basic', w: 50 }];
    if (d > 1.5) pool.push({ id: 'fast', w: 20 + d * 2 });
    if (d > 3) pool.push({ id: 'tank', w: 12 + d });
    if (d > 4) pool.push({ id: 'sniper', w: 10 + d * 1.3 });
    if (d > 5) pool.push({ id: 'dasher', w: 9 + d * 1.4 });
    if (d > 7) pool.push({ id: 'splitter', w: 8 + d });
    const total = pool.reduce((sum, p) => sum + p.w, 0);
    let roll = Math.random() * total;
    for (const p of pool) {
      roll -= p.w;
      if (roll <= 0) return p.id;
    }
    return pool[0].id;
  }

  spawnEnemy(type = this.enemyTypeForDifficulty()) {
    const data = ENEMY_TYPES[type];
    const edge = randInt(0, 3);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = rand(-40, CONFIG.world.width + 40); y = -60; }
    if (edge === 1) { x = CONFIG.world.width + 60; y = rand(-40, CONFIG.world.height + 40); }
    if (edge === 2) { x = rand(-40, CONFIG.world.width + 40); y = CONFIG.world.height + 60; }
    if (edge === 3) { x = -60; y = rand(-40, CONFIG.world.height + 40); }
    this.enemies.push({
      type,
      x,
      y,
      hp: data.hp + this.wave * (type === 'tank' ? 5 : 2),
      maxHp: data.hp + this.wave * (type === 'tank' ? 5 : 2),
      speed: data.speed,
      radius: data.radius,
      damage: data.damage,
      xp: data.xp,
      score: data.score,
      color: data.color,
      contactCd: 0,
      shootCd: rand(0.6, 1.4),
      dashCd: rand(1.2, 2.4),
      born: 0.4,
      dead: false
    });
  }

  addXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.ceil(this.xpToNext * CONFIG.xp.growth);
      this.pendingLevelUps += 1;
    }
    if (this.pendingLevelUps > 0 && this.state === 'playing') this.openLevelUp();
  }

  openLevelUp() {
    this.state = 'levelup';
    dom.levelUpOverlay.classList.remove('hidden');
    dom.upgradeChoices.innerHTML = '';
    const choices = [];
    while (choices.length < 3) {
      const candidate = pick(UPGRADES);
      if (!choices.includes(candidate)) choices.push(candidate);
    }
    choices.forEach(upgrade => {
      const btn = document.createElement('button');
      btn.className = 'upgrade-btn';
      btn.innerHTML = `<span class="upgrade-tag">${upgrade.tag}</span><h3>${upgrade.title}</h3><p>${upgrade.desc}</p>`;
      btn.addEventListener('click', () => {
        upgrade.apply(this);
        this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
        dom.levelUpOverlay.classList.add('hidden');
        showToast(`Amélioration : ${upgrade.title}`);
        vibrate(16);
        if (this.pendingLevelUps > 0) this.openLevelUp();
        else {
          this.state = 'playing';
          this.lastTime = performance.now();
        }
      });
      dom.upgradeChoices.appendChild(btn);
    });
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills += 1;
    this.score += enemy.score;
    this.pickups.push({ x: enemy.x, y: enemy.y, value: enemy.xp, radius: 8, life: 12 });
    this.spawnBurst(enemy.x, enemy.y, enemy.color, 12, 3, 70);
    this.damageTexts.push({ x: enemy.x, y: enemy.y - 8, text: `+${enemy.score}`, color: '#ffffff', life: 0.7, vy: -22 });
    if (enemy.type === 'splitter') {
      for (let i = 0; i < ENEMY_TYPES.splitter.splitInto; i++) {
        this.enemies.push({
          type: 'fast',
          x: enemy.x + rand(-10, 10),
          y: enemy.y + rand(-10, 10),
          hp: 16 + this.wave,
          maxHp: 16 + this.wave,
          speed: 148,
          radius: 13,
          damage: 7,
          xp: 3,
          score: 7,
          color: '#ffd56f',
          contactCd: 0,
          shootCd: 0,
          dashCd: 0,
          born: 0,
          dead: false
        });
      }
    }
  }

  damagePlayer(amount) {
    if (this.player.invuln > 0 || this.state !== 'playing') return;
    const dealt = Math.max(1, amount * (1 - this.player.armor));
    this.player.health -= dealt;
    this.player.invuln = CONFIG.player.invuln;
    this.player.healthFlash = 0.24;
    this.camera.shake(8);
    this.damageTexts.push({ x: this.player.x, y: this.player.y - 28, text: `-${Math.round(dealt)}`, color: '#ff7ea5', life: 0.8, vy: -20 });
    this.spawnBurst(this.player.x, this.player.y, '#ff7ea5', 10, 3.5, 50);
    vibrate(18);
    if (this.player.health <= 0) this.gameOver();
  }

  gameOver() {
    this.state = 'gameover';
    this.running = false;
    this.highScore = Math.max(this.highScore, this.score);
    this.saveHighScore();
    dom.finalTime.textContent = formatTime(this.survivalTime);
    dom.finalScore.textContent = `${this.score}`;
    dom.finalLevel.textContent = `${this.level}`;
    dom.finalKills.textContent = `${this.kills}`;
    dom.finalWave.textContent = `${this.wave}`;
    dom.gameOverOverlay.classList.remove('hidden');
    vibrate([30, 40, 30]);
  }

  spawnBurst(x, y, color, count, speedMin, speedMax) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(speedMin, speedMax);
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(0.3, 0.7), size: rand(2, 5), color });
    }
    this.rings.push({ x, y, radius: 8, maxRadius: 40, life: 0.32, color });
  }

  createPlayerProjectiles(target) {
    const base = WEAPONS[this.player.currentWeapon];
    if (!base) return;
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    this.player.aimAngle = angle;
    let shots = base.shots + this.player.extraProjectiles;
    if (this.player.currentWeapon === 'burst') shots += this.player.burstBonus;
    const pierce = base.pierce + this.player.extraPierce;
    const damage = (base.damage + (this.player.currentWeapon === 'beam' ? this.player.beamBonusDamage : 0)) * this.player.damageMul;
    const spread = shots > 1 ? base.spread || 0.12 : 0;
    const startOffset = -spread * (shots - 1) / 2;
    for (let i = 0; i < shots; i++) {
      const a = angle + startOffset + spread * i;
      this.playerBullets.push({
        x: this.player.x + Math.cos(a) * (this.player.radius + 6),
        y: this.player.y + Math.sin(a) * (this.player.radius + 6),
        vx: Math.cos(a) * base.speed,
        vy: Math.sin(a) * base.speed,
        radius: base.size,
        color: base.color,
        life: base.range / base.speed,
        damage,
        pierce,
        hit: new Set()
      });
    }
    this.spawnBurst(this.player.x + Math.cos(angle) * 18, this.player.y + Math.sin(angle) * 18, base.color, 5, 2, 24);
  }

  nearestTarget() {
    let best = null;
    let bestScore = Infinity;
    const weapon = WEAPONS[this.player.currentWeapon];
    const range = weapon.range + (this.player.currentWeapon === 'beam' ? 40 : 0);
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const d2 = distSq(this.player.x, this.player.y, enemy.x, enemy.y);
      if (d2 > range * range) continue;
      const score = d2 + enemy.hp * 4;
      if (score < bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    return best;
  }

  updatePlayer(dt) {
    const move = this.input.getMoveVector();
    let speed = CONFIG.player.speed * this.player.speedMul;
    if (this.player.dashTime > 0) {
      this.player.dashTime -= dt;
      speed = CONFIG.player.dashSpeed;
      this.player.x += this.player.dashDir.x * speed * dt;
      this.player.y += this.player.dashDir.y * speed * dt;
      if (chance(0.45)) this.particles.push({ x: this.player.x, y: this.player.y, vx: rand(-30, 30), vy: rand(-30, 30), life: 0.25, size: rand(2, 4), color: '#7cefff' });
    } else {
      this.player.x += move.x * speed * dt;
      this.player.y += move.y * speed * dt;
    }

    this.player.x = clamp(this.player.x, 24, CONFIG.world.width - 24);
    this.player.y = clamp(this.player.y, 24, CONFIG.world.height - 24);

    this.player.invuln = Math.max(0, this.player.invuln - dt);
    this.player.healthFlash = Math.max(0, this.player.healthFlash - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.player.skillCooldown = Math.max(0, this.player.skillCooldown - dt);

    if (this.player.regen > 0) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.regen * dt);
    }

    this.attackCooldown -= dt;
    const target = this.nearestTarget();
    if (target && this.attackCooldown <= 0) {
      this.createPlayerProjectiles(target);
      const weapon = WEAPONS[this.player.currentWeapon];
      this.attackCooldown = weapon.cooldown / this.player.attackSpeedMul;
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.born = Math.max(0, enemy.born - dt);
      enemy.contactCd = Math.max(0, enemy.contactCd - dt);
      const toPlayerX = this.player.x - enemy.x;
      const toPlayerY = this.player.y - enemy.y;
      const d = Math.hypot(toPlayerX, toPlayerY) || 1;
      const dirX = toPlayerX / d;
      const dirY = toPlayerY / d;

      if (enemy.type === 'sniper') {
        enemy.shootCd -= dt;
        const preferred = ENEMY_TYPES.sniper.preferred;
        const moveSign = d > preferred ? 1 : d < preferred - 40 ? -1 : 0;
        enemy.x += dirX * enemy.speed * moveSign * dt;
        enemy.y += dirY * enemy.speed * moveSign * dt;
        if (enemy.shootCd <= 0 && d < 480) {
          enemy.shootCd = ENEMY_TYPES.sniper.shootCooldown;
          const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
          this.enemyBullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 310, vy: Math.sin(angle) * 310, radius: 8, life: 3.2, damage: enemy.damage, color: '#a99cff' });
          this.spawnBurst(enemy.x, enemy.y, '#8e8cff', 4, 2, 20);
        }
      } else if (enemy.type === 'dasher') {
        enemy.dashCd -= dt;
        if (enemy.dashCd <= 0 && d < 320) {
          enemy.dashCd = ENEMY_TYPES.dasher.dashCooldown;
          enemy.x += dirX * 80;
          enemy.y += dirY * 80;
          this.spawnBurst(enemy.x, enemy.y, '#62e8ff', 6, 2, 24);
        }
        enemy.x += dirX * enemy.speed * dt;
        enemy.y += dirY * enemy.speed * dt;
      } else {
        enemy.x += dirX * enemy.speed * dt;
        enemy.y += dirY * enemy.speed * dt;
      }

      if (d < enemy.radius + this.player.radius + 2 && enemy.contactCd <= 0) {
        enemy.contactCd = 0.8;
        this.damagePlayer(enemy.damage);
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  updateProjectiles(dt) {
    for (const bullet of this.playerBullets) {
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      for (const enemy of this.enemies) {
        if (enemy.dead || bullet.hit.has(enemy)) continue;
        const r = bullet.radius + enemy.radius;
        if (distSq(bullet.x, bullet.y, enemy.x, enemy.y) <= r * r) {
          bullet.hit.add(enemy);
          const crit = chance(this.player.critChance);
          const amount = bullet.damage * (crit ? this.player.critMultiplier : 1);
          enemy.hp -= amount;
          this.damageTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 6, text: `${Math.round(amount)}`, color: crit ? '#ffdf7a' : '#ffffff', life: 0.75, vy: -18 });
          this.spawnBurst(bullet.x, bullet.y, bullet.color, 6, 2, 30);
          if (enemy.hp <= 0) this.killEnemy(enemy);
          if (bullet.pierce <= 0) bullet.life = 0;
          else bullet.pierce -= 1;
          break;
        }
      }
    }
    this.playerBullets = this.playerBullets.filter(b => b.life > 0 && b.x > -90 && b.x < CONFIG.world.width + 90 && b.y > -90 && b.y < CONFIG.world.height + 90);

    for (const bullet of this.enemyBullets) {
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      const r = bullet.radius + this.player.radius;
      if (distSq(bullet.x, bullet.y, this.player.x, this.player.y) <= r * r) {
        bullet.life = 0;
        this.damagePlayer(bullet.damage);
      }
    }
    this.enemyBullets = this.enemyBullets.filter(b => b.life > 0);
  }

  updatePickups(dt) {
    for (const p of this.pickups) {
      p.life -= dt;
      const d = dist(this.player.x, this.player.y, p.x, p.y);
      if (d < this.player.magnetRange) {
        const dir = normalize(this.player.x - p.x, this.player.y - p.y);
        p.x += dir.x * (160 + (this.player.magnetRange - d) * 2.3) * dt;
        p.y += dir.y * (160 + (this.player.magnetRange - d) * 2.3) * dt;
      }
      if (d < this.player.radius + 10) {
        p.life = 0;
        this.addXP(p.value);
      }
    }
    this.pickups = this.pickups.filter(p => p.life > 0);
  }

  updateOrbitals(dt) {
    if (this.player.orbitals <= 0 && this.player.auraDps <= 0) return;
    for (let i = 0; i < this.player.orbitals; i++) {
      const angle = this.survivalTime * 2.4 + (Math.PI * 2 * i) / Math.max(1, this.player.orbitals);
      const ox = this.player.x + Math.cos(angle) * 58;
      const oy = this.player.y + Math.sin(angle) * 58;
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const r = enemy.radius + 10;
        if (distSq(ox, oy, enemy.x, enemy.y) < r * r) {
          enemy.hp -= 17 * dt;
          if (enemy.hp <= 0) this.killEnemy(enemy);
        }
      }
    }

    if (this.player.auraDps > 0) {
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const auraRadius = 96;
        if (distSq(this.player.x, this.player.y, enemy.x, enemy.y) <= (auraRadius + enemy.radius) ** 2) {
          enemy.hp -= this.player.auraDps * dt;
          if (enemy.hp <= 0) this.killEnemy(enemy);
        }
      }
    }
  }

  updateSkillWaves(dt) {
    for (const wave of this.skillWaves) {
      wave.life -= dt;
      wave.radius = lerp(wave.radius, wave.maxRadius, 0.18);
      for (const enemy of this.enemies) {
        if (enemy.dead || wave.hit.has(enemy)) continue;
        if (distSq(wave.x, wave.y, enemy.x, enemy.y) <= (wave.radius + enemy.radius) ** 2) {
          wave.hit.add(enemy);
          enemy.hp -= wave.damage;
          this.spawnBurst(enemy.x, enemy.y, '#8af8c7', 8, 2, 28);
          this.damageTexts.push({ x: enemy.x, y: enemy.y - 10, text: `${Math.round(wave.damage)}`, color: '#8af8c7', life: 0.72, vy: -18 });
          if (enemy.hp <= 0) this.killEnemy(enemy);
        }
      }
    }
    this.skillWaves = this.skillWaves.filter(w => w.life > 0);
  }

  updateFX(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const d of this.damageTexts) {
      d.life -= dt;
      d.y += d.vy * dt;
    }
    this.damageTexts = this.damageTexts.filter(d => d.life > 0);

    for (const r of this.rings) {
      r.life -= dt;
      r.radius = lerp(r.radius, r.maxRadius, 0.18);
    }
    this.rings = this.rings.filter(r => r.life > 0);
  }

  updateWave(dt) {
    this.survivalTime += dt;
    this.waveTimer += dt;
    const newWave = Math.floor(this.survivalTime / CONFIG.wave.duration) + 1;
    if (newWave !== this.wave) {
      this.wave = newWave;
      showToast(`Vague ${this.wave}`);
      this.spawnBurst(this.player.x, this.player.y, '#76ebff', 20, 3, 80);
    }
    const dynamicInterval = Math.max(CONFIG.wave.minSpawnInterval, CONFIG.wave.baseSpawnInterval - this.survivalTime * 0.01 - this.wave * 0.03);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = dynamicInterval;
      this.spawnEnemy();
      if (this.wave >= 3 && chance(0.4)) this.spawnEnemy();
      if (this.wave >= 6 && chance(0.25)) this.spawnEnemy();
    }
  }

  updateHUD() {
    dom.timerText.textContent = formatTime(this.survivalTime);
    dom.levelText.textContent = `${this.level}`;
    dom.scoreText.textContent = `${this.score}`;
    dom.waveText.textContent = `${this.wave}`;
    dom.healthText.textContent = `${Math.max(0, Math.ceil(this.player.health))} / ${this.player.maxHealth}`;
    dom.xpText.textContent = `${Math.floor(this.xp)} / ${this.xpToNext}`;
    dom.healthFill.style.width = `${clamp((this.player.health / this.player.maxHealth) * 100, 0, 100)}%`;
    dom.xpFill.style.width = `${clamp((this.xp / this.xpToNext) * 100, 0, 100)}%`;
    dom.dashButton.textContent = this.player.dashCooldown > 0 ? `${this.player.dashCooldown.toFixed(1)}s` : 'Dash';
    dom.specialButton.textContent = this.player.skillCooldown > 0 ? `${this.player.skillCooldown.toFixed(1)}s` : 'Skill';
  }

  step(dt) {
    this.updatePlayer(dt);
    this.updateWave(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateOrbitals(dt);
    this.updateSkillWaves(dt);
    this.updateFX(dt);
    this.camera.update(dt, this.player.x, this.player.y);
    this.updateHUD();
  }

  makeStarfield() {
    const stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({ x: Math.random(), y: Math.random(), r: rand(0.4, 1.6), a: rand(0.18, 0.55) });
    }
    return stars;
  }

  drawBackground() {
    ctx.fillStyle = '#06111d';
    ctx.fillRect(0, 0, this.width, this.height);

    const grad = ctx.createRadialGradient(this.width * 0.5, this.height * 0.22, 0, this.width * 0.5, this.height * 0.3, this.height * 0.9);
    grad.addColorStop(0, 'rgba(27, 99, 144, 0.25)');
    grad.addColorStop(1, 'rgba(3, 9, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.starfield) {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = '#dff8ff';
      ctx.beginPath();
      ctx.arc(star.x * this.width, star.y * this.height, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawWorld() {
    this.camera.begin(ctx, this.width, this.height);

    const g = CONFIG.grid;
    const startX = Math.floor((this.camera.x - this.width / 2) / g) * g - g;
    const endX = Math.ceil((this.camera.x + this.width / 2) / g) * g + g;
    const startY = Math.floor((this.camera.y - this.height / 2) / g) * g - g;
    const endY = Math.ceil((this.camera.y + this.height / 2) / g) * g + g;

    ctx.fillStyle = '#071421';
    ctx.fillRect(0, 0, CONFIG.world.width, CONFIG.world.height);

    const arenaGrad = ctx.createLinearGradient(0, 0, CONFIG.world.width, CONFIG.world.height);
    arenaGrad.addColorStop(0, 'rgba(0, 173, 255, 0.08)');
    arenaGrad.addColorStop(0.5, 'rgba(16, 76, 140, 0.03)');
    arenaGrad.addColorStop(1, 'rgba(125, 96, 255, 0.08)');
    ctx.fillStyle = arenaGrad;
    ctx.fillRect(0, 0, CONFIG.world.width, CONFIG.world.height);

    ctx.strokeStyle = 'rgba(140, 220, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += g) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.world.height);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += g) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.world.width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(98, 240, 255, 0.24)';
    ctx.lineWidth = 8;
    ctx.strokeRect(0, 0, CONFIG.world.width, CONFIG.world.height);

    for (const ring of this.rings) {
      ctx.globalAlpha = ring.life * 1.8;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (this.player.auraDps > 0) {
      ctx.globalAlpha = 0.1 + pulse(this.survivalTime * 5) * 0.05;
      ctx.fillStyle = '#73f2b4';
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 96, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < this.player.orbitals; i++) {
      const angle = this.survivalTime * 2.4 + (Math.PI * 2 * i) / Math.max(1, this.player.orbitals);
      const ox = this.player.x + Math.cos(angle) * 58;
      const oy = this.player.y + Math.sin(angle) * 58;
      ctx.fillStyle = '#76ebff';
      ctx.beginPath();
      ctx.arc(ox, oy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const pickup of this.pickups) {
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = '#73f2b4';
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, pickup.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const enemy of this.enemies) {
      ctx.globalAlpha = 1 - enemy.born * 0.55;
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, (enemy.hp / enemy.maxHp) * enemy.radius * 2, 4);
      ctx.globalAlpha = 1;
    }

    for (const bullet of this.playerBullets) {
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const bullet of this.enemyBullets) {
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const wave of this.skillWaves) {
      ctx.globalAlpha = wave.life * 1.2;
      ctx.strokeStyle = '#8af8c7';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const particle of this.particles) {
      ctx.globalAlpha = particle.life * 1.6;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const angle = this.player.aimAngle;
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(angle);
    ctx.fillStyle = this.player.healthFlash > 0 ? '#ff9bb8' : '#69ecff';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eaffff';
    ctx.fillRect(6, -4, 16, 8);
    ctx.beginPath();
    ctx.arc(-7, -5, 3, 0, Math.PI * 2);
    ctx.arc(-7, 5, 3, 0, Math.PI * 2);
    ctx.fill();
    if (this.player.invuln > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    for (const text of this.damageTexts) {
      ctx.globalAlpha = text.life * 1.35;
      ctx.fillStyle = text.color;
      ctx.font = '700 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
    this.camera.end(ctx);
  }

  drawOverlay() {
    if (this.state !== 'playing') return;
    if (this.highScore > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Record ${this.highScore}`, this.width - 14, this.height - 14);
    }
  }

  render() {
    this.drawBackground();
    if (this.state !== 'menu') {
      this.drawWorld();
      this.drawOverlay();
    }
  }

  loop(now) {
    const dt = clamp((now - this.lastTime) / 1000 || 0, 0, 0.033);
    this.lastTime = now;
    if (this.state === 'playing') this.step(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }
}

loadSettings();
syncSettingsUI();
const game = new Game();
window.__neonArenaPremium = game;
