// Read an image File and return a resized JPEG data URL (for avatars/photos).
export async function fileToResizedDataUrl(file: File, max = 256, quality = 0.72): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Grab a poster frame from a recorded/selected video File as a resized JPEG data
// URL (we store the frame as a live photo; full video isn't persisted).
export async function videoFileToThumbnail(file: File, max = 640, quality = 0.55): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'metadata';
    const cleanup = () => URL.revokeObjectURL(url);
    const grab = () => {
      try {
        const vw = v.videoWidth || 320;
        const vh = v.videoHeight || 240;
        const scale = Math.min(1, max / Math.max(vw, vh));
        const w = Math.max(1, Math.round(vw * scale));
        const h = Math.max(1, Math.round(vh * scale));
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) {
          cleanup();
          return reject(new Error('no canvas ctx'));
        }
        ctx.drawImage(v, 0, 0, w, h);
        cleanup();
        resolve(c.toDataURL('image/jpeg', quality));
      } catch (e) {
        cleanup();
        reject(e instanceof Error ? e : new Error('thumbnail failed'));
      }
    };
    v.onloadeddata = () => {
      try {
        v.currentTime = Math.min(0.1, v.duration || 0.1);
      } catch {
        grab();
      }
    };
    v.onseeked = grab;
    v.onerror = () => {
      cleanup();
      reject(new Error('video load failed'));
    };
    v.src = url;
  });
}
