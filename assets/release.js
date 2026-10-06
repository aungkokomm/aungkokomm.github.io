/* aungkokomm.github.io: auto-fill versions + download links from GitHub Releases.
 *
 * No build step, no GitHub Actions: this runs in the visitor's browser on page
 * load. It reads two kinds of markers and never throws: if the GitHub API is
 * unreachable (offline / rate-limited) the hard-coded fallback text already in
 * the HTML is left exactly as-is, so the page never shows anything broken.
 *
 *   1. App cards on the home page:
 *        <div class="card-rich" data-repo="owner/name"> … .version-pill, .card-updated, .card-dl
 *      → the pill gets the latest release tag, "Updated N days ago" shows for a
 *        release in the last week, Download points at the installer, and
 *        [data-stats] in the hero gets the apps' total downloads.
 *
 *   2. Hero download buttons on each app sub-page:
 *        <a class="btn-primary" data-dl data-repo="owner/name">⬇ Download vX</a>
 *      → label becomes "⬇ Download <tag>", href becomes the installer asset's
 *        direct URL, and any <span data-dl-size> on the page shows the real size.
 *
 * Version-shaped tags only (v1.2.3, 2.9, …) update the visible label, so a repo
 * that uses a non-version tag keeps whatever was typed by hand.
 */
(function () {
  "use strict";

  function isVersion(tag) { return /^v?\d/.test(tag || ""); }

  function findAsset(rel) {
    var assets = rel.assets || [];
    return assets.find(function (a) { return /setup.*\.exe$/i.test(a.name); })
        || assets.find(function (a) { return /\.exe$/i.test(a.name); })
        || assets.find(function (a) { return /\.zip$/i.test(a.name); })
        || null;
  }

  function fetchLatest(repo) {
    return fetch("https://api.github.com/repos/" + repo + "/releases/latest",
                 { headers: { "Accept": "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : null; });
  }

  // Home page: one request per app for all its releases gives the latest tag,
  // its date, the installer and the app's total downloads. Kept for an hour in
  // the visitor's browser, since GitHub allows 60 requests an hour without a key.
  var TTL = 60 * 60 * 1000;

  function fetchSummary(repo) {
    var key = "ghrel:" + repo;
    try {
      var hit = JSON.parse(localStorage.getItem(key) || "null");
      if (hit && Date.now() - hit.t < TTL) return Promise.resolve(hit.d);
    } catch (e) { /* storage blocked: just fetch */ }
    return fetch("https://api.github.com/repos/" + repo + "/releases?per_page=100",
                 { headers: { "Accept": "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (!Array.isArray(list)) return null;
        var rels = list.filter(function (x) { return !x.draft && !x.prerelease; });
        if (!rels.length) return null;
        var asset = findAsset(rels[0]);
        var d = {
          tag: rels[0].tag_name,
          date: rels[0].published_at,
          url: asset ? asset.browser_download_url : null,
          downloads: list.reduce(function (n, x) {
            return n + (x.assets || []).reduce(function (m, a) { return m + (a.download_count || 0); }, 0);
          }, 0)
        };
        try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { }
        return d;
      });
  }

  // 1. The home page's app cards: version pill, "Updated …" for releases in
  //     the last week, the Download button, and the total in the hero.
  var cards = document.querySelectorAll(".card-rich[data-repo]");
  var counts = [];
  cards.forEach(function (card) {
    counts.push(fetchSummary(card.getAttribute("data-repo")).then(function (d) {
      if (!d) return null;
      var pill = card.querySelector(".version-pill");
      if (pill && isVersion(d.tag)) pill.textContent = d.tag;
      var dl = card.querySelector(".card-dl");
      if (dl && d.url) dl.href = d.url;
      var upd = card.querySelector(".card-updated");
      var days = Math.floor((Date.now() - Date.parse(d.date)) / 86400000);
      if (upd && days >= 0 && days <= 7) {
        upd.textContent = days === 0 ? "Updated today" : days === 1 ? "Updated yesterday" : "Updated " + days + " days ago";
        upd.hidden = false;
      }
      return d.downloads;
    }).catch(function () { return null; }));
  });
  var stats = document.querySelector("[data-stats]");
  if (stats && counts.length) {
    Promise.all(counts).then(function (n) {
      // Only show a total when every app answered; a partial sum would undersell.
      if (n.some(function (x) { return x == null; })) return;
      var total = n.reduce(function (a, b) { return a + b; }, 0);
      stats.textContent = cards.length + " apps · " + total.toLocaleString("en-US") + " downloads · MIT licensed";
    });
  }

  // 2. Hero download buttons on each app sub-page
  document.querySelectorAll("a[data-dl][data-repo]").forEach(function (btn) {
    fetchLatest(btn.getAttribute("data-repo")).then(function (rel) {
      if (!rel) return;
      if (isVersion(rel.tag_name)) btn.textContent = "⬇ Download " + rel.tag_name;
      var asset = findAsset(rel);
      if (asset && asset.browser_download_url) btn.href = asset.browser_download_url;
      var sizeEl = document.querySelector("[data-dl-size]");
      if (sizeEl && asset && asset.size) {
        var mb = Math.round(asset.size / (1024 * 1024));
        sizeEl.textContent = "Portable installer (~" + mb + " MB)";
      }
    }).catch(function () { /* keep fallback */ });
  });
})();
