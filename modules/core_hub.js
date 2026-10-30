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

    togglePanel: function(panelId, btnId) {
      const panel = document.getElementById(panelId);
      const btn = document.getElementById(btnId);
      if (!panel) return;
      const isHidden = panel.classList.contains('hidden');
      if (isHidden) {
        panel.classList.remove('hidden');
        if (btn) {
          btn.classList.add('bg-sky-600', 'text-white');
          btn.classList.remove('text-slate-600', 'dark:text-slate-400');
        }
      } else {
        panel.classList.add('hidden');
        if (btn) {
          btn.classList.remove('bg-sky-600', 'text-white');
          btn.classList.add('text-slate-600', 'dark:text-slate-400');
        }
      }
    }
  };
})();
