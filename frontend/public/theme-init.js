// Aplica el tema guardado antes de que React cargue, para evitar un parpadeo de color.
// Archivo aparte (no script en línea) porque la política de seguridad (CSP) bloquea scripts en línea.
;(function () {
  var theme = 'dark'
  try {
    var saved = localStorage.getItem('smred-theme')
    if (saved === 'dark' || saved === 'light') theme = saved
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light'
  } catch {
    /* sin acceso a localStorage: se usa oscuro */
  }
  document.documentElement.setAttribute('data-theme', theme)
})()
