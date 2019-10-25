function awaitLoad() {
  return new Promise(resolve => {
    const onLoad = () => {
      window.removeEventListener('load', onLoad);
      resolve();
    };
    
    window.addEventListener('load', onLoad);
  });
}

export default () => {
  const original = document.querySelector('#original');
  const candidate = document.querySelector('#candidate');
  const fuzz = document.querySelector('#fuzz');
  const canvas = document.querySelector('canvas');
  
  const files = new Map();

  const loadUrl = (img, url) => {
    return new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = e => reject(e);
      img.src = url;
    });
  };

  const getBlob = (canvas) => {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob(blob => resolve(blob), 'image/png');
      } catch (e) {
        reject(e);
      }
    });
  };

  const getImageData = async file => {
    const img = new Image();

    const url = URL.createObjectURL(file);
    await loadUrl(img, url);
    URL.revokeObjectURL(url);

    const { naturalWidth, naturalHeight } = img;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    ctx.drawImage(img, 0, 0);

    return ctx.getImageData(0, 0, naturalWidth, naturalHeight);
  };

  const computeDiff = async (from, to) => {
    if (from.width !== to.width) {
      console.log(from.width, to.width);
      throw new Error('the images do not have the same width');
    }

    if (from.height !== to.height) {
      console.log(from.height, to.height);
      throw new Error('the images do not have the same height');
    }

    console.time('diffing');

    const fuzzAllowed = Number(fuzz.value) || 0;
    const output = document.createElement('canvas').getContext('2d').createImageData(from.width, from.height);
    let differentPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < from.data.length; i += 4) {
      totalPixels += 1;

      const [fr, fg, fb, fa] = from.data.slice(i, i+4);
      const [tr, tg, tb, ta] = to.data.slice(i, i+4);

      const pixelMatches = Math.abs(fr - tr) + Math.abs(fb - tb) + Math.abs(fg - tg) + Math.abs(fa - ta) < fuzzAllowed;

      if (pixelMatches) {
        output.data[i + 0] = Math.round((fr + fr + 255) / 3);
        output.data[i + 1] = Math.round((fg + fg + 255) / 3);
        output.data[i + 2] = Math.round((fb + fb + 255) / 3);
        output.data[i + 3] = fa;
      } else {
        differentPixels += 1;
        output.data[i + 0] = 255;
        output.data[i + 1] = 0;
        output.data[i + 2] = 0;
        output.data[i + 3] = 255;
      }
    }

    console.timeEnd('diffing');

    const diffPercent = differentPixels / totalPixels * 100;
    console.log(`difference of ${diffPercent.toFixed(2)}%`);

    return output;
  };

  const loadFile = which => async (ev) => {
    if (!ev.target.files[0]) {
      return;
    }

    const imageData = await getImageData(ev.target.files[0]);
    files.set(which, imageData);
    console.log(which, 'saved');

    if (files.has('original') && files.has('candidate')) {
      const original = files.get('original');
      const candidate = files.get('candidate');
      const diffData = await computeDiff(original, candidate);

      canvas.width = diffData.width * 3;
      canvas.height = diffData.height;
      canvas.getContext('2d').putImageData(original, 0, 0);
      canvas.getContext('2d').putImageData(diffData, original.width, 0);
      canvas.getContext('2d').putImageData(candidate, original.width * 2, 0);
    }
  };

  original.addEventListener('change', loadFile('original'));
  candidate.addEventListener('change', loadFile('candidate'));
};