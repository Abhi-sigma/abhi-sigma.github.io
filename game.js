// game.js content moved here for cleaner separation
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: { preload, create, update }
};
const game = new Phaser.Game(config);

let player, cursors, joystickVector = { x: 0, y: 0 }, joystickActive = false;
let targets, blocksGroup, balls;
let levelTargets = [35, 42, 18, 27, 64];
let currentTargetIndex = 0;
let capturedTotal = 0;
let expanding = false;

function preload() {}

function create() {
  this.cameras.main.setBounds(0, 0, 3000, 3000);
  this.physics.world.setBounds(0, 0, 3000, 3000);

  const g = this.add.graphics();
  g.fillStyle(0x0000ff, 1).fillRect(0, 0, 40, 40);
  g.generateTexture('playerTex', 40, 40);
  player = this.physics.add.sprite(1500, 2800, 'playerTex').setCollideWorldBounds(true);
  this.cameras.main.startFollow(player);

  cursors = this.input.keyboard.createCursorKeys();
  balls = this.physics.add.group();
  blocksGroup = this.physics.add.group();

  this.input.keyboard.on('keydown-SPACE', () => throwBall(this));
  document.getElementById('throwBtn').addEventListener('click', () => throwBall(this));

  const base = document.getElementById('joystickBase');
  const thumb = document.getElementById('joystickThumb');
  base.addEventListener('touchstart', () => joystickActive = true);
  base.addEventListener('touchmove', e => {
    const rect = base.getBoundingClientRect();
    const t = e.touches[0];
    const dx = t.clientX - (rect.left + rect.width/2);
    const dy = t.clientY - (rect.top + rect.height/2);
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), rect.width/2);
    const angle = Math.atan2(dy, dx);
    joystickVector.x = Math.cos(angle) * (dist / (rect.width/2));
    joystickVector.y = Math.sin(angle) * (dist / (rect.width/2));
    thumb.style.left = (rect.width/2 - 25 + joystickVector.x * dist) + 'px';
    thumb.style.top = (rect.height/2 - 25 + joystickVector.y * dist) + 'px';
    e.preventDefault();
  });
  base.addEventListener('touchend', () => {
    joystickActive = false;
    joystickVector = { x: 0, y: 0 };
    thumb.style.left = '25px';
    thumb.style.top = '25px';
  });

  this.physics.add.overlap(balls, blocksGroup, (ball, block) => captureBlock(this, block, ball), null, this);
  loadNextTarget(this);
}

function throwBall(scene) {
  const ball = balls.create(player.x, player.y, null).setDisplaySize(10, 10);
  const g = scene.add.graphics().fillStyle(0xffffff, 1).fillCircle(5, 5, 5);
  g.generateTexture('ballTex', 10, 10);
  ball.setTexture('ballTex');
  const dx = joystickVector.x || (cursors.left.isDown ? -1 : 0) + (cursors.right.isDown ? 1 : 0);
  const dy = joystickVector.y || (cursors.up.isDown ? -1 : 0) + (cursors.down.isDown ? 1 : 0);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  ball.setVelocity((dx/len) * 300, (dy/len) * 300);
}

function loadNextTarget(scene) {
  blocksGroup.clear(true, true);
  capturedTotal = 0;
  const target = levelTargets[currentTargetIndex];
  document.getElementById('targetValue').innerText = target;
  document.getElementById('collectedTotal').innerText = capturedTotal;

  const tens = Math.floor(target / 10);
  const ones = target % 10;
  const px = player.x, py = player.y;

  for (let i = 0; i < tens; i++) spawnBlock(scene, 10, px, py);
  for (let i = 0; i < ones; i++) spawnBlock(scene, 1, px, py);
}

function spawnBlock(scene, value, px, py) {
  const w = 40;
  const x = Phaser.Math.Between(px - 200, px + 200);
  const y = Phaser.Math.Between(py - 200, py + 200);
  const color = value === 10 ? 0xffaa00 : 0xaaff00;
  const block = scene.add.rectangle(x, y, w, w, color);
  const text = scene.add.text(x, y, value.toString(), { fontSize: '18px', color: '#000' }).setOrigin(0.5);
  const container = scene.add.container(x, y, [block, text]);
  scene.physics.add.existing(container);
  container.body.setBounce(1, 1).setCollideWorldBounds(true);
  container.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
  container.setData('value', value);
  blocksGroup.add(container);
}

function captureBlock(scene, block, ball) {
  capturedTotal += block.getData('value');
  document.getElementById('collectedTotal').innerText = capturedTotal;
  ball.destroy();
  block.destroy();

  if (capturedTotal === levelTargets[currentTargetIndex]) {
    currentTargetIndex++;
    if (currentTargetIndex < levelTargets.length) {
      scene.time.delayedCall(800, () => loadNextTarget(scene));
    } else {
      document.getElementById('targetValue').innerText = '✔ All done!';
    }
  }
}

function update() {
  player.setVelocity(0);
  const speed = 200;
  if (joystickActive) {
    player.setVelocity(joystickVector.x * speed, joystickVector.y * speed);
  } else {
    if (cursors.left.isDown) player.setVelocityX(-speed);
    if (cursors.right.isDown) player.setVelocityX(speed);
    if (cursors.up.isDown) player.setVelocityY(-speed);
    if (cursors.down.isDown) player.setVelocityY(speed);
  }

  blocksGroup.children.iterate(block => {
    const dx = block.x - player.x;
    const dy = block.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 150) {
      const vx = (dx / dist) * 100;
      const vy = (dy / dist) * 100;
      block.body.setVelocity(vx, vy);
    }

    if (block.y >= config.height - 40) block.body.setVelocityY(-Math.abs(block.body.velocity.y));
    if (block.y <= 0) {
      if (Phaser.Math.Distance.Between(player.x, player.y, block.x, block.y) < 150) {
        expandWorld(this, block);
      } else {
        block.body.setVelocityY(Math.abs(block.body.velocity.y));
      }
    }
    if (block.x <= 0 || block.x >= config.width - 40) block.body.setVelocityX(-block.body.velocity.x);
  });
}

function expandWorld(scene, block) {
  if (expanding) return;
  expanding = true;
  const h = scene.physics.world.bounds.height;
  scene.physics.world.setBounds(0, 0, 3000, h + 1000);
  scene.cameras.main.setBounds(0, 0, 3000, h + 1000);
  block.y = h + 100;
  expanding = false;
}
