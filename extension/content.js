// Conservatively mark pages dirty on edits. Only background may decide to close.
(() => {
  let dirty = false;
  function onChange(event) {
    if (!event.isTrusted) return;
    const target = event.target;
    if (!target) return;
    const editable = target.isContentEditable || target.closest?.('input,textarea,select,[contenteditable="true"],form');
    if (!editable || dirty) return;
    dirty = true;
    try {chrome.runtime.sendMessage({type:'DIRTY'}).catch?.(() => {});} catch {}
  }
  document.addEventListener('input',onChange,true);
  document.addEventListener('change',onChange,true);
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type === 'IS_DIRTY') {reply({dirty});return false;}
  });
})();
