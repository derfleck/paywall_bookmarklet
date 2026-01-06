# Paywall Inspector Bookmarklet

A bookmarklet/userscript for analyzing paywall configurations on kurier.at and freizeit.at.

## File Structure

```
paywall_bookmarklet/
├── loader.js                    # Main entry point (loads modules)
├── paywall-inspector.js         # Single-file version (standalone)
├── paywall-inspector.user.js    # Tampermonkey userscript
├── README.md
└── src/
    ├── styles.js                # CSS styles
    ├── core.js                  # DataLayer monitoring, scanning
    └── widget.js                # UI widget
```

## Installation Options

### Option 1: Bookmarklet (One-Click, Manual)

Best for occasional use. Click the bookmarklet when you want to inspect a page.

1. Create a new bookmark in your browser
2. Name it: `Paywall Inspector`
3. For the URL, use:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/derfleck/paywall_bookmarklet@main/loader.js?_='+Date.now();document.body.appendChild(s);})();
```

**Usage:** Click the bookmarklet on any kurier.at or freizeit.at page.

---

### Option 2: Tampermonkey/Greasemonkey Userscript (Auto-Load) ⭐ Recommended

Best for always-on usage. Automatically loads on every kurier.at and freizeit.at page.

**Requirements:** [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge/Firefox) or [Greasemonkey](https://www.greasespot.net/) (Firefox)

**Installation:**

1. Install Tampermonkey from your browser's extension store
2. Click here to install the userscript: [paywall-inspector.user.js](https://cdn.jsdelivr.net/gh/derfleck/paywall_bookmarklet@main/paywall-inspector.user.js)
3. Click "Install" in Tampermonkey

Or manually:
1. Open Tampermonkey dashboard
2. Create new script
3. Copy contents of `paywall-inspector.user.js`
4. Save

---

### Option 3: Standalone Single File

For simpler deployment, use the all-in-one file:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/derfleck/paywall_bookmarklet@main/paywall-inspector.js?_='+Date.now();document.body.appendChild(s);})();
```

---

## Features

### Widget Features
- **DataLayer Analysis**: Shows test group, paywall status, subscription likelihood scores
- **Premium Article Detection**: Highlights premium articles with purple border and ⭐ badge
- **Edit Buttons**: Toggle edit links for quick access to Hermes CMS
- **Cookie Reset**: Clear cookies and reload to get reassigned to a test group
- **Movable Widget**: Position in any corner
- **Auto-load Toggle**: Enable to remember preference (works with SPA navigation)

### Auto-Load Behavior

When "Auto-load on kurier.at" is enabled in the widget:
- **SPA Navigation**: Automatically reinitializes when navigating within the site
- **Full Page Reload**: Use the Tampermonkey userscript for true persistence

---

## Development

### Modular Architecture

The code is split into modules for easier maintenance:

| File | Purpose |
|------|---------|
| `loader.js` | Entry point, loads modules in order |
| `src/styles.js` | All CSS styles |
| `src/core.js` | DataLayer monitoring, article scanning, API calls |
| `src/widget.js` | UI widget creation and management |

### Making Changes

1. Edit the relevant module in `src/`
2. Push to GitHub
3. jsDelivr will automatically update (may take a few minutes for cache)

To bust the cache immediately, update the version in the URL:
```javascript
// Change @main to a specific commit or tag
https://cdn.jsdelivr.net/gh/derfleck/paywall_bookmarklet@COMMIT_HASH/loader.js
```

### Testing Locally

During development, you can test with local files:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='file:///path/to/paywall_bookmarklet/loader.js';document.body.appendChild(s);})();
```

Note: Some browsers block `file://` URLs on HTTPS pages. Use a local server or the browser console to test.

---

## Differences from Chrome Extension

| Feature | Chrome Extension | Bookmarklet/Userscript |
|---------|------------------|------------------------|
| Auto-loads on page | ✅ | ✅ (with Tampermonkey) |
| Cookie clearing | Full (HttpOnly) | Partial (JS-accessible) |
| Extension icon | ✅ | ❌ |
| Settings sync | Chrome Sync | localStorage (per device) |
| Install complexity | Extension store | Bookmark or userscript |

---

## Troubleshooting

### Script doesn't load
- Check if the jsDelivr URL is correct
- Some corporate networks may block CDN URLs

### Widget doesn't appear
- Open browser console (F12) and check for errors
- Ensure you're on a kurier.at or freizeit.at page

### Auto-load not working on page refresh
- The bookmarklet can only persist for SPA navigation
- For full page reload persistence, use the Tampermonkey userscript

### Premium articles not highlighting
- The API at `efs-varnish.kurier.at` must be accessible
- Check console for CORS or network errors

---

## URLs

- **Loader (modular):** `https://cdn.jsdelivr.net/gh/derfleck/paywall_bookmarklet@main/loader.js`
- **Standalone:** `https://cdn.jsdelivr.net/gh/derfleck/paywall_bookmarklet@main/paywall-inspector.js`
- **Userscript:** `https://cdn.jsdelivr.net/gh/derfleck/paywall_bookmarklet@main/paywall-inspector.user.js`
