(function () {
  'use strict';
  const styles = [
    ['original', 'テンプレート標準'], ['diagonal', 'スラッシュ'],
    ['checker', 'チェッカー'], ['dots', 'ドット'],
    ['circuit', 'サーキット'], ['chevron', 'シェブロン'],
    ['barcode', 'バーコード'], ['none', '帯なし']
  ];
  const normalize = value => styles.some(([key]) => key === value) ? value : 'original';
  function graphic(value) {
    const style = normalize(value);
    let shapes = '<rect width="528" height="10" fill="#fff"/>';
    if (style === 'diagonal') {
      for (let x = -10; x < 538; x += 12) shapes += `<path d="M${x} 10l10-10h6l-10 10z"/>`;
    } else if (style === 'checker') {
      for (let x = 0; x < 528; x += 10) shapes += `<path d="M${x} 0h5v5h-5zM${x+5} 5h5v5h-5z"/>`;
    } else if (style === 'dots') {
      for (let x = 3; x < 528; x += 8) shapes += `<circle cx="${x}" cy="2.5" r="1.5"/><circle cx="${x+4}" cy="7.5" r="1.5"/>`;
    } else if (style === 'circuit') {
      shapes += '<path d="M0 1h528M0 9h528" fill="none" stroke="#000" stroke-width="1"/>';
      for (let x = 0; x < 528; x += 36) shapes += `<path d="M${x} 5h10l4-3h10l4 3h8" fill="none" stroke="#000" stroke-width="1.2"/><circle cx="${x+10}" cy="5" r="1.6"/><circle cx="${x+28}" cy="5" r="1.6"/>`;
    } else if (style === 'chevron') {
      for (let x = -8; x < 528; x += 14) shapes += `<path d="M${x} 0h6l6 5-6 5h-6l6-5z"/>`;
    } else if (style === 'barcode') {
      let x = 0; const widths = [2,4,1,3,1,1,5,2,3,1,2,4]; let i = 0;
      while (x < 528) { const width = widths[i++ % widths.length]; shapes += `<rect x="${x}" width="${width}" height="10"/>`; x += width + (i % 3 + 1); }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" class="sheet-band" viewBox="0 0 528 10" preserveAspectRatio="none" aria-hidden="true" fill="#000">${shapes}</svg>`;
  }
  function markup(value) {
    const style = normalize(value);
    if (style === 'original') return '';
    return style === 'none' ? '<span class="sheet-band-hidden"></span>' : graphic(style);
  }
  window.SheetBands = { styles, normalize, graphic, markup };
})();
