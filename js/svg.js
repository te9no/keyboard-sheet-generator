(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const number = value => Math.round(value * 1000) / 1000;
  function node(tag, attributes = {}, text) {
    const element = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function imageData(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/png');
  }
  let localAssets;
  function loadLocalAssets() {
    if (!localAssets) localAssets = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/svg-assets.js';
      script.onload = () => { script.remove(); resolve(window.SheetSVGAssets); };
      script.onerror = () => { script.remove(); localAssets = null; reject(new Error('ロゴ画像を読み込めませんでした。')); };
      document.head.append(script);
    });
    return localAssets;
  }
  // Measure an unscaled copy so narrow screens produce the same SVG layout.
  async function create(sheet, template, showEventLogo) {
    await document.fonts.ready;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:139.5mm;height:96mm;pointer-events:none';
    host.setAttribute('aria-hidden', 'true');
    const card = document.createElement('article');
    card.className = `sheet-card print-sheet template-${template}`;
    card.style.cssText = 'width:100%;height:100%;margin:0;border-radius:0;box-shadow:none';
    card.innerHTML = SheetCard.markup(sheet, template, false, showEventLogo);
    host.append(card);
    document.body.append(host);
    try {
      if (location.protocol === 'file:' && card.querySelector('img')) {
        const assets = await loadLocalAssets();
        card.querySelectorAll('img').forEach(img => { const embedded = assets[img.getAttribute('src')]; if (embedded) img.src = embedded; });
      }
      await Promise.all(Array.from(card.querySelectorAll('img')).filter(img => getComputedStyle(img).display !== 'none').map(img => img.decode()));
      SheetCard.fitKeyboardName(card, true);
      const bounds = card.getBoundingClientRect();
      const svg = node('svg', { xmlns: NS, width: '139.5mm', height: '96mm', viewBox: `0 0 ${number(bounds.width)} ${number(bounds.height)}`, role: 'img' });
      svg.append(node('title', {}, sheet.keyboardName || 'キーボード紹介シート'));
      const defs = node('defs');
      svg.append(defs);
      let clipId = 0;
      const context = document.createElement('canvas').getContext('2d');
      const segments = new Intl.Segmenter('ja', { granularity: 'grapheme' });
      const relative = rect => ({ x: number(rect.left - bounds.left), y: number(rect.top - bounds.top), width: number(rect.width), height: number(rect.height) });
      function textNode(source, parent, style) {
        const range = document.createRange();
        const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        context.font = font;
        const metrics = context.measureText('Mg');
        const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize);
        const text = node('text', { fill: style.color, 'font-family': style.fontFamily, 'font-size': style.fontSize, 'font-weight': style.fontWeight, 'font-style': style.fontStyle, 'xml:space': 'preserve' });
        for (const part of segments.segment(source.textContent)) {
          if (part.segment === '\n' || part.segment === '\r') continue;
          range.setStart(source, part.index);
          range.setEnd(source, part.index + part.segment.length);
          const rect = range.getBoundingClientRect();
          if (!rect.width || !rect.height) continue;
          const position = relative(rect);
          text.append(node('tspan', { x: position.x, y: number(position.y + ascent) }, part.segment));
        }
        parent.append(text);
      }
      function paint(element, parent) {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const box = relative(element.getBoundingClientRect());
        if (element.classList.contains('sheet-band')) {
          const band = element.cloneNode(true);
          Object.entries(box).forEach(([key,value])=>band.setAttribute(key,value));
          band.removeAttribute('class');
          parent.append(band);
          return;
        }
        const group = node('g');
        parent.append(group);
        const radius = Math.min(parseFloat(style.borderTopLeftRadius) || 0, box.width / 2, box.height / 2);
        if (style.overflowX === 'hidden' || style.overflowY === 'hidden') {
          const id = `clip-${++clipId}`;
          const clip = node('clipPath', { id });
          clip.append(node('rect', { ...box, rx: radius }));
          defs.append(clip);
          group.setAttribute('clip-path', `url(#${id})`);
        }
        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
          group.append(node('rect', { ...box, rx: radius, fill: style.backgroundColor }));
        }
        const widths = ['Top', 'Right', 'Bottom', 'Left'].map(side => parseFloat(style[`border${side}Width`]) || 0);
        if (widths.every(width => width > 0 && width === widths[0])) {
          const inset = widths[0] / 2;
          group.append(node('rect', { x: box.x + inset, y: box.y + inset, width: Math.max(0, box.width - widths[0]), height: Math.max(0, box.height - widths[0]), rx: Math.max(0, radius - inset), fill: 'none', stroke: style.borderTopColor, 'stroke-width': widths[0] }));
        } else {
          const points = [[box.x, box.y + widths[0] / 2, box.x + box.width, box.y + widths[0] / 2], [box.x + box.width - widths[1] / 2, box.y, box.x + box.width - widths[1] / 2, box.y + box.height], [box.x, box.y + box.height - widths[2] / 2, box.x + box.width, box.y + box.height - widths[2] / 2], [box.x + widths[3] / 2, box.y, box.x + widths[3] / 2, box.y + box.height]];
          ['Top', 'Right', 'Bottom', 'Left'].forEach((side, index) => {
            if (!widths[index]) return;
            const [x1, y1, x2, y2] = points[index];
            group.append(node('line', { x1, y1, x2, y2, stroke: style[`border${side}Color`], 'stroke-width': widths[index] }));
          });
        }
        if (element === card && SheetBands.normalize(sheet.bandStyle) === 'original') {
          // The template accent is a CSS pseudo-element; reproduce it as a vector gradient.
          const stops = { nagare: [[0, '#ed6d68'], [44, '#ed6d68'], [44, '#f4c84b'], [70, '#f4c84b'], [70, '#48b7ae'], [100, '#48b7ae']], tenkey: [[0, '#ed2aa9'], [47, '#be2bd0'], [73, '#9a32ee'], [100, '#3e86f6']], ttt: [[0, '#000'], [50, '#000'], [50, '#d9dddc'], [100, '#d9dddc']] }[template];
          if (stops) {
            const gradient = node('linearGradient', { id: 'accent' });
            stops.forEach(([offset, color]) => gradient.append(node('stop', { offset: `${offset}%`, 'stop-color': color })));
            defs.append(gradient);
            group.append(node('rect', { x: 0, y: 0, width: box.width, height: 7, fill: 'url(#accent)' }));
          }
        }
        if (element.tagName === 'IMG') {
          group.append(node('image', { ...box, href: imageData(element), preserveAspectRatio: 'xMaxYMin meet' }));
          return;
        }
        // Match the visible ellipsis on feature tags before measuring their text.
        if (style.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth) {
          const original = element.textContent;
          const chars = Array.from(segments.segment(original), part => part.segment);
          while (chars.length && element.scrollWidth > element.clientWidth) {
            chars.pop();
            element.textContent = chars.join('') + '…';
          }
        }
        element.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) textNode(child, group, style);
          else if (child.nodeType === Node.ELEMENT_NODE) paint(child, group);
        });
      }
      paint(card, svg);
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(svg);
    } finally {
      host.remove();
    }
  }
  async function createPages(sheets, template, showEventLogo) {
    if (!sheets.length) throw new Error('出力するシートを1つ以上選択してください。');
    const pages = [];
    for (let start = 0; start < sheets.length; start += 4) {
      // Millimetre viewBox units match the existing A4 layout: 7 mm margins, 4 mm gaps.
      const page = node('svg', { xmlns: NS, width: '297mm', height: '210mm', viewBox: '0 0 297 210', role: 'img' });
      page.append(node('title', {}, `キーボード紹介シート — ${pages.length + 1}ページ`));
      page.append(node('rect', { width: 297, height: 210, fill: '#fff' }));
      const batch = sheets.slice(start, start + 4);
      for (let index = 0; index < batch.length; index++) {
        const source = await create(batch[index], template, showEventLogo);
        const card = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
        // IDs are document-wide, including inside nested SVGs. Keep every card's
        // clipping paths and gradient references independent.
        const prefix = `card-${start + index}-`;
        card.querySelectorAll('[id]').forEach(element => element.id = prefix + element.id);
        card.querySelectorAll('*').forEach(element => {
          Array.from(element.attributes).forEach(attribute => {
            if (attribute.value.includes('url(#')) {
              element.setAttribute(attribute.name, attribute.value.replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`));
            }
          });
        });
        card.setAttribute('x', 7 + (index % 2) * 143.5);
        card.setAttribute('y', 7 + Math.floor(index / 2) * 100);
        card.setAttribute('width', 139.5);
        card.setAttribute('height', 96);
        card.setAttribute('overflow', 'hidden');
        page.append(document.importNode(card, true));
      }
      pages.push('<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(page));
    }
    return pages;
  }
  async function download(sheet, template, showEventLogo) {
    const source = await create(sheet, template, showEventLogo);
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const name = (sheet.keyboardName || 'keyboard-sheet').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 80) || 'keyboard-sheet';
    link.download = `${name}.svg`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.SheetSVG = { create, createPages, download };
})();
