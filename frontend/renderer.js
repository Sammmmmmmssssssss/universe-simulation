function render(ctx, canvas, state, cam, mousePos, currentTool, velocityDrag, selectedBody) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground(ctx, canvas);

  for (const f of state.supernova_flashes || []) {
    drawSupernovaFlash(ctx, f, cam);
  }

  for (const p of state.particles || []) {
    if (!p) continue;
    const [sx, sy] = w2s(p.x, p.y);
    if (sx < -20 || sx > canvas.width + 20 || sy < -20 || sy > canvas.height + 20) continue;
    const sr = Math.max(1.5, 2.5 * cam.zoom);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = p.color || '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    if (sr > 3 && cam.zoom > 0.4) {
      ctx.globalAlpha = 0.2;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.5);
      g.addColorStop(0, p.color || '#ffffff');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const b of state.bodies || []) {
    if (!b) continue;
    const [sx, sy] = w2s(b.x, b.y);
    const sr = Math.max(3, (b.radius || 10) * cam.zoom);
    if (sx < -sr * 4 || sx > canvas.width + sr * 4 || sy < -sr * 4 || sy > canvas.height + sr * 4) continue;
    drawBody(ctx, b, sx, sy, sr);
  }

  if (velocityDrag && currentTool === 'place') {
    const [sx, sy] = w2s(velocityDrag.wx, velocityDrag.wy);
    ctx.strokeStyle = 'rgba(0,200,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(velocityDrag.ex, velocityDrag.ey);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (currentTool === 'nebula' && mousePos) {
    const bs = parseInt(document.getElementById('brush-size').value) || 60;
    ctx.strokeStyle = 'rgba(100,150,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, bs, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (selectedBody && selectedBody.x !== undefined) {
    const [sx, sy] = w2s(selectedBody.x, selectedBody.y);
    const sr = Math.max(5, (selectedBody.radius || 10) * cam.zoom);
    ctx.strokeStyle = 'rgba(0,220,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(sx, sy, sr + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawBackground(ctx, canvas) {
  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const seed = 12345;
  for (let i = 0; i < Math.floor(canvas.width * canvas.height / 1000); i++) {
    const x = (i * 7919 + seed) % canvas.width;
    const y = (i * 6271 + seed) % canvas.height;
    ctx.globalAlpha = 0.15 + (i % 5) * 0.1;
    ctx.fillStyle = `hsl(${200 + (i * 37) % 60},50%,90%)`;
    ctx.beginPath();
    ctx.arc(x, y, 0.5 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSupernovaFlash(ctx, f, cam) {
  f.t = (f.t || 0) + 1;
  if (f.t > (f.mt || 100)) return;
  const [sx, sy] = w2s(f.x, f.y);
  const pr = f.t / (f.mt || 100);
  const fr = (f.r || 60) * pr * cam.zoom * 14;
  const al = 1 - pr;
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(1, fr));
  g.addColorStop(0, `rgba(255,220,100,${al})`);
  g.addColorStop(0.4, `rgba(255,100,50,${al * 0.6})`);
  g.addColorStop(1, 'rgba(255,50,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, Math.max(1, fr), 0, Math.PI * 2);
  ctx.fill();
}

function drawBody(ctx, b, sx, sy, sr) {
  const t = b.type || 'asteroid';

  if (t === 'black_hole' || t === 'supermassive_bh') {
    const dr = sr * 3.5;
    const g = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, dr);
    g.addColorStop(0, 'rgba(255,140,0,0.9)');
    g.addColorStop(0.5, 'rgba(255,60,0,0.4)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, dr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,50,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (t === 'neutron_star' || t === 'pulsar') {
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 3.5);
    g.addColorStop(0, 'rgba(200,220,255,1)');
    g.addColorStop(0.4, 'rgba(100,150,255,0.5)');
    g.addColorStop(1, 'rgba(50,80,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (t === 'pulsar') {
      const ang = (Date.now() / 200) % (Math.PI * 2);
      ctx.strokeStyle = 'rgba(180,220,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(ang) * sr, sy + Math.sin(ang) * sr);
      ctx.lineTo(sx + Math.cos(ang) * sr * 9, sy + Math.sin(ang) * sr * 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(ang) * sr, sy - Math.sin(ang) * sr);
      ctx.lineTo(sx - Math.cos(ang) * sr * 9, sy - Math.sin(ang) * sr * 9);
      ctx.stroke();
    }
    return;
  }

  if (t === 'white_dwarf') {
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.5);
    g.addColorStop(0, 'rgba(240,245,255,1)');
    g.addColorStop(0.5, 'rgba(180,200,255,0.4)');
    g.addColorStop(1, 'rgba(100,130,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 2.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (b.is_star) {
    const starColors = {
      'blue_giant': '#aaccff',
      'main_sequence_star': '#fffaaa',
      'red_dwarf': '#ff6644',
      'brown_dwarf': '#8B4513',
      'red_giant': '#ff3300',
    };
    const sc = starColors[t] || '#fff';
    const gr = sr * (t === 'red_giant' ? 4.5 : 3);
    if (cam.zoom > 0.3) {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
      g.addColorStop(0, 'white');
      g.addColorStop(0.25, sc);
      g.addColorStop(0.7, sc + '66');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, gr, 0, Math.PI * 2);
      ctx.fill();
      if (t !== 'brown_dwarf') {
        ctx.globalAlpha = 0.12 + Math.sin(Date.now() / 400 + (b.id || '').charCodeAt(0)) * 0.04;
        const cg = ctx.createRadialGradient(sx, sy, gr * 0.8, sx, sy, gr * 1.4);
        cg.addColorStop(0, sc + '55');
        cg.addColorStop(1, 'transparent');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(sx, sy, gr * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = sc;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  let col = '#778899';
  if (t === 'terrestrial_planet') col = '#4488cc';
  else if (t === 'gas_giant') col = '#cc9944';
  else if (t === 'ice_giant') col = '#44aacc';
  else if (t === 'dwarf_planet') col = '#889999';
  else if (t === 'major_moon' || t === 'minor_moon') col = '#888898';
  else if (t === 'asteroid' || t === 'meteoroid') col = '#666655';

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  if (t === 'gas_giant' && sr > 5 && cam.zoom > 0.5) {
    ctx.globalAlpha = 0.22;
    ['#aa7733', '#cc8844', '#bb6622'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(sx, sy - sr * 0.2 + i * sr * 0.28, sr, sr * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  if (b.life) {
    ctx.globalAlpha = 0.12 + Math.sin(Date.now() / 700) * 0.08;
    const lg = ctx.createRadialGradient(sx, sy, sr, sx, sy, sr * 2.5);
    lg.addColorStop(0, 'rgba(0,255,136,0.5)');
    lg.addColorStop(1, 'rgba(0,255,136,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (sr > 9 && cam.zoom > 0.4) {
    ctx.fillStyle = 'rgba(200,220,255,0.55)';
    ctx.font = `${Math.max(8, Math.min(11, sr * 0.5))}px Inter`;
    ctx.fillText(b.name || '?', sx + sr + 3, sy - sr);
  }
}
