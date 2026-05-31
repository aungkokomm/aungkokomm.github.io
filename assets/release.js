/* aungkokomm.github.io — auto-fill versions + download links from GitHub Releases.
 *
 * No build step, no GitHub Actions: this runs in the visitor's browser on page
 * load. It reads two kinds of markers and never throws — if the GitHub API is
 * unreachable (offline / rate-limited) the hard-coded fallback text already in
 * the HTML is left exactly as-is, so the page never shows anything broken.
 *
 *   1. App cards on the home page:
 *        <a class="card-rich" data-repo="owner/name"> … <span class="version-pill">…</span>
 *      → the pill is set to the repo's latest release tag.
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

  // 1 — version pills on the home page's app cards
  document.querySelectorAll(".card-rich[data-repo]").forEach(function (card) {
    var pill = card.querySelector(".version-pill");
    if (!pill) return;
    fetchLatest(card.getAttribute("data-repo")).then(function (rel) {
      if (rel && isVersion(rel.tag_name)) pill.textContent = rel.tag_name;
    }).catch(function () { /* keep fallback */ });
  });

  // 2 — hero download buttons on each app sub-page
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
