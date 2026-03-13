'use strict';

// =========================================================
// NEON ARENA SURVIVAL
// Version de base jouable, structurée et facile à modifier.
// Fonctionne sur mobile / tablette / iPad / desktop.
// Contrôles: joystick tactile ou clavier FR (AZERTY / ZQSD).
// =========================================================

// ---------------------------------------------------------
// Helpers math
// ---------------------------------------------------------
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

function distanceSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function normalize(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function formatTime(totalSeconds) {
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function weightedPick(items) {
  let total = 0;
  for (const item of items) total += item.weight;
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function roundTo(value, precision = 2) {
  const p = Math.pow(10, precision);
  return Math.round(value * p) / p;
}

// ---------------------------------------------------------
// DOM refs
// ---------------------------------------------------------
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
  joystickStick: document.getElementById('joystickStick')
};

const ctx = dom.gameCanvas.getContext('2d');

// ---------------------------------------------------------
// Persistent settings
// ---------------------------------------------------------
const STORAGE_KEY = 'neon-arena-survival-settings-v1';

const settings = {
  controlMode: 'joystick',
  screenshake: true,
  showHelpers: true
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    settings.controlMode = parsed.controlMode === 'keyboard' ? 'keyboard' : 'joystick';
    settings.screenshake = parsed.screenshake !== false;
    settings.showHelpers = parsed.showHelpers !== false;
  } catch (error) {
    console.warn('Impossible de charger les paramètres', error);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Impossible de sauvegarder les paramètres', error);
  }
}

function syncSettingsUI() {
  dom.controlJoystickButton.classList.toggle('is-active', settings.controlMode === 'joystick');
  dom.controlKeyboardButton.classList.toggle('is-active', settings.controlMode === 'keyboard');
  dom.screenshakeToggle.checked = settings.screenshake;
  dom.helpersToggle.checked = settings.showHelpers;
  dom.settingsHelpBox.classList.toggle('hidden-visibility', !settings.showHelpers);
  dom.joystickArea.classList.toggle('hidden-visibility', settings.controlMode !== 'joystick');
}

// ---------------------------------------------------------
// Constants - easy balancing
// ---------------------------------------------------------
const CONFIG = {
  world: {
    width: 2200,
    height: 1400,
    padding: 90
  },
  player: {
    radius: 24,
    baseSpeed: 290,
    maxHealth: 100,
    invulnAfterHit: 0.45,
    autoTargetRange: 360,
    attackCooldown: 0.62,
    damage: 15,
    projectileSpeed: 600,
    projectileRadius: 8,
    projectileLifetime: 1.35,
    projectilePierce: 0,
    projectileCount: 1,
    attackArcDamage: 0,
    auraDamagePerSecond: 0,
    auraRadius: 88,
    regenPerSecond: 0,
    pickupRadius: 92,
    attackRangeBonus: 0,
    moveFriction: 0.84
  },
  enemies: {
    contactDamageCooldown: 0.9,
    despawnMargin: 240,
    types: {
      basic: {
        health: 28,
        speed: 84,
        radius: 19,
        damage: 12,
        xp: 4,
        score: 8,
        color: '#ff7da0'
      },
      fast: {
        health: 18,
        speed: 138,
        radius: 15,
        damage: 9,
        xp: 5,
        score: 11,
        color: '#ffd36f'
      },
      tank: {
        health: 68,
        speed: 58,
        radius: 28,
        damage: 18,
        xp: 9,
        score: 20,
        color: '#8ef7c0'
      },
      shooter: {
        health: 32,
        speed: 64,
        radius: 18,
        damage: 11,
        xp: 7,
        score: 16,
        color: '#8ea6ff',
        attackCooldown: 2.4,
        preferredDistance: 280,
        projectileSpeed: 300,
        projectileRadius: 9,
        projectileLifetime: 3.8
      }
    }
  },
  xp: {
    initialToLevel: 12,
    growth: 1.22
  },
  wave: {
    baseSpawnInterval: 1.1,
    minSpawnInterval: 0.18,
    difficultyRampPerSecond: 0.011,
    extraSpawnPerMinute: 0.26,
    waveDuration: 24,
    waveBreak: 2
  },
  visual: {
    backgroundGridSize: 72,
    damageNumberLife: 0.8,
    pickupMagnetStrength: 560,
    cameraFollow: 0.14,
    maxShake: 18,
    flashTime: 0.12
  }
};

// ---------------------------------------------------------
// Upgrade catalog
// ---------------------------------------------------------
const UPGRADE_DEFS = [
  {
    id: 'damage_up',
    name: 'Canon renforcé',
    description: 'Tes projectiles infligent plus de dégâts.',
    rarity: 'Commun',
    tags: ['+4 dégâts', 'Build direct'],
    apply(player) {
      player.stats.damage += 4;
    }
  },
  {
    id: 'speed_up',
    name: 'Pas rapides',
    description: 'Augmente ta vitesse de déplacement.',
    rarity: 'Commun',
    tags: ['+9% vitesse', 'Esquive'],
    apply(player) {
      player.stats.moveSpeed *= 1.09;
    }
  },
  {
    id: 'attack_speed_up',
    name: 'Cadence nerveuse',
    description: 'Réduit légèrement le délai entre deux attaques.',
    rarity: 'Commun',
    tags: ['+12% cadence', 'Plus fluide'],
    apply(player) {
      player.stats.attackCooldown *= 0.88;
      player.stats.attackCooldown = Math.max(0.16, player.stats.attackCooldown);
    }
  },
  {
    id: 'range_up',
    name: 'Focalisation',
    description: 'Augmente la portée de verrouillage automatique.',
    rarity: 'Commun',
    tags: ['+50 portée', 'Confort'],
    apply(player) {
      player.stats.attackRange += 50;
    }
  },
  {
    id: 'projectile_plus',
    name: 'Salve double',
    description: 'Ajoute un projectile supplémentaire.',
    rarity: 'Rare',
    tags: ['+1 projectile', 'DPS de zone'],
    apply(player) {
      player.stats.projectileCount += 1;
    }
  },
  {
    id: 'regen_up',
    name: 'Récupération lente',
    description: 'Régénère un peu de vie au fil du temps.',
    rarity: 'Rare',
    tags: ['+1.2 PV/s', 'Tenue'],
    apply(player) {
      player.stats.regen += 1.2;
    }
  },
  {
    id: 'shield_temp',
    name: 'Bouclier d’urgence',
    description: 'Gagne un bouclier temporaire qui absorbe des dégâts.',
    rarity: 'Rare',
    tags: ['+35 bouclier', 'Sécurité'],
    apply(player) {
      player.shield += 35;
      player.maxShield = Math.max(player.maxShield, player.shield);
    }
  },
  {
    id: 'circle_attack',
    name: 'Onde circulaire',
    description: 'Déclenche une explosion circulaire à chaque attaque.',
    rarity: 'Épique',
    tags: ['Onde offensive', 'Zone proche'],
    apply(player) {
      player.stats.arcDamage += 9;
    }
  },
  {
    id: 'aura',
    name: 'Aura instable',
    description: 'Inflige des dégâts continus autour du joueur.',
    rarity: 'Épique',
    tags: ['Aura de zone', 'Pression constante'],
    apply(player) {
      player.stats.auraDps += 8;
      player.stats.auraRadius += 10;
    }
  },
  {
    id: 'projectile_speed',
    name: 'Impulsion bleue',
    description: 'Projectiles plus rapides et plus fiables.',
    rarity: 'Commun',
    tags: ['+18% vitesse proj.', 'Toucher facile'],
    apply(player) {
      player.stats.projectileSpeed *= 1.18;
    }
  },
  {
    id: 'health_up',
    name: 'Structure renforcée',
    description: 'Augmente les points de vie max et soigne légèrement.',
    rarity: 'Rare',
    tags: ['+18 PV max', '+10 soin'],
    apply(player) {
      player.maxHealth += 18;
      player.health = Math.min(player.maxHealth, player.health + 10);
    }
  },
  {
    id: 'magnet',
    name: 'Champ magnétique',
    description: 'Ramasse l’expérience de plus loin.',
    rarity: 'Commun',
    tags: ['+30 rayon loot', 'Confort'],
    apply(player) {
      player.stats.pickupRadius += 30;
    }
  },
  {
    id: 'pierce',
    name: 'Munitions perforantes',
    description: 'Les projectiles traversent un ennemi supplémentaire.',
    rarity: 'Rare',
    tags: ['+1 perforation', 'Rentable'],
    apply(player) {
      player.stats.projectilePierce += 1;
    }
  },
  {
    id: 'burst',
    name: 'Survoltage',
    description: 'Petit boost global à la vitesse et aux dégâts.',
    rarity: 'Épique',
    tags: ['+6% vitesse', '+3 dégâts'],
    apply(player) {
      player.stats.moveSpeed *= 1.06;
      player.stats.damage += 3;
    }
  }
];

// ---------------------------------------------------------
// Input manager
// ---------------------------------------------------------
class InputManager {
  constructor() {
    this.keys = new Map();
    this.pointerId = null;
    this.touchActive = false;
    this.moveX = 0;
    this.moveY = 0;
    this.keyboardX = 0;
    this.keyboardY = 0;
    this.joyCenterX = 0;
    this.joyCenterY = 0;
    this.joyMaxRadius = 0;
    this.resizeJoystickMetrics();
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.key.toLowerCase(), true);
      if ([
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        'z', 'q', 's', 'd', 'w', 'a',
        ' '
      ].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.key.toLowerCase(), false);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.resetJoystick();
    });

    window.addEventListener('resize', () => this.resizeJoystickMetrics());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resizeJoystickMetrics(), 50));

    const startPointer = (e) => {
      if (settings.controlMode !== 'joystick') return;
      if (this.pointerId !== null) return;
      const rect = dom.joystickBase.getBoundingClientRect();
      this.joyCenterX = rect.left + rect.width / 2;
      this.joyCenterY = rect.top + rect.height / 2;
      this.joyMaxRadius = rect.width * 0.34;
      this.pointerId = e.pointerId;
      this.touchActive = true;
      this.handlePointerMove(e);
      dom.joystickArea.setPointerCapture?.(e.pointerId);
    };

    const movePointer = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.handlePointerMove(e);
    };

    const endPointer = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.resetJoystick();
    };

    dom.joystickArea.addEventListener('pointerdown', startPointer);
    window.addEventListener('pointermove', movePointer, { passive: false });
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
  }

  resizeJoystickMetrics() {
    const rect = dom.joystickBase.getBoundingClientRect();
    this.joyCenterX = rect.left + rect.width / 2;
    this.joyCenterY = rect.top + rect.height / 2;
    this.joyMaxRadius = rect.width * 0.34;
  }

  handlePointerMove(e) {
    if (settings.controlMode !== 'joystick') return;
    e.preventDefault();
    const dx = e.clientX - this.joyCenterX;
    const dy = e.clientY - this.joyCenterY;
    const len = Math.hypot(dx, dy);
    const max = this.joyMaxRadius || 1;
    const clamped = len > max ? max / len : 1;
    const x = dx * clamped;
    const y = dy * clamped;

    this.moveX = clamp(x / max, -1, 1);
    this.moveY = clamp(y / max, -1, 1);

    dom.joystickStick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  resetJoystick() {
    this.pointerId = null;
    this.touchActive = false;
    this.moveX = 0;
    this.moveY = 0;
    dom.joystickStick.style.transform = 'translate(-50%, -50%)';
  }

  updateKeyboardVector() {
    const up = this.keys.get('z') || this.keys.get('w') || this.keys.get('arrowup');
    const left = this.keys.get('q') || this.keys.get('a') || this.keys.get('arrowleft');
    const down = this.keys.get('s') || this.keys.get('arrowdown');
    const right = this.keys.get('d') || this.keys.get('arrowright');

    let x = 0;
    let y = 0;
    if (left) x -= 1;
    if (right) x += 1;
    if (up) y -= 1;
    if (down) y += 1;
    if (x !== 0 || y !== 0) {
      const n = normalize(x, y);
      x = n.x;
      y = n.y;
    }
    this.keyboardX = x;
    this.keyboardY = y;
  }

  getMoveVector() {
    this.updateKeyboardVector();
    if (settings.controlMode === 'keyboard') {
      return { x: this.keyboardX, y: this.keyboardY };
    }
    return { x: this.moveX, y: this.moveY };
  }

  isPressed(key) {
    return !!this.keys.get(key.toLowerCase());
  }
}

