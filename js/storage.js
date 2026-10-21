(function(){
  const KEY='keyboard-sheet-generator:v1';
  const blankSheet=()=>({id:null,keyboardName:'',exhibitor:'',switchName:'',keycaps:'',feature:'',typing:'',photo:'',description:'',images:[],bandStyle:'original'});
  const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  // Retain UUIDs and legacy simple IDs. IDs are internal references, never markup.
  const validId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id);
  function normalize(value){
    if(!isRecord(value)||(value.schemaVersion!==1&&value.version!==1))return null;
    const sourceSheets=Array.isArray(value.sheets)?value.sheets.filter(isRecord):[];
    const sourceCurrent=isRecord(value.current)?value.current:{};
    // Reserve all existing valid IDs before repairing any row, so a repair cannot
    // take an ID belonging to a later row or to the unsaved editor draft.
    const reserved=new Set(sourceSheets.map(sheet=>sheet.id).filter(validId));
    if(validId(sourceCurrent.id))reserved.add(sourceCurrent.id);
    let sequence=0;
    function freshId(){let id;do{id=`recovered-${++sequence}`;}while(reserved.has(id));reserved.add(id);return id;}
    const used=new Set(),references=new Map();
    const normalizeSheet=(sheet,id)=>({...blankSheet(),...sheet,id,bandStyle:SheetBands.normalize(sheet.bandStyle),images:SheetImages.normalize(sheet.images)});
    const sheets=sourceSheets.map(sheet=>{
      const id=validId(sheet.id)&&!used.has(sheet.id)?sheet.id:freshId();
      used.add(id);
      if(typeof sheet.id==='string'&&sheet.id){
        const matches=references.get(sheet.id)||[];
        matches.push(id);references.set(sheet.id,matches);
      }
      return normalizeSheet(sheet,id);
    });
    let currentId=null;
    if(sourceCurrent.id!=null&&sourceCurrent.id!==''){
      const matches=references.get(sourceCurrent.id)||[];
      // An ambiguous duplicate ID must not make saving the draft overwrite an
      // arbitrary saved row. Keep that draft as an independent recoverable copy.
      currentId=matches.length===1?matches[0]:matches.length>1?freshId():validId(sourceCurrent.id)?sourceCurrent.id:freshId();
    }
    return {schemaVersion:1,template:['blank','nagare','tenkey','ttt'].includes(value.template)?value.template:'blank',showEventLogo:value.showEventLogo!==false,current:normalizeSheet(sourceCurrent,currentId),sheets};
  }
  window.SheetStorage={
    blankSheet,
    normalize,
    load(){try{return this.normalize(JSON.parse(localStorage.getItem(KEY)))||{schemaVersion:1,template:'blank',showEventLogo:true,current:blankSheet(),sheets:[]};}catch(e){return {schemaVersion:1,template:'blank',showEventLogo:true,current:blankSheet(),sheets:[]};}},
    save(state){const status=document.getElementById('storage-status');try{localStorage.setItem(KEY,JSON.stringify(this.exportData(state)));if(status)status.hidden=true;return true;}catch(error){if(status){status.hidden=false;status.textContent='ブラウザへの保存ができませんでした。画像を減らすか、データ管理のエクスポートでJSONを保存してください。現在の編集内容は、ページを閉じると失われる可能性があります。';}return false;}},
    exportData(state){return {schemaVersion:1,exportedAt:new Date().toISOString(),template:state.template,showEventLogo:state.showEventLogo,current:state.current,sheets:state.sheets};},
    importData(text){let value;try{value=JSON.parse(text);}catch(e){throw new Error('JSONを読み込めませんでした。');}const normalized=this.normalize(value);if(!normalized)throw new Error('このアプリの設定ファイルではありません。');return normalized;}
  };
})();
