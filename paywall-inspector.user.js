// ==UserScript==
// @name         Paywall Inspector
// @namespace    https://github.com/derfleck/analytics_debugger
// @version      1.0
// @description  Inspect paywall configuration on kurier.at and freizeit.at
// @author       derfleck
// @match        *://*.kurier.at/*
// @match        *://*.freizeit.at/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
	'use strict';

	// Configuration - Update this to your GitHub raw URL
	const LOADER_URL = 'https://cdn.jsdelivr.net/gh/derfleck/analytics_debugger@main/bookmarklet/loader.js';

	// Check if already loaded
	if (window.__paywallInspectorLoaded) {
		return;
	}

	// Load the main loader script
	const script = document.createElement('script');
	script.src = LOADER_URL + '?_=' + Date.now();
	script.onload = () => console.log('[Paywall Inspector] Userscript loaded successfully');
	script.onerror = () => console.error('[Paywall Inspector] Userscript failed to load');
	document.head.appendChild(script);

})();
