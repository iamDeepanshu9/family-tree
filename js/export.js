export async function exportTreeAsPng(stage, filename = 'family-tree.png') {
  const clone = stage.cloneNode(true);
  clone.style.transform = 'none';
  const width = Math.ceil(parseFloat(stage.style.width));
  const height = Math.ceil(parseFloat(stage.style.height));
  if (width > 12000 || height > 12000) throw new Error('This tree is too large for a PNG. Use Print / PDF instead.');
  const styles = [...document.styleSheets].flatMap(sheet => {
    try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; }
  }).join('\n');
  const wrapper = document.createElement('div'); wrapper.append(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${styles}</style>${wrapper.innerHTML}</div></foreignObject></svg>`;
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Your browser could not create the PNG. Use Print / PDF instead.')); image.src = url; });
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); context.fillStyle = '#fff8e8'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0); URL.revokeObjectURL(url);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Your browser could not create the PNG. Use Print / PDF instead.');
  const downloadUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = downloadUrl; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}
