/**
 * Módulo 2: Proyección Estereográfica Profesional (Rocscience Dips / Stereonet Style)
 * Falsilla de Schmidt (Igual Área) y Wulff (Igual Ángulo)
 * Graduación de limbo de 2°/10°, cuadrícula polar/ecuatorial, cono de fricción (phi),
 * polos con etiquetas, trazas de grandes círculos, diedros de intersección y cursor interactivo.
 * Desarrollado para Geologgia Ltda.
 */

window.GeoWedgeStereonet = (function() {
  let canvas = null;
  let ctx = null;
  let lastState = null;
  let lastRes = null;

  // Estado de configuración visual
  const config = {
    projection: 'schmidt', // 'schmidt' (igual área) o 'wulff' (igual ángulo)
    showGreatCircles: true,
    showPoles: true,
    showFrictionCone: true,
    showIntersections: true,
    showGrid: true,
    mouseCoord: null // { trend, plunge } cuando el mouse está sobre la falsilla
  };

  function toRad(deg) { return (deg * Math.PI) / 180; }
  function toDeg(rad) { return (rad * 180) / Math.PI; }

  function init() {
    canvas = document.getElementById('canvas-stereonet');
    if (canvas) {
      ctx = canvas.getContext('2d');
      setupCanvasInteractions();
    }
    console.log('[Módulo Stereonet Pro] Inicializado.');
  }

  function setupCanvasInteractions() {
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.42;

      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist <= R) {
        let trend = toDeg(Math.atan2(dx, -dy));
        if (trend < 0) trend += 360;

        let plunge = 0;
        if (config.projection === 'schmidt') {
          // r = sqrt(2) * R * sin((90 - plunge)/2)
          const sinHalf = dist / (Math.SQRT2 * R);
          const clamped = Math.max(0, Math.min(1, sinHalf));
          plunge = 90 - 2 * toDeg(Math.asin(clamped));
        } else {
          // Wulff: r = R * tan((90 - plunge)/2)
          const tanHalf = dist / R;
          plunge = 90 - 2 * toDeg(Math.atan(tanHalf));
        }
        config.mouseCoord = { trend, plunge, cx: clientX, cy: clientY };
      } else {
        config.mouseCoord = null;
      }
      draw();
    });

    canvas.addEventListener('mouseleave', () => {
      config.mouseCoord = null;
      draw();
    });
  }

  function update(res, state) {
    lastRes = res;
    lastState = state;
    const panel = document.getElementById('panel-stereonet');
    if (panel && !panel.classList.contains('hidden')) {
      draw();
    }
  }

  // Proyección de una dirección (trend, plunge) en el plano 2D
  function projectLine(trendDeg, plungeDeg, R) {
    const tRad = toRad(trendDeg);
    const pRad = toRad(Math.max(0, Math.min(90, plungeDeg)));
    let r = 0;
    if (config.projection === 'schmidt') {
      // Schmidt Equal-Area
      r = Math.SQRT2 * R * Math.sin((Math.PI / 2 - pRad) / 2);
    } else {
      // Wulff Equal-Angle
      r = R * Math.tan((Math.PI / 2 - pRad) / 2);
    }
    const x = r * Math.sin(tRad);
    const y = -r * Math.cos(tRad);
    return { x, y, r };
  }

  // Polo de un plano (Dip, DipDir)
  function projectPole(dipDeg, dipdirDeg, R) {
    const poleTrend = (dipdirDeg + 180) % 360;
    const polePlunge = 90 - dipDeg;
    return projectLine(poleTrend, polePlunge, R);
  }

  // Intersección de dos planos
  function calculateIntersection(jA, jB) {
    const nA = planeNormal(jA.dip, jA.dipdir);
    const nB = planeNormal(jB.dip, jB.dipdir);

    let lx = nA.y * nB.z - nA.z * nB.y;
    let ly = nA.z * nB.x - nA.x * nB.z;
    let lz = nA.x * nB.y - nA.y * nB.x;

    const mag = Math.hypot(lx, ly, lz);
    if (mag < 1e-5) return null;
    lx /= mag; ly /= mag; lz /= mag;

    if (lz > 0) { lx = -lx; ly = -ly; lz = -lz; }

    const plunge = toDeg(Math.asin(-lz));
    let trend = toDeg(Math.atan2(lx, ly));
    if (trend < 0) trend += 360;

    return { trend, plunge };
  }

  function planeNormal(dip, dipdir) {
    const radDip = toRad(dip);
    const radDir = toRad(dipdir);
    return {
      x: Math.sin(radDip) * Math.sin(radDir),
      y: Math.sin(radDip) * Math.cos(radDir),
      z: Math.cos(radDip)
    };
  }

  // Dibuja el Gran Círculo (traza del plano en la semiesfera inferior estilo Rocscience Dips / Stereonet)
  function drawGreatCircle(dip, dipdir, cx, cy, R, color, label) {
    if (dip <= 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.0;

    const strike = (dipdir - 90 + 360) % 360;
    const radStrike = toRad(strike);

    if (dip >= 90) {
      // Plano vertical: línea recta pasando por el centro entre los rumbos
      const x1 = cx + R * Math.sin(radStrike);
      const y1 = cy - R * Math.cos(radStrike);
      const x2 = cx - R * Math.sin(radStrike);
      const y2 = cy + R * Math.cos(radStrike);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      return;
    }

    const radS = toRad(strike);
    const radDir = toRad(dipdir);
    const radDip = toRad(dip);

    // Base ortonormal estricta del plano geológico:
    // v_strike: vector horizontal a lo largo del rumbo (plunge = 0)
    // v_dip: vector de máxima pendiente apuntando hacia abajo en la dirección de manteo (plunge = dip)
    const v_strike = [Math.sin(radS), Math.cos(radS), 0];
    const v_dip = [Math.sin(radDir) * Math.cos(radDip), Math.cos(radDir) * Math.cos(radDip), -Math.sin(radDip)];

    const steps = 180;
    ctx.beginPath();
    let midPoint = null;

    for (let i = 0; i <= steps; i++) {
      const psi = (Math.PI * i) / steps;
      const vx = Math.cos(psi) * v_strike[0] + Math.sin(psi) * v_dip[0];
      const vy = Math.cos(psi) * v_strike[1] + Math.sin(psi) * v_dip[1];
      const vz = Math.cos(psi) * v_strike[2] + Math.sin(psi) * v_dip[2];

      const rHoriz = Math.hypot(vx, vy);
      const trend = Math.atan2(vx, vy);
      const plunge = Math.atan2(-vz, rHoriz); // vz es negativo hacia abajo, -vz > 0

      let rProj = 0;
      if (config.projection === 'schmidt') {
        rProj = Math.SQRT2 * R * Math.sin((Math.PI / 2 - plunge) / 2);
      } else {
        rProj = R * Math.tan((Math.PI / 2 - plunge) / 2);
      }

      const px = cx + rProj * Math.sin(trend);
      const py = cy - rProj * Math.cos(trend);

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }

      // El punto medio (psi = pi/2) corresponde exactamente a la línea de máxima pendiente (Apex / DipDir)
      if (i === Math.floor(steps / 2)) {
        midPoint = { px, py, trend };
      }
    }
    ctx.stroke();

    // Etiqueta legible en el ápex del Gran Círculo
    if (midPoint && label) {
      ctx.save();
      ctx.font = 'bold 9.5px monospace';
      const tw = ctx.measureText(label).width;
      const distOffset = 16;
      const lx = midPoint.px + distOffset * Math.sin(midPoint.trend);
      const ly = midPoint.py - distOffset * Math.cos(midPoint.trend);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(lx - tw / 2 - 3, ly - 7, tw + 6, 14);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - tw / 2 - 3, ly - 7, tw + 6, 14);

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly);
      ctx.restore();
    }
  }

  function draw() {
    if (!canvas) canvas = document.getElementById('canvas-stereonet');
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext('2d');

    // Manejo de High DPI (Retina displays) para nitidez 100% vectorial
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 440;
    const displayHeight = canvas.clientHeight || 440;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const w = displayWidth;
    const h = displayHeight;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.42;

    const isDark = document.documentElement.classList.contains('dark') || true;
    const bgFill = isDark ? '#0b1120' : '#ffffff';
    const limbColor = isDark ? '#64748b' : '#475569';
    const gridMajor = isDark ? '#334155' : '#cbd5e1';
    const gridMinor = isDark ? '#1e293b' : '#f1f5f9';
    const textCol = isDark ? '#cbd5e1' : '#334155';
    const accentColor = '#38bdf8';

    // Fondo del estereograma
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, w, h);

    // 1. Círculo interior base
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#070b14' : '#f8fafc';
    ctx.fill();

    // 2. Cuadrícula Polar y Ecuatorial (Falsilla completa)
    if (config.showGrid) {
      // Círculos concéntricos de manteo (Dip) cada 10°
      for (let dipAng = 10; dipAng < 90; dipAng += 10) {
        let rAng = 0;
        if (config.projection === 'schmidt') {
          rAng = Math.SQRT2 * R * Math.sin(toRad(dipAng) / 2);
        } else {
          rAng = R * Math.tan(toRad(dipAng) / 2);
        }

        ctx.strokeStyle = (dipAng % 30 === 0) ? gridMajor : gridMinor;
        ctx.lineWidth = (dipAng % 30 === 0) ? 0.9 : 0.6;
        if (dipAng % 30 !== 0) {
          ctx.setLineDash([2, 3]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.arc(cx, cy, rAng, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Etiquetas de ángulo en el eje Norte-Sur
        if (dipAng % 20 === 0) {
          ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${dipAng}°`, cx, cy - rAng);
          ctx.fillText(`${dipAng}°`, cx, cy + rAng);
        }
      }

      // Radios de acimut cada 10°
      for (let az = 0; az < 360; az += 10) {
        const rad = toRad(az);
        const xOuter = cx + R * Math.sin(rad);
        const yOuter = cy - R * Math.cos(rad);

        ctx.strokeStyle = (az % 30 === 0) ? gridMajor : gridMinor;
        ctx.lineWidth = (az % 30 === 0) ? 0.9 : 0.5;
        if (az % 30 !== 0) {
          ctx.setLineDash([1, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(xOuter, yOuter);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. Ejes Principales (N-S y E-W)
    ctx.strokeStyle = limbColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.stroke();

    // 4. Cono de Fricción (Friction Cone phi)
    const phi = (lastState && lastState.phi !== undefined) ? lastState.phi : 30;
    if (config.showFrictionCone && phi > 0) {
      let rFric = 0;
      if (config.projection === 'schmidt') {
        rFric = Math.SQRT2 * R * Math.sin(toRad(90 - phi) / 2);
      } else {
        rFric = R * Math.tan(toRad(90 - phi) / 2);
      }

      ctx.save();
      // Área de deslizamiento (fuera del cono de fricción hacia el borde)
      ctx.beginPath();
      ctx.arc(cx, cy, rFric, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Cono Fricción (φ=${phi}°)`, cx + rFric - 6, cy - 6);
      ctx.restore();
    }

    // 5. Círculo Primitivo Exterior con Graduación Milimétrica (2°, 5°, 10°)
    ctx.strokeStyle = limbColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Ticks exteriores
    for (let az = 0; az < 360; az += 2) {
      const rad = toRad(az);
      let tickLen = 4;
      let strokeW = 0.6;

      if (az % 10 === 0) {
        tickLen = 9;
        strokeW = 1.2;
      } else if (az % 5 === 0) {
        tickLen = 6;
        strokeW = 0.9;
      }

      const x1 = cx + R * Math.sin(rad);
      const y1 = cy - R * Math.cos(rad);
      const x2 = cx + (R - tickLen) * Math.sin(rad);
      const y2 = cy - (R - tickLen) * Math.cos(rad);

      ctx.strokeStyle = (az % 10 === 0) ? limbColor : (isDark ? '#475569' : '#94a3b8');
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Números de rumbo en el limbo exterior cada 30°
      if (az % 30 === 0) {
        const distNum = R + 14;
        const xNum = cx + distNum * Math.sin(rad);
        const yNum = cy - distNum * Math.cos(rad);

        let label = '';
        if (az === 0) label = 'N';
        else if (az === 90) label = 'E';
        else if (az === 180) label = 'S';
        else if (az === 270) label = 'W';
        else label = `${az}°`;

        ctx.fillStyle = (az % 90 === 0) ? (isDark ? '#38bdf8' : '#0284c7') : textCol;
        ctx.font = (az % 90 === 0) ? 'bold 11px sans-serif' : '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, xNum, yNum);
      }
    }

    if (!lastState) {
      ctx.restore();
      return;
    }

    // 6. Trazas de Planos (Grandes Círculos)
    if (config.showGreatCircles) {
      drawGreatCircle(lastState.j1.dip, lastState.j1.dipdir, cx, cy, R, '#38bdf8', `J1 ${lastState.j1.dip}°/${lastState.j1.dipdir}°`);
      drawGreatCircle(lastState.j2.dip, lastState.j2.dipdir, cx, cy, R, '#34d399', `J2 ${lastState.j2.dip}°/${lastState.j2.dipdir}°`);
      drawGreatCircle(lastState.j3.dip, lastState.j3.dipdir, cx, cy, R, '#fbbf24', `J3 ${lastState.j3.dip}°/${lastState.j3.dipdir}°`);
    }

    // 7. Polos de Discontinuidades (P1, P2, P3)
    if (config.showPoles) {
      const p1 = projectPole(lastState.j1.dip, lastState.j1.dipdir, R);
      const p2 = projectPole(lastState.j2.dip, lastState.j2.dipdir, R);
      const p3 = projectPole(lastState.j3.dip, lastState.j3.dipdir, R);

      function renderPoleMarker(p, color, label, dip, dir) {
        const px = cx + p.x;
        const py = cy + p.y;
        
        // Círculo exterior con halo
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Punto central
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Etiqueta con sombra suave
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`P_${label}`, px + 8, py - 4);
      }

      renderPoleMarker(p1, '#38bdf8', 'J1', lastState.j1.dip, lastState.j1.dipdir);
      renderPoleMarker(p2, '#34d399', 'J2', lastState.j2.dip, lastState.j2.dipdir);
      renderPoleMarker(p3, '#fbbf24', 'J3', lastState.j3.dip, lastState.j3.dipdir);
    }

    // 8. Eje de Excavación (Trend / Plunge del Túnel - Cyan Técnico)
    const tunnel = projectLine(lastState.trend, lastState.plunge, R);
    const tx = cx + tunnel.x;
    const ty = cy + tunnel.y;

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(tx - 4.5, ty - 4.5, 9, 9);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx - 4.5, ty - 4.5, 9, 9);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Eje Túnel (${lastState.trend}°/${lastState.plunge}°)`, tx + 8, ty);

    // 9. Intersecciones Diedras de Planos (Modos Cinemáticos)
    const i12 = calculateIntersection(lastState.j1, lastState.j2);
    const i23 = calculateIntersection(lastState.j2, lastState.j3);
    const i31 = calculateIntersection(lastState.j3, lastState.j1);

    if (config.showIntersections) {
      function renderIntersectionMarker(inter, label, color) {
        if (!inter) return;
        const pt = projectLine(inter.trend, inter.plunge, R);
        const ix = cx + pt.x;
        const iy = cy + pt.y;

        const isCritical = inter.plunge > phi;

        // Diamante (Rombo)
        ctx.save();
        ctx.translate(ix, iy);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (isCritical) {
          // Halo de peligro cinemático
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${label} (${inter.trend.toFixed(0)}°/${inter.plunge.toFixed(0)}°)`, ix + 9, iy);
      }

      renderIntersectionMarker(i12, 'I₁₂', '#3b82f6');
      renderIntersectionMarker(i23, 'I₂₃', '#06b6d4');
      renderIntersectionMarker(i31, 'I₃₁', '#f43f5e');
    }

    // 10. Cursor interactivo (Trend / Plunge en tiempo real)
    if (config.mouseCoord) {
      const mc = config.mouseCoord;
      ctx.save();
      // Mira / Crosshair sutil
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mc.cx - 10, mc.cy); ctx.lineTo(mc.cx + 10, mc.cy);
      ctx.moveTo(mc.cx, mc.cy - 10); ctx.lineTo(mc.cx, mc.cy + 10);
      ctx.stroke();
      ctx.setLineDash([]);

      // Caja de coordenadas
      const coordStr = `${mc.trend.toFixed(1)}° / ${mc.plunge.toFixed(1)}°`;
      ctx.font = 'bold 10px monospace';
      const textW = ctx.measureText(coordStr).width;
      const boxX = Math.min(w - textW - 20, Math.max(10, mc.cx + 12));
      const boxY = Math.min(h - 20, Math.max(20, mc.cy - 12));

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(boxX - 4, boxY - 12, textW + 8, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX - 4, boxY - 12, textW + 8, 18);

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(coordStr, boxX, boxY - 3);
      ctx.restore();
    }

    // 11. Marca de agua y leyenda técnica
    ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${config.projection.toUpperCase()} NET • Semisfera Inferior`, w - 10, h - 8);

    ctx.textAlign = 'left';
    ctx.fillText('Geologgia Ltda • GeoWedge Pro', 10, h - 8);

    ctx.restore();

    // Actualizar tabla cinemática en el DOM
    updateKinematicsUI(i12, i23, i31, phi);
  }

  function updateKinematicsUI(i12, i23, i31, phi) {
    if (lastState) {
      const lblJ1 = document.getElementById('stereo-lbl-j1');
      const lblJ2 = document.getElementById('stereo-lbl-j2');
      const lblJ3 = document.getElementById('stereo-lbl-j3');
      if (lblJ1) lblJ1.textContent = `${lastState.j1.dip.toFixed(0)}° / ${lastState.j1.dipdir.toFixed(0)}°`;
      if (lblJ2) lblJ2.textContent = `${lastState.j2.dip.toFixed(0)}° / ${lastState.j2.dipdir.toFixed(0)}°`;
      if (lblJ3) lblJ3.textContent = `${lastState.j3.dip.toFixed(0)}° / ${lastState.j3.dipdir.toFixed(0)}°`;
    }

    const interList = document.getElementById('stereonet-intersections-list');
    if (!interList) return;

    const inters = [
      { name: 'I₁₂ (J1-J2)', data: i12, color: '#3b82f6' },
      { name: 'I₂₃ (J2-J3)', data: i23, color: '#06b6d4' },
      { name: 'I₃₁ (J3-J1)', data: i31, color: '#f43f5e' }
    ];

    let html = '';
    inters.forEach(item => {
      if (!item.data) return;
      const t = item.data.trend.toFixed(0);
      const p = item.data.plunge.toFixed(0);
      const isCritical = item.data.plunge > phi;
      const statusBadge = isCritical
        ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">CRÍTICO: Deslizamiento (P>${phi}°)</span>`
        : `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ESTABLE (P≤${phi}°)</span>`;

      html += `
        <div class="flex items-center justify-between text-[11px] font-mono py-1.5 px-2 rounded-lg bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rotate-45 inline-block" style="background: ${item.color}"></span>
            <span class="font-bold text-slate-200">${item.name}:</span>
            <span class="font-mono text-sky-400 font-bold">${t}° / ${p}°</span>
          </div>
          <div>${statusBadge}</div>
        </div>
      `;
    });

    interList.innerHTML = html;
  }

  // Descarga directa del canvas en HD
  function downloadCanvasHD() {
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Estereograma_GeoWedge_${config.projection}_HD.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // Descarga del Script Python listo para ejecutar con DPI 300
  function downloadPythonScript() {
    if (!lastState) return;
    const pyScript = `#!/usr/bin/env python3
"""
🏔️ GeoWedge 3D Pro - Generador Profesional de Red Estereográfica (Schmidt / Rocscience Dips)
Generado automáticamente desde la sesión interactiva de GeoWedge 3D Pro.
Geologgia Ltda - Geología & Geotecnia
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle

def to_rad(d): return np.radians(d)
def to_deg(r): return np.degrees(r)

def project_schmidt(trend, plunge, R=1.0):
    t_rad = to_rad(trend)
    p_rad = to_rad(np.clip(plunge, 0, 90))
    r = np.sqrt(2.0) * R * np.sin((np.pi / 2.0 - p_rad) / 2.0)
    return r * np.sin(t_rad), r * np.cos(t_rad)

def project_pole(dip, dipdir, R=1.0):
    return project_schmidt((dipdir + 180.0) % 360.0, 90.0 - dip, R)

def great_circle(dip, dipdir, R=1.0, pts=180):
    if dip <= 0: return np.array([]), np.array([])
    strike = (dipdir - 90.0) % 360.0
    if dip >= 90:
        rad1, rad2 = to_rad(strike), to_rad((strike + 180.0) % 360.0)
        return np.array([R*np.sin(rad1), R*np.sin(rad2)]), np.array([R*np.cos(rad1), R*np.cos(rad2)])
    rad_s, rad_dir, rad_dip = to_rad(strike), to_rad(dipdir), to_rad(dip)
    v_strike = np.array([np.sin(rad_s), np.cos(rad_s), 0.0])
    v_dip = np.array([np.sin(rad_dir)*np.cos(rad_dip), np.cos(rad_dir)*np.cos(rad_dip), -np.sin(rad_dip)])
    psis = np.linspace(0.0, np.pi, pts)
    xs, ys = [], []
    for psi in psis:
        v = np.cos(psi)*v_strike + np.sin(psi)*v_dip
        r_h = np.hypot(v[0], v[1])
        plunge = np.arctan2(-v[2], r_h)
        theta = np.arctan2(v[0], v[1])
        r = np.sqrt(2.0) * R * np.sin((np.pi/2.0 - plunge) / 2.0)
        xs.append(r * np.sin(theta))
        ys.append(r * np.cos(theta))
    return np.array(xs), np.array(ys)

fig, ax = plt.subplots(figsize=(8, 8), dpi=300)
fig.patch.set_facecolor('#0b1120')
ax.set_facecolor('#0b1120')
R = 1.0

# 1. Grilla Schmidt
for d in range(10, 90, 10):
    r_c = np.sqrt(2.0) * R * np.sin(to_rad(d) / 2.0)
    ax.add_patch(Circle((0, 0), r_c, fill=False, edgecolor='#1e293b' if d%30!=0 else '#334155', lw=0.8, ls='--' if d%30!=0 else '-'))

for az in range(0, 360, 10):
    rad = to_rad(az)
    ax.plot([0, R * np.sin(rad)], [0, R * np.cos(rad)], color='#334155' if az%30==0 else '#1e293b', lw=0.7)

# 2. Limbo exterior graduado
ax.add_patch(Circle((0, 0), R, fill=False, edgecolor='#64748b', lw=2))
for az in range(0, 360, 2):
    rad = to_rad(az)
    t_len = 0.035 if az%10==0 else (0.02 if az%5==0 else 0.012)
    ax.plot([R*np.sin(rad), (R-t_len)*np.sin(rad)], [R*np.cos(rad), (R-t_len)*np.cos(rad)], color='#64748b', lw=0.8)
    if az % 30 == 0:
        lbl = 'N' if az==0 else ('E' if az==90 else ('S' if az==180 else ('W' if az==270 else f'{az}°')))
        ax.text((R+0.07)*np.sin(rad), (R+0.07)*np.cos(rad), lbl, color='#38bdf8' if az%90==0 else '#94a3b8', ha='center', va='center', fontsize=9, fontweight='bold')

# 3. Cono de Fricción
phi = ${lastState.phi}
r_f = np.sqrt(2.0) * R * np.sin(to_rad(90 - phi) / 2.0)
ax.add_patch(Circle((0, 0), r_f, fill=True, facecolor='#ef4444', alpha=0.15, edgecolor='#ef4444', lw=1.2, ls=':'))

# 4. Planos y Polos
planes = [
    ('J1', ${lastState.j1.dip}, ${lastState.j1.dipdir}, '#38bdf8'),
    ('J2', ${lastState.j2.dip}, ${lastState.j2.dipdir}, '#34d399'),
    ('J3', ${lastState.j3.dip}, ${lastState.j3.dipdir}, '#fbbf24')
]
for lbl, dip, dipdir, col in planes:
    gx, gy = great_circle(dip, dipdir, R)
    ax.plot(gx, gy, color=col, lw=2, label=f'{lbl}: {dip:.0f}°/{dipdir:.0f}°')
    px, py = project_pole(dip, dipdir, R)
    ax.scatter([px], [py], s=60, color=col, edgecolors='#fff', zorder=5)
    ax.text(px + 0.03, py + 0.03, f'P_{lbl}', color=col, fontsize=9, fontweight='bold')

# 5. Eje del Túnel
tx, ty = project_schmidt(${lastState.trend}, ${lastState.plunge}, R)
ax.scatter([tx], [ty], s=90, marker='s', color='#38bdf8', edgecolors='#fff', zorder=6, label=f'Eje Túnel (${lastState.trend}°/${lastState.plunge}°)')

ax.set_xlim(-1.25, 1.25); ax.set_ylim(-1.25, 1.25); ax.set_aspect('equal'); ax.axis('off')
ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.20), ncol=2, facecolor='#0f172a', edgecolor='#334155', labelcolor='#e2e8f0', fontsize=8.5)
plt.title("PROYECCIÓN ESTEREOGRÁFICA (SCHMIDT EQUAL-AREA)\\nGeologgia Ltda • GeoWedge 3D Pro", color='#f1f5f9', fontsize=12, pad=15)
plt.tight_layout()
plt.savefig("estereograma_geowedge_300dpi.png", dpi=300, bbox_inches='tight')
print("✅ Estereograma HD guardado en 'estereograma_geowedge_300dpi.png'")
plt.show()
`;

    const blob = new Blob([pyScript], { type: 'text/x-python' });
    const link = document.createElement('a');
    link.download = 'generar_estereograma_geowedge.py';
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  // Configuración interactiva
  function setProjection(type) {
    config.projection = type;
    const btnSchmidt = document.getElementById('btn-proj-schmidt');
    const btnWulff = document.getElementById('btn-proj-wulff');
    if (btnSchmidt && btnWulff) {
      if (type === 'schmidt') {
        btnSchmidt.classList.add('bg-sky-600', 'text-white');
        btnSchmidt.classList.remove('bg-slate-800', 'text-slate-400');
        btnWulff.classList.remove('bg-sky-600', 'text-white');
        btnWulff.classList.add('bg-slate-800', 'text-slate-400');
      } else {
        btnWulff.classList.add('bg-sky-600', 'text-white');
        btnWulff.classList.remove('bg-slate-800', 'text-slate-400');
        btnSchmidt.classList.remove('bg-sky-600', 'text-white');
        btnSchmidt.classList.add('bg-slate-800', 'text-slate-400');
      }
    }
    draw();
  }

  function toggleLayer(layerKey) {
    if (config[layerKey] !== undefined) {
      config[layerKey] = !config[layerKey];
      draw();
    }
  }

  function showPythonModal() {
    let modal = document.getElementById('modal-stereonet-python');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-stereonet-python';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
      modal.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl relative">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-xl">🐍</span>
              <div>
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Estereograma HD (Matplotlib DPI 300)</h3>
                <p class="text-[11px] text-slate-400">Renderizado con calidad de publicación para informes técnicos geomecánicos</p>
              </div>
            </div>
            <button onclick="document.getElementById('modal-stereonet-python').classList.add('hidden')" class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-lg">✕</button>
          </div>
          <div class="flex justify-center bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            <img id="img-stereonet-python-preview" src="assets/stereonet_preview.png" alt="Estereograma Python" class="max-h-[380px] rounded-lg shadow-lg object-contain">
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <span class="text-[11px] text-slate-400 font-mono">Resolución: 2700 x 2700 px (DPI 300)</span>
            <div class="flex items-center gap-2">
              <a href="assets/stereonet_preview.png" download="Estereograma_Python_DPI300.png" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition">
                <span>⬇️</span> Descargar PNG 300 DPI
              </a>
              <button onclick="window.GeoWedgeStereonet.downloadPythonScript()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition">
                <span>🐍</span> Descargar Script .py
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.classList.remove('hidden');
    }
  }

  return {
    init,
    update,
    draw,
    setProjection,
    toggleLayer,
    downloadCanvasHD,
    downloadPythonScript,
    showPythonModal
  };
})();

// Registro modular en Core Hub
if (window.GeoWedgeModules) {
  window.GeoWedgeModules.register('stereonet', window.GeoWedgeStereonet);
}