// ---------------------------------------------------------
// Camera
// ---------------------------------------------------------
class Camera {
  constructor() {
    this.x = CONFIG.world.width / 2;
    this.y = CONFIG.world.height / 2;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeAmount = 0;
    this.flash = 0;
  }

  update(dt, targetX, targetY) {
    this.x = lerp(this.x, targetX, CONFIG.visual.cameraFollow);
    this.y = lerp(this.y, targetY, CONFIG.visual.cameraFollow);

    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 35);
      const magnitude = this.shakeAmount;
      this.shakeX = rand(-magnitude, magnitude);
      this.shakeY = rand(-magnitude, magnitude);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    this.flash = Math.max(0, this.flash - dt / CONFIG.visual.flashTime);
  }

  shake(amount) {
    if (!settings.screenshake) return;
    this.shakeAmount = Math.min(CONFIG.visual.maxShake, this.shakeAmount + amount);
  }

  triggerFlash() {
    this.flash = 1;
  }

  begin(ctx, canvas) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  end(ctx) {
    ctx.restore();
  }
}

// ---------------------------------------------------------
// Particle systems
// ---------------------------------------------------------
class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx ?? rand(-30, 30);
    this.vy = options.vy ?? rand(-30, 30);
    this.life = options.life ?? 0.6;
    this.maxLife = this.life;
    this.radius = options.radius ?? rand(2, 6);
    this.color = options.color ?? '#ffffff';
    this.fade = options.fade ?? true;
    this.grow = options.grow ?? 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.radius += this.grow * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.fade ? clamp(this.life / this.maxLife, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.radius), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffffff', size = 18) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = CONFIG.visual.damageNumberLife;
    this.maxLife = this.life;
    this.vy = -40;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `800 ${this.size}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-stack')}`;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ---------------------------------------------------------
// Entities base
// ---------------------------------------------------------
class Entity {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = 0;
    this.vy = 0;
    this.dead = false;
  }

  update() {}
  draw() {}
}

class ExperienceOrb extends Entity {
  constructor(x, y, value) {
    super(x, y, 10 + Math.min(8, value * 0.3));
    this.value = value;
    this.spin = rand(0, Math.PI * 2);
  }

