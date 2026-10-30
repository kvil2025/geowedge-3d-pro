/**
 * Módulo 4: Simulación Cinemática 3D de Inestabilidad y Caída
 * Modela la trayectoria física de desprendimiento de la cuña en tiempo real.
 * Optimizado: 60 FPS directos sobre el renderizador 3D sin bucles recursivos.
 * Desarrollado para Geologgia Ltda.
 */

window.GeoWedgeSimulation = (function() {
  let isRunning = false;
  let isPaused = false;
  let simTime = 0;
  let animFrameId = null;
  let offset = { x: 0, y: 0, z: 0 };
  let speedFactor = 1.0;
  let maxDrop = 4.0;
  let lastRes = null;
  let lastState = null;

  function init() {
    bindControls();
    console.log('[Módulo Simulación] Inicializado y optimizado.');
  }

  function update(res, state) {
    lastRes = res;
    lastState = state;
    maxDrop = (state.height || 4.5) * 0.95;
    // Si la cuña no está en simulación activa, resetear suavemente las coordenadas
    if (!isRunning) {
      simTime = 0;
      offset.x = 0;
      offset.y = 0;
      offset.z = 0;
    }
  }

  function getWedgeOffset() {
    return offset;
  }

  function isSimulating() {
    return isRunning;
  }

  function start() {
    if (isRunning && isPaused) {
      isPaused = false;
      loop();
      updateUIButtons();
      return;
    }
    isRunning = true;
    isPaused = false;
    simTime = 0;
    offset.x = 0;
    offset.y = 0;
    offset.z = 0;
    updateUIButtons();
    loop();
  }

  function pause() {
    isPaused = true;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    updateUIButtons();
  }

  function reset() {
    isRunning = false;
    isPaused = false;
    simTime = 0;
    offset.x = 0;
    offset.y = 0;
    offset.z = 0;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    updateUIButtons();
    // Renderizar solo la escena 3D sin relanzar updateUI
    if (typeof window.draw3DCurrent === 'function') {
      window.draw3DCurrent();
    }
  }

  function loop() {
    if (!isRunning || isPaused) return;

    simTime += 0.016 * speedFactor;

    // Física de caída / deslizamiento cinemático
    const gEff = 4.8;
    const dy = -0.5 * gEff * (simTime * simTime);

    let dx = 0;
    let dz = 0;
    if (lastState && lastState.enableSeismic) {
      const azRad = ((lastState.seismicAz || 90) * Math.PI) / 180;
      const sMag = (lastState.kh || 0.15) * 2.2;
      dx = Math.sin(azRad) * sMag * simTime;
      dz = Math.cos(azRad) * sMag * simTime;
    }

    if (Math.abs(dy) >= maxDrop) {
      offset.y = -maxDrop;
      offset.x = dx;
      offset.z = dz;
      isPaused = true;
      updateUIButtons();
      if (typeof window.draw3DCurrent === 'function') window.draw3DCurrent();
      return;
    }

    offset.y = dy;
    offset.x = dx;
    offset.z = dz;

    // Solo redibujar el canvas 3D (60 FPS puros)
    if (typeof window.draw3DCurrent === 'function') {
      window.draw3DCurrent();
    }

    animFrameId = requestAnimationFrame(loop);
  }

  function updateUIButtons() {
    const btnPlay = document.getElementById('sim-btn-play');
    const statusText = document.getElementById('sim-status-text');

    if (btnPlay) {
      if (isRunning && !isPaused) {
        btnPlay.classList.add('bg-emerald-700');
        btnPlay.innerHTML = '<span>⚡</span> En Curso';
      } else {
        btnPlay.classList.remove('bg-emerald-700');
        btnPlay.innerHTML = '<span>▶️</span> Iniciar';
      }
    }

    if (statusText) {
      if (!isRunning) statusText.textContent = 'En reposo en su posición geológica';
      else if (isPaused && Math.abs(offset.y) >= maxDrop) statusText.textContent = '💥 ¡Impacto en solera/piso de labor!';
      else if (isPaused) statusText.textContent = '⏸️ En pausa';
      else statusText.textContent = `🚀 Cayendo: ${(Math.abs(offset.y)).toFixed(2)} m`;
    }
  }

  function bindControls() {
    const btnPlay = document.getElementById('sim-btn-play');
    const btnPause = document.getElementById('sim-btn-pause');
    const btnReset = document.getElementById('sim-btn-reset');
    const sliderSpeed = document.getElementById('sim-slider-speed');

    if (btnPlay) btnPlay.addEventListener('click', start);
    if (btnPause) btnPause.addEventListener('click', pause);
    if (btnReset) btnReset.addEventListener('click', reset);
    if (sliderSpeed) {
      sliderSpeed.addEventListener('input', e => {
        speedFactor = Number(e.target.value);
        const lbl = document.getElementById('sim-lbl-speed');
        if (lbl) lbl.textContent = `${speedFactor.toFixed(1)}x`;
      });
    }
  }

  return {
    init,
    update,
    getWedgeOffset,
    isSimulating,
    start,
    pause,
    reset
  };
})();

// Registro modular en Core Hub
if (window.GeoWedgeModules) {
  window.GeoWedgeModules.register('simulation', window.GeoWedgeSimulation);
}
