const next = () => new Promise(resolve => setTimeout(() => resolve(), 0));

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

const computeDiff = async (from, to, fuzz) => {
  if (from.width !== to.width) {
    throw new Error('the images do not have the same width');
  }

  if (from.height !== to.height) {
    throw new Error('the images do not have the same height');
  }

  const start = Date.now();

  const output = document.createElement('canvas').getContext('2d').createImageData(from.width, from.height);
  let differentPixels = 0;
  let totalPixels = 0;
  let stamp = Date.now();

  for (let i = 0; i < from.data.length; i += 4) {
    totalPixels += 1;

    const [fr, fg, fb, fa] = from.data.slice(i, i+4);
    const [tr, tg, tb, ta] = to.data.slice(i, i+4);

    const pixelMatches = Math.abs(fr - tr) + Math.abs(fb - tb) + Math.abs(fg - tg) + Math.abs(fa - ta) <= fuzz;

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

    if (Date.now() - stamp > 16) {
      await next();
      stamp = Date.now();
    }
  }

  const diffPercent = differentPixels / totalPixels;

  return { imageData: output, difference: diffPercent, time: Date.now() - start };
};

const loadDisplayImage = (() => {
  let url;

  return async (parent, canvas) => {
    if (url) {
      URL.revokeObjectURL(url);
      url = null;
    }

    const blob = await getBlob(canvas);
    url = URL.createObjectURL(blob);

    const img = document.createElement('img');
    parent.appendChild(img);

    await loadUrl(img, url);
  };
})();

export default () => {
  const original = document.querySelector('#original');
  const candidate = document.querySelector('#candidate');
  const fuzz = document.querySelector('#fuzz');
  const content = document.querySelector('.content');
  const percent = document.querySelector('.percent');

  const files = new Map();

  const executeIfFilesLoaded = async () => {
    const original = files.get('original');
    const candidate = files.get('candidate');

    if (!(original && candidate)) {
      return;
    }

    content.innerHTML = '';
    content.classList.add('loading');
    await next();

    const { imageData, difference, time } = await computeDiff(original, candidate, Number(fuzz.value) || 0);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageData.width * 3;
    canvas.height = imageData.height;
    ctx.putImageData(original, 0, 0);
    ctx.putImageData(imageData, original.width, 0);
    ctx.putImageData(candidate, original.width * 2, 0);

    content.innerHTML = '';
    await loadDisplayImage(content, canvas);
    content.classList.remove('loading');

    percent.innerHTML = `${(difference * 100).toFixed(2)}% difference<br/>in ${time}ms`;
  };

  const loadLabel = (elem, text, name) => {
    elem.innerHTML = '';
    elem.appendChild(document.createTextNode(text));
    elem.appendChild(document.createElement('br'));
    elem.appendChild(document.createTextNode(name));
  };

  const loadFile = async (which, file) => {
    const imageData = await getImageData(file);
    files.set(which, imageData);

    if (which === 'original') {
      loadLabel(original, 'Original file:', file.name);
    } else {
      loadLabel(candidate, 'Candidate file:', file.name);
    }

    await executeIfFilesLoaded();
  };

  const onClick = which => () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.click();

    input.onchange = ev => {
      if (!ev.target.files[0]) {
        return;
      }

      loadFile(which, ev.target.files[0]);
    };
  };

  const onDropFile = which => ev => {
    ev.stopPropagation();
    ev.preventDefault();

    if (!ev.dataTransfer.files[0]) {
      return;
    }

    loadFile(which, ev.dataTransfer.files[0]);
  };

  const onDrop = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();

    const drops = [].slice.call(ev.dataTransfer.files, 0, 2);
    let promise;

    if (drops.length === 1 && files.has('original')) {
      // load as candidate
      files.delete('candidate');
      promise = loadFile('candidate', drops[0]);
    } else if (drops.length === 1) {
      files.delete('original');
      promise = loadFile('original', drops[0]);
      // load as original
    } else if (drops.length === 2) {
      files.delete('original');
      files.delete('candidate');

      promise = Promise.all([
        loadFile('original', drops[0]),
        loadFile('candidate', drops[1])
      ]);
    }

    if (promise) {
      promise.then(() => {
        // eslint-disable-next-line no-console
        console.log('loaded dropped files');
      }).catch(err => {
        // eslint-disable-next-line no-console
        console.log('error handling dropped files', err);
      });
    }
  };

  const onDrag = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  };

  original.addEventListener('click', onClick('original'));
  original.addEventListener('drop', onDropFile('original'));
  candidate.addEventListener('click', onClick('candidate'));
  candidate.addEventListener('drop', onDropFile('candidate'));

  fuzz.addEventListener('change', executeIfFilesLoaded);

  window.addEventListener('drop', onDrop);
  window.addEventListener('dragover', onDrag);
};
