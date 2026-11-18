const library = new URL("../../assets/svg-asset-library/", import.meta.url);
const layers = {creature: "character", item: "object", ui: "object"};

/** Register the pinned manifest; individual SVGs are requested when a scene uses them. */
export async function loadLibrary(renderer) {
  const paths = new Map();
  let assets;
  try {
    const response = await fetch(new URL("manifest.json", library));
    if (!response.ok) throw new Error(response.statusText);
    assets = (await response.json()).assets;
  } catch (error) {
    console.warn("SVG catalog unavailable; using built-in emoji assets.", error);
    assets = [];
  }
  renderer._libraryManifest = assets;
  for (const asset of assets) {
    const layer = layers[asset.layer] || asset.layer;
    const tags = (asset.tags || "").split(",").map(tag => tag.trim()).filter(Boolean);
    const stem = asset.path.split("/").pop().replace(/\.svg$/i, "");
    const alias = asset.layer === "background" ? "bg-" + stem : stem;
    paths.set(asset.id, asset);
    if (renderer.assetMeta[alias] && alias !== asset.id) paths.set(alias, asset);
    const existing = renderer.assetMeta[asset.id];
    renderer.assetMeta[asset.id] = {
      ...existing, layer, tags: [...new Set([...(existing?.tags || []), ...tags, asset.id])],
      origin: layer === "effect" ? "center-center" : "center-bottom", source: "library"
    };
    if (!renderer.EMOJI_MAP[asset.id]) {
      const emoji = renderer._guessEmoji(asset.id);
      renderer.EMOJI_MAP[asset.id] = {emoji, label: asset.id.replace(/[-_]/g, " ")};
      renderer.assets[asset.id] = emoji;
      renderer.loadedCount++;
    }
  }

  const pending = new Map();
  async function readSvg(asset) {
    const response = await fetch(new URL(asset.path, library));
    if (!response.ok) throw new Error(String(response.status));
    const svg = await response.text();
    if (!svg.includes("<svg")) throw new Error("Missing SVG root");
    renderer._svgCache[asset.id] = svg;
    return svg;
  }

  function fetchSvg(id) {
    const asset = paths.get(id);
    if (!asset) return Promise.resolve(null);
    if (renderer._svgCache[asset.id]) return Promise.resolve(renderer._svgCache[asset.id]);
    if (!pending.has(asset.id)) {
      const request = readSvg(asset).catch(error => {
        console.warn("Using emoji fallback for", asset.id, error);
        return null;
      }).finally(() => pending.delete(asset.id));
      pending.set(asset.id, request);
    }
    return pending.get(asset.id);
  }

  return {
    has: id => paths.has(id),
    async mount(host, id, fallback) {
      host.textContent = fallback;
      const svg = await fetchSvg(id);
      if (svg && host.isConnected) host.innerHTML = svg;
    },
    async preload() {
      // The asset diagnostics page explicitly checks every file in the manifest.
      const remaining = assets.values();
      async function next() {
        for (const asset of remaining) await fetchSvg(asset.id);
      }
      await Promise.all(Array.from({length: Math.min(8, assets.length)}, next));
    }
  };
}
