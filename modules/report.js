/**
 * Módulo 1: Memoria de Cálculo Geotécnica y Exportador PDF / Imprimir
 * Genera un informe técnico formal con membrete de Geologgia Ltda.
 */

window.GeoWedgeReport = (function() {
  let lastRes = null;
  let lastState = null;

  function init() {
    console.log('[Módulo Reporte] Inicializado.');
  }

  function update(res, state) {
    lastRes = res;
    lastState = JSON.parse(JSON.stringify(state));
  }

  function generateReportHTML() {
    if (!lastRes || !lastState) return '';

    // Snapshot del canvas 3D
    const canvas3d = document.getElementById('canvas-3d');
    let snapshotUrl = '';
    if (canvas3d) {
      try {
        snapshotUrl = canvas3d.toDataURL('image/png');
      } catch (e) {
        console.warn('No se pudo capturar snapshot:', e);
      }
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isStable = lastRes.fs >= (window.targetFS || 1.15);
    const fsVal = lastRes.fs >= 100 ? '> 100' : lastRes.fs.toFixed(2);
    const unitS = window.useMPa ? 'MPa' : 'kPa';
    const unitF = window.useMPa ? 'MN' : 'kN';

    const shapeNames = {
      horseshoe: 'Herradura Clásica (Horseshoe)',
      arch: 'Bóveda / Medio Punto Semicircular',
      circular: 'Circular / TBM (Túnel Escudo)',
      rectangular: 'Rectangular / Caserón Minero',
      shaft: 'Pique Vertical (Shaft Cilíndrico 90°)'
    };

    return `
      <div id="printable-geotechnical-report" class="bg-white text-slate-900 p-8 max-w-4xl mx-auto font-sans shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0">
        
        <!-- ENCABEZADO CORPORATIVO GEOLOGGIA LTDA -->
        <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
          <div class="flex items-center gap-4">
            <img src="assets/logo_geologgia.svg" alt="Geologgia Logo" class="h-10 w-auto">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-slate-950 uppercase">Memoria de Cálculo Geotécnico</h1>
              <p class="text-xs text-slate-600 font-medium">Estabilidad Tridimensional de Cuñas y Dimensionamiento de Soporte Subterráneo</p>
            </div>
          </div>
          <div class="text-right text-xs text-slate-500 font-mono">
            <p><b>Fecha:</b> ${dateStr}</p>
            <p><b>Software:</b> GeoWedge 3D Pro v2.4</p>
            <p><b>Metodología:</b> Block Theory (Goodman & Shi)</p>
          </div>
        </div>

        <!-- RESUMEN EJECUTIVO / FACTOR DE SEGURIDAD -->
        <div class="p-4 rounded-xl ${isStable ? 'bg-emerald-50 border border-emerald-300' : 'bg-rose-50 border border-rose-300'} mb-6 flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider ${isStable ? 'text-emerald-800' : 'text-rose-800'}">Dictamen Geomecánico de Estabilidad</span>
            <h2 class="text-2xl font-black ${isStable ? 'text-emerald-700' : 'text-rose-700'}">
              ${isStable ? '✅ CONDICIÓN ESTABLE Y SEGURA' : '⚠️ CONDICIÓN CRÍTICA / INESTABLE'}
            </h2>
            <p class="text-xs text-slate-700 mt-0.5">
              Factor de Seguridad Calculado: <b class="font-mono text-sm">${fsVal}</b> | Requerido por Norma: <b class="font-mono">FS ≥ ${(window.targetFS || 1.15).toFixed(2)}</b>
            </p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-black font-mono ${isStable ? 'text-emerald-600' : 'text-rose-600'}">FS ${fsVal}</div>
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isStable ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}">
              ${lastRes.mode || 'Caída Libre / Deslizamiento'}
            </span>
          </div>
        </div>

        <!-- FOTO 3D Y DATOS GEOMÉTRICOS -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div class="border border-slate-200 rounded-lg p-2 bg-slate-900 flex flex-col items-center justify-center">
            ${snapshotUrl ? `<img src="${snapshotUrl}" alt="Modelo 3D" class="w-full h-auto rounded object-contain max-h-56">` : '<div class="text-white text-xs">Captura no disponible</div>'}
            <span class="text-[10px] text-slate-400 font-mono mt-1">Render 3D • Cuña, Labores y Soporte Modelado</span>
          </div>

          <div class="space-y-3 text-xs">
            <h3 class="font-bold text-slate-800 border-b pb-1 uppercase tracking-wide text-[11px]">1. Parámetros de Excavación</h3>
            <table class="w-full text-left">
              <tbody>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Perfil / Sección:</td><td class="py-1 font-semibold">${shapeNames[lastState.shape] || lastState.shape}</td></tr>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Ancho (Span) / Diámetro:</td><td class="py-1 font-mono font-semibold">${lastState.span.toFixed(2)} m</td></tr>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Altura Libre:</td><td class="py-1 font-mono font-semibold">${lastState.height.toFixed(2)} m</td></tr>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Rumbo (Trend) / Manteo (Plunge):</td><td class="py-1 font-mono font-semibold">${lastState.trend}° / ${lastState.plunge}°</td></tr>
                <tr class="border-b border-slate-100"><td class="py-1 text-slate-500">Ubicación de Cuña Crítica:</td><td class="py-1 font-semibold uppercase text-sky-700">${lastState.wedgeLoc === 'roof' ? 'Techo / Corona' : (lastState.wedgeLoc === 'left' ? 'Pared Izquierda' : 'Pared Derecha')}</td></tr>
                <tr><td class="py-1 text-slate-500">Volumen / Peso Cuña:</td><td class="py-1 font-mono font-semibold">${lastRes.volumeM3.toFixed(2)} m³ (${lastRes.weightTon.toFixed(1)} Ton)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- DISCONTINUIDADES ESTRUCTURALES -->
        <div class="mb-6">
          <h3 class="font-bold text-slate-800 border-b pb-1 uppercase tracking-wide text-[11px] mb-2">2. Familias de Discontinuidades (Orientación & Geomecánica)</h3>
          <table class="w-full text-xs text-left border border-slate-200">
            <thead class="bg-slate-100 text-slate-700">
              <tr>
                <th class="p-2 border-r">Set Estructural</th>
                <th class="p-2 border-r">Manteo (Dip)</th>
                <th class="p-2 border-r">Dirección Manteo (DipDir)</th>
                <th class="p-2 border-r">Ángulo Fricción (&phi;)</th>
                <th class="p-2">Cohesión (c)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 font-mono">
              <tr><td class="p-2 font-bold font-sans">Junta 1 (J1)</td><td class="p-2">${lastState.j1.dip}°</td><td class="p-2">${String(lastState.j1.dipdir).padStart(3, '0')}°</td><td class="p-2">${lastState.friction}°</td><td class="p-2">${lastState.cohesionMPa.toFixed(3)} MPa</td></tr>
              <tr><td class="p-2 font-bold font-sans">Junta 2 (J2)</td><td class="p-2">${lastState.j2.dip}°</td><td class="p-2">${String(lastState.j2.dipdir).padStart(3, '0')}°</td><td class="p-2">${lastState.friction}°</td><td class="p-2">${lastState.cohesionMPa.toFixed(3)} MPa</td></tr>
              <tr><td class="p-2 font-bold font-sans">Junta 3 (J3)</td><td class="p-2">${lastState.j3.dip}°</td><td class="p-2">${String(lastState.j3.dipdir).padStart(3, '0')}°</td><td class="p-2">${lastState.friction}°</td><td class="p-2">${lastState.cohesionMPa.toFixed(3)} MPa</td></tr>
            </tbody>
          </table>
        </div>

        <!-- SISTEMA DE SOPORTE Y SISMICIDAD -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 class="font-bold text-slate-800 border-b pb-1 uppercase tracking-wide text-[11px] mb-2">3. Sismicidad Pseudoestática</h3>
            <table class="w-full text-xs text-left border border-slate-200">
              <tbody class="divide-y divide-slate-100 font-mono">
                <tr><td class="p-1.5 text-slate-500 font-sans">Condición Sísmica:</td><td class="p-1.5 font-bold">${lastState.enableSeismic ? 'ACTIVA (Conforme Norma)' : 'INACTIVA (Solo Estático)'}</td></tr>
                <tr><td class="p-1.5 text-slate-500 font-sans">Coef. Sísmico Horizontal (kh):</td><td class="p-1.5 font-bold text-orange-600">${lastState.kh.toFixed(2)} g</td></tr>
                <tr><td class="p-1.5 text-slate-500 font-sans">Coef. Sísmico Vertical (kv):</td><td class="p-1.5 font-bold text-orange-600">${lastState.kv.toFixed(2)} g</td></tr>
                <tr><td class="p-1.5 text-slate-500 font-sans">Azimut de Ataque Sísmico:</td><td class="p-1.5">${lastState.seismicAz}°</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 class="font-bold text-slate-800 border-b pb-1 uppercase tracking-wide text-[11px] mb-2">4. Fortificación y Sostenimiento</h3>
            <table class="w-full text-xs text-left border border-slate-200">
              <tbody class="divide-y divide-slate-100 font-mono">
                <tr><td class="p-1.5 text-slate-500 font-sans">Pernos de Anclaje:</td><td class="p-1.5 font-bold text-violet-700">${lastState.enableBolts ? `${lastRes.boltCount} pernos (${lastState.boltST}x${lastState.boltSL}m, L=${lastState.boltLen}m)` : 'Sin pernos'}</td></tr>
                <tr><td class="p-1.5 text-slate-500 font-sans">Capacidad Tensil Perno:</td><td class="p-1.5">${lastState.boltCapMN.toFixed(2)} MN (${(lastState.boltCapMN * 1000).toFixed(0)} kN)</td></tr>
                <tr><td class="p-1.5 text-slate-500 font-sans">Hormigón Shotcrete:</td><td class="p-1.5 font-bold text-amber-700">${lastState.enableShotcrete ? `Espesor e = ${lastState.shotT} cm (f'c = ${lastState.shotFC} MPa)` : 'Sin shotcrete'}</td></tr>
                <tr><td class="p-1.5 text-slate-500 font-sans">Resistencia al Corte (&tau;):</td><td class="p-1.5">${lastState.shotShearMPa.toFixed(2)} MPa</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- BALANCE DE FUERZAS Y TENSIONES -->
        <div class="mb-6">
          <h3 class="font-bold text-slate-800 border-b pb-1 uppercase tracking-wide text-[11px] mb-2">5. Balance Vectorial de Fuerzas y Tensiones de Equilibrio Límite</h3>
          <table class="w-full text-xs text-left border border-slate-200 font-mono">
            <thead class="bg-slate-100 font-sans text-slate-700">
              <tr>
                <th class="p-1.5">Componente de Equilibrio</th>
                <th class="p-1.5">Tensión (${unitS})</th>
                <th class="p-1.5 text-right">Fuerza (${unitF})</th>
                <th class="p-1.5 text-right">% Aporte</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr class="text-orange-700 bg-orange-50/50"><td class="p-1.5 font-sans">Sobrecarga Sísmica Inercial</td><td class="p-1.5">${lastRes.stressSeismic.toFixed(3)}</td><td class="p-1.5 text-right font-bold">${lastRes.seismicMagMN.toFixed(3)}</td><td class="p-1.5 text-right">-</td></tr>
              <tr><td class="p-1.5 font-sans">Resistencia en Discontinuidades (Roca)</td><td class="p-1.5">${lastRes.stressRock.toFixed(3)}</td><td class="p-1.5 text-right">${lastRes.resRock.toFixed(3)}</td><td class="p-1.5 text-right">${((lastRes.resRock/lastRes.resTotal)*100 || 0).toFixed(1)}%</td></tr>
              <tr class="text-violet-700"><td class="p-1.5 font-sans">Aporte Tensil de Pernos</td><td class="p-1.5">${lastRes.stressBolts.toFixed(3)}</td><td class="p-1.5 text-right font-bold">${lastRes.resBolts.toFixed(3)}</td><td class="p-1.5 text-right">${((lastRes.resBolts/lastRes.resTotal)*100 || 0).toFixed(1)}%</td></tr>
              <tr class="text-amber-700"><td class="p-1.5 font-sans">Aporte al Corte Shotcrete</td><td class="p-1.5">${lastRes.stressShot.toFixed(3)}</td><td class="p-1.5 text-right font-bold">${lastRes.resShot.toFixed(3)}</td><td class="p-1.5 text-right">${((lastRes.resShot/lastRes.resTotal)*100 || 0).toFixed(1)}%</td></tr>
              <tr class="bg-slate-100 font-bold font-sans"><td class="p-1.5">FUERZA RESISTENTE TOTAL</td><td class="p-1.5 font-mono">${lastRes.stressTotal.toFixed(3)}</td><td class="p-1.5 text-right font-mono text-emerald-700">${lastRes.resTotal.toFixed(3)}</td><td class="p-1.5 text-right font-mono">100%</td></tr>
              <tr class="bg-slate-200 font-bold font-sans text-sm"><td class="p-2">FACTOR DE SEGURIDAD (FS)</td><td class="p-2 font-mono" colspan="2">${isStable ? 'CUMPLE NORMATIVA' : 'NO CUMPLE CRITERIO'}</td><td class="p-2 text-right font-mono ${isStable ? 'text-emerald-700' : 'text-rose-700'}">${fsVal}</td></tr>
            </tbody>
          </table>
        </div>

        <!-- FIRMA Y RESPONSABILIDAD TÉCNICA -->
        <div class="mt-8 pt-4 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
          <div>
            <p class="font-bold text-slate-800 uppercase mb-1">Notas Geotécnicas:</p>
            <p class="text-[11px] leading-relaxed">
              El análisis corresponde a una evaluación tridimensional cinemática mediante equilibrio límite y teoría de bloques rígidos. El diseño del soporte considera una acción combinada de pernos pasivos/activos y hormigón proyectado con fibra estructural.
            </p>
          </div>
          <div class="flex flex-col items-center justify-end text-center">
            <div class="w-48 border-b border-slate-400 mb-1"></div>
            <p class="font-bold text-slate-800">Geologgia Ltda</p>
            <p class="text-[10px] text-slate-500">Área de Geomecánica y Obras Subterráneas</p>
          </div>
        </div>

      </div>
    `;
  }

  function openPrintWindow() {
    const reportHtml = generateReportHTML();
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes para generar el informe PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Memoria de Cálculo Geotécnico - GeoWedge 3D Pro</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body class="bg-slate-100 p-4 print:bg-white print:p-0">
        <div class="no-print max-w-4xl mx-auto mb-4 flex justify-between items-center bg-slate-900 text-white p-3 rounded-xl shadow">
          <span class="text-xs font-semibold">📄 Vista previa de informe formal para imprimir o Guardar como PDF</span>
          <div class="flex gap-2">
            <button onclick="window.print()" class="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5">
              <span>🖨️</span> Imprimir / Guardar PDF
            </button>
            <button onclick="window.close()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition">
              Cerrar
            </button>
          </div>
        </div>
        ${reportHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  return {
    init,
    update,
    openPrintWindow
  };
})();

// Registro modular en Core Hub
if (window.GeoWedgeModules) {
  window.GeoWedgeModules.register('report', window.GeoWedgeReport);
}
