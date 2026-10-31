// Signal Breaker: an original self-contained canvas arcade game.
// No ROM downloads, emulators, accounts, network calls, or third-party game scripts.
export function startArcade(canvas, startButton) {
  const ctx = canvas.getContext("2d");
  if (!ctx) { startButton.disabled = true; return () => {}; }
  const W = canvas.width, H = canvas.height;
  const keys = new Set();
  const stars = Array.from({length: 55}, (_, i) => ({
    x: (i * 173 + 31) % W, y: (i * 97 + 81) % H, r: (i % 3) + 1
  }));
  const PADDLE_W = 130, PADDLE_Y = H - 48;
  let paddleX = (W - PADDLE_W) / 2;
  let ballX = W / 2, ballY = H - 68, ballVX = 4, ballVY = -5;
  let lives = 3, score = 0, blocks = [], active = false, finished = false;
  let last = 0, raf = 0, destroyed = false;
  let padLaunchWasDown = false;
  const isPlayingWithControls = () => document.activeElement === canvas;
  function reset() {
    paddleX = (W - PADDLE_W) / 2;
    ballX = W / 2; ballY = H - 68;
    ballVX = 4; ballVY = -5;
    lives = 3; score = 0; active = true; finished = false;
    blocks = [];
    const colors = ["#a68bff", "#79c2fb", "#7fe2d6", "#e9a3c7"];
    for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
      blocks.push({x: 50 + col * 96, y: 83 + row * 39, w: 83, h: 24, color: colors[row], alive: true});
    }
    startButton.textContent = "↻ Restart";
    canvas.focus({preventScroll:true});
    document.getElementById("arcade-control-status")?.replaceChildren(document.createTextNode("Playing Signal Breaker. Press B or Escape to return to the menu."));
  }
  function drawRoundRect(x, y, w, h, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
  }
  function text(message, x, y, size, color = "#e7edff", align = "left") {
    ctx.fillStyle = color; ctx.font = "700 " + size + "px system-ui, sans-serif";
    ctx.textAlign = align; ctx.fillText(message, x, y);
  }
  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#161438"); bg.addColorStop(1, "#070e1e");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    stars.forEach(s => { ctx.fillStyle = "#8c9cd055"; ctx.fillRect(s.x, s.y, s.r, s.r); });
    ctx.strokeStyle = "#7787cd15"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    text("SIGNAL BREAKER", 28, 37, 22, "#d1c5ff");
    text("SCORE  " + String(score).padStart(4, "0") + "     LIVES  " + lives, W - 30, 37, 18, "#a4d9ec", "right");
    blocks.forEach(b => { if (b.alive) { drawRoundRect(b.x, b.y, b.w, b.h, 6, b.color); drawRoundRect(b.x + 5, b.y + 5, b.w - 10, 4, 2, "#ffffff44"); } });
    drawRoundRect(paddleX, PADDLE_Y, PADDLE_W, 17, 8, "#8acdf5");
    drawRoundRect(paddleX + 9, PADDLE_Y + 3, PADDLE_W - 18, 5, 3, "#dceeff");
    ctx.beginPath(); ctx.arc(ballX, ballY, 9, 0, Math.PI * 2); ctx.fillStyle = "#fff1b3"; ctx.shadowBlur = 20; ctx.shadowColor = "#ffe8a4"; ctx.fill(); ctx.shadowBlur = 0;
    if (!active) {
      ctx.fillStyle = "#050a1ce0"; ctx.fillRect(0, 120, W, 295);
      text(finished ? (lives ? "YOU CLEARED THE SIGNAL!" : "SIGNAL LOST") : "READY, PLAYER ONE?", W / 2, 231, 36, "#d8ccff", "center");
      text(finished ? "Score: " + score + " · Hit Restart to play again" : "Press Start, Space, or gamepad A", W / 2, 277, 22, "#a5cde0", "center");
      text("Move with ← → / A D / left stick", W / 2, 315, 18, "#91a7cf", "center");
    }
  }
  function onKeyDown(e) {
    if (!isPlayingWithControls()) return;
    if (["ArrowLeft", "ArrowRight", " ", "a", "d", "A", "D", "Enter"].includes(e.key)) {
      e.preventDefault(); keys.add(e.key.toLowerCase());
      if ((e.key === " " || e.key === "Enter") && !active) reset();
    }
  }
  function onKeyUp(e) { keys.delete(e.key.toLowerCase()); }
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    paddleX = Math.max(0, Math.min(W - PADDLE_W, ((e.clientX - rect.left) / rect.width) * W - PADDLE_W / 2));
  }
  function tick(now) {
    if (destroyed) return;
    const dt = Math.min(2, (now - (last || now)) / 16.667);
    last = now;
    let direction = 0;
    if (keys.has("arrowleft") || keys.has("a")) direction -= 1;
    if (keys.has("arrowright") || keys.has("d")) direction += 1;
    const pad = navigator.getGamepads ? Array.from(navigator.getGamepads()).find(Boolean) : null;
    if (pad && isPlayingWithControls()) {
      const left = pad.buttons[14] && pad.buttons[14].pressed;
      const right = pad.buttons[15] && pad.buttons[15].pressed;
      const axis = pad.axes[0] || 0;
      if (left || axis < -0.3) direction -= 1;
      if (right || axis > 0.3) direction += 1;
      const launchDown = !!(pad.buttons[0] && pad.buttons[0].pressed);
      if (launchDown && !padLaunchWasDown && !active) reset();
      padLaunchWasDown = launchDown;
    } else padLaunchWasDown = false;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, paddleX + direction * 8 * dt));
    if (active && document.visibilityState !== "hidden") {
      ballX += ballVX * dt; ballY += ballVY * dt;
      if (ballX < 9) {ballX = 9; ballVX = Math.abs(ballVX);}
      if (ballX > W - 9) {ballX = W - 9; ballVX = -Math.abs(ballVX);}
      if (ballY < 56) {ballY = 56; ballVY = Math.abs(ballVY);}
      if (ballVY > 0 && ballY + 9 >= PADDLE_Y && ballY < PADDLE_Y + 24 &&
          ballX + 9 >= paddleX && ballX - 9 <= paddleX + PADDLE_W) {
        ballY = PADDLE_Y - 10;
        ballVY = -Math.max(4.6, Math.abs(ballVY));
        ballVX = ((ballX - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2)) * 5.5;
      }
      for (const block of blocks) {
        if (!block.alive) continue;
        if (ballX + 9 > block.x && ballX - 9 < block.x + block.w &&
            ballY + 9 > block.y && ballY - 9 < block.y + block.h) {
          block.alive = false; score += 10; ballVY = -ballVY;
          break;
        }
      }
      if (ballY > H + 10) {
        lives--;
        if (lives === 0) { active = false; finished = true; }
        else { ballX = paddleX + PADDLE_W / 2; ballY = PADDLE_Y - 26; ballVX = 4; ballVY = -5; }
      }
      if (blocks.every(block => !block.alive)) {active = false; finished = true;}
    }
    draw();
    raf = requestAnimationFrame(tick);
  }
  startButton.addEventListener("click", reset);
  canvas.addEventListener("focus",()=>keys.clear());
  canvas.addEventListener("pointermove", onMove);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  raf = requestAnimationFrame(tick);
  return function cleanup() {
    destroyed = true;
    cancelAnimationFrame(raf);
    startButton.removeEventListener("click", reset);
    canvas.removeEventListener("pointermove", onMove);
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  };
}
