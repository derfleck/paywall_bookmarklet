// Paywall Inspector - Loader
// This is the entry point that loads all modules
// Users load this single file, which then fetches the components

(function () {
	'use strict';

	// Configuration - Update this to your GitHub raw URL base
	const BASE_URL = 'https://cdn.jsdelivr.net/gh/derfleck/analytics_debugger@main/bookmarklet/src';

	// Modules to load in order
	const MODULES = [
		'styles.js',
		'core.js',
		'widget.js'
	];

	// Prevent double initialization
	if (window.__paywallInspectorLoaded) {
		console.log('[Paywall Inspector] Already loaded, toggling visibility');
		if (window.PaywallInspector?.widget) {
			window.PaywallInspector.widget.toggle();
		}
		return;
	}
	window.__paywallInspectorLoaded = true;

	// Load a script and return a promise
	function loadScript(url) {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = url + '?_=' + Date.now(); // Cache bust
			script.onload = resolve;
			script.onerror = () => reject(new Error(`Failed to load ${url}`));
			document.head.appendChild(script);
		});
	}

	// Load all modules sequentially
	async function loadModules() {
		console.log('[Paywall Inspector] Loading modules...');

		for (const module of MODULES) {
			try {
				await loadScript(`${BASE_URL}/${module}`);
				console.log(`[Paywall Inspector] Loaded ${module}`);
			} catch (error) {
				console.error(`[Paywall Inspector] Error loading ${module}:`, error);
				throw error;
			}
		}

		console.log('[Paywall Inspector] All modules loaded');
	}

	// Initialize the inspector
	function init() {
		const PI = window.PaywallInspector;

		// Create widget
		PI.widget.create();

		// Start DataLayer detection
		PI.dataLayer.detect();
		PI.dataLayer.startTpTagsPolling();

		// Initial widget update
		PI.widget.update();

		// Install auto-load bootstrap if enabled
		installBootstrap();

		console.log('[Paywall Inspector] Initialized successfully!');
	}

	// Install a bootstrap that will auto-load on future page loads
	function installBootstrap() {
		// Only install on kurier.at or freizeit.at
		const hostname = window.location.hostname;
		if (!hostname.includes('kurier.at') && !hostname.includes('freizeit.at')) {
			return;
		}

		// Check if auto-load is enabled
		if (localStorage.getItem('paywallInspector_autoload') !== 'true') {
			return;
		}

		// Create a check script that runs on page load
		const bootstrapCode = `
            (function() {
                if (window.__paywallInspectorLoaded) return;
                if (localStorage.getItem('paywallInspector_autoload') !== 'true') return;
                
                var s = document.createElement('script');
                s.src = '${BASE_URL.replace('/src', '')}/loader.js?_=' + Date.now();
                document.head.appendChild(s);
            })();
        `;

		// Store the bootstrap code for the next page load
		// This uses sessionStorage to persist across SPA navigations
		sessionStorage.setItem('paywallInspector_bootstrap', bootstrapCode);

		// For SPA navigation, watch for URL changes
		let lastUrl = window.location.href;
		const observer = new MutationObserver(() => {
			if (window.location.href !== lastUrl) {
				lastUrl = window.location.href;
				console.log('[Paywall Inspector] Navigation detected, reinitializing...');

				// Reset state for new page
				window.PaywallInspector.state.scannedPages.clear();
				window.PaywallInspector.state.dataLayerData = {
					composerSegmentsReady: null,
					setPaidContent: null,
					tpTags: null,
					debug: {
						monitoringStarted: Date.now(),
						eventsProcessed: 0,
						dataLayerExists: false,
						lastEventTime: null
					}
				};
				window.PaywallInspector.state.isMonitoringSetup = false;

				// Reinitialize
				setTimeout(() => {
					window.PaywallInspector.dataLayer.detect();
					window.PaywallInspector.dataLayer.startTpTagsPolling();
					window.PaywallInspector.widget.update();
				}, 500);
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });

		console.log('[Paywall Inspector] Auto-load bootstrap installed');
	}

	// Run on page load
	loadModules()
		.then(init)
		.catch(error => {
			console.error('[Paywall Inspector] Failed to initialize:', error);
		});

})();
