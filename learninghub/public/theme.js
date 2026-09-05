// Prevents theme flash: apply dark class before React hydrates
;(function () {
  try {
    var stored = JSON.parse(localStorage.getItem('learninghub-storage') || '{}')
    var theme = stored && stored.theme && stored.theme.mode
    if (
      theme === 'dark' ||
      (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch (e) {}
})()