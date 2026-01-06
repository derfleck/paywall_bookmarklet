// Paywall Inspector - Styles Module
// All CSS for the widget and article highlighting

window.PaywallInspector = window.PaywallInspector || {};

window.PaywallInspector.styles = `
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

.pi-autoload-toggle { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e1e8ed; display: flex; justify-content: space-between; align-items: center; }
.pi-autoload-label { font-size: 11px; color: #666; font-weight: 500; }

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

console.log('[Paywall Inspector] Styles module loaded');
