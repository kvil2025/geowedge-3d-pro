/**
 * GeoWedge 3D Pro - Core Modular Hub
 * Arquitectura modular desacoplada para módulos opcionales.
 * Desarrollado para Geologgia Ltda.
 */

window.GeoWedgeModules = (function() {
  const modules = {};
  const listeners = [];

  return {
    register: function(name, moduleObj) {
      modules[name] = moduleObj;
      if (typeof moduleObj.init === 'function') {
        try {
          moduleObj.init();
        } catch (e) {
          console.warn(`[GeoWedgeModules] Error inicializando módulo ${name}:`, e);
        }
      }
      console.log(`[GeoWedgeModules] Módulo '${name}' registrado y activo.`);
    },

    get: function(name) {
      return modules[name];
    },

    onUpdate: function(callback) {
      if (typeof callback === 'function') {
        listeners.push(callback);
      }
    },

    notifyUpdate: function(res, state) {
      listeners.forEach(fn => {
        try {
          fn(res, state);
        } catch (e) {
          console.warn('[GeoWedgeModules] Error en listener de actualización:', e);
        }
      });
      // Notificar a módulos individuales si tienen método update
      Object.keys(modules).forEach(name => {
        if (typeof modules[name].update === 'function') {
          try {
            modules[name].update(res, state);
          } catch (e) {
            console.warn(`[GeoWedgeModules] Error actualizando módulo ${name}:`, e);
          }
        }
      });
    },

    syncButtons: function() {
      const mappings = [
        { panelId: 'panel-stereonet', btnId: 'btn-toggle-stereonet' },
        { panelId: 'panel-simulation', btnId: 'btn-toggle-simulation' },
        { panelId: 'panel-sensitivity', btnId: 'btn-toggle-sensitivity' },
        { panelId: 'panel-presets', btnId: 'btn-toggle-presets' }
      ];
      mappings.forEach(m => {
        const panel = document.getElementById(m.panelId);
        const btn = document.getElementById(m.btnId);
        if (panel && btn) {
          const isOpen = !panel.classList.contains('hidden');
          if (isOpen) {
            btn.classList.add('is-active');
            btn.setAttribute('aria-pressed', 'true');
          } else {
            btn.classList.remove('is-active');
            btn.setAttribute('aria-pressed', 'false');
          }
        }
      });
    },

    togglePanel: function(panelId, btnId) {
      const panel = document.getElementById(panelId);
      const btn = document.getElementById(btnId);
      if (!panel) return;
      const willOpen = panel.classList.contains('hidden');
      if (willOpen) {
        panel.classList.remove('hidden');
        if (btn) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
        }
        if (panelId === 'panel-stereonet' && window.GeoWedgeStereonet) {
          window.GeoWedgeStereonet.draw();
        } else if (panelId === 'panel-sensitivity' && window.GeoWedgeSensitivity) {
          window.GeoWedgeSensitivity.draw();
        }
      } else {
        panel.classList.add('hidden');
        if (btn) {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-pressed', 'false');
        }
      }
    }
  };
})();

// Sincronización automática de botones al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.GeoWedgeModules && window.GeoWedgeModules.syncButtons());
} else {
  setTimeout(() => window.GeoWedgeModules && window.GeoWedgeModules.syncButtons(), 50);
}