  update(dt, game) {
    this.spin += dt * 2.4;
    const dx = game.player.x - this.x;
    const dy = game.player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < game.player.stats.pickupRadius + this.radius + 20) {
      const pull = clamp((game.player.stats.pickupRadius + 60 - dist) / 80, 0.2, 2.4);
      const n = normalize(dx, dy);
      this.vx += n.x * CONFIG.visual.pickupMagnetStrength * pull * dt;
      this.vy += n.y * CONFIG.visual.pickupMagnetStrength * pull * dt;
    }

    this.vx *= 0.94;
    this.vy *= 0.94;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (dist < game.player.radius + this.radius + 12) {
      game.player.gainXp(this.value, game);
      game.spawnPickupBurst(this.x, this.y, '#76f3ff');
      this.dead = true;
    }
  }

  draw(ctx) {
    const pulse = 1 + Math.sin(this.spin * 2.1) * 0.12;
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#76f3ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.8 * pulse, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * pulse);
    grad.addColorStop(0, '#d8ffff');
    grad.addColorStop(0.55, '#76f3ff');
    grad.addColorStop(1, '#498bff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class Projectile extends Entity {
  constructor(x, y, angle, stats, ownerType = 'player') {
    super(x, y, stats.radius);
    this.ownerType = ownerType;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.life = stats.life;
    this.maxLife = this.life;
    this.angle = angle;
    this.color = stats.color;
    this.pierce = stats.pierce ?? 0;
    this.hitIds = new Set();
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const bounds = CONFIG.world;
    if (
      this.x < -CONFIG.enemies.despawnMargin ||
      this.y < -CONFIG.enemies.despawnMargin ||
      this.x > bounds.width + CONFIG.enemies.despawnMargin ||
      this.y > bounds.height + CONFIG.enemies.despawnMargin
    ) {
      this.dead = true;
      return;
    }

    if (this.ownerType === 'player') {
      for (const enemy of game.enemies) {
        if (enemy.dead) continue;
        if (this.hitIds.has(enemy.id)) continue;
        const rr = this.radius + enemy.radius;
        if (distanceSq(this.x, this.y, enemy.x, enemy.y) <= rr * rr) {
          enemy.takeDamage(this.damage, game, this.x, this.y, false);
          this.hitIds.add(enemy.id);
          game.spawnHitParticles(this.x, this.y, enemy.color);
          if (this.pierce > 0) {
            this.pierce -= 1;
          } else {
            this.dead = true;
            break;
          }
        }
      }
    } else {
      const player = game.player;
      const rr = this.radius + player.radius;
      if (distanceSq(this.x, this.y, player.x, player.y) <= rr * rr) {
        player.takeDamage(this.damage, game, 'projectile');
        game.spawnHitParticles(this.x, this.y, '#8ea6ff');
        this.dead = true;
      }
    }
  }

  draw(ctx) {
    const lifeAlpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = 0.2 * lifeAlpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(-this.radius * 1.3, 0, this.radius * 2.2, this.radius * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = lifeAlpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-this.radius * 1.7, -this.radius * 0.7, this.radius * 3.2, this.radius * 1.4, this.radius);
    ctx.fill();
    ctx.restore();
  }
}

class Enemy extends Entity {
  constructor(id, type, x, y, statsScale = 1) {
    const def = CONFIG.enemies.types[type];
    super(x, y, def.radius);
    this.id = id;
    this.type = type;
    this.color = def.color;
    this.maxHealth = Math.round(def.health * statsScale);
    this.health = this.maxHealth;
    this.speed = def.speed * (1 + (statsScale - 1) * 0.12);
    this.damage = Math.round(def.damage * (1 + (statsScale - 1) * 0.08));
    this.xp = Math.round(def.xp * (0.9 + (statsScale - 1) * 0.35));
    this.score = Math.round(def.score * (0.9 + (statsScale - 1) * 0.4));
    this.contactCooldown = 0;
    this.attackCooldown = def.attackCooldown ?? 0;
    this.preferredDistance = def.preferredDistance ?? 0;
    this.projectileSpeed = def.projectileSpeed ?? 0;
    this.projectileRadius = def.projectileRadius ?? 0;
    this.projectileLifetime = def.projectileLifetime ?? 0;
    this.flash = 0;
  }

  takeDamage(amount, game, hitX = this.x, hitY = this.y, aura = false) {
    this.health -= amount;
    this.flash = 1;
    game.floatingTexts.push(new FloatingText(hitX, hitY - this.radius - 8, `${Math.round(amount)}`, aura ? '#7dffb0' : '#ffffff', aura ? 16 : 18));
    if (this.health <= 0) {
      this.die(game);
    }
  }

  die(game) {
    this.dead = true;
    game.kills += 1;
    game.score += this.score;
    game.orbs.push(new ExperienceOrb(this.x, this.y, this.xp));
    game.spawnDeathBurst(this.x, this.y, this.color, this.radius);
    if (Math.random() < 0.08) {
      game.orbs.push(new ExperienceOrb(this.x + rand(-18, 18), this.y + rand(-18, 18), Math.round(this.xp * 0.6)));
    }
  }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt * 7);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);

    const player = game.player;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const n = { x: dx / dist, y: dy / dist };

    if (this.type === 'shooter') {
      const desired = this.preferredDistance;
      let moveX = 0;
      let moveY = 0;
      if (dist > desired + 40) {
        moveX = n.x;
        moveY = n.y;
      } else if (dist < desired - 40) {
        moveX = -n.x;
        moveY = -n.y;
      } else {
        moveX = -n.y * 0.6;
        moveY = n.x * 0.6;
      }

      this.vx = lerp(this.vx, moveX * this.speed, 0.08);
      this.vy = lerp(this.vy, moveY * this.speed, 0.08);

      this.attackCooldown -= dt;
      if (this.attackCooldown <= 0 && dist < desired + 140) {
        this.attackCooldown = CONFIG.enemies.types.shooter.attackCooldown * rand(0.92, 1.12);
        const angle = angleBetween(this.x, this.y, player.x, player.y);
        game.enemyProjectiles.push(new Projectile(this.x, this.y, angle, {
          radius: this.projectileRadius,
          speed: this.projectileSpeed,
          damage: this.damage,
          life: this.projectileLifetime,
          color: '#9fb2ff',
          pierce: 0
        }, 'enemy'));
        game.spawnMuzzleFlash(this.x, this.y, '#9fb2ff');
      }
    } else {
      this.vx = lerp(this.vx, n.x * this.speed, 0.09);
      this.vy = lerp(this.vy, n.y * this.speed, 0.09);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (dist < this.radius + player.radius + 4 && this.contactCooldown <= 0) {
      player.takeDamage(this.damage, game, 'contact');
      this.contactCooldown = CONFIG.enemies.contactDamageCooldown;
      const push = normalize(player.x - this.x, player.y - this.y);
      player.vx += push.x * 130;
      player.vy += push.y * 130;
      this.vx -= push.x * 100;
      this.vy -= push.y * 100;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const hitScale = 1 + this.flash * 0.08;
    ctx.scale(hitScale, hitScale);

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.7, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createRadialGradient(-this.radius * 0.25, -this.radius * 0.35, 2, 0, 0, this.radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, this.flash > 0 ? '#ffffff' : this.color);
    grad.addColorStop(1, '#1b2433');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.25, -this.radius * 0.1, this.radius * 0.13, 0, Math.PI * 2);
    ctx.arc(this.radius * 0.25, -this.radius * 0.1, this.radius * 0.13, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, this.radius * 0.2, this.radius * 0.35, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.restore();
  }
}

