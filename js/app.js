(function(){
  const state=SheetStorage.load();let activeId=state.current.id;const selectedIds=new Set(state.sheets.map(sheet=>sheet.id));const $=id=>document.getElementById(id);const form=$('sheet-form');const fields=['keyboardName','exhibitor','switchName','keycaps','feature','description','bandStyle'];
  const imageEditor=SheetImages.setup(()=>state.current.images||[],images=>{state.current.images=images;render();});
  SheetBands.styles.filter(([key])=>!['original','none'].includes(key)).forEach(([key,label])=>{const button=document.createElement('button');button.type='button';button.dataset.band=key;button.innerHTML=SheetBands.graphic(key);const text=document.createElement('span');text.textContent=label;button.append(text);button.onclick=()=>{$('bandStyle').value=key;render();};$('band-samples').append(button);});
  function current(){const sheet={...state.current};fields.forEach(key=>sheet[key]=$(key).value);sheet.typing=form.querySelector('[name=typing]:checked')?.value||'';sheet.photo=form.querySelector('[name=photo]:checked')?.value||'';sheet.id=activeId;return sheet;}
  function put(sheet){state.current={...SheetStorage.blankSheet(),...sheet};activeId=sheet.id||null;fields.forEach(key=>$(key).value=state.current[key]||'');['typing','photo'].forEach(name=>form.querySelectorAll(`[name=${name}]`).forEach(radio=>radio.checked=radio.value===state.current[name]));imageEditor.reset();render();}
  function save(){state.current=current();SheetStorage.save(state);}
  function syncPreviewScale(){const stage=$('preview-stage');const frame=stage?.querySelector('.preview-frame');if(!stage||!frame)return;const scale=stage.clientWidth/frame.offsetWidth;frame.style.setProperty('--preview-scale',scale);stage.style.height=`${frame.offsetHeight*scale}px`;}
  function render(){const sheet=current();state.current=sheet;const preview=$('preview-card');preview.className=`sheet-card print-sheet template-${state.template}`;preview.innerHTML=SheetCard.markup(sheet,state.template,false,state.showEventLogo);SheetCard.fitKeyboardName(preview,true);syncPreviewScale();document.querySelectorAll('#band-samples button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.band===sheet.bandStyle)));renderList();SheetStorage.save(state);}
  function renderList(){const list=$('sheet-list');list.replaceChildren();if(!state.sheets.length){list.innerHTML='<p class="hint">まだ保存されたシートはありません。</p>';return;}state.sheets.forEach(sheet=>{const row=document.createElement('div');row.className='sheet-row';row.innerHTML=`<input type="checkbox" data-action="select" data-id="${sheet.id}"${selectedIds.has(sheet.id)?' checked':''} aria-label="${escapeHtml(sheet.keyboardName||'（名称未入力）')}を印刷対象にする"><strong>${escapeHtml(sheet.keyboardName||'（名称未入力）')}</strong><button data-action="edit" data-id="${sheet.id}">編集</button><button data-action="copy" data-id="${sheet.id}">複製</button><button data-action="delete" data-id="${sheet.id}" class="quiet danger">削除</button>`;list.append(row);});}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  form.addEventListener('input',()=>{save();render();});form.addEventListener('change',()=>{save();render();});form.addEventListener('submit',event=>{event.preventDefault();const sheet=current();if(!sheet.id)sheet.id=crypto.randomUUID();const index=state.sheets.findIndex(item=>item.id===sheet.id);if(index<0)state.sheets.push(sheet);else state.sheets[index]=sheet;selectedIds.add(sheet.id);activeId=sheet.id;state.current=sheet;SheetStorage.save(state);renderList();});
  $('new-sheet').onclick=()=>put(SheetStorage.blankSheet());document.querySelectorAll('[name=template]').forEach(radio=>radio.onchange=()=>{state.template=radio.value;render();});
  $('sheet-list').addEventListener('change',event=>{const input=event.target.closest('input[data-action="select"]');if(!input)return;if(input.checked)selectedIds.add(input.dataset.id);else selectedIds.delete(input.dataset.id);});
  $('sheet-list').onclick=event=>{const button=event.target.closest('button');if(!button)return;const sheet=state.sheets.find(item=>item.id===button.dataset.id);if(button.dataset.action==='edit')put(sheet);if(button.dataset.action==='copy'){const copy={...sheet,id:crypto.randomUUID()};state.sheets.push(copy);selectedIds.add(copy.id);put(copy);save();}if(button.dataset.action==='delete'&&confirm('このシートを削除しますか？')){state.sheets=state.sheets.filter(item=>item.id!==sheet.id);selectedIds.delete(sheet.id);if(activeId===sheet.id)put(SheetStorage.blankSheet());else render();}};
  $('select-all').onclick=()=>{state.sheets.forEach(sheet=>selectedIds.add(sheet.id));renderList();};$('deselect-all').onclick=()=>{selectedIds.clear();renderList();};
  $('clear-all').onclick=()=>{if(confirm('作成済みシートと編集中の内容をすべて削除しますか？')){state.sheets=[];selectedIds.clear();put(SheetStorage.blankSheet());}};
  $('print-all').onclick=()=>{const selected=state.sheets.filter(sheet=>selectedIds.has(sheet.id));if(!selected.length){alert('印刷対象のシートを1つ以上選択してください。');return;}alert('印刷プレビューで、各シートのレイアウトや文字の収まりを目視で確認してください。');SheetPrint.all(selected,state.template,state.showEventLogo);};$('print-blank').onclick=()=>SheetPrint.blank(state.template,state.showEventLogo,current().bandStyle);
  $('export-svg').onclick=async()=>{const button=$('export-svg');button.disabled=true;button.textContent='SVGを作成中…';try{await SheetSVG.download(current(),state.template,state.showEventLogo);}catch(error){console.error(error);alert('SVGの保存に失敗しました。ページを再読み込みして、もう一度お試しください。');}finally{button.disabled=false;button.textContent='SVGで保存';}};
  let svgPageUrls=[];
  function releaseSvgPages(){svgPageUrls.forEach(url=>URL.revokeObjectURL(url));svgPageUrls=[];}
  window.addEventListener('pagehide',releaseSvgPages);
  $('export-svg-a4').onclick=async()=>{
    const selected=state.sheets.filter(sheet=>selectedIds.has(sheet.id)).map(sheet=>({...sheet}));
    if(!selected.length){alert('出力するシートを1つ以上選択してください。');return;}
    const button=$('export-svg-a4');button.disabled=true;button.textContent='SVGを作成中…';
    try{
      const pages=await SheetSVG.createPages(selected,state.template,state.showEventLogo);
      releaseSvgPages();
      const results=$('svg-pages');results.replaceChildren();
      const message=document.createElement('p');message.className='hint';message.textContent=`${selected.length}枚を${pages.length}ページに配置しました。各ページを保存してください。`;results.append(message);
      const list=document.createElement('ul');
      pages.forEach((source,index)=>{
        const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));svgPageUrls.push(url);
        const item=document.createElement('li');const link=document.createElement('a');link.href=url;
        link.download=`keyboard-sheets-a4-${String(index+1).padStart(2,'0')}.svg`;
        link.textContent=`${index+1}ページ目を保存（${Math.min(4,selected.length-index*4)}枚）`;item.append(link);list.append(item);
      });
      results.append(list);
    }catch(error){console.error(error);alert('4面付けSVGの作成に失敗しました。もう一度お試しください。');}
    finally{button.disabled=false;button.textContent='A4・4面付けSVGを作成';}
  };
  $('export-data').onclick=()=>{const blob=new Blob([JSON.stringify(SheetStorage.exportData(state),null,2)],{type:'application/json'});const link=document.createElement('a');const now=new Date();const pad=value=>String(value).padStart(2,'0');const stamp=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;link.href=URL.createObjectURL(blob);link.download=`keyboard-sheet-generator-${stamp}.json`;link.click();URL.revokeObjectURL(link.href);};
  const importFile=$('import-file');$('import-data').onclick=()=>importFile.click();importFile.onchange=async()=>{const file=importFile.files?.[0];if(!file)return;try{const imported=SheetStorage.importData(await file.text());if(!confirm(`${imported.sheets.length}件のシートを読み込みます。現在のデータは置き換わります。続けますか？`))return;state.schemaVersion=imported.schemaVersion;state.template=imported.template;state.showEventLogo=imported.showEventLogo;state.current=imported.current;state.sheets=imported.sheets;selectedIds.clear();state.sheets.forEach(sheet=>selectedIds.add(sheet.id));activeId=state.current.id||null;const templateRadio=document.querySelector(`[name=template][value="${state.template}"]`);if(templateRadio)templateRadio.checked=true;$('show-event-logo').checked=state.showEventLogo;SheetStorage.save(state);put(state.current);alert('設定をインポートしました。');}catch(error){alert(error.message||'設定のインポートに失敗しました。');}finally{importFile.value='';}};
  $('show-event-logo').onchange=event=>{state.showEventLogo=event.target.checked;render();};
  window.addEventListener('resize',syncPreviewScale);
  const initialTemplate=document.querySelector(`[name=template][value="${state.template}"]`);if(initialTemplate)initialTemplate.checked=true;$('show-event-logo').checked=state.showEventLogo;put(state.current||SheetStorage.blankSheet());
})();
