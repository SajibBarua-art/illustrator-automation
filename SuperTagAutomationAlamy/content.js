// ============================================================
//  Alamy Bulk SuperTagger — content.js  v6
//  Selectors CONFIRMED by live DOM inspection:
//    Inactive Star : i.icon-tag-star.dark-grey
//    Active Star   : i.icon-tag-star.cyan
//    Save Button   : input#submitsearch
//    Clear Select  : label#automationClearSelection
//    Image thumb   : a.relative  (wrap around the <img>)
// ============================================================

let isRunning = false;
let targetImages = 20;
let imagesProcessed = 0;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── GUI ────────────────────────────────────────────────────
function injectGUI() {
    if (document.getElementById('alamy-automator-tool')) return;

    let div = document.createElement('div');
    div.id = 'alamy-automator-tool';
    div.style.cssText = [
        'position:fixed', 'top:12px', 'left:50%', 'transform:translateX(-50%)',
        'z-index:2147483647', 'background:#1e272e', 'color:#f5f6fa',
        'border:2px solid #8c7ae6', 'padding:14px 18px', 'border-radius:10px',
        'box-shadow:0 4px 20px rgba(0,0,0,.55)', 'font-family:sans-serif',
        'display:flex', 'flex-direction:column', 'gap:9px', 'min-width:265px',
        'pointer-events:all'
    ].join(';');

    div.innerHTML = `
        <h3 style="margin:0;text-align:center;color:#8c7ae6;font-size:15px;">🌟 Alamy Bulk SuperTagger</h3>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
            <label style="font-size:13px;">Images to process:</label>
            <input type="number" id="aa-target-count" value="20" min="1" max="1000"
                style="width:55px;padding:4px;border-radius:4px;border:1px solid #718093;background:#2d3436;color:#fff;text-align:center;">
        </div>
        <div style="display:flex;gap:8px;">
            <button id="aa-start-btn" style="background:#4cd137;color:#111;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;font-weight:bold;flex:1;">▶ Start</button>
            <button id="aa-stop-btn" style="background:#e84118;color:#fff;border:none;padding:8px 12px;border-radius:4px;cursor:pointer;font-weight:bold;flex:1;">■ Stop</button>
        </div>
        <div id="aa-status" style="font-size:11px;color:#a29bfe;text-align:center;min-height:16px;word-break:break-word;">Ready.</div>
        <div id="aa-progress" style="font-size:11px;color:#dfe6e9;text-align:center;display:none;"></div>
    `;

    document.body.appendChild(div);

    document.getElementById('aa-start-btn').addEventListener('click', () => {
        if (!isRunning) startBulkProcess();
    });
    document.getElementById('aa-stop-btn').addEventListener('click', () => {
        isRunning = false;
        updateStatus('⛔ Stopped.');
    });
}

function updateStatus(msg) {
    let el = document.getElementById('aa-status');
    if (el) el.textContent = msg;
    console.log('[AutoSuperTag] ' + msg);
}

function updateProgress(done, total) {
    let el = document.getElementById('aa-progress');
    if (el) {
        el.style.display = 'block';
        el.textContent = `Progress: ${done} / ${total} images`;
    }
}

// ─── CONFIRMED SELECTORS ─────────────────────────────────────

/**
 * Read the current supertag count.
 * The page renders:  <span class="ng-binding">4/10</span> supertags
 * or the full text could appear in innerText as "4/10 supertags"
 */
function getSupertagCount() {
    // Try the confirmed span selector first
    let spans = Array.from(document.querySelectorAll('span.ng-binding'));
    for (let span of spans) {
        let t = (span.textContent || '').trim();
        let m = t.match(/^(\d+)\/10$/);
        if (m) return parseInt(m[1], 10);
    }

    // Fallback: scan all text nodes for "X/10 supertags"
    let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
        let v = node.nodeValue || '';
        let m = v.match(/(\d+)\s*\/\s*10\s*supertags/i);
        if (m) return parseInt(m[1], 10);
    }

    // Last resort: innerText scan
    let bodyText = document.body.innerText || '';
    let m2 = bodyText.match(/(\d+)\s*\/\s*10\s*supertags/i);
    if (m2) return parseInt(m2[1], 10);

    return null;
}

