// Conservatively mark pages dirty on edits. Only background may decide to close.
(() => {
  if (globalThis.__tabArchiveGuardV1) return; // A legacy tab may already have the guard.
  globalThis.__tabArchiveGuardV1 = true;
  let dirty = false;
  function notifyDirty() {
    if (dirty) return;
    dirty = true;
    try {chrome.runtime.sendMessage({type:'DIRTY'}).catch?.(() => {});} catch {}
  }
  function hasUnsavedForm() {
    try {
      const editors = document.querySelectorAll?.('input,textarea,select,[contenteditable="true"],[role="textbox"]') || [];
      for (const e of editors) {
        if (e.disabled) continue;
        const tag = String(e.tagName || '').toLowerCase();
        const type = String(e.type || '').toLowerCase();
        if (e.isContentEditable || e.getAttribute?.('contenteditable') === 'true' || e.getAttribute?.('role') === 'textbox') return true;
        if (tag === 'textarea' && e.value !== e.defaultValue) return true;
        if (tag === 'input' && !['hidden','button','submit','reset','file','image'].includes(type)) {
          if (['checkbox','radio'].includes(type) ? e.checked !== e.defaultChecked : e.value !== e.defaultValue) return true;
        }
        if (tag === 'select' && [...(e.options || [])].some(o => o.selected !== o.defaultSelected)) return true;
      }
    } catch { return true; } // Unknown editors are not safe to close.
    return false;
  }
  function clean() { if (hasUnsavedForm()) notifyDirty(); return !dirty; }
  function metadata() {
    const items = Array.from(document.querySelectorAll?.('meta') || []).slice(0,120);
    function field(keys,limit) {
      for (const key of keys) for (const item of items) {
        const name=String(item.getAttribute('name') || item.getAttribute('property') || '').toLowerCase();
        if (name!==key) continue;
        const value=String(item.getAttribute('content')||'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim();
        if (value) return value.slice(0,limit);
      }
      return '';
    }
    return {
      title:field(['og:title','twitter:title'],180) || String(document.title||'').trim().slice(0,180),
      description:field(['description','og:description','twitter:description'],400),
      siteName:field(['og:site_name','application-name'],80),
      kind:field(['og:type'],40),
      keywords:field(['keywords'],250).split(',').map(x=>x.trim()).filter(Boolean).slice(0,5),
    };
  }
  function onChange(event) {
    if (!event.isTrusted) return;
    const target = event.target;
    if (!target) return;
    const editable = target.isContentEditable || target.closest?.('input,textarea,select,[contenteditable="true"],form');
    if (!editable) return;
    notifyDirty();
  }
  document.addEventListener('input',onChange,true);
  document.addEventListener('change',onChange,true);
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type === 'IS_DIRTY') {reply({dirty:!clean()});return false;}
    if (message?.type === 'GET_METADATA') {
      // Only the top frame supplies metadata; other frames can still mark their form dirty.
      // A legacy tab may contain a previously edited iframe that cannot be inspected reliably.
      if (!clean() || (message.legacy && document.querySelectorAll?.('iframe')?.length) || (typeof window !== 'undefined' && window !== window.top)) reply({dirty:true});
      else reply({dirty:false,metadata:metadata()});
      return false;
    }
  });
  clean(); // Detect already-edited forms when injected into an old tab.
})();
