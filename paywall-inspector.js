// Paywall Inspector Bookmarklet
// Host this file on GitHub and load via bookmarklet
(function() {
    'use strict';

    // Prevent double initialization
    if (window.__paywallInspectorLoaded) {
        console.log('[Paywall Inspector] Already loaded, toggling visibility');
        const widget = document.getElementById('datalayer-inspector-widget');
        if (widget) {
            widget.classList.toggle('visible');
        }
        return;
    }
    window.__paywallInspectorLoaded = true;

    // ===== CONFIGURATION =====
    const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

    // ===== STATE =====
    let dataLayerData = {
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

    let isMonitoringSetup = false;
    let isMonitoringActive = false;
    let originalDataLayerPush = null;
    let widget = null;
    let isCollapsed = false;
    let editButtonsEnabled = localStorage.getItem('paywallInspector_editButtons') === 'true';
    let articleDataCache = new Map();
    let pendingRequests = new Map();
    let scannedPages = new Set();
    let currentPageUrl = window.location.href;

    let scanProgress = {
        isScanning: false,
        totalArticles: 0,
        processedArticles: 0,
        cacheHits: 0,
        apiCalls: 0,
        startTime: null,
        phase: 'idle'
    };

    // ===== CSS (inlined) =====
    function injectCSS() {
        if (document.getElementById('paywall-inspector-css')) return;

        const style = document.createElement('style');
        style.id = 'paywall-inspector-css';
        style.textContent = `
#datalayer-inspector-widget {
    position: fixed;
    width: 300px;
    max-width: 90vw;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #e1e8ed;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    pointer-events: none;
}
#datalayer-inspector-widget.position-top-left { top: 20px; left: 20px; }
#datalayer-inspector-widget.position-top-right { top: 20px; right: 20px; }
#datalayer-inspector-widget.position-bottom-left { bottom: 20px; left: 20px; }
#datalayer-inspector-widget.position-bottom-right { bottom: 20px; right: 20px; }
#datalayer-inspector-widget.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}
#datalayer-inspector-widget.collapsed { width: auto; min-width: 200px; }
.pi-widget-header {
    background: #4a90e2;
    color: white;
    padding: 10px 12px;
    border-radius: 8px 8px 0 0;
    font-weight: 600;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
}
.pi-widget-header:hover { background: #357abd; }
.pi-widget-toggle {
    background: none;
    border: none;
    color: white;
    font-size: 14px;
    cursor: pointer;
    padding: 2px;
    border-radius: 2px;
    line-height: 1;
}
.pi-widget-toggle:hover { background: rgba(255, 255, 255, 0.2); }
.pi-widget-content {
    padding: 12px;
    background: white;
    border-radius: 0 0 8px 8px;
}
.pi-widget-content.collapsed { display: none; }
.pi-paywall-story {
    margin-bottom: 12px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 3px solid #4a90e2;
    font-size: 13px;
    line-height: 1.5;
    color: #2c3e50;
}
.pi-paywall-story.static { border-left-color: #1976d2; background: #e3f2fd; }
.pi-paywall-story.dynamic { border-left-color: #7b1fa2; background: #f3e5f5; }
.pi-paywall-story.unknown { border-left-color: #666; background: #f5f5f5; }
.pi-paywall-story.channel { border-left-color: #ff9800; background: #fff3e0; text-align: center; color: #e65100; font-weight: 500; }
.pi-paywall-story strong { color: #2c3e50; font-weight: 600; }
.pi-widget-details { font-size: 12px; color: #666; margin-bottom: 12px; }
.pi-widget-details .detail-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
.pi-widget-details .label { font-weight: 500; }
.pi-widget-details .value { font-weight: 600; color: #2c3e50; }
.pi-widget-details .value.static { color: #1976d2; }
.pi-widget-details .value.dynamic { color: #7b1fa2; }
.pi-widget-details .value.enabled { color: #2e7d32; }
.pi-widget-details .value.disabled { color: #c62828; }
.pi-widget-details .value.premium { color: #7b1fa2; font-weight: 600; }
.pi-widget-details .value.free { color: #2e7d32; font-weight: 600; }
.pi-widget-details .value.score-low { color: #d32f2f; font-weight: 500; }
.pi-widget-details .value.score-high { color: #2e7d32; font-weight: 600; }
.pi-widget-details .value.score-high::before { content: "✓ "; font-size: 10px; opacity: 0.7; }
.pi-widget-details .value.score-unknown { color: #757575; font-style: italic; }
.pi-widget-actions { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e1e8ed; }
.pi-widget-btn {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background: #4a90e2;
    color: white;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 6px;
}
.pi-widget-btn:hover { background: #357abd; }
.pi-widget-btn:disabled { background: #bdc3c7; cursor: not-allowed; }
.pi-widget-btn.danger { background: #e74c3c; }
.pi-widget-btn.danger:hover { background: #c0392b; }
.pi-position-selector { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e1e8ed; }
.pi-position-selector-label { font-size: 11px; color: #666; margin-bottom: 8px; font-weight: 500; text-align: center; }
.pi-position-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; max-width: 60px; margin: 0 auto; }
.pi-position-option {
    width: 28px; height: 20px;
    border: 1px solid #d1d8e0;
    border-radius: 3px;
    background: #f8f9fa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}
.pi-position-option:hover { border-color: #4a90e2; background: #e3f2fd; }
.pi-position-option.active { border-color: #4a90e2; background: #4a90e2; }
.pi-position-option::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #666; }
.pi-position-option.active::before { background: white; }
.pi-edit-buttons-toggle { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e1e8ed; display: flex; justify-content: space-between; align-items: center; }
.pi-edit-buttons-label { font-size: 11px; color: #666; font-weight: 500; }
.pi-toggle-switch { position: relative; width: 36px; height: 20px; }
.pi-toggle-checkbox { opacity: 0; width: 0; height: 0; }
.pi-toggle-label { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; border-radius: 20px; transition: .4s; }
.pi-toggle-label:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; border-radius: 50%; transition: .4s; }
.pi-toggle-checkbox:checked + .pi-toggle-label { background-color: #4a90e2; }
.pi-toggle-checkbox:checked + .pi-toggle-label:before { transform: translateX(16px); }
.pi-widget-status { font-size: 11px; color: #666; text-align: center; margin-top: 8px; padding: 4px; background: #f8f9fa; border-radius: 3px; }
.pi-widget-status.waiting { color: #856404; background: #fff3cd; }
.pi-widget-status.complete { color: #155724; background: #d4edda; }
.pi-widget-status.error { color: #721c24; background: #f8d7da; }
.pi-widget-status.scanning { color: #0c5460; background: #d1ecf1; font-size: 10px; line-height: 1.3; padding: 6px; }
.pi-widget-loading { display: inline-block; width: 12px; height: 12px; border: 2px solid #f3f3f3; border-top: 2px solid #4a90e2; border-radius: 50%; animation: pi-spin 1s linear infinite; margin-right: 6px; }
@keyframes pi-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.pi-premium-highlight { position: relative; border: 2px solid #7b1fa2 !important; background: rgba(123, 31, 162, 0.05) !important; box-sizing: border-box !important; }
.pi-premium-badge { position: absolute !important; top: 8px !important; right: 8px !important; background: #7b1fa2 !important; color: white !important; padding: 4px 8px !important; border-radius: 12px !important; font-size: 11px !important; font-weight: 600 !important; z-index: 1000 !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important; pointer-events: none !important; }
.pi-edit-btn-container { position: absolute !important; bottom: 8px !important; right: 8px !important; z-index: 1001 !important; }
.pi-edit-btn { display: inline-block !important; width: 20px !important; height: 20px !important; background: rgba(74, 144, 226, 0.9) !important; color: white !important; text-decoration: none !important; border-radius: 3px !important; text-align: center !important; line-height: 20px !important; font-size: 12px !important; cursor: pointer !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important; border: none !important; }
.pi-edit-btn:hover { background: rgba(53, 122, 189, 0.9) !important; transform: scale(1.1) !important; }
`;
        document.head.appendChild(style);
    }

    // ===== WIDGET =====
    function createWidget() {
        if (widget) return widget;

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

        setupWidgetEventListeners();
        loadWidgetPosition();
        loadEditButtonsState();

        return widget;
    }

    function setupWidgetEventListeners() {
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

        toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleWidget(); });
        header.addEventListener('click', toggleWidget);
        clearBtn.addEventListener('click', clearCookiesAndReload);

        const positionOptions = widget.querySelectorAll('.pi-position-option');
        positionOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                setWidgetPosition(option.dataset.position);
            });
        });

        const editButtonsCheckbox = widget.querySelector('#pi-edit-buttons-checkbox');
        if (editButtonsCheckbox) {
            editButtonsCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                setEditButtonsState(editButtonsCheckbox.checked);
            });
        }
    }

    function loadWidgetPosition() {
        const position = localStorage.getItem('paywallInspector_position') || 'top-right';
        applyWidgetPosition(position);
        updatePositionSelector(position);
    }

    function applyWidgetPosition(position) {
        if (!widget) return;
        widget.classList.remove('position-top-left', 'position-top-right', 'position-bottom-left', 'position-bottom-right');
        widget.classList.add(`position-${position}`);
    }

    function updatePositionSelector(position) {
        if (!widget) return;
        widget.querySelectorAll('.pi-position-option').forEach(option => {
            option.classList.toggle('active', option.dataset.position === position);
        });
    }

    function setWidgetPosition(position) {
        localStorage.setItem('paywallInspector_position', position);
        applyWidgetPosition(position);
        updatePositionSelector(position);
    }

    function loadEditButtonsState() {
        const checkbox = widget.querySelector('#pi-edit-buttons-checkbox');
        if (checkbox) checkbox.checked = editButtonsEnabled;
        if (editButtonsEnabled) addEditButtonsToAllArticles();
    }

    function setEditButtonsState(enabled) {
        editButtonsEnabled = enabled;
        localStorage.setItem('paywallInspector_editButtons', enabled ? 'true' : 'false');
        if (enabled) addEditButtonsToAllArticles();
        else removeEditButtonsFromAllArticles();
    }

    function showWidget() {
        if (!widget) return;
        widget.classList.add('visible');
    }

    // ===== COOKIE HANDLING =====
    function clearCookiesAndReload() {
        const btn = widget.querySelector('#pi-clear-cookies-btn');
        if (btn) { btn.textContent = 'Lösche Cookies...'; btn.disabled = true; }

        // Clear cookies accessible via JavaScript
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        });

        setTimeout(() => window.location.reload(), 500);
    }

    // ===== DATA LAYER MONITORING =====
    function setupDataLayerMonitoring() {
        if (isMonitoringSetup || !window.dataLayer || !Array.isArray(window.dataLayer)) return;

        isMonitoringSetup = true;
        isMonitoringActive = true;
        dataLayerData.debug.dataLayerExists = true;

        window.dataLayer.forEach((event, index) => processDataLayerEvent(event));

        originalDataLayerPush = window.dataLayer.push;
        window.dataLayer.push = function(...args) {
            args.forEach(event => processDataLayerEvent(event));
            return originalDataLayerPush.apply(this, args);
        };
    }

    function processDataLayerEvent(event) {
        if (!event || typeof event !== 'object') return;
        dataLayerData.debug.eventsProcessed++;
        dataLayerData.debug.lastEventTime = Date.now();

        if (event.event === 'composerSegmentsReady') {
            dataLayerData.composerSegmentsReady = {
                cscore: event.cscore || 'no_score',
                ltc: event.ltc || 'no_score',
                lts: event.lts || 'no_score',
                timestamp: Date.now()
            };
            updateWidget();
        }

        if (event.event === 'setPaidContent' && event.DynamicPaywall !== undefined) {
            dataLayerData.setPaidContent = {
                DynamicPaywall: event.DynamicPaywall,
                timestamp: Date.now()
            };
            updateWidget();
        }

        if (hasCompleteData() && isMonitoringActive) {
            isMonitoringActive = false;
            if (originalDataLayerPush) window.dataLayer.push = originalDataLayerPush;
        }
    }

    function hasCompleteData() {
        return dataLayerData.composerSegmentsReady && dataLayerData.setPaidContent;
    }

    function detectTpTags() {
        if (window.tp?.tags && typeof window.tp.tags === 'string') {
            dataLayerData.tpTags = window.tp.tags;
            updateWidget();
            return true;
        }
        return false;
    }

    function startTpTagsPolling() {
        if (detectTpTags()) return;
        let attempts = 0;
        const pollInterval = setInterval(() => {
            if (++attempts >= 20 || detectTpTags()) clearInterval(pollInterval);
        }, 500);
    }

    // ===== HELPER FUNCTIONS =====
    function getCookieData() {
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
    }

    function isChannelPage(tpTags) {
        if (!tpTags || typeof tpTags !== 'string') return true;
        const hasArticlePageType = tpTags.includes('page-type-Artikelseite');
        const hasEditorialDecision = tpTags.includes('article-model-free') || tpTags.includes('article-model-premium');
        return !(hasArticlePageType && hasEditorialDecision);
    }

    function getEditorialDecision(tpTags) {
        if (!tpTags || typeof tpTags !== 'string') return null;
        if (tpTags.includes('article-model-premium')) return { text: 'Plus-Artikel', type: 'premium' };
        if (tpTags.includes('article-model-free')) return { text: 'Freier Artikel', type: 'free' };
        return null;
    }

    function formatScoreDisplay(score) {
        if (score === 'no_score' || score === undefined || score === null) return 'Unbekannt';
        const scoreNum = parseInt(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 9) return 'Unbekannt';
        const ranges = ['0-9%', '10-19%', '20-29%', '30-39%', '40-49%', '50-59%', '60-69%', '70-79%', '80-89%', '90-100%'];
        return ranges[scoreNum];
    }

    function getScoreClass(score) {
        if (score === 'no_score' || score === undefined || score === null) return 'score-unknown';
        const scoreNum = parseInt(score);
        if (isNaN(scoreNum)) return 'score-unknown';
        return scoreNum >= 7 ? 'score-high' : 'score-low';
    }

    // ===== WIDGET UPDATE =====
    function updateWidget() {
        if (!widget) return;

        const cookieData = getCookieData();
        const story = generateStoryText(cookieData, dataLayerData);
        const isOnChannelPage = isChannelPage(dataLayerData.tpTags);

        const storyElement = widget.querySelector('#pi-paywall-story');
        if (storyElement) {
            storyElement.innerHTML = story.text;
            storyElement.className = `pi-paywall-story ${story.type}`;
        }

        const detailsElement = widget.querySelector('#pi-widget-details');
        if (detailsElement) {
            detailsElement.style.display = isOnChannelPage ? 'none' : (hasCompleteData() || dataLayerData.tpTags ? 'block' : 'none');
        }

        if (!isOnChannelPage) {
            const testGroupElement = widget.querySelector('#pi-test-group');
            if (testGroupElement) {
                testGroupElement.textContent = cookieData.testGroup;
                testGroupElement.className = `value ${cookieData.testGroup}`;
            }

            const paywallStatusElement = widget.querySelector('#pi-paywall-status');
            if (paywallStatusElement && dataLayerData.setPaidContent) {
                const enabled = dataLayerData.setPaidContent.DynamicPaywall;
                paywallStatusElement.textContent = enabled ? 'Aktiviert' : 'Deaktiviert';
                paywallStatusElement.className = `value ${enabled ? 'enabled' : 'disabled'}`;
            }

            if (dataLayerData.composerSegmentsReady) {
                const composer = dataLayerData.composerSegmentsReady;
                const likelihoodUserElement = widget.querySelector('#pi-likelihood-user');
                if (likelihoodUserElement) {
                    likelihoodUserElement.textContent = formatScoreDisplay(composer.lts);
                    likelihoodUserElement.className = `value ${getScoreClass(composer.lts)}`;
                }
                const likelihoodContentElement = widget.querySelector('#pi-likelihood-content');
                if (likelihoodContentElement) {
                    likelihoodContentElement.textContent = formatScoreDisplay(composer.cscore);
                    likelihoodContentElement.className = `value ${getScoreClass(composer.cscore)}`;
                }
            }

            if (dataLayerData.tpTags) {
                const editorial = getEditorialDecision(dataLayerData.tpTags);
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

        updateWidgetStatus();

        if (story.text && (!story.text.includes('Analysiere') || isOnChannelPage)) {
            showWidget();
        }

        if (isOnChannelPage && !scannedPages.has(window.location.pathname)) {
            scannedPages.add(window.location.pathname);
            setTimeout(() => scanChannelPageArticles(), 1000);
        }
    }

    function updateWidgetStatus() {
        const statusElement = widget.querySelector('#pi-widget-status');
        if (!statusElement) return;

        if (scanProgress.isScanning) {
            let statusText = '';
            if (scanProgress.phase === 'processing') {
                const percentage = Math.round((scanProgress.processedArticles / scanProgress.totalArticles) * 100);
                statusText = `Scanne Artikel... ${percentage}% (${scanProgress.processedArticles}/${scanProgress.totalArticles})`;
            } else if (scanProgress.phase === 'complete') {
                statusText = `Scan abgeschlossen: ${scanProgress.totalArticles} Artikel`;
            } else {
                statusText = 'Initialisiere Scan...';
            }
            statusElement.textContent = statusText;
            statusElement.className = `pi-widget-status ${scanProgress.phase === 'complete' ? 'complete' : 'scanning'}`;
            return;
        }

        if (hasCompleteData()) {
            statusElement.textContent = 'DataLayer-Analyse abgeschlossen';
            statusElement.className = 'pi-widget-status complete';
        } else if (dataLayerData.debug.eventsProcessed > 0) {
            statusElement.textContent = 'Verarbeite DataLayer-Ereignisse...';
            statusElement.className = 'pi-widget-status waiting';
        } else {
            statusElement.textContent = 'Warte auf DataLayer-Ereignisse...';
            statusElement.className = 'pi-widget-status waiting';
        }
    }

    function generateStoryText(cookieData, dataLayerData) {
        const testGroup = cookieData.testGroup;

        if (isChannelPage(dataLayerData.tpTags)) {
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
            const editorial = dataLayerData.tpTags ? getEditorialDecision(dataLayerData.tpTags) : null;

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

    // ===== ARTICLE SCANNING =====
    async function scanChannelPageArticles() {
        if (scanProgress.isScanning) return;

        const articleElements = document.querySelectorAll('[data-teaser-url]');
        if (articleElements.length === 0) return;

        scanProgress = {
            isScanning: true,
            totalArticles: articleElements.length,
            processedArticles: 0,
            cacheHits: 0,
            apiCalls: 0,
            startTime: Date.now(),
            phase: 'processing'
        };
        updateWidget();

        const promises = Array.from(articleElements).map(el => processArticleElement(el));
        await Promise.allSettled(promises);

        scanProgress.phase = 'complete';
        scanProgress.isScanning = false;
        updateWidget();
    }

    async function processArticleElement(element) {
        const teaserUrl = element.getAttribute('data-teaser-url');
        if (!teaserUrl) return;

        // Check cache
        if (articleDataCache.has(teaserUrl)) {
            const cached = articleDataCache.get(teaserUrl);
            if (Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
                scanProgress.cacheHits++;
                highlightArticleElement(element, cached.isPremium);
                if (editButtonsEnabled && cached.articleId) addEditButtonToArticle(element, cached.articleId);
                scanProgress.processedArticles++;
                updateWidget();
                return;
            }
            articleDataCache.delete(teaserUrl);
        }

        // Check pending
        if (pendingRequests.has(teaserUrl)) {
            const result = await pendingRequests.get(teaserUrl);
            highlightArticleElement(element, result?.isPremium);
            if (editButtonsEnabled && result?.articleId) addEditButtonToArticle(element, result.articleId);
            scanProgress.processedArticles++;
            updateWidget();
            return;
        }

        const hermesUri = transformUrlForHermesApi(teaserUrl);
        if (!hermesUri) return;

        const requestPromise = checkArticleData(hermesUri);
        pendingRequests.set(teaserUrl, requestPromise);

        try {
            const articleData = await requestPromise;
            scanProgress.apiCalls++;

            articleDataCache.set(teaserUrl, {
                isPremium: articleData?.isPremium || null,
                articleId: articleData?.articleId || null,
                timestamp: Date.now()
            });

            highlightArticleElement(element, articleData?.isPremium);
            if (editButtonsEnabled && articleData?.articleId) addEditButtonToArticle(element, articleData.articleId);
        } finally {
            pendingRequests.delete(teaserUrl);
            scanProgress.processedArticles++;
            updateWidget();
        }
    }

    function transformUrlForHermesApi(url) {
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
    }

    async function checkArticleData(hermesUri) {
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
    }

    function highlightArticleElement(element, isPremium) {
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
    }

    function addEditButtonToArticle(element, articleId) {
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
    }

    function addEditButtonsToAllArticles() {
        document.querySelectorAll('[data-teaser-url]').forEach(element => {
            const url = element.getAttribute('data-teaser-url');
            const cached = articleDataCache.get(url);
            if (cached?.articleId) addEditButtonToArticle(element, cached.articleId);
        });
    }

    function removeEditButtonsFromAllArticles() {
        document.querySelectorAll('.pi-edit-btn-container').forEach(el => el.remove());
    }

    // ===== DATALOADER DETECTION =====
    function detectDataLayer() {
        if (window.dataLayer && Array.isArray(window.dataLayer)) {
            setupDataLayerMonitoring();
            return;
        }

        let pollCount = 0;
        const quickPoll = setInterval(() => {
            pollCount++;
            if (window.dataLayer && Array.isArray(window.dataLayer)) {
                clearInterval(quickPoll);
                setupDataLayerMonitoring();
                return;
            }
            if (pollCount >= 20) clearInterval(quickPoll);
        }, 100);
    }

    // ===== INITIALIZE =====
    function init() {
        injectCSS();
        createWidget();
        detectDataLayer();
        startTpTagsPolling();
        updateWidget();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('[Paywall Inspector] Bookmarklet loaded successfully!');
})();
