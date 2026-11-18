const library = new URL("../../assets/svg-asset-library/", import.meta.url);
const layers = {creature: "character", item: "object", ui: "object"};

/** Register the pinned catalog and fetch every declared SVG at most once. */
export async function loadLibrary(renderer) {
  renderer._svgAliases = new Map();
  let assets;
  try {
    const response = await fetch(new URL("manifest.json", library));
    if (!response.ok) throw new Error(response.statusText);
    assets = (await response.json()).assets;
  } catch (error) {
    console.warn("SVG catalog unavailable; using built-in emoji assets.", error);
    renderer._libraryManifest = [];
    return;
  }
  renderer._libraryManifest = assets;
  for (const asset of assets) {
    const layer = layers[asset.layer] || asset.layer;
    const tags = (asset.tags || "").split(",").map(tag => tag.trim()).filter(Boolean);
    const stem = asset.path.split("/").pop().replace(/\.svg$/i, "");
    const alias = asset.layer === "background" ? "bg-" + stem : stem;
    if (renderer.assetMeta[alias] && alias !== asset.id) renderer._svgAliases.set(alias, asset.id);
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
  const pending = assets.values();
  async function fetchNext() {
    for (const asset of pending) {
      try {
        const response = await fetch(new URL(asset.path, library));
        if (response.ok) {
          const svg = await response.text();
          if (svg.includes("<svg")) renderer._svgCache[asset.id] = svg;
        }
      } catch (error) {
        console.warn("Using emoji fallback for", asset.id, error);
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(8, assets.length)}, fetchNext));
}
