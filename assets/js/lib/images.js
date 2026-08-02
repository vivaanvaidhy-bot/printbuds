window.MiniMakerImages = (() => {
  async function fileToDataUrl(file, options = {}) {
    const {
      maxWidth = 720,
      maxHeight = 720,
      quality = 0.72,
      type = 'image/jpeg'
    } = options;

    if (!file) return '';

    const source = await readFile(file);
    const image = await loadImage(source);
    const { width, height } = fit(image.width, image.height, maxWidth, maxHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL(type, quality);
  }

  function fit(width, height, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not load image.'));
      image.src = source;
    });
  }

  return { fileToDataUrl };
})();