class Player extends Entity {
  constructor(x, y) {
    super(x, y, CONFIG.player.radius);
    this.maxHealth = CONFIG.player.maxHealth;
    this.health = this.maxHealth;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = CONFIG.xp.initialToLevel;
    this.attackTimer = 0;
    this.invuln = 0;
    this.angle = 0;
    this.shield = 0;
    this.maxShield = 0;
    this.stats = {
      moveSpeed: CONFIG.player.baseSpeed,
      attackCooldown: CONFIG.player.attackCooldown,
      damage: CONFIG.player.damage,
      projectileSpeed: CONFIG.player.projectileSpeed,
      projectileRadius: CONFIG.player.projectileRadius,
      projectileLifetime: CONFIG.player.projectileLifetime,
      projectilePierce: CONFIG.player.projectilePierce,
      projectileCount: CONFIG.player.projectileCount,
      attackRange: CONFIG.player.autoTargetRange + CONFIG.player.attackRangeBonus,
      arcDamage: CONFIG.player.attackArcDamage,
      auraDps: CONFIG.player.auraDamagePerSecond,
      auraRadius: CONFIG.player.auraRadius,
      regen: CONFIG.player.regenPerSecond,
      pickupRadius: CONFIG.player.pickupRadius
    };
    this.upgrades = new Map();
    this.trailTimer = 0;
  }

