// Paywall Inspector - Core Module
// DataLayer monitoring, article scanning, API calls

window.PaywallInspector = window.PaywallInspector || {};

(function () {
	'use strict';

	const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

	const PI = window.PaywallInspector;

	// State
	PI.state = {
		dataLayerData: {
			composerSegmentsReady: null,
			setPaidContent: null,
			tpTags: null,
			debug: {
				monitoringStarted: Date.now(),
				eventsProcessed: 0,
				dataLayerExists: false,
				lastEventTime: null
			}
		},
		isMonitoringSetup: false,
		isMonitoringActive: false,
		originalDataLayerPush: null,
		editButtonsEnabled: localStorage.getItem('paywallInspector_editButtons') === 'true',
		autoloadEnabled: localStorage.getItem('paywallInspector_autoload') === 'true',
		articleDataCache: new Map(),
		pendingRequests: new Map(),
		scannedPages: new Set(),
		scanProgress: {
			isScanning: false,
			totalArticles: 0,
			processedArticles: 0,
			cacheHits: 0,
			apiCalls: 0,
			startTime: null,
			phase: 'idle'
		}
	};

	// Helper functions
	PI.helpers = {
		getCookieData() {
			const cookies = document.cookie.split(';').reduce((acc, cookie) => {
				const [name, value] = cookie.trim().split('=');
				if (name) acc[name] = value || '';
				return acc;
			}, {});
			const pcPwValue = cookies['_pc_pw'];
			return {
				_pc_pw: pcPwValue || 'not found',
				testGroup: pcPwValue === 'static' ? 'static' : (pcPwValue ? 'dynamic' : 'unknown')
			};
		},

		isChannelPage(tpTags) {
			if (!tpTags || typeof tpTags !== 'string') return true;
			const hasArticlePageType = tpTags.includes('page-type-Artikelseite');
			const hasEditorialDecision = tpTags.includes('article-model-free') || tpTags.includes('article-model-premium');
			return !(hasArticlePageType && hasEditorialDecision);
		},

		getEditorialDecision(tpTags) {
			if (!tpTags || typeof tpTags !== 'string') return null;
			if (tpTags.includes('article-model-premium')) return { text: 'Plus-Artikel', type: 'premium' };
			if (tpTags.includes('article-model-free')) return { text: 'Freier Artikel', type: 'free' };
			return null;
		},

		formatScoreDisplay(score) {
			if (score === 'no_score' || score === undefined || score === null) return 'Unbekannt';
			const scoreNum = parseInt(score);
			if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 9) return 'Unbekannt';
			const ranges = ['0-9%', '10-19%', '20-29%', '30-39%', '40-49%', '50-59%', '60-69%', '70-79%', '80-89%', '90-100%'];
			return ranges[scoreNum];
		},

		getScoreClass(score) {
			if (score === 'no_score' || score === undefined || score === null) return 'score-unknown';
			const scoreNum = parseInt(score);
			if (isNaN(scoreNum)) return 'score-unknown';
			return scoreNum >= 7 ? 'score-high' : 'score-low';
		},

		hasCompleteData() {
			return PI.state.dataLayerData.composerSegmentsReady && PI.state.dataLayerData.setPaidContent;
		}
	};

	// DataLayer monitoring
	PI.dataLayer = {
		setup() {
			if (PI.state.isMonitoringSetup || !window.dataLayer || !Array.isArray(window.dataLayer)) return;

			PI.state.isMonitoringSetup = true;
			PI.state.isMonitoringActive = true;
			PI.state.dataLayerData.debug.dataLayerExists = true;

			window.dataLayer.forEach(event => this.processEvent(event));

			PI.state.originalDataLayerPush = window.dataLayer.push;
			window.dataLayer.push = function (...args) {
				args.forEach(event => PI.dataLayer.processEvent(event));
				return PI.state.originalDataLayerPush.apply(this, args);
			};
		},

		processEvent(event) {
			if (!event || typeof event !== 'object') return;
			PI.state.dataLayerData.debug.eventsProcessed++;
			PI.state.dataLayerData.debug.lastEventTime = Date.now();

			if (event.event === 'composerSegmentsReady') {
				PI.state.dataLayerData.composerSegmentsReady = {
					cscore: event.cscore || 'no_score',
					ltc: event.ltc || 'no_score',
					lts: event.lts || 'no_score',
					timestamp: Date.now()
				};
				if (PI.widget) PI.widget.update();
			}

			if (event.event === 'setPaidContent' && event.DynamicPaywall !== undefined) {
				PI.state.dataLayerData.setPaidContent = {
					DynamicPaywall: event.DynamicPaywall,
					timestamp: Date.now()
				};
				if (PI.widget) PI.widget.update();
			}

			if (PI.helpers.hasCompleteData() && PI.state.isMonitoringActive) {
				PI.state.isMonitoringActive = false;
				if (PI.state.originalDataLayerPush) window.dataLayer.push = PI.state.originalDataLayerPush;
			}
		},

		detect() {
			if (window.dataLayer && Array.isArray(window.dataLayer)) {
				this.setup();
				return;
			}

			let pollCount = 0;
			const quickPoll = setInterval(() => {
				pollCount++;
				if (window.dataLayer && Array.isArray(window.dataLayer)) {
					clearInterval(quickPoll);
					this.setup();
					return;
				}
				if (pollCount >= 20) clearInterval(quickPoll);
			}, 100);
		},

		detectTpTags() {
			if (window.tp?.tags && typeof window.tp.tags === 'string') {
				PI.state.dataLayerData.tpTags = window.tp.tags;
				if (PI.widget) PI.widget.update();
				return true;
			}
			return false;
		},

		startTpTagsPolling() {
			if (this.detectTpTags()) return;
			let attempts = 0;
			const pollInterval = setInterval(() => {
				if (++attempts >= 20 || this.detectTpTags()) clearInterval(pollInterval);
			}, 500);
		}
	};

	// Article scanning
	PI.scanner = {
		async scanArticles() {
			if (PI.state.scanProgress.isScanning) return;

			const articleElements = document.querySelectorAll('[data-teaser-url]');
			if (articleElements.length === 0) return;

			PI.state.scanProgress = {
				isScanning: true,
				totalArticles: articleElements.length,
				processedArticles: 0,
				cacheHits: 0,
				apiCalls: 0,
				startTime: Date.now(),
				phase: 'processing'
			};
			if (PI.widget) PI.widget.update();

			const promises = Array.from(articleElements).map(el => this.processElement(el));
			await Promise.allSettled(promises);

			PI.state.scanProgress.phase = 'complete';
			PI.state.scanProgress.isScanning = false;
			if (PI.widget) PI.widget.update();
		},

		async processElement(element) {
			const teaserUrl = element.getAttribute('data-teaser-url');
			if (!teaserUrl) return;

			// Check cache
			if (PI.state.articleDataCache.has(teaserUrl)) {
				const cached = PI.state.articleDataCache.get(teaserUrl);
				if (Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
					PI.state.scanProgress.cacheHits++;
					this.highlightElement(element, cached.isPremium);
					if (PI.state.editButtonsEnabled && cached.articleId) {
						this.addEditButton(element, cached.articleId);
					}
					PI.state.scanProgress.processedArticles++;
					if (PI.widget) PI.widget.update();
					return;
				}
				PI.state.articleDataCache.delete(teaserUrl);
			}

			// Check pending
			if (PI.state.pendingRequests.has(teaserUrl)) {
				const result = await PI.state.pendingRequests.get(teaserUrl);
				this.highlightElement(element, result?.isPremium);
				if (PI.state.editButtonsEnabled && result?.articleId) {
					this.addEditButton(element, result.articleId);
				}
				PI.state.scanProgress.processedArticles++;
				if (PI.widget) PI.widget.update();
				return;
			}

			const hermesUri = this.transformUrl(teaserUrl);
			if (!hermesUri) return;

			const requestPromise = this.checkArticle(hermesUri);
			PI.state.pendingRequests.set(teaserUrl, requestPromise);

			try {
				const articleData = await requestPromise;
				PI.state.scanProgress.apiCalls++;

				PI.state.articleDataCache.set(teaserUrl, {
					isPremium: articleData?.isPremium || null,
					articleId: articleData?.articleId || null,
					timestamp: Date.now()
				});

				this.highlightElement(element, articleData?.isPremium);
				if (PI.state.editButtonsEnabled && articleData?.articleId) {
					this.addEditButton(element, articleData.articleId);
				}
			} finally {
				PI.state.pendingRequests.delete(teaserUrl);
				PI.state.scanProgress.processedArticles++;
				if (PI.widget) PI.widget.update();
			}
		},

		transformUrl(url) {
			try {
				const currentHost = window.location.hostname;
				if (url.startsWith('/')) {
					if (currentHost.includes('kurier.at')) return `/kurierat${url}`;
					if (currentHost.includes('freizeit.at')) return `/freizeitat${url}`;
					return null;
				}
				const urlObj = new URL(url);
				if (urlObj.hostname.includes('kurier.at')) return `/kurierat${urlObj.pathname}`;
				if (urlObj.hostname.includes('freizeit.at')) return `/freizeitat${urlObj.pathname}`;
				return null;
			} catch { return null; }
		},

		async checkArticle(hermesUri) {
			try {
				const apiUrl = `https://efs-varnish.kurier.at/api/v1/cfs/route?uri=${encodeURIComponent(hermesUri)}`;
				const response = await fetch(apiUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
				if (!response.ok) return null;

				const data = await response.json();
				const articleType = data?.dataLayer?.article_type;
				const premiumContent = data?.dataLayer?.PremiumContent;
				const articleId = data?.layout?.center?.[0]?.id;

				const result = {};
				if (articleType !== undefined) result.isPremium = articleType === 'premium';
				else if (premiumContent !== undefined) result.isPremium = premiumContent === true;
				if (articleId !== undefined) result.articleId = String(articleId);

				return Object.keys(result).length > 0 ? result : null;
			} catch { return null; }
		},

		highlightElement(element, isPremium) {
			element.classList.remove('pi-premium-highlight');
			const existingBadge = element.querySelector('.pi-premium-badge');
			if (existingBadge) existingBadge.remove();

			if (isPremium) {
				element.classList.add('pi-premium-highlight');
				element.style.position = 'relative';
				const badge = document.createElement('div');
				badge.className = 'pi-premium-badge';
				badge.innerHTML = '⭐ Plus';
				element.appendChild(badge);
			}
		},

		addEditButton(element, articleId) {
			if (element.querySelector('.pi-edit-btn')) return;
			element.style.position = 'relative';

			const container = document.createElement('div');
			container.className = 'pi-edit-btn-container';

			const btn = document.createElement('a');
			btn.className = 'pi-edit-btn';
			btn.href = `https://hermes.telekurier.at/node/${articleId}/edit`;
			btn.target = '_blank';
			btn.title = `Artikel bearbeiten (ID: ${articleId})`;
			btn.innerHTML = '✏️';
			btn.addEventListener('click', e => e.stopPropagation());

			container.appendChild(btn);
			element.appendChild(container);
		},

		addEditButtonsToAll() {
			document.querySelectorAll('[data-teaser-url]').forEach(element => {
				const url = element.getAttribute('data-teaser-url');
				const cached = PI.state.articleDataCache.get(url);
				if (cached?.articleId) this.addEditButton(element, cached.articleId);
			});
		},

		removeEditButtonsFromAll() {
			document.querySelectorAll('.pi-edit-btn-container').forEach(el => el.remove());
		}
	};

	// Cookie handling
	PI.cookies = {
		clearAndReload() {
			const cookies = document.cookie.split(';');
			cookies.forEach(cookie => {
				const name = cookie.split('=')[0].trim();
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
				document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
			});
			setTimeout(() => window.location.reload(), 500);
		}
	};

	console.log('[Paywall Inspector] Core module loaded');
})();
