/**
 * Módulo 5: Análisis de Sensibilidad Geomecánica Multivariable
 * Genera curvas de Factor de Seguridad frente a parámetros críticos y exporta a CSV.
 * Desarrollado para Geologgia Ltda.
 */

window.GeoWedgeSensitivity = (function() {
  let canvas = null;
  let ctx = null;
  let lastState = null;
  let lastRes = null;
  let activeCurve = 'friction'; // 'friction', 'shotcrete', 'seismic', 'bolts'

  function init() {
    canvas = document.getElementById('canvas-sensitivity');
    if (canvas) ctx = canvas.getContext('2d');
    bindControls();
    console.log('[Módulo Sensibilidad] Inicializado.');
  }

  function update(res, state) {
    lastRes = res;
    lastState = state;
    const panel = document.getElementById('panel-sensitivity');
    if (panel && !panel.classList.contains('hidden')) {
      draw();
    }
  }

  function evaluateFS(modState) {
    // Evaluación rápida de FS variando parámetros
    const s = Object.assign({}, lastState, modState);
    const weightTon = lastRes ? lastRes.weightTon : 20.0;
    const gAcc = 0.00981;
    const staticW = weightTon * gAcc;

    let sMag = 0;
    if (s.enableSeismic) {
      sMag = Math.sqrt(Math.pow(s.kh, 2) + Math.pow(s.kv, 2)) * staticW;
    }
    const demForce = staticW + sMag;

    // Resistencia
    const fricRad = (s.friction * Math.PI) / 180;
    const norm = Math.max(0.001, staticW * Math.cos(fricRad));
    const resRock = norm * Math.tan(fricRad) + (s.cohesionMPa || 0.03) * (lastRes ? lastRes.areaJoints : 10.0);

    let resBolts = 0;
    if (s.enableBolts) {
      const bCount = lastRes ? lastRes.boltCount : 2;
      resBolts = bCount * (s.boltCapMN || 0.18);
    }

    let resShot = 0;
    if (s.enableShotcrete) {
      const perim = lastRes ? lastRes.perimBase : 8.0;
      resShot = (s.shotShearMPa || 1.2) * perim * ((s.shotT || 10) / 100.0);
    }

    const totalRes = resRock + resBolts + resShot;
    return totalRes / Math.max(0.001, demForce);
  }

  function generateCurveData() {
    if (!lastState) return [];
    const points = [];

    if (activeCurve === 'friction') {
      for (let phi = 15; phi <= 50; phi += 2) {
        const fs = evaluateFS({ friction: phi });
        points.push({ x: phi, y: fs, labelX: `${phi}°` });
      }
    } else if (activeCurve === 'shotcrete') {
      for (let t = 0; t <= 25; t += 1) {
        const fs = evaluateFS({ enableShotcrete: t > 0, shotT: t });
        points.push({ x: t, y: fs, labelX: `${t} cm` });
      }
    } else if (activeCurve === 'seismic') {
      for (let kh = 0.0; kh <= 0.35; kh += 0.02) {
        const fs = evaluateFS({ enableSeismic: kh > 0, kh: kh, kv: -kh / 2 });
        points.push({ x: kh, y: fs, labelX: `${kh.toFixed(2)}g` });
      }
    } else if (activeCurve === 'bolts') {
      for (let cap = 0.05; cap <= 0.40; cap += 0.025) {
        const fs = evaluateFS({ enableBolts: true, boltCapMN: cap });
        points.push({ x: cap * 1000, y: fs, labelX: `${(cap * 1000).toFixed(0)} kN` });
      }
    }

    return points;
  }

  function draw() {
    if (!canvas) canvas = document.getElementById('canvas-sensitivity');
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const isDark = document.documentElement.classList.contains('dark');
    const axisColor = isDark ? '#475569' : '#cbd5e1';
    const gridColor = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.7)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const targetFS = window.targetFS || 1.15;

    const padL = 45;
    const padR = 25;
    const padT = 25;
    const padB = 35;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const data = generateCurveData();
    if (data.length === 0) return;

    const maxY = Math.min(25, Math.max(3.0, ...data.map(d => d.y) * 1.15));
    const minY = 0;

    // Cuadrícula horizontal
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = (maxY / ySteps) * i;
      const py = padT + plotH - (yVal / maxY) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(w - padR, py);
      ctx.stroke();
      ctx.fillText(yVal.toFixed(1), padL - 6, py + 3);
    }

    // Líneas Umbral: FS = 1.0 (Falla) y FS = targetFS (Seguro)
    const py1 = padT + plotH - (1.0 / maxY) * plotH;
    ctx.strokeStyle = '#ef4444'; // Rojo falla
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padL, py1); ctx.lineTo(w - padR, py1); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'left';
    ctx.fillText('Límite Falla FS=1.0', padL + 6, py1 - 4);

    const pyTarget = padT + plotH - (targetFS / maxY) * plotH;
    ctx.strokeStyle = '#10b981'; // Verde seguro
    ctx.beginPath(); ctx.moveTo(padL, pyTarget); ctx.lineTo(w - padR, pyTarget); ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.fillText(`Diseño FS≥${targetFS.toFixed(2)}`, padL + 6, pyTarget - 4);
    ctx.setLineDash([]);

    // Curva de Sensibilidad
    ctx.strokeStyle = '#38bdf8'; // Celeste brillante
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    data.forEach((pt, idx) => {
      const px = padL + (idx / (data.length - 1)) * plotW;
      const clampedY = Math.min(maxY, pt.y);
      const py = padT + plotH - (clampedY / maxY) * plotH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Puntos y etiquetas en X
    ctx.fillStyle = '#38bdf8';
    data.forEach((pt, idx) => {
      const px = padL + (idx / (data.length - 1)) * plotW;
      const clampedY = Math.min(maxY, pt.y);
      const py = padT + plotH - (clampedY / maxY) * plotH;

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      // Etiquetas en X cada pocos puntos
      if (idx % Math.ceil(data.length / 7) === 0 || idx === data.length - 1) {
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(pt.labelX, px, h - padB + 14);
        ctx.fillStyle = '#38bdf8';
      }
    });

    // Ejes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH); ctx.lineTo(w - padR, padT + plotH);
    ctx.stroke();

    // Título del eje X
    const xLabels = {
      friction: 'Ángulo de Fricción en Discontinuidades φ (°)',
      shotcrete: 'Espesor de Hormigón Proyectado / Shotcrete (cm)',
      seismic: 'Coeficiente Sísmico Horizontal kh (g)',
      bolts: 'Capacidad Tensil de Pernos de Anclaje (kN)'
    };
    ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(xLabels[activeCurve] || 'Parámetro', padL + plotW / 2, h - 6);
  }

  function exportCSV() {
    const data = generateCurveData();
    if (data.length === 0) return;

    let csv = `Parametro,Valor_X,Factor_Seguridad_FS\n`;
    data.forEach(d => {
      csv += `"${activeCurve}","${d.labelX}",${d.y.toFixed(3)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sensibilidad_geowedge_${activeCurve}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function bindControls() {
    const selector = document.getElementById('select-sensitivity-var');
    if (selector) {
      selector.addEventListener('change', e => {
        activeCurve = e.target.value;
        draw();
      });
    }

    const btnCsv = document.getElementById('btn-export-sensitivity-csv');
    if (btnCsv) btnCsv.addEventListener('click', exportCSV);
  }

  return {
    init,
    update,
    draw
  };
})();

// Registro modular en Core Hub
if (window.GeoWedgeModules) {
  window.GeoWedgeModules.register('sensitivity', window.GeoWedgeSensitivity);
}