/**
 * CONFIRMED: Inactive stars are  i.icon-tag-star.dark-grey
 * Active stars are                i.icon-tag-star.cyan
 * We ONLY click inactive (dark-grey) ones to avoid toggling off existing supertags.
 */
function getInactiveTagStars() {
    // Primary: use the confirmed class combo
    let stars = Array.from(document.querySelectorAll('i.icon-tag-star.dark-grey'));

    // Fallback if dark-grey class isn't present — get any icon-tag-star that isn't cyan
    if (stars.length === 0) {
        stars = Array.from(document.querySelectorAll('i.icon-tag-star')).filter(el => {
            let cls = el.className || '';
            return !cls.includes('cyan') && !cls.includes('gold') &&
                !cls.includes('yellow') && !cls.includes('active');
        });
    }

    // Filter to only visible stars
    return stars.filter(el => {
        let rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    });
}

/**
 * CONFIRMED: Save button is  input#submitsearch
 */
function getSaveButton() {
    return document.getElementById('submitsearch') || null;
}

/**
 * CONFIRMED: Clear selection is  label#automationClearSelection
 */
function getClearSelectionButton() {
    return document.getElementById('automationClearSelection') || null;
}

/**
 * CONFIRMED: Image thumbnails in grid are wrapped in  a.relative
 * We grab those that haven't been processed yet.
 */
function getNextImage() {
    let anchors = Array.from(document.querySelectorAll('a.relative'));

    for (let a of anchors) {
        if (a.getAttribute('data-aa-done')) continue;

        // Must visually contain a real thumbnail image
        let img = a.querySelector('img');
        if (!img) continue;

        let rect = a.getBoundingClientRect();
        if (rect.width < 60 || rect.height < 60) continue;

        // Scroll into view if off-screen
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            a.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return a;
    }
    return null;
}

// ─── DOM EVENT DISPATCHING ──────────────────────────────────

// We send a full mouse sequence directly to this element
function simulateHumanClick(element) {
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // We send a full mouse sequence directly to this element
    ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        let evt = new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window });
        element.dispatchEvent(evt);
    });

    if (typeof element.click === 'function') element.click();
}

function clickImageInPage() {
    let anchors = Array.from(document.querySelectorAll('a.relative')).filter(a => !a.getAttribute('data-aa-done') && a.querySelector('img') && a.getBoundingClientRect().width > 0);
    if (anchors.length > 0) {
        let a = anchors[0];
        let img = a.querySelector('img') || a;

        ['mousedown', 'mouseup', 'click'].forEach(eventType => {
            img.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
            a.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
        });

        if (typeof a.click === 'function') a.click();
    }
}

function clickFirstInactiveStarInPage() {
    let stars = Array.from(document.querySelectorAll('i.icon-tag-star.dark-grey')).filter(el => el.getBoundingClientRect().width > 0);
    if (stars.length === 0) {
        stars = Array.from(document.querySelectorAll('i.icon-tag-star')).filter(el => {
            let cls = el.className || '';
            return !cls.includes('cyan') && !cls.includes('gold') && !cls.includes('active') && el.getBoundingClientRect().width > 0;
        });
    }

    if (stars.length > 0) {
        let star = stars[0];
        // The simple method that triggered the tag selection perfectly in the older version
        star.click();
    }
}

function clickSaveInPage() {
    let saveBtn = document.getElementById('submitsearch');
    if (saveBtn) {
        saveBtn.disabled = false;
        simulateHumanClick(saveBtn);
    }
}

function clickClearSelectionInPage() {
    let clearBtn = document.getElementById('automationClearSelection');
    if (clearBtn) simulateHumanClick(clearBtn);
}

// ─── MODAL DISMISSAL ────────────────────────────────────────

