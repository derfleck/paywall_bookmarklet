// Paywall Inspector - Widget Module
// UI widget creation and management

window.PaywallInspector = window.PaywallInspector || {};

(function () {
	'use strict';

	const PI = window.PaywallInspector;

	let widget = null;
	let isCollapsed = false;

	PI.widget = {
		create() {
			if (widget) return widget;

			// Inject CSS
			if (!document.getElementById('paywall-inspector-css')) {
				const style = document.createElement('style');
				style.id = 'paywall-inspector-css';
				style.textContent = PI.styles;
				document.head.appendChild(style);
			}

			const widgetHTML = `
                <div id="datalayer-inspector-widget">
                    <div class="pi-widget-header" id="pi-widget-header">
                        <span>Paywall Inspector</span>
                        <button class="pi-widget-toggle" id="pi-widget-toggle">−</button>
                    </div>
                    <div class="pi-widget-content" id="pi-widget-content">
                        <div class="pi-paywall-story" id="pi-paywall-story">
                            <span class="pi-widget-loading"></span>
                            Analysiere DataLayer-Ereignisse...
                        </div>
                        <div class="pi-widget-details" id="pi-widget-details" style="display: none;">
                            <div class="detail-row">
                                <span class="label">Test-Gruppe:</span>
                                <span class="value" id="pi-test-group">-</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Paywall:</span>
                                <span class="value" id="pi-paywall-status">-</span>
                            </div>
                            <div class="detail-row" id="pi-editorial-row" style="display: none;">
                                <span class="label">Redaktionelle Entscheidung:</span>
                                <span class="value" id="pi-editorial-decision">-</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Abo-Wahrscheinlichkeit Nutzer:</span>
                                <span class="value" id="pi-likelihood-user">-</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Abo-Wahrscheinlichkeit Artikel:</span>
                                <span class="value" id="pi-likelihood-content">-</span>
                            </div>
                        </div>
                        <div class="pi-widget-actions">
                            <button class="pi-widget-btn danger" id="pi-clear-cookies-btn">
                                Cookies löschen & neu laden
                            </button>
                        </div>
                        <div class="pi-position-selector">
                            <div class="pi-position-selector-label">Widget-Position</div>
                            <div class="pi-position-grid">
                                <div class="pi-position-option" data-position="top-left" title="Oben links"></div>
                                <div class="pi-position-option" data-position="top-right" title="Oben rechts"></div>
                                <div class="pi-position-option" data-position="bottom-left" title="Unten links"></div>
                                <div class="pi-position-option" data-position="bottom-right" title="Unten rechts"></div>
                            </div>
                        </div>
                        <div class="pi-edit-buttons-toggle">
                            <div class="pi-edit-buttons-label">Bearbeiten-Buttons</div>
                            <div class="pi-toggle-switch">
                                <input type="checkbox" id="pi-edit-buttons-checkbox" class="pi-toggle-checkbox">
                                <label for="pi-edit-buttons-checkbox" class="pi-toggle-label"></label>
                            </div>
                        </div>
                        <div class="pi-autoload-toggle">
                            <div class="pi-autoload-label">Auto-laden auf kurier.at</div>
                            <div class="pi-toggle-switch">
                                <input type="checkbox" id="pi-autoload-checkbox" class="pi-toggle-checkbox">
                                <label for="pi-autoload-checkbox" class="pi-toggle-label"></label>
                            </div>
                        </div>
                        <div class="pi-widget-status" id="pi-widget-status">
                            Warte auf DataLayer-Ereignisse...
                        </div>
                    </div>
                </div>
            `;

			const container = document.createElement('div');
			container.innerHTML = widgetHTML;
			widget = container.firstElementChild;
			document.body.appendChild(widget);

			this.setupEventListeners();
			this.loadPosition();
			this.loadEditButtonsState();
			this.loadAutoloadState();

			return widget;
		},

		setupEventListeners() {
			const toggleBtn = widget.querySelector('#pi-widget-toggle');
			const header = widget.querySelector('#pi-widget-header');
			const content = widget.querySelector('#pi-widget-content');
			const clearBtn = widget.querySelector('#pi-clear-cookies-btn');

			const toggleWidget = () => {
				isCollapsed = !isCollapsed;
				content.classList.toggle('collapsed', isCollapsed);
				widget.classList.toggle('collapsed', isCollapsed);
				toggleBtn.textContent = isCollapsed ? '+' : '−';
			};

			toggleBtn.addEventListener('click', e => { e.stopPropagation(); toggleWidget(); });
			header.addEventListener('click', toggleWidget);
			clearBtn.addEventListener('click', () => {
				clearBtn.textContent = 'Lösche Cookies...';
				clearBtn.disabled = true;
				PI.cookies.clearAndReload();
			});

			widget.querySelectorAll('.pi-position-option').forEach(option => {
				option.addEventListener('click', e => {
					e.stopPropagation();
					this.setPosition(option.dataset.position);
				});
			});

			const editButtonsCheckbox = widget.querySelector('#pi-edit-buttons-checkbox');
			if (editButtonsCheckbox) {
				editButtonsCheckbox.addEventListener('change', e => {
					e.stopPropagation();
					this.setEditButtonsState(editButtonsCheckbox.checked);
				});
			}

			const autoloadCheckbox = widget.querySelector('#pi-autoload-checkbox');
			if (autoloadCheckbox) {
				autoloadCheckbox.addEventListener('change', e => {
					e.stopPropagation();
					this.setAutoloadState(autoloadCheckbox.checked);
				});
			}
		},

		loadPosition() {
			const position = localStorage.getItem('paywallInspector_position') || 'top-right';
			this.applyPosition(position);
			this.updatePositionSelector(position);
		},

		applyPosition(position) {
			if (!widget) return;
			widget.classList.remove('position-top-left', 'position-top-right', 'position-bottom-left', 'position-bottom-right');
			widget.classList.add(`position-${position}`);
		},

		updatePositionSelector(position) {
			if (!widget) return;
			widget.querySelectorAll('.pi-position-option').forEach(option => {
				option.classList.toggle('active', option.dataset.position === position);
			});
		},

		setPosition(position) {
			localStorage.setItem('paywallInspector_position', position);
			this.applyPosition(position);
			this.updatePositionSelector(position);
		},

		loadEditButtonsState() {
			const checkbox = widget.querySelector('#pi-edit-buttons-checkbox');
			if (checkbox) checkbox.checked = PI.state.editButtonsEnabled;
			if (PI.state.editButtonsEnabled) PI.scanner.addEditButtonsToAll();
		},

		setEditButtonsState(enabled) {
			PI.state.editButtonsEnabled = enabled;
			localStorage.setItem('paywallInspector_editButtons', enabled ? 'true' : 'false');
			if (enabled) PI.scanner.addEditButtonsToAll();
			else PI.scanner.removeEditButtonsFromAll();
		},

		loadAutoloadState() {
			const checkbox = widget.querySelector('#pi-autoload-checkbox');
			if (checkbox) checkbox.checked = PI.state.autoloadEnabled;
		},

		setAutoloadState(enabled) {
			PI.state.autoloadEnabled = enabled;
			localStorage.setItem('paywallInspector_autoload', enabled ? 'true' : 'false');
			console.log(`[Paywall Inspector] Auto-load ${enabled ? 'enabled' : 'disabled'}`);
		},

		show() {
			if (!widget) return;
			widget.classList.add('visible');
		},

		hide() {
			if (!widget) return;
			widget.classList.remove('visible');
		},

		toggle() {
			if (!widget) return;
			widget.classList.toggle('visible');
		},

		update() {
			if (!widget) return;

			const cookieData = PI.helpers.getCookieData();
			const story = this.generateStoryText(cookieData, PI.state.dataLayerData);
			const isOnChannelPage = PI.helpers.isChannelPage(PI.state.dataLayerData.tpTags);

			const storyElement = widget.querySelector('#pi-paywall-story');
			if (storyElement) {
				storyElement.innerHTML = story.text;
				storyElement.className = `pi-paywall-story ${story.type}`;
			}

			const detailsElement = widget.querySelector('#pi-widget-details');
			if (detailsElement) {
				detailsElement.style.display = isOnChannelPage ? 'none' : (PI.helpers.hasCompleteData() || PI.state.dataLayerData.tpTags ? 'block' : 'none');
			}

			if (!isOnChannelPage) {
				const testGroupElement = widget.querySelector('#pi-test-group');
				if (testGroupElement) {
					testGroupElement.textContent = cookieData.testGroup;
					testGroupElement.className = `value ${cookieData.testGroup}`;
				}

				const paywallStatusElement = widget.querySelector('#pi-paywall-status');
				if (paywallStatusElement && PI.state.dataLayerData.setPaidContent) {
					const enabled = PI.state.dataLayerData.setPaidContent.DynamicPaywall;
					paywallStatusElement.textContent = enabled ? 'Aktiviert' : 'Deaktiviert';
					paywallStatusElement.className = `value ${enabled ? 'enabled' : 'disabled'}`;
				}

				if (PI.state.dataLayerData.composerSegmentsReady) {
					const composer = PI.state.dataLayerData.composerSegmentsReady;
					const likelihoodUserElement = widget.querySelector('#pi-likelihood-user');
					if (likelihoodUserElement) {
						likelihoodUserElement.textContent = PI.helpers.formatScoreDisplay(composer.lts);
						likelihoodUserElement.className = `value ${PI.helpers.getScoreClass(composer.lts)}`;
					}
					const likelihoodContentElement = widget.querySelector('#pi-likelihood-content');
					if (likelihoodContentElement) {
						likelihoodContentElement.textContent = PI.helpers.formatScoreDisplay(composer.cscore);
						likelihoodContentElement.className = `value ${PI.helpers.getScoreClass(composer.cscore)}`;
					}
				}

				if (PI.state.dataLayerData.tpTags) {
					const editorial = PI.helpers.getEditorialDecision(PI.state.dataLayerData.tpTags);
					const editorialRowElement = widget.querySelector('#pi-editorial-row');
					const editorialDecisionElement = widget.querySelector('#pi-editorial-decision');
					if (editorial && editorialRowElement && editorialDecisionElement) {
						editorialDecisionElement.textContent = editorial.text;
						editorialDecisionElement.className = `value ${editorial.type}`;
						editorialRowElement.style.display = 'flex';
					} else if (editorialRowElement) {
						editorialRowElement.style.display = 'none';
					}
				}
			}

			this.updateStatus();

			if (story.text && (!story.text.includes('Analysiere') || isOnChannelPage)) {
				this.show();
			}

			if (isOnChannelPage && !PI.state.scannedPages.has(window.location.pathname)) {
				PI.state.scannedPages.add(window.location.pathname);
				setTimeout(() => PI.scanner.scanArticles(), 1000);
			}
		},

		updateStatus() {
			const statusElement = widget.querySelector('#pi-widget-status');
			if (!statusElement) return;

			if (PI.state.scanProgress.isScanning) {
				let statusText = '';
				if (PI.state.scanProgress.phase === 'processing') {
					const percentage = Math.round((PI.state.scanProgress.processedArticles / PI.state.scanProgress.totalArticles) * 100);
					statusText = `Scanne Artikel... ${percentage}% (${PI.state.scanProgress.processedArticles}/${PI.state.scanProgress.totalArticles})`;
				} else if (PI.state.scanProgress.phase === 'complete') {
					statusText = `Scan abgeschlossen: ${PI.state.scanProgress.totalArticles} Artikel`;
				} else {
					statusText = 'Initialisiere Scan...';
				}
				statusElement.textContent = statusText;
				statusElement.className = `pi-widget-status ${PI.state.scanProgress.phase === 'complete' ? 'complete' : 'scanning'}`;
				return;
			}

			if (PI.helpers.hasCompleteData()) {
				statusElement.textContent = 'DataLayer-Analyse abgeschlossen';
				statusElement.className = 'pi-widget-status complete';
			} else if (PI.state.dataLayerData.debug.eventsProcessed > 0) {
				statusElement.textContent = 'Verarbeite DataLayer-Ereignisse...';
				statusElement.className = 'pi-widget-status waiting';
			} else {
				statusElement.textContent = 'Warte auf DataLayer-Ereignisse...';
				statusElement.className = 'pi-widget-status waiting';
			}
		},

		generateStoryText(cookieData, dataLayerData) {
			const testGroup = cookieData.testGroup;

			if (PI.helpers.isChannelPage(dataLayerData.tpTags)) {
				return { text: 'Daten werden nur auf Artikeln angezeigt', type: 'channel' };
			}

			if (testGroup === 'static') {
				const isPaidContent = dataLayerData.setPaidContent?.DynamicPaywall;
				if (isPaidContent === true) {
					return { text: '<strong>Statische Paywall:</strong> Artikel hinter Paywall - von der Redaktion als Plus markiert.', type: 'static' };
				} else if (isPaidContent === false) {
					return { text: '<strong>Statische Paywall:</strong> Artikel frei zugänglich - von der Redaktion als frei markiert.', type: 'static' };
				}
				return { text: '<strong>Statische Paywall:</strong> Warte auf Paywall-Daten...', type: 'static' };
			}

			if (testGroup === 'dynamic') {
				const composer = dataLayerData.composerSegmentsReady;
				const isPaidContent = dataLayerData.setPaidContent?.DynamicPaywall;
				const editorial = dataLayerData.tpTags ? PI.helpers.getEditorialDecision(dataLayerData.tpTags) : null;

				if (!composer || !dataLayerData.setPaidContent) {
					return { text: '<strong>Dynamische Paywall:</strong> Warte auf DataLayer-Daten...', type: 'dynamic' };
				}

				const lts = composer.lts;
				const ltc = composer.cscore;

				if (lts === 'no_score' || ltc === 'no_score') {
					const statusText = isPaidContent ? 'Artikel hinter Paywall' : 'Artikel frei zugänglich';
					if (editorial) {
						return { text: `<strong>Dynamische Paywall:</strong> ${statusText} - keine Abo-Wahrscheinlichkeit verfügbar, Artikel von Redaktion als ${editorial.type === 'premium' ? 'Plus' : 'frei'} markiert.`, type: 'dynamic' };
					}
					return { text: `<strong>Dynamische Paywall:</strong> ${statusText} - keine Abo-Wahrscheinlichkeit verfügbar.`, type: 'dynamic' };
				}

				const ltsNum = parseInt(lts);
				const ltcNum = parseInt(ltc);
				const ltsHigh = ltsNum >= 7;
				const ltcHigh = ltcNum >= 7;

				if (isPaidContent && editorial?.type === 'free') {
					return { text: '<strong>Dynamische Paywall:</strong> Artikel hinter Paywall - überschreibt Redaktions-Entscheidung (frei → Plus).', type: 'dynamic' };
				}

				const statusText = isPaidContent ? 'Artikel hinter Paywall' : 'Artikel frei zugänglich';
				if (ltsHigh && ltcHigh) {
					return { text: `<strong>Dynamische Paywall:</strong> ${statusText} - hohe Abo-Wahrscheinlichkeit für Nutzer und Artikel.`, type: 'dynamic' };
				} else if (!ltsHigh && !ltcHigh) {
					return { text: `<strong>Dynamische Paywall:</strong> ${statusText} - niedrige Abo-Wahrscheinlichkeit.`, type: 'dynamic' };
				}
				return { text: `<strong>Dynamische Paywall:</strong> ${statusText}`, type: 'dynamic' };
			}

			return { text: 'Test-Gruppe unbekannt. Lade Cookie-Daten...', type: 'unknown' };
		}
	};

	console.log('[Paywall Inspector] Widget module loaded');
})();