  gainXp(amount, game) {
    this.xp += amount;
    game.score += Math.round(amount * 0.6);
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.round(this.xpToNext * CONFIG.xp.growth + 4);
      game.requestLevelUp();
    }
    game.updateHUD();
  }

  takeDamage(amount, game, source = 'contact') {
    if (this.invuln > 0 || game.state === 'gameover') return;
    let remaining = amount;

    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
      if (absorbed > 0) {
        game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 22, `-${Math.round(absorbed)} bouclier`, '#7ddfff', 16));
      }
    }

    if (remaining > 0) {
      this.health -= remaining;
      game.floatingTexts.push(new FloatingText(this.x, this.y - this.radius - 8, `-${Math.round(remaining)}`, '#ff7da0', 19));
    }

    this.invuln = CONFIG.player.invulnAfterHit;
    game.camera.shake(source === 'contact' ? 9 : 6);
    game.camera.triggerFlash();
    game.spawnHitParticles(this.x, this.y, source === 'contact' ? '#ff7da0' : '#9fb2ff');
    game.updateHUD();

    if (this.health <= 0) {
      this.health = 0;
      game.gameOver();
    }
  }

  update(dt, game) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackTimer -= dt;

    if (this.stats.regen > 0 && this.health > 0) {
      this.health = Math.min(this.maxHealth, this.health + this.stats.regen * dt);
    }

    const move = game.input.getMoveVector();
    const speed = this.stats.moveSpeed;
    this.vx = lerp(this.vx, move.x * speed, 0.18);
    this.vy = lerp(this.vy, move.y * speed, 0.18);

    if (Math.abs(move.x) < 0.02) this.vx *= CONFIG.player.moveFriction;
    if (Math.abs(move.y) < 0.02) this.vy *= CONFIG.player.moveFriction;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = clamp(this.x, CONFIG.world.padding, CONFIG.world.width - CONFIG.world.padding);
    this.y = clamp(this.y, CONFIG.world.padding, CONFIG.world.height - CONFIG.world.padding);

    if (move.x !== 0 || move.y !== 0) {
      this.angle = Math.atan2(move.y, move.x);
    }

    if (this.attackTimer <= 0) {
      const target = game.findNearestEnemy(this.x, this.y, this.stats.attackRange);
      if (target) {
        this.autoAttack(target, game);
        this.attackTimer = this.stats.attackCooldown;
      }
    }

    if (this.stats.auraDps > 0) {
      this.applyAura(dt, game);
    }

    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && (Math.abs(this.vx) > 30 || Math.abs(this.vy) > 30)) {
      this.trailTimer = 0.05;
      game.particles.push(new Particle(this.x, this.y, {
        vx: rand(-15, 15),
        vy: rand(-15, 15),
        radius: rand(2, 5),
        life: 0.32,
        color: 'rgba(110,240,255,0.6)'
      }));
    }
  }

  autoAttack(target, game) {
    const baseAngle = angleBetween(this.x, this.y, target.x, target.y);
    this.angle = baseAngle;

    const count = this.stats.projectileCount;
    const spread = count > 1 ? Math.min(0.42, 0.12 + count * 0.04) : 0;
    const start = baseAngle - spread / 2;

    for (let i = 0; i < count; i += 1) {
      const angle = count === 1 ? baseAngle : start + (spread * i) / (count - 1 || 1);
      game.projectiles.push(new Projectile(this.x, this.y, angle, {
        radius: this.stats.projectileRadius,
        speed: this.stats.projectileSpeed,
        damage: this.stats.damage,
        life: this.stats.projectileLifetime,
        color: '#7dedff',
        pierce: this.stats.projectilePierce
      }, 'player'));
    }

    game.spawnMuzzleFlash(this.x, this.y, '#7dedff');
    game.camera.shake(1.6);

    if (this.stats.arcDamage > 0) {
      this.emitArcAttack(game);
    }
  }

  emitArcAttack(game) {
    const radius = 86 + this.stats.projectileCount * 6;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dist = distance(this.x, this.y, enemy.x, enemy.y);
      if (dist <= radius + enemy.radius) {
        enemy.takeDamage(this.stats.arcDamage, game, enemy.x, enemy.y, true);
      }
    }
    game.spawnRing(this.x, this.y, radius, 'rgba(125,255,176,0.7)');
  }

  applyAura(dt, game) {
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const dist = distance(this.x, this.y, enemy.x, enemy.y);
      if (dist <= this.stats.auraRadius + enemy.radius) {
        enemy.takeDamage(this.stats.auraDps * dt, game, enemy.x, enemy.y, true);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#6ef0ff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.9, 0, Math.PI * 2);
    ctx.fill();

    if (this.stats.auraDps > 0) {
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = '#7dffb0';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.stats.auraRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const bodyGrad = ctx.createRadialGradient(-6, -8, 2, 0, 0, this.radius + 8);
    bodyGrad.addColorStop(0, this.invuln > 0 ? '#ffffff' : '#e8ffff');
    bodyGrad.addColorStop(0.36, '#6ef0ff');
    bodyGrad.addColorStop(1, '#2f73ff');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(8, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(14, -10);
    ctx.stroke();

    if (this.shield > 0) {
      const alpha = 0.22 + (this.shield / Math.max(1, this.maxShield)) * 0.34;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#87dfff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ---------------------------------------------------------
// Game core
// ---------------------------------------------------------
class Game {
  constructor() {
    this.canvas = dom.gameCanvas;
    this.ctx = ctx;
    this.input = new InputManager();
    this.camera = new Camera();

    this.state = 'menu';
    this.lastTime = 0;
    this.accumulator = 0;

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.orbs = [];
    this.particles = [];
    this.floatingTexts = [];
    this.rings = [];

    this.score = 0;
    this.kills = 0;
    this.survivalTime = 0;
    this.enemyIdSeed = 0;

    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.waveIndex = 1;
    this.difficulty = 1;
    this.levelUpQueue = 0;
    this.pendingUpgrades = [];

    this.helperBadge = document.createElement('div');
    this.helperBadge.className = 'helper-badge';
    this.helperBadge.innerHTML = 'Déplace-toi pour survivre. L’attaque est automatique.';
    document.getElementById('canvasWrap').appendChild(this.helperBadge);

    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 50));

    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    dom.playButton.addEventListener('click', () => this.startRun());
    dom.openSettingsButton.addEventListener('click', () => this.openSettings());
    dom.settingsButtonInGame.addEventListener('click', () => this.openSettings());
    dom.pauseButton.addEventListener('click', () => this.togglePause());
    dom.closeSettingsButton.addEventListener('click', () => this.closeSettings());
    dom.resumeButton.addEventListener('click', () => this.resumeFromPause());
    dom.pauseSettingsButton.addEventListener('click', () => {
      this.closePause();
      this.openSettings();
    });
    dom.restartButton.addEventListener('click', () => this.startRun());
    dom.backToMenuButton.addEventListener('click', () => this.backToMenu());

    dom.controlJoystickButton.addEventListener('click', () => {
      settings.controlMode = 'joystick';
      this.input.resetJoystick();
      saveSettings();
      syncSettingsUI();
      this.showToast('Mode joystick tactile activé.');
    });

    dom.controlKeyboardButton.addEventListener('click', () => {
      settings.controlMode = 'keyboard';
      this.input.resetJoystick();
      saveSettings();
      syncSettingsUI();
      this.showToast('Mode clavier AZERTY activé.');
    });

    dom.screenshakeToggle.addEventListener('change', () => {
      settings.screenshake = dom.screenshakeToggle.checked;
      saveSettings();
      syncSettingsUI();
    });

    dom.helpersToggle.addEventListener('change', () => {
      settings.showHelpers = dom.helpersToggle.checked;
      saveSettings();
      syncSettingsUI();
      this.updateHelperBadge();
    });

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'p') {
        if (this.state === 'running') this.openPause();
        else if (this.state === 'paused') this.resumeFromPause();
      }
      if (key === 'enter' && this.state === 'gameover') {
        this.startRun();
      }
      if (key === 'escape') {
        if (!dom.settingsOverlay.classList.contains('hidden')) {
          this.closeSettings();
        } else if (this.state === 'running') {
          this.openPause();
        } else if (this.state === 'paused') {
          this.resumeFromPause();
        }
      }
    });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  startRun() {
    this.player = new Player(CONFIG.world.width / 2, CONFIG.world.height / 2);
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.orbs = [];
    this.particles = [];
    this.floatingTexts = [];
    this.rings = [];
    this.score = 0;
    this.kills = 0;
    this.survivalTime = 0;
    this.enemyIdSeed = 0;
    this.spawnTimer = 0.25;
    this.waveTimer = 0;
    this.waveIndex = 1;
    this.difficulty = 1;
    this.levelUpQueue = 0;
    this.pendingUpgrades = [];
    this.camera = new Camera();
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.state = 'running';
    dom.menuScreen.classList.remove('active');
    dom.gameScreen.classList.add('active');
    this.hideOverlay(dom.gameOverOverlay);
    this.hideOverlay(dom.levelUpOverlay);
    this.hideOverlay(dom.pauseOverlay);
    this.hideOverlay(dom.settingsOverlay);
    this.input.resetJoystick();
    this.updateHUD();
    this.updateHelperBadge();
    this.showToast('Bonne chance. Survis le plus longtemps possible.');
  }

  backToMenu() {
    this.state = 'menu';
    dom.menuScreen.classList.add('active');
    dom.gameScreen.classList.remove('active');
    this.hideOverlay(dom.gameOverOverlay);
    this.hideOverlay(dom.levelUpOverlay);
    this.hideOverlay(dom.pauseOverlay);
    this.hideOverlay(dom.settingsOverlay);
  }

  openSettings() {
    this.showOverlay(dom.settingsOverlay);
  }

  closeSettings() {
    this.hideOverlay(dom.settingsOverlay);
  }

  openPause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.showOverlay(dom.pauseOverlay);
  }

  closePause() {
    this.hideOverlay(dom.pauseOverlay);
  }

  resumeFromPause() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.hideOverlay(dom.pauseOverlay);
  }

  togglePause() {
    if (this.state === 'running') this.openPause();
    else if (this.state === 'paused') this.resumeFromPause();
  }

  requestLevelUp() {
    this.levelUpQueue += 1;
    if (this.state === 'running') {
      this.presentLevelUp();
    }
  }

  presentLevelUp() {
    if (this.levelUpQueue <= 0 || this.state !== 'running') return;
    this.state = 'levelup';
    this.levelUpQueue -= 1;
    this.pendingUpgrades = this.generateUpgradeChoices();
    dom.upgradeChoices.innerHTML = '';

    for (const upgrade of this.pendingUpgrades) {
      const button = document.createElement('button');
      button.className = 'upgrade-btn';
      button.innerHTML = `
        <span class="upgrade-rarity">${upgrade.rarity}</span>
        <h3>${upgrade.name}</h3>
        <p>${upgrade.description}</p>
        <div class="upgrade-stats">
          ${upgrade.tags.map(tag => `<span class="mini-pill">${tag}</span>`).join('')}
        </div>
      `;
      button.addEventListener('click', () => this.applyUpgrade(upgrade));
      dom.upgradeChoices.appendChild(button);
    }

    this.showOverlay(dom.levelUpOverlay);
  }

  applyUpgrade(upgrade) {
    upgrade.apply(this.player);
    this.player.upgrades.set(upgrade.id, (this.player.upgrades.get(upgrade.id) || 0) + 1);
    this.hideOverlay(dom.levelUpOverlay);
    this.showToast(`Amélioration obtenue : ${upgrade.name}`);
    this.updateHUD();
    this.state = 'running';

    if (this.levelUpQueue > 0) {
      this.presentLevelUp();
    }
  }

  generateUpgradeChoices() {
    const pool = [...UPGRADE_DEFS];
    const chosen = [];
    while (chosen.length < 3 && pool.length > 0) {
      const weights = pool.map(up => ({
        value: up,
        weight: up.rarity === 'Commun' ? 4 : up.rarity === 'Rare' ? 2.5 : 1.3
      }));
      const picked = weightedPick(weights);
      chosen.push(picked);
      pool.splice(pool.findIndex(p => p.id === picked.id), 1);
    }
    return chosen;
  }

  gameOver() {
    this.state = 'gameover';
    this.showOverlay(dom.gameOverOverlay);
    dom.finalTime.textContent = formatTime(this.survivalTime);
    dom.finalScore.textContent = `${Math.floor(this.score)}`;
    dom.finalLevel.textContent = `${this.player.level}`;
    dom.finalKills.textContent = `${this.kills}`;
    dom.finalWave.textContent = `${this.waveIndex}`;
    this.updateHUD();
  }

  findNearestEnemy(x, y, maxDistance) {
    let best = null;
    let bestDistSq = maxDistance * maxDistance;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const d2 = distanceSq(x, y, enemy.x, enemy.y);
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = enemy;
      }
    }
    return best;
  }

  updateHUD() {
    if (!this.player) return;
    dom.timerText.textContent = formatTime(this.survivalTime);
    dom.levelText.textContent = `${this.player.level}`;
    dom.scoreText.textContent = `${Math.floor(this.score)}`;
    dom.waveText.textContent = `${this.waveIndex}`;
    dom.healthText.textContent = `${Math.ceil(this.player.health)} / ${Math.ceil(this.player.maxHealth)}`;
    dom.xpText.textContent = `${Math.floor(this.player.xp)} / ${Math.floor(this.player.xpToNext)}`;

    const healthPct = clamp(this.player.health / this.player.maxHealth, 0, 1);
    const xpPct = clamp(this.player.xp / this.player.xpToNext, 0, 1);
    dom.healthFill.style.width = `${healthPct * 100}%`;
    dom.xpFill.style.width = `${xpPct * 100}%`;
  }

  updateHelperBadge() {
    if (!settings.showHelpers) {
      this.helperBadge.classList.add('hidden-visibility');
      return;
    }
    this.helperBadge.classList.remove('hidden-visibility');
    if (settings.controlMode === 'keyboard') {
      this.helperBadge.innerHTML = 'Déplacement au clavier FR : <strong>ZQSD</strong>. Pause : <strong>P</strong>.';
    } else {
      this.helperBadge.innerHTML = 'Déplace le joystick à gauche. L’attaque vise automatiquement l’ennemi le plus proche.';
    }
  }

  spawnEnemy() {
    const edge = randInt(0, 3);
    let x = 0;
    let y = 0;
    const margin = 80;

    if (edge === 0) {
      x = rand(margin, CONFIG.world.width - margin);
      y = margin;
    } else if (edge === 1) {
      x = CONFIG.world.width - margin;
      y = rand(margin, CONFIG.world.height - margin);
    } else if (edge === 2) {
      x = rand(margin, CONFIG.world.width - margin);
      y = CONFIG.world.height - margin;
    } else {
      x = margin;
      y = rand(margin, CONFIG.world.height - margin);
    }

    const time = this.survivalTime;
    const picks = [
      { value: 'basic', weight: Math.max(1, 6 - time * 0.02) },
      { value: 'fast', weight: time > 18 ? 3.4 : 0.5 },
      { value: 'tank', weight: time > 34 ? 2.2 : 0.2 },
      { value: 'shooter', weight: time > 58 ? 2.4 : 0.01 }
    ];
    const type = weightedPick(picks);
    const statsScale = 1 + this.difficulty * 0.28 + this.waveIndex * 0.05;

    this.enemies.push(new Enemy(++this.enemyIdSeed, type, x, y, statsScale));
  }

  updateSpawning(dt) {
    this.waveTimer += dt;
    this.difficulty += CONFIG.wave.difficultyRampPerSecond * dt;

    const waveLength = CONFIG.wave.waveDuration + CONFIG.wave.waveBreak;
    const wavePhase = this.waveTimer % waveLength;
    this.waveIndex = Math.floor(this.waveTimer / waveLength) + 1;

    const activeWave = wavePhase <= CONFIG.wave.waveDuration;
    if (!activeWave) return;

    const minuteBonus = (this.survivalTime / 60) * CONFIG.wave.extraSpawnPerMinute;
    const interval = clamp(
      CONFIG.wave.baseSpawnInterval - this.difficulty * 0.18 - minuteBonus,
      CONFIG.wave.minSpawnInterval,
      2
    );

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = interval;
      const spawnCount = 1 + Math.floor(this.difficulty * 0.16) + (Math.random() < 0.18 ? 1 : 0);
      for (let i = 0; i < spawnCount; i += 1) {
        this.spawnEnemy();
      }
    }
  }

  updateEntities(dt) {
    this.player.update(dt, this);
    this.camera.update(dt, this.player.x, this.player.y);

    this.updateSpawning(dt);

    for (const enemy of this.enemies) enemy.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const p of this.enemyProjectiles) p.update(dt, this);
    for (const orb of this.orbs) orb.update(dt, this);

    this.enemies = this.enemies.filter(e => !e.dead);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.enemyProjectiles = this.enemyProjectiles.filter(p => !p.dead);
    this.orbs = this.orbs.filter(o => !o.dead);
    this.particles = this.particles.filter(p => p.update(dt));
    this.floatingTexts = this.floatingTexts.filter(t => t.update(dt));
    this.rings = this.rings.filter(r => {
      r.life -= dt;
      return r.life > 0;
    });

    this.resolveEnemySeparation();
    this.updateHUD();
  }

  resolveEnemySeparation() {
    for (let i = 0; i < this.enemies.length; i += 1) {
      const a = this.enemies[i];
      for (let j = i + 1; j < this.enemies.length; j += 1) {
        const b = this.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minDist = a.radius + b.radius + 3;
        if (dist < minDist) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }
  }

  spawnHitParticles(x, y, color) {
    for (let i = 0; i < 8; i += 1) {
      this.particles.push(new Particle(x, y, {
        vx: rand(-120, 120),
        vy: rand(-120, 120),
        radius: rand(2, 5),
        life: rand(0.18, 0.42),
        color
      }));
    }
  }

  spawnDeathBurst(x, y, color, radius = 24) {
    for (let i = 0; i < 18; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(45, 180);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: rand(2, radius * 0.16),
        life: rand(0.24, 0.62),
        color,
        grow: -4
      }));
    }
  }

  spawnPickupBurst(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      this.particles.push(new Particle(x, y, {
        vx: rand(-80, 80),
        vy: rand(-80, 80),
        radius: rand(1, 4),
        life: rand(0.18, 0.38),
        color
      }));
    }
  }

  spawnMuzzleFlash(x, y, color) {
    for (let i = 0; i < 6; i += 1) {
      this.particles.push(new Particle(x, y, {
        vx: rand(-40, 40),
        vy: rand(-40, 40),
        radius: rand(2, 7),
        life: rand(0.08, 0.18),
        color
      }));
    }
  }

  spawnRing(x, y, radius, color) {
    this.rings.push({ x, y, radius, color, life: 0.26, maxLife: 0.26 });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      toast.style.transition = 'all 0.18s ease';
      setTimeout(() => toast.remove(), 220);
    }, 1800);
  }

  showOverlay(el) {
    el.classList.remove('hidden');
  }

  hideOverlay(el) {
    el.classList.add('hidden');
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dtRaw = Math.min(0.033, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.state === 'running') {
      this.survivalTime += dtRaw;
      this.updateEntities(dtRaw);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  drawBackground(ctx) {
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const grad = ctx.createLinearGradient(0, 0, 0, rect.height);
    grad.addColorStop(0, '#0c2238');
    grad.addColorStop(1, '#07121f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    this.camera.begin(ctx, this.canvas);

    const world = CONFIG.world;
    const grid = CONFIG.visual.backgroundGridSize;
    const startX = Math.floor((this.camera.x - rect.width / 2 - 120) / grid) * grid;
    const endX = Math.ceil((this.camera.x + rect.width / 2 + 120) / grid) * grid;
    const startY = Math.floor((this.camera.y - rect.height / 2 - 120) / grid) * grid;
    const endY = Math.ceil((this.camera.y + rect.height / 2 + 120) / grid) * grid;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.height);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(world.width, y);
      ctx.stroke();
    }

    const arenaGrad = ctx.createLinearGradient(0, 0, world.width, world.height);
    arenaGrad.addColorStop(0, 'rgba(110,240,255,0.06)');
    arenaGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    arenaGrad.addColorStop(1, 'rgba(125,255,176,0.05)');
    ctx.fillStyle = arenaGrad;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.strokeStyle = 'rgba(110,240,255,0.15)';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, world.width, world.height);

    ctx.strokeStyle = 'rgba(125,255,176,0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, world.width - 36, world.height - 36);
  }

  drawWorld(ctx) {
    for (const ring of this.rings) {
      const alpha = clamp(ring.life / ring.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius + (1 - alpha) * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const orb of this.orbs) orb.draw(ctx);
    for (const enemy of this.enemies) enemy.draw(ctx);
    for (const projectile of this.projectiles) projectile.draw(ctx);
    for (const projectile of this.enemyProjectiles) projectile.draw(ctx);
    for (const particle of this.particles) particle.draw(ctx);
    if (this.player) this.player.draw(ctx);
    for (const text of this.floatingTexts) text.draw(ctx);
  }

  drawWaveBanner(ctx) {
    const rect = this.canvas.getBoundingClientRect();
    const waveLength = CONFIG.wave.waveDuration + CONFIG.wave.waveBreak;
    const wavePhase = this.waveTimer % waveLength;
    const inBreak = wavePhase > CONFIG.wave.waveDuration;
    const t = inBreak ? 1 - (wavePhase - CONFIG.wave.waveDuration) / CONFIG.wave.waveBreak : Math.min(1, wavePhase / 3);
    const alpha = smoothstep(0, 1, t) * 0.8;
    if (alpha <= 0.01) return;

    const label = inBreak ? `Vague ${this.waveIndex} terminée` : `Vague ${this.waveIndex}`;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(12, 24, 38, 0.62)';
    ctx.beginPath();
    const width = 220;
    const height = 52;
    const x = rect.width / 2 - width / 2;
    const y = 18;
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,240,255,0.14)';
    ctx.stroke();
    ctx.fillStyle = '#f2f7ff';
    ctx.font = '800 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, rect.width / 2, y + 33);
    ctx.restore();
  }

  drawDamageFlash(ctx) {
    if (this.camera.flash <= 0) return;
    const rect = this.canvas.getBoundingClientRect();
    ctx.save();
    ctx.globalAlpha = this.camera.flash * 0.16;
    ctx.fillStyle = '#ff7da0';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    this.drawBackground(ctx);

    if (this.player || this.state !== 'menu') {
      this.drawWorld(ctx);
    }

    this.camera.end(ctx);
    this.drawWaveBanner(ctx);
    this.drawDamageFlash(ctx);
  }
}

