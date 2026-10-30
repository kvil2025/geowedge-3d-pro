/**
 * Módulo 2: Proyección Estereográfica Interactiva (Stereonet Wulff / Schmidt)
 * Visualiza polos, trazas de planos J1/J2/J3, eje del túnel e intersecciones cinemáticas.
 * Desarrollado para Geologgia Ltda.
 */

window.GeoWedgeStereonet = (function() {
  let canvas = null;
  let ctx = null;
  let lastState = null;
  let lastRes = null;

  function init() {
    canvas = document.getElementById('canvas-stereonet');
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
    console.log('[Módulo Stereonet] Inicializado.');
  }

  function update(res, state) {
    lastRes = res;
    lastState = JSON.parse(JSON.stringify(state));
    draw();
  }

  function toRad(deg) { return (deg * Math.PI) / 180; }
  function toDeg(rad) { return (rad * 180) / Math.PI; }

  // Proyección de igual área (Schmidt Equal-Area)
  function projectPole(dip, dipdir, R) {
    const poleTrend = (dipdir + 180) % 360;
    const radTrend = toRad(poleTrend);
    // Para igual área: r = sqrt(2) * R * sin(dip / 2)
    const r = Math.SQRT2 * R * Math.sin(toRad(dip) / 2);
    const x = r * Math.sin(radTrend);
    const y = -r * Math.cos(radTrend);
    return { x, y };
  }

  // Intersección de dos planos (Normales n1 y n2 -> Línea de intersección L = n1 x n2)
  function calculateIntersection(jA, jB) {
    const nA = planeNormal(jA.dip, jA.dipdir);
    const nB = planeNormal(jB.dip, jB.dipdir);

    // Producto cruz
    let lx = nA.y * nB.z - nA.z * nB.y;
    let ly = nA.z * nB.x - nA.x * nB.z;
    let lz = nA.x * nB.y - nA.y * nB.x;

    const mag = Math.hypot(lx, ly, lz);
    if (mag < 1e-5) return null;
    lx /= mag; ly /= mag; lz /= mag;

    // Queremos que apunte hacia abajo (z negativo o plunge positivo)
    // En nuestro sistema: x: Este, y: Norte, z: Arriba
    if (lz > 0) { lx = -lx; ly = -ly; lz = -lz; }

    const plunge = toDeg(Math.asin(-lz)); // Plunge hacia abajo
    let trend = toDeg(Math.atan2(lx, ly));
    if (trend < 0) trend += 360;

    return { trend, plunge };
  }

  function planeNormal(dip, dipdir) {
    // Normal al plano apuntando hacia arriba/dentro
    const radDip = toRad(dip);
    const radDir = toRad(dipdir);
    return {
      x: Math.sin(radDip) * Math.sin(radDir),
      y: Math.sin(radDip) * Math.cos(radDir),
      z: Math.cos(radDip)
    };
  }

  function drawGreatCircle(dip, dipdir, cx, cy, R, color) {
    if (dip <= 0 || dip >= 90) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.beginPath();

    const radDir = toRad(dipdir);
    const strike = (dipdir - 90 + 360) % 360;
    const radStrike = toRad(strike);

    const steps = 60;
    let first = true;
    for (let i = 0; i <= steps; i++) {
      const alpha = -Math.PI / 2 + (Math.PI * i) / steps;
      // Posición en el plano
      const xLocal = Math.cos(alpha);
      const yLocal = Math.sin(alpha) * Math.cos(toRad(dip));
      const zLocal = -Math.sin(alpha) * Math.sin(toRad(dip));

      // Rotar según strike
      const gx = xLocal * Math.cos(radStrike) - yLocal * Math.sin(radStrike);
      const gy = xLocal * Math.sin(radStrike) + yLocal * Math.cos(radStrike);

      const r3d = Math.hypot(gx, gy);
      const theta = Math.atan2(gx, gy);
      const plungeAngle = Math.atan2(-zLocal, r3d);
      const rProj = Math.SQRT2 * R * Math.sin((Math.PI / 2 - plungeAngle) / 2);

      const px = cx + rProj * Math.sin(theta);
      const py = cy - rProj * Math.cos(theta);

      if (first) { ctx.moveTo(px, py); first = false; }
      else { ctx.lineTo(px, py); }
    }
    ctx.stroke();
  }

  function draw() {
    if (!canvas) canvas = document.getElementById('canvas-stereonet');
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.40;

    const isDark = document.documentElement.classList.contains('dark');
    const ringColor = isDark ? '#475569' : '#cbd5e1';
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(203, 213, 225, 0.6)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // Círculo Primitivo
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Cuadrícula concéntrica (20°, 40°, 60°, 80°)
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.8;
    for (let ang = 20; ang < 90; ang += 20) {
      const rAng = Math.SQRT2 * R * Math.sin(toRad(ang) / 2);
      ctx.beginPath();
      ctx.arc(cx, cy, rAng, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ejes Norte-Sur y Este-Oeste
    ctx.beginPath();
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.stroke();

    // Etiquetas cardinales
    ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('N (0°)', cx, cy - R - 4);
    ctx.textBaseline = 'top';
    ctx.fillText('S (180°)', cx, cy + R + 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('E (90°)', cx + R + 6, cy);
    ctx.textAlign = 'right';
    ctx.fillText('W (270°)', cx - R - 6, cy);

    if (!lastState) return;

    // Trazas de Planos (Grandes Círculos)
    drawGreatCircle(lastState.j1.dip, lastState.j1.dipdir, cx, cy, R, 'rgba(59, 130, 246, 0.7)'); // Azul J1
    drawGreatCircle(lastState.j2.dip, lastState.j2.dipdir, cx, cy, R, 'rgba(16, 185, 129, 0.7)'); // Verde J2
    drawGreatCircle(lastState.j3.dip, lastState.j3.dipdir, cx, cy, R, 'rgba(245, 158, 11, 0.7)'); // Naranja J3

    // Polos de J1, J2, J3
    const p1 = projectPole(lastState.j1.dip, lastState.j1.dipdir, R);
    const p2 = projectPole(lastState.j2.dip, lastState.j2.dipdir, R);
    const p3 = projectPole(lastState.j3.dip, lastState.j3.dipdir, R);

    function drawPole(p, color, label) {
      const px = cx + p.x;
      const py = cy + p.y;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, px + 6, py - 3);
    }

    drawPole(p1, '#3b82f6', 'J1');
    drawPole(p2, '#10b981', 'J2');
    drawPole(p3, '#f59e0b', 'J3');

    // Eje de la excavación (Trend / Plunge)
    const tunnelR = Math.SQRT2 * R * Math.sin(toRad(90 - lastState.plunge) / 2);
    const radTunnelTrend = toRad(lastState.trend);
    const tx = cx + tunnelR * Math.sin(radTunnelTrend);
    const ty = cy - tunnelR * Math.cos(radTunnelTrend);

    ctx.fillStyle = '#ec4899'; // Rosa fuerte
    ctx.fillRect(tx - 4, ty - 4, 8, 8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx - 4, ty - 4, 8, 8);
    ctx.fillText(`Eje Túnel (${lastState.trend}°/${lastState.plunge}°)`, tx + 7, ty + 2);

    // Calcular y graficar intersecciones de planos (Diedros cinemáticos)
    const i12 = calculateIntersection(lastState.j1, lastState.j2);
    const i23 = calculateIntersection(lastState.j2, lastState.j3);
    const i31 = calculateIntersection(lastState.j3, lastState.j1);

    const interList = document.getElementById('stereonet-intersections-list');
    let htmlList = '';

    function drawIntersectionPoint(inter, label, color) {
      if (!inter) return;
      const rInter = Math.SQRT2 * R * Math.sin(toRad(90 - inter.plunge) / 2);
      const radT = toRad(inter.trend);
      const ix = cx + rInter * Math.sin(radT);
      const iy = cy - rInter * Math.cos(radT);

      // Triángulo
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ix, iy - 5);
      ctx.lineTo(ix + 5, iy + 4);
      ctx.lineTo(ix - 5, iy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = color;
      ctx.fillText(label, ix + 6, iy + 4);

      htmlList += `
        <div class="flex items-center justify-between text-[11px] font-mono py-1 border-b border-slate-200 dark:border-slate-800">
          <span class="flex items-center gap-1.5" style="color: ${color}">▲ <b>${label}:</b></span>
          <span class="font-bold text-slate-800 dark:text-slate-200">${inter.trend.toFixed(0)}° / ${inter.plunge.toFixed(0)}°</span>
          <span class="text-[10px] text-slate-400 font-sans">${inter.plunge > 10 ? 'Deslizamiento' : 'Sub-horizontal'}</span>
        </div>
      `;
    }

    drawIntersectionPoint(i12, 'I₁₂ (J1-J2)', '#8b5cf6');
    drawIntersectionPoint(i23, 'I₂₃ (J2-J3)', '#06b6d4');
    drawIntersectionPoint(i31, 'I₃₁ (J3-J1)', '#e11d48');

    if (interList) interList.innerHTML = htmlList;
  }

  return {
    init,
    update,
    draw
  };
})();

// Registro modular en Core Hub
if (window.GeoWedgeModules) {
  window.GeoWedgeModules.register('stereonet', window.GeoWedgeStereonet);
}
