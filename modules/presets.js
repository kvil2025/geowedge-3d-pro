/**
 * Módulo 3: Gestor de Proyectos y Presets Geotécnicos Chilenos
 * Permite guardar, cargar, exportar e importar casos en LocalStorage.
 * Desarrollado para Geologgia Ltda.
 */

window.GeoWedgePresets = (function() {
  const STORAGE_KEY = 'geowedge_saved_projects_v1';

  // Casos de Estudio de la Práctica Geotécnica Chilena
  const BENCHMARKS = [
    {
      id: 'bench-teniente',
      name: '⛏️ El Teniente - Galería de Transporte 4.8x4.5m',
      desc: 'Mina subterránea profunda en roca andesita primaria con cuña en techo de alta sismicidad.',
      state: {
        shape: 'horseshoe', wedgeLoc: 'roof', trend: 60, plunge: 0, span: 4.8, height: 4.5, wedgeScale: 0.9,
        j1: { dip: 70, dipdir: 140 }, j2: { dip: 65, dipdir: 230 }, j3: { dip: 45, dipdir: 10 },
        cohesionMPa: 0.05, friction: 38, rockDensity: 2.75,
        enableSeismic: true, kh: 0.20, kv: -0.10, seismicAz: 150,
        enableBolts: true, boltST: 1.5, boltSL: 1.5, boltCapMN: 0.22, boltLen: 3.2,
        enableShotcrete: true, shotT: 7, shotFC: 30, shotShearMPa: 1.4
      }
    },
    {
      id: 'bench-los-bronces',
      name: '⛰️ Los Bronces - Túnel Bypass Cordillerano',
      desc: 'Labor vial/minera en alta cordillera (granodiorita fracturada, alta solicitación sísmica).',
      state: {
        shape: 'horseshoe', wedgeLoc: 'roof', trend: 315, plunge: 2, span: 6.2, height: 5.8, wedgeScale: 1.0,
        j1: { dip: 60, dipdir: 110 }, j2: { dip: 75, dipdir: 200 }, j3: { dip: 55, dipdir: 350 },
        cohesionMPa: 0.03, friction: 34, rockDensity: 2.7,
        enableSeismic: true, kh: 0.25, kv: -0.12, seismicAz: 270,
        enableBolts: true, boltST: 1.2, boltSL: 1.2, boltCapMN: 0.25, boltLen: 3.5,
        enableShotcrete: true, shotT: 10, shotFC: 35, shotShearMPa: 1.6
      }
    },
    {
      id: 'bench-metro-l7',
      name: '🚇 Metro L7 - Túnel Circular de Estación (TBM)',
      desc: 'Túnel circular mecanizado en suelo denso/roca blanda con cuñas locales en hastiales.',
      state: {
        shape: 'circular', wedgeLoc: 'left', trend: 90, plunge: 0, span: 9.5, height: 9.5, wedgeScale: 0.7,
        j1: { dip: 80, dipdir: 170 }, j2: { dip: 70, dipdir: 280 }, j3: { dip: 40, dipdir: 45 },
        cohesionMPa: 0.02, friction: 30, rockDensity: 2.5,
        enableSeismic: true, kh: 0.15, kv: -0.07, seismicAz: 90,
        enableBolts: true, boltST: 1.5, boltSL: 1.5, boltCapMN: 0.18, boltLen: 3.0,
        enableShotcrete: true, shotT: 12, shotFC: 30, shotShearMPa: 1.3
      }
    },
    {
      id: 'bench-ralco',
      name: '⚡ Central Ralco - Caverna de Máquinas (Bóveda)',
      desc: 'Excavación de gran luz en roca basáltica con sostenimiento combinado pesado.',
      state: {
        shape: 'arch', wedgeLoc: 'roof', trend: 15, plunge: 0, span: 14.0, height: 16.0, wedgeScale: 1.0,
        j1: { dip: 55, dipdir: 125 }, j2: { dip: 68, dipdir: 215 }, j3: { dip: 48, dipdir: 305 },
        cohesionMPa: 0.06, friction: 36, rockDensity: 2.8,
        enableSeismic: true, kh: 0.18, kv: -0.09, seismicAz: 105,
        enableBolts: true, boltST: 1.2, boltSL: 1.2, boltCapMN: 0.30, boltLen: 5.0,
        enableShotcrete: true, shotT: 15, shotFC: 35, shotShearMPa: 1.8
      }
    },
    {
      id: 'bench-pique-90',
      name: '🪜 Pique Vertical de Ventilación 4.5m (90°)',
      desc: 'Pique cilíndrico vertical en chimenea minera con cuñas en paredes y pernos radiales.',
      state: {
        shape: 'shaft', wedgeLoc: 'left', trend: 0, plunge: 90, span: 4.5, height: 8.0, wedgeScale: 0.85,
        j1: { dip: 75, dipdir: 90 }, j2: { dip: 80, dipdir: 210 }, j3: { dip: 60, dipdir: 330 },
        cohesionMPa: 0.04, friction: 33, rockDensity: 2.7,
        enableSeismic: true, kh: 0.15, kv: -0.07, seismicAz: 180,
        enableBolts: true, boltST: 1.5, boltSL: 1.5, boltCapMN: 0.20, boltLen: 2.8,
        enableShotcrete: true, shotT: 8, shotFC: 28, shotShearMPa: 1.2
      }
    }
  ];

  function init() {
    renderBenchmarksList();
    renderUserProjectsList();
    bindEvents();
    console.log('[Módulo Presets] Inicializado.');
  }

  function getSavedProjects() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Error leyendo localStorage:', e);
      return [];
    }
  }

  function saveProjects(projects) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Error guardando en localStorage:', e);
    }
  }

  function loadProjectState(targetState) {
    if (!targetState) return;
    const currentState = window.state || (window.GeoWedgeReport && window.GeoWedgeReport.lastState);
    if (!currentState) return;

    // Actualizar campos de estado global
    Object.assign(window.state, JSON.parse(JSON.stringify(targetState)));

    // Sincronizar inputs en la interfaz
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const setChk = (id, checked) => { const el = document.getElementById(id); if (el) el.checked = checked; };

    setVal('select-shape', window.state.shape);
    setVal('select-wedge-loc', window.state.wedgeLoc);
    setVal('input-trend', window.state.trend);
    setVal('input-plunge', window.state.plunge);
    setVal('input-span', window.state.span);
    setVal('input-height', window.state.height);
    setVal('input-wedge-scale', Math.round((window.state.wedgeScale || 1.0) * 100));

    setVal('j1-dip', window.state.j1.dip); setVal('j1-dipdir', window.state.j1.dipdir);
    setVal('j2-dip', window.state.j2.dip); setVal('j2-dipdir', window.state.j2.dipdir);
    setVal('j3-dip', window.state.j3.dip); setVal('j3-dipdir', window.state.j3.dipdir);

    setVal('input-cohesion', window.useMPa ? window.state.cohesionMPa : window.state.cohesionMPa * 1000);
    setVal('input-friction', window.state.friction);

    setChk('chk-seismic', window.state.enableSeismic);
    setVal('input-kh', window.state.kh);
    setVal('input-kv', window.state.kv);
    setVal('input-sismo-az', window.state.seismicAz);

    setChk('chk-bolts', window.state.enableBolts);
    setVal('input-bolt-st', window.state.boltST);
    setVal('input-bolt-sl', window.state.boltSL);
    setVal('input-bolt-cap', window.useMPa ? window.state.boltCapMN : window.state.boltCapMN * 1000);
    setVal('input-bolt-len', window.state.boltLen);

    setChk('chk-shotcrete', window.state.enableShotcrete);
    setVal('input-shot-t', window.state.shotT);
    setVal('input-shot-fc', window.useMPa ? window.state.shotFC : window.state.shotFC * 1000);
    setVal('input-shot-shear', window.useMPa ? window.state.shotShearMPa : window.state.shotShearMPa * 1000);

    // Actualizar etiquetas de etiquetas
    const labelWedge = document.getElementById('label-wedge-scale');
    if (labelWedge) labelWedge.textContent = `${Math.round((window.state.wedgeScale || 1.0) * 100)}%`;

    ['j1', 'j2', 'j3'].forEach(k => {
      const lbl = document.getElementById(`label-${k}`);
      if (lbl) lbl.textContent = `${window.state[k].dip}° / ${String(window.state[k].dipdir).padStart(3, '0')}°`;
    });

    if (typeof window.updateUI === 'function') {
      window.updateUI();
    }
  }

  function renderBenchmarksList() {
    const container = document.getElementById('presets-benchmarks-list');
    if (!container) return;

    container.innerHTML = BENCHMARKS.map((bm, idx) => `
      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 transition flex items-center justify-between gap-2">
        <div class="space-y-0.5">
          <h4 class="text-xs font-bold text-slate-900 dark:text-white">${bm.name}</h4>
          <p class="text-[10px] text-slate-500 dark:text-slate-400">${bm.desc}</p>
        </div>
        <button onclick="window.GeoWedgePresets.loadBenchmark(${idx})" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] transition shrink-0 shadow-sm">
          Cargar
        </button>
      </div>
    `).join('');
  }

  function renderUserProjectsList() {
    const container = document.getElementById('presets-user-list');
    if (!container) return;

    const list = getSavedProjects();
    if (list.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-slate-400 text-xs">
          No tienes proyectos guardados aún. Guarda la configuración actual con el botón inferior.
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((item, idx) => `
      <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div>
          <div class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>📁</span> ${item.name}
            <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">${item.date}</span>
          </div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Labor: ${item.state.shape} (${item.state.span}x${item.state.height}m) | Cuña: ${item.state.wedgeLoc}
          </p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="window.GeoWedgePresets.loadUserProject(${idx})" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] transition">
            Cargar
          </button>
          <button onclick="window.GeoWedgePresets.deleteUserProject(${idx})" class="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-500 text-xs transition" title="Eliminar">
            ✕
          </button>
        </div>
      </div>
    `).join('');
  }

  function saveCurrentProject() {
    const input = document.getElementById('input-new-project-name');
    const name = input ? input.value.trim() : '';
    if (!name) {
      alert('Ingresa un nombre para tu proyecto (ej: Túnel Central Km 12+400).');
      return;
    }

    const projects = getSavedProjects();
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CL') + ' ' + now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    projects.unshift({
      name,
      date: dateStr,
      state: JSON.parse(JSON.stringify(window.state))
    });

    saveProjects(projects);
    if (input) input.value = '';
    renderUserProjectsList();
  }

  function exportProjectsJSON() {
    const projects = getSavedProjects();
    const payload = {
      app: 'GeoWedge 3D Pro',
      version: '2.4',
      date: new Date().toISOString(),
      projects
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geowedge_proyectos_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProjectsJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        const importedList = Array.isArray(parsed) ? parsed : (parsed.projects || []);
        if (!Array.isArray(importedList) || importedList.length === 0) {
          alert('El archivo JSON no contiene proyectos válidos.');
          return;
        }
        const existing = getSavedProjects();
        const combined = [...importedList, ...existing];
        saveProjects(combined);
        renderUserProjectsList();
        alert(`Se importaron ${importedList.length} proyectos con éxito.`);
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    const btnSave = document.getElementById('btn-save-project');
    if (btnSave) btnSave.addEventListener('click', saveCurrentProject);

    const btnExport = document.getElementById('btn-export-projects');
    if (btnExport) btnExport.addEventListener('click', exportProjectsJSON);

    const inputImport = document.getElementById('input-import-json');
    if (inputImport) inputImport.addEventListener('change', importProjectsJSON);
  }

  return {
    init,
    loadBenchmark: function(idx) {
      if (BENCHMARKS[idx]) loadProjectState(BENCHMARKS[idx].state);
    },
    loadUserProject: function(idx) {
      const list = getSavedProjects();
      if (list[idx]) loadProjectState(list[idx].state);
    },
    deleteUserProject: function(idx) {
      if (!confirm('¿Deseas eliminar este proyecto guardado?')) return;
      const list = getSavedProjects();
      list.splice(idx, 1);
      saveProjects(list);
      renderUserProjectsList();
    }
  };
})();

// Registro modular en Core Hub
if (window.GeoWedgeModules) {
  window.GeoWedgeModules.register('presets', window.GeoWedgePresets);
}