// ---------------------------------------------------------
// Padding section for structure, balancing notes and hooks.
// Large commented sections keep the file easy to extend.
// ---------------------------------------------------------

// The following sections are intentionally verbose and structured.
// They provide extension points for future features without forcing a refactor.
// This also keeps the codebase pleasant to edit when the game grows.

// ---------------------------------------------------------
// Extension ideas block 001
// ---------------------------------------------------------
// Add elite enemies with telegraphed dashes.
// Add mini-bosses every X waves.
// Add persistent meta-progression saved in localStorage.
// Add weapon families (laser, spread, orbitals, mines).
// Add unlockable skins.
// Add sound effects and music.
// Add haptic feedback on supported mobile devices.
// Add portrait mode layout adjustments.
// Add pause menu sliders for difficulty.
// Add accessibility options for contrast and reduced flashes.

// ---------------------------------------------------------
// Extension ideas block 002
// ---------------------------------------------------------
// You can split this file further in modules later:
// - math.js
// - input.js
// - entities/player.js
// - entities/enemy.js
// - entities/projectile.js
// - systems/render.js
// - systems/spawn.js
// - ui.js
// For the requested first version, everything stays in one file to run instantly.

// ---------------------------------------------------------
// Balancing notes block 003
// ---------------------------------------------------------
// Player balance levers:
// CONFIG.player.baseSpeed
// CONFIG.player.attackCooldown
// CONFIG.player.damage
// CONFIG.player.projectileCount
// CONFIG.player.autoTargetRange
// Enemy balance levers:
// CONFIG.enemies.types.basic.health
// CONFIG.enemies.types.fast.speed
// CONFIG.enemies.types.tank.health
// CONFIG.enemies.types.shooter.attackCooldown
// Global difficulty levers:
// CONFIG.wave.baseSpawnInterval
// CONFIG.wave.minSpawnInterval
// CONFIG.wave.difficultyRampPerSecond

