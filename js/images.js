(function () {
  'use strict';
  const MAX_IMAGES = 6;
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  function normalize(images) {
    return (Array.isArray(images) ? images : []).filter(image => image && typeof image.src === 'string' && image.src.length <= 1500000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image.src)).slice(0, MAX_IMAGES).map(image => ({
      src: image.src, name: String(image.name || '画像').slice(0, 120),
      x: clamp(image.x, 0, 95, 68), y: clamp(image.y, 0, 95, 48), width: clamp(image.width, 5, 100, 22)
    }));
  }
  async function read(file) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('PNG・JPEG・WebPの画像を選択してください。');
    if (file.size > 20 * 1024 * 1024) throw new Error('画像は20 MB以下にしてください。');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      let src = canvas.toDataURL('image/png');
      if (src.length > 1400000) src = canvas.toDataURL('image/webp', 0.9);
      if (src.length > 1500000) throw new Error('画像が大きすぎます。小さい画像を選択してください。');
      return { src, name: file.name, x: 68, y: 48, width: 22 };
    } finally { URL.revokeObjectURL(url); }
  }
  function setup(getImages, update) {
    const input = document.getElementById('sheet-image-file');
    const list = document.getElementById('sheet-image-list');
    const status = document.getElementById('image-status');
    let generation = 0;
    function show() {
      list.replaceChildren();
      getImages().forEach((image, index) => {
        const row = document.createElement('div'); row.className = 'image-editor';
        const preview = document.createElement('img'); preview.src = image.src; preview.alt = image.name;
        const title = document.createElement('strong'); title.textContent = image.name;
        const controls = document.createElement('div'); controls.className = 'image-controls';
        [['x','横位置 (%)',0,95],['y','縦位置 (%)',0,95],['width','幅 (%)',5,100]].forEach(([key, text, min, max]) => {
          const label = document.createElement('label'); label.textContent = text;
          const control = document.createElement('input'); control.type = 'number'; control.min = min; control.max = max; control.step = 1; control.value = image[key];
          control.oninput = () => { if (control.value === '') return; const value = clamp(control.value,min,max,image[key]); update(getImages().map((entry,i) => i === index ? {...entry,[key]:value} : entry)); };
          control.onchange = () => {control.value = getImages()[index][key];};
          label.append(control); controls.append(label);
        });
        const presets = document.createElement('div'); presets.className = 'button-row';
        [['名前の横', {x:52,y:7,width:13}], ['右下（QRなど）',{x:70,y:49,width:20}], ['中央（横長画像）',{x:9,y:54,width:82}]].forEach(([text, placement]) => {
          const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
          button.onclick = () => {update(getImages().map((entry,i) => i === index ? {...entry,...placement} : entry));show();}; presets.append(button);
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'quiet danger'; remove.textContent = '画像を削除';
        remove.onclick = () => {update(getImages().filter((_,i) => i !== index));show();};
        row.append(preview,title,controls,presets,remove); list.append(row);
      });
    }
    input.onchange = async () => {
      const files = Array.from(input.files || []); if (!files.length) return;
      const token = generation; input.disabled = true; status.textContent = '画像を読み込み中…';
      try {
        if (getImages().length + files.length > MAX_IMAGES) throw new Error('画像は1シートにつき6枚まで追加できます。');
        const added = [];
        for (const file of files) added.push(await read(file));
        if (token !== generation) return;
        update([...getImages(), ...added]); show(); status.textContent = `${added.length}枚の画像を追加しました。`;
      } catch (error) { if (token === generation) status.textContent = error.message || '画像を読み込めませんでした。'; }
      finally {input.value = ''; input.disabled = false;}
    };
    return { reset() { generation++; status.textContent = ''; show(); } };
  }
  window.SheetImages = { normalize, setup };
})();
