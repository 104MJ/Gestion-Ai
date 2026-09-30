/** Photos, partage de fichiers et exports. */
export function pickFile(accept) {
  return new Promise(res => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.style.display = 'none';
    inp.onchange = () => {
      res(inp.files[0] || null);
      inp.remove();
    };
    document.body.appendChild(inp);
    inp.click();
  });
}
export async function resizeImage(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((r, j) => {
      img.onload = r;
      img.onerror = j;
      img.src = url;
    });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function pickPhoto() {
  const f = await pickFile('image/*');
  return f ? resizeImage(f) : null;
}
export async function shareFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  try {
    const file = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}