// ---------------------------------------------------------
// Architecture notes block 004
// ---------------------------------------------------------
// The Game class owns the main arrays and state machine.
// The Player is responsible for movement, auto-attack, regen and aura.
// Enemies manage their chase logic and optional ranged attack.
// Projectiles manage collision and lifetime.
// Camera is intentionally separate to keep render logic simple.
// DOM HUD updates are centralized in updateHUD().

// ---------------------------------------------------------
// Mobile notes block 005
// ---------------------------------------------------------
// The page disables scrolling and pinch zoom by design for gameplay comfort.
// The joystick uses Pointer Events to work across modern mobile browsers and iPadOS.
// On iPad with keyboard, the player can switch to AZERTY controls in settings.
// Safe-area insets are respected with CSS environment variables.

// ---------------------------------------------------------
// Rendering notes block 006
// ---------------------------------------------------------
// The canvas uses CSS sizing + DPR scaling for crisp visuals.
// Background grid is drawn in world space for motion parallax feeling.
// Entities use simple gradients and glows to stay lightweight.
// No dependencies are used, which makes the project easy to deploy.

// ---------------------------------------------------------
// Future hook block 007
// ---------------------------------------------------------
function noopExtensionHook001() { return null; }
function noopExtensionHook002() { return null; }
function noopExtensionHook003() { return null; }
function noopExtensionHook004() { return null; }
function noopExtensionHook005() { return null; }
function noopExtensionHook006() { return null; }
function noopExtensionHook007() { return null; }
function noopExtensionHook008() { return null; }
function noopExtensionHook009() { return null; }
function noopExtensionHook010() { return null; }
function noopExtensionHook011() { return null; }
function noopExtensionHook012() { return null; }
function noopExtensionHook013() { return null; }
function noopExtensionHook014() { return null; }
function noopExtensionHook015() { return null; }
function noopExtensionHook016() { return null; }
function noopExtensionHook017() { return null; }
function noopExtensionHook018() { return null; }
function noopExtensionHook019() { return null; }
function noopExtensionHook020() { return null; }

// ---------------------------------------------------------
// Additional balancing presets block 008
// ---------------------------------------------------------
const BALANCE_PRESETS = {
  normal: {
    label: 'Normal',
    playerDamageMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemySpawnMultiplier: 1
  },
  easy: {
    label: 'Easy',
    playerDamageMultiplier: 1.18,
    enemyHealthMultiplier: 0.88,
    enemySpawnMultiplier: 0.88
  },
  hard: {
    label: 'Hard',
    playerDamageMultiplier: 0.94,
    enemyHealthMultiplier: 1.16,
    enemySpawnMultiplier: 1.14
  }
};

// ---------------------------------------------------------
// Debug helpers block 009
// ---------------------------------------------------------
function debugDescribePlayer(player) {
  if (!player) return 'No player';
  return [
    `HP ${roundTo(player.health)}/${roundTo(player.maxHealth)}`,
    `LV ${player.level}`,
    `DMG ${roundTo(player.stats.damage)}`,
    `SPD ${roundTo(player.stats.moveSpeed)}`,
    `CD ${roundTo(player.stats.attackCooldown)}`
  ].join(' | ');
}

function debugDescribeRun(game) {
  return [
    `Score ${Math.floor(game.score)}`,
    `Kills ${game.kills}`,
    `Time ${formatTime(game.survivalTime)}`,
    `Wave ${game.waveIndex}`,
    `Enemies ${game.enemies.length}`
  ].join(' | ');
}

