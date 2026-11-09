/**
 * High-Resolution Family Tree PNG Exporter
 * Renders the entire interactive tree canvas into a crisp, high-DPI (2x Retina)
 * heirloom poster snapshot complete with royal botanical framing and title banner.
 */

async function inlineImageAsDataUri(img) {
  // Method 1: Try drawing the already-rendered DOM image to an offscreen canvas
  try {
    if (img.complete && img.naturalWidth > 0) {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUri = c.toDataURL('image/png');
      if (dataUri && dataUri.startsWith('data:image/png')) {
        img.src = dataUri;
        return;
      }
    }
  } catch {
    // If canvas is tainted by CORS, fall through to fetch
  }

  // Method 2: Fetch as blob with CORS
  try {
    const res = await fetch(img.src, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const dataUri = await new Promise((resUri, rejUri) => {
        const reader = new FileReader();
        reader.onloadend = () => resUri(reader.result);
        reader.onerror = rejUri;
        reader.readAsDataURL(blob);
      });
      img.src = dataUri;
      return;
    }
  } catch {
    // If fetching fails, remove broken img so initials avatar fallback shows cleanly
    img.remove();
  }
}

export async function exportTreeAsPng(stage, options = {}) {
  const filename = options.filename || `jeev-family-tree-${new Date().toISOString().slice(0, 10)}.png`;
  const title = options.title || 'Jeev Family Tree';
  const titleHindi = options.titleHindi || 'जीव वंशवृक्ष';

  // 1. Clone stage DOM
  const clone = stage.cloneNode(true);
  clone.style.transform = 'none';

  // Read natural dimensions
  const treeWidth = Math.ceil(parseFloat(stage.style.width)) || 3000;
  const treeHeight = Math.ceil(parseFloat(stage.style.height)) || 2000;

  if (treeWidth > 14000 || treeHeight > 14000) {
    throw new Error('This tree is extraordinarily large for a single image. Please filter generations or use Print / PDF.');
  }

  // Decorative banner & framing dimensions
  const PADDING_X = 80;
  const HEADER_HEIGHT = 160;
  const FOOTER_HEIGHT = 80;
  const totalWidth = treeWidth + (PADDING_X * 2);
  const totalHeight = treeHeight + HEADER_HEIGHT + FOOTER_HEIGHT;

  // Determine optimal high-DPI scaling factor (2x for ultra-sharp Retina rendering)
  // Ensure we stay within max canvas limits (16,000px)
  const maxDim = Math.max(totalWidth, totalHeight);
  const scale = maxDim <= 7500 ? 2 : (maxDim <= 13000 ? 1.5 : 1);

  // 2. Inline all member & decoration images as Data URIs so canvas won't be tainted
  const imgs = clone.querySelectorAll('img');
  await Promise.all([...imgs].map(img => inlineImageAsDataUri(img)));

  // 3. Collect active document styles + inject essential variables
  const documentStyles = [...document.styleSheets].flatMap(sheet => {
    try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; }
  }).join('\n');

  const injectedTokens = `
    :root {
      --paper: #f7f5ef;
      --paper-deep: #e7efe9;
      --green: #173f35;
      --green-soft: #2f5d50;
      --ink: #2a2924;
      --gold: #7a5700;
      --gold-light: #c8a85d;
      --white: #fff;
      --radius: 18px;
      --font-body: "Noto Sans Devanagari", "Nirmala UI", system-ui, -apple-system, sans-serif;
      --font-display: "Noto Serif Devanagari", "Kohinoor Devanagari", Georgia, serif;
    }
    .tree-stage { background: transparent !important; }
    .tree-card { box-shadow: 0 8px 24px rgba(42, 41, 36, 0.12) !important; }
  `;

  // 4. Construct SVG ForeignObject wrapper
  const wrapper = document.createElement('div');
  wrapper.append(clone);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${treeWidth}" height="${treeHeight}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">
        <style>${injectedTokens}\n${documentStyles}</style>
        ${wrapper.innerHTML}
      </div>
    </foreignObject>
  </svg>`;

  // 5. Load SVG into Image
  const svgImage = new Image();
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  await new Promise((resolve, reject) => {
    svgImage.onload = resolve;
    svgImage.onerror = () => reject(new Error('Browser could not render the tree snapshot. Please try reducing visible generations.'));
    svgImage.src = svgUrl;
  });

  // 6. Draw onto High-Resolution Canvas with Parchment & Gold Poster Frame
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalWidth * scale);
  canvas.height = Math.round(totalHeight * scale);
  const ctx = canvas.getContext('2d');

  // Apply Retina/Hi-DPI scaling
  ctx.scale(scale, scale);

  // 6A. Parchment Gradient Background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGradient.addColorStop(0, '#fbf8f0');
  bgGradient.addColorStop(0.5, '#f7f2e4');
  bgGradient.addColorStop(1, '#efe7d3');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 6B. Double Gold Border
  ctx.strokeStyle = '#c8a85d';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, totalWidth - 36, totalHeight - 36);

  ctx.strokeStyle = '#e2cf9f';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(26, 26, totalWidth - 52, totalHeight - 52);

  // 6C. Archival Header Banner
  ctx.textAlign = 'center';
  ctx.fillStyle = '#173f35';
  ctx.font = 'bold 36px "Noto Serif Devanagari", Georgia, serif';
  ctx.fillText(`${titleHindi} • ${title}`, totalWidth / 2, 68);

  ctx.fillStyle = '#7a5700';
  ctx.font = '600 16px "Noto Sans Devanagari", system-ui, sans-serif';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`वंशवृक्ष आलेख • High-Resolution Family Lineage Archive • ${dateStr}`, totalWidth / 2, 102);

  // Decorative divider rule
  ctx.strokeStyle = '#c8a85d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(totalWidth / 2 - 280, 118);
  ctx.lineTo(totalWidth / 2 + 280, 118);
  ctx.stroke();

  // 6D. Draw Tree Stage
  ctx.drawImage(svgImage, PADDING_X, HEADER_HEIGHT);
  URL.revokeObjectURL(svgUrl);

  // 6E. Footer inscription
  ctx.fillStyle = '#7a5700';
  ctx.font = '14px "Noto Serif Devanagari", Georgia, serif';
  ctx.fillText('जीव वंशवृक्ष — संरक्षित पारिवारिक इतिहास (Preserved Family Heritage)', totalWidth / 2, totalHeight - 32);

  // 7. Output High-Resolution PNG Download
  const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!pngBlob) {
    throw new Error('Failed to generate PNG image. Your browser canvas limit may have been reached.');
  }

  const downloadUrl = URL.createObjectURL(pngBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
  return { success: true, width: canvas.width, height: canvas.height };
}
