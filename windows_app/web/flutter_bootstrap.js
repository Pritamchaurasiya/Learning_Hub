/**
 * Learning Hub - Premium Bootstrap Loader
 * Handles initialization with custom logic and retry strategies.
 */

// Custom configuration for CanvasKit/SKIA
window.flutterWebRenderer = "canvaskit";

// God Mode Loader
(function() {
  const loadingContainer = document.querySelector('.loading-container');
  const progressBar = document.querySelector('.progress-value');
  
  // Update progress simulation
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 10;
    if (progress > 90) progress = 90;
    if (progressBar) progressBar.style.width = `${progress}%`;
  }, 200);

  // Initialize Flutter with detailed logging
  _flutter.loader.loadEntrypoint({
    serviceWorker: {
      serviceWorkerVersion: {{flutter_service_worker_version}},
    },
    onEntrypointLoaded: async function(engineInitializer) {
      console.log("[LearningHub] Engine Initializer Loaded");
      
      const appRunner = await engineInitializer.initializeEngine({
        // Enforce CanvasKit for Desktop/High-End Mobile
        renderer: "canvaskit", 
        canvasKitVariant: "full",
      });
      
      console.log("[LearningHub] Engine Initialized");
      
      // Finish progress bar
      clearInterval(interval);
      if (progressBar) progressBar.style.width = '100%';
      
      // Fade out loader
      if (loadingContainer) {
        loadingContainer.style.transition = 'opacity 0.5s ease';
        loadingContainer.style.opacity = '0';
        setTimeout(() => loadingContainer.remove(), 500);
      }

      await appRunner.runApp();
    }
  });
})();