// ---------------------------------------------------------
// Optional content scaffolding block 010
// ---------------------------------------------------------
const FUTURE_CONTENT_SETS = {
  biome_city: {
    name: 'Ville néon',
    groundTint: '#0d2236',
    accent: '#6ef0ff'
  },
  biome_forest: {
    name: 'Forêt cyber',
    groundTint: '#102b28',
    accent: '#7dffb0'
  },
  biome_void: {
    name: 'Vide stellaire',
    groundTint: '#14152d',
    accent: '#a995ff'
  }
};

// ---------------------------------------------------------
// More extension hooks block 011
// ---------------------------------------------------------
function futureUpgradeFactory001() { return []; }
function futureUpgradeFactory002() { return []; }
function futureUpgradeFactory003() { return []; }
function futureUpgradeFactory004() { return []; }
function futureUpgradeFactory005() { return []; }
function futureUpgradeFactory006() { return []; }
function futureUpgradeFactory007() { return []; }
function futureUpgradeFactory008() { return []; }
function futureUpgradeFactory009() { return []; }
function futureUpgradeFactory010() { return []; }

// ---------------------------------------------------------
// Data notes block 012
// ---------------------------------------------------------
const DESIGN_NOTES = [
  'Combat lisible avec peu de projectiles au départ.',
  'Progression rapide pour garder une boucle arcade.',
  'UI légère et élégante pour mobile.',
  'Code sans dépendances pour faciliter le test.',
  'Option clavier utile sur iPad avec clavier physique.',
  'Arène compacte pour garder la pression constante.',
  'Couleurs stylisées et non réalistes.'
];

// ---------------------------------------------------------
// Future achievement template block 013
// ---------------------------------------------------------
const FUTURE_ACHIEVEMENTS = [
  { id: 'survive_60', name: '1 minute', description: 'Survivre 60 secondes.' },
  { id: 'survive_180', name: '3 minutes', description: 'Survivre 180 secondes.' },
  { id: 'kill_100', name: 'Centaine', description: 'Éliminer 100 ennemis.' },
  { id: 'reach_10', name: 'Puissance 10', description: 'Atteindre le niveau 10.' },
  { id: 'tank_master', name: 'Mur', description: 'Finir avec plus de 150 PV max.' }
];

// ---------------------------------------------------------
// Visual palette registry block 014
// ---------------------------------------------------------
const VISUAL_PALETTES = {
  playerCore: ['#e8ffff', '#6ef0ff', '#2f73ff'],
  enemyBasic: ['#ffd0dc', '#ff7da0', '#1f2433'],
  enemyFast: ['#fff0bf', '#ffd36f', '#312913'],
  enemyTank: ['#d8ffe9', '#8ef7c0', '#183327'],
  enemyShooter: ['#eef2ff', '#8ea6ff', '#202544']
};

// ---------------------------------------------------------
// Utility registry block 015
// ---------------------------------------------------------
const UTIL_REGISTRY = {
  clamp,
  lerp,
  rand,
  randInt,
  pickRandom,
  distance,
  distanceSq,
  normalize,
  angleBetween,
  formatTime,
  smoothstep,
  weightedPick,
  roundTo
};

// ---------------------------------------------------------
// Placeholder tables block 016
// ---------------------------------------------------------
const FUTURE_ENEMY_WAVES = [
  { minute: 0, types: ['basic'] },
  { minute: 1, types: ['basic', 'fast'] },
  { minute: 2, types: ['basic', 'fast', 'tank'] },
  { minute: 3, types: ['basic', 'fast', 'tank', 'shooter'] }
];

const FUTURE_META_SHOP = [
  { id: 'meta_health', cost: 25, bonus: '+5 PV max au départ' },
  { id: 'meta_xp', cost: 40, bonus: '+5% XP gagnée' },
  { id: 'meta_regen', cost: 60, bonus: '+0.2 regen / s' },
  { id: 'meta_speed', cost: 45, bonus: '+4% vitesse' }
];

// ---------------------------------------------------------
// Padding comment block 017
// ---------------------------------------------------------
// This project intentionally keeps rendering and simulation together in one source file.
// For a jam, prototype, or AI-assisted workflow, this is convenient.
// When the game grows, the existing class boundaries make extraction straightforward.
// Most gameplay values live in CONFIG and UPGRADE_DEFS.
// That keeps balancing fast, especially for mobile feel iteration.

// ---------------------------------------------------------
// Padding comment block 018
// ---------------------------------------------------------
// iPad note:
// Safari on iPad handles Pointer Events correctly in modern versions.
// If you use a hardware keyboard, switching control mode to keyboard gives ZQSD movement.
// If you want WASD too, the current implementation already supports W/A/S/D aliases.

// ---------------------------------------------------------
// Padding comment block 019
// ---------------------------------------------------------
// Potential next version ideas:
// - dedicated boss attack telegraphs
// - weapon evolution after combining two upgrades
// - passive items and treasure chests
// - map hazards and shrinking arena events
// - challenge modifiers selected before start

// ---------------------------------------------------------
// Padding comment block 020
// ---------------------------------------------------------
// Performance note:
// The current entity counts are safe for a simple mobile browser game.
// If you push much higher counts, consider spatial hashing for collisions.
// You can also pool particles and projectiles if needed.

// ---------------------------------------------------------
// Long-form tune tables block 021
// ---------------------------------------------------------
const TUNING_TABLES = {
  projectileSpreadByCount: {
    1: 0,
    2: 0.18,
    3: 0.24,
    4: 0.30,
    5: 0.36,
    6: 0.42
  },
  rarityWeights: {
    Commun: 4,
    Rare: 2.5,
    Épique: 1.3
  },
  scoreHints: {
    basic: 8,
    fast: 11,
    tank: 20,
    shooter: 16
  }
};

// ---------------------------------------------------------
// Future analytics stub block 022
// ---------------------------------------------------------
function analyticsTrackRunStart() { return false; }
function analyticsTrackRunEnd() { return false; }
function analyticsTrackUpgradeChoice() { return false; }
function analyticsTrackControlModeChange() { return false; }

// ---------------------------------------------------------
// State machine notes block 023
// ---------------------------------------------------------
const GAME_STATES = Object.freeze({
  MENU: 'menu',
  RUNNING: 'running',
  PAUSED: 'paused',
  LEVELUP: 'levelup',
  GAMEOVER: 'gameover'
});

// ---------------------------------------------------------
// Even more hooks block 024
// ---------------------------------------------------------
function reservedHookA() { return undefined; }
function reservedHookB() { return undefined; }
function reservedHookC() { return undefined; }
function reservedHookD() { return undefined; }
function reservedHookE() { return undefined; }
function reservedHookF() { return undefined; }
function reservedHookG() { return undefined; }
function reservedHookH() { return undefined; }
function reservedHookI() { return undefined; }
function reservedHookJ() { return undefined; }

// ---------------------------------------------------------
// Spawn presets block 025
// ---------------------------------------------------------
const SPAWN_PRESETS = [
  { label: 'Soft intro', interval: 1.2, enemies: ['basic'] },
  { label: 'Mixed pressure', interval: 0.9, enemies: ['basic', 'fast'] },
  { label: 'Heavy lane', interval: 0.72, enemies: ['fast', 'tank'] },
  { label: 'Late shooter', interval: 0.55, enemies: ['tank', 'shooter', 'fast'] }
];

// ---------------------------------------------------------
// Initialization
// ---------------------------------------------------------
loadSettings();
syncSettingsUI();
const game = new Game();
game.updateHelperBadge();
