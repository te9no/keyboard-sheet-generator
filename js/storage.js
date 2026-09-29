(function(){
  const KEY='keyboard-sheet-generator:v1';
  const blankSheet=()=>({id:null,keyboardName:'',exhibitor:'',switchName:'',keycaps:'',feature:'',typing:'',photo:'',description:'',images:[],bandStyle:'original'});
  window.SheetStorage={
    blankSheet,
    normalize(value){if(!value||typeof value!=='object'||(value.schemaVersion!==1&&value.version!==1))return null;const sheets=Array.isArray(value.sheets)?value.sheets.filter(sheet=>sheet&&typeof sheet==='object').map(sheet=>({...blankSheet(),...sheet,bandStyle:SheetBands.normalize(sheet.bandStyle),images:SheetImages.normalize(sheet.images),id:typeof sheet.id==='string'&&sheet.id?sheet.id:null})).filter(sheet=>sheet.id):[];return {schemaVersion:1,template:['blank','nagare','tenkey','ttt'].includes(value.template)?value.template:'blank',showEventLogo:value.showEventLogo!==false,current:{...blankSheet(),...(value.current||{}),bandStyle:SheetBands.normalize(value.current?.bandStyle),images:SheetImages.normalize(value.current?.images)},sheets};},
    load(){try{return this.normalize(JSON.parse(localStorage.getItem(KEY)))||{schemaVersion:1,template:'blank',showEventLogo:true,current:blankSheet(),sheets:[]};}catch(e){return {schemaVersion:1,template:'blank',showEventLogo:true,current:blankSheet(),sheets:[]};}},
    save(state){const status=document.getElementById('storage-status');try{localStorage.setItem(KEY,JSON.stringify(this.exportData(state)));if(status)status.hidden=true;return true;}catch(error){if(status){status.hidden=false;status.textContent='ブラウザへの保存ができませんでした。画像を減らすか、データ管理のエクスポートでJSONを保存してください。現在の編集内容は、ページを閉じると失われる可能性があります。';}return false;}},
    exportData(state){return {schemaVersion:1,exportedAt:new Date().toISOString(),template:state.template,showEventLogo:state.showEventLogo,current:state.current,sheets:state.sheets};},
    importData(text){let value;try{value=JSON.parse(text);}catch(e){throw new Error('JSONを読み込めませんでした。');}const normalized=this.normalize(value);if(!normalized)throw new Error('このアプリの設定ファイルではありません。');return normalized;}
  };
})();