async function dismissAnyModal() {
    let okBtns = Array.from(document.querySelectorAll('button, input[type="button"]')).filter(btn => {
        let t = (btn.innerText || btn.value || '').trim().toUpperCase();
        return (t === 'OK' || t === 'CLOSE' || t === 'DISMISS') && btn.getBoundingClientRect().width > 0;
    });
    if (okBtns.length > 0) {
        simulateHumanClick(okBtns[0]);
    }
    await delay(200);
}

// ─── SUPERTAG LOGIC ─────────────────────────────────────────

async function addSupertagsToCurrentImage() {
    // Wait for the right sidebar to populate with this image's data
    await delay(2800);

    let count = getSupertagCount();
    if (count === null) {
        await delay(2000);
        count = getSupertagCount();
    }

    if (count === null) {
        updateStatus('⚠️ Sidebar not loaded. Skipping image.');
        return false;
    }

    if (count >= 10) {
        updateStatus('✅ Already has 10/10 supertags.');
        return true;
    }

    updateStatus(`Adding supertags (${count}/10)...`);

    const MAX_CLICKS = 50;
    let clicksDone = 0;

    while (isRunning && clicksDone < MAX_CLICKS) {
        count = getSupertagCount();
        if (count === null || count >= 10) break;

        await dismissAnyModal();

        let starsCount = getInactiveTagStars().length;
        if (starsCount === 0) {
            updateStatus(`⚠️ No inactive stars at ${count}/10. Stopping.`);
            break;
        }

        let prevCount = count;

        // Execute click directly in page context
        clickFirstInactiveStarInPage();

        // Human-like wait (1.0 – 1.6s)
        await delay(1200 + Math.random() * 500);

        await dismissAnyModal();

        count = getSupertagCount();
        if (count !== null) {
            if (count > prevCount) {
                updateStatus(`✓ Supertag added (${count}/10)`);
            } else if (count < prevCount) {
                // Accidentally toggled off — restore
                updateStatus(`↩ Restoring accidentally removed supertag...`);
                clickFirstInactiveStarInPage();
                await delay(1000);
                await dismissAnyModal();
            }
        }

        clicksDone++;
    }

    let finalCount = getSupertagCount();
    return finalCount !== null && finalCount >= 10;
}

// ─── MAIN LOOP ──────────────────────────────────────────────

async function startBulkProcess() {
    isRunning = true;
    targetImages = parseInt(document.getElementById('aa-target-count').value, 10) || 20;
    imagesProcessed = 0;

    updateStatus(`🚀 Starting — ${targetImages} images...`);
    updateProgress(0, targetImages);

    while (isRunning && imagesProcessed < targetImages) {

        // ── 1. Deselect any current selection first
        clickClearSelectionInPage();
        await delay(800);

        // ── 2. Find next unprocessed image thumbnail
        let anchor = getNextImage();
        if (!anchor) {
            updateStatus('⚠️ No more images found. Done!');
            break;
        }

        updateStatus(`Selecting image ${imagesProcessed + 1}/${targetImages}...`);

        // ── 3. Click image to select it via page injection
        anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await delay(500);
        clickImageInPage();

        // Wait for the sidebar to update with this image's data
        await delay(3500);
        if (!isRunning) break;

        // ── 4. Add supertags
        await addSupertagsToCurrentImage();
        if (!isRunning) break;

        // ── 5. Click Save
        updateStatus(`💾 Saving image ${imagesProcessed + 1}...`);
        clickSaveInPage();
        await delay(3500);

        // ── 6. Mark processed & advance
        // We do this in extensions content scope so we don't lose track
        anchor.setAttribute('data-aa-done', '1');
        imagesProcessed++;
        updateProgress(imagesProcessed, targetImages);
        updateStatus(`✅ Image ${imagesProcessed}/${targetImages} done.`);
        await delay(1000);
    }

    if (isRunning) {
        updateStatus(`🎉 Done! Processed ${imagesProcessed} images.`);
        isRunning = false;
    }
}

// ─── BOOTSTRAP ──────────────────────────────────────────────
injectGUI();
setInterval(injectGUI, 4000);

console.log('[AutoSuperTag] v6 loaded — selectors: i.icon-tag-star.dark-grey | input#submitsearch | label#automationClearSelection | a.relative');
