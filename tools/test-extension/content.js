// Newgen test extension — proves the MV2 loader path works end-to-end.
// Drops a small Win95-styled badge into the bottom-right corner of every page.
(function () {
  if (window.top !== window) return;            // skip inside iframes
  if (document.getElementById('__newgen_test_badge')) return;

  const badge = document.createElement('div');
  badge.id = '__newgen_test_badge';
  badge.textContent = 'NN ext: loaded';
  Object.assign(badge.style, {
    position: 'fixed',
    bottom: '8px',
    right: '8px',
    zIndex: '2147483647',
    padding: '3px 8px',
    fontFamily: 'Tahoma, "MS Sans Serif", sans-serif',
    fontSize: '11px',
    color: '#000',
    background: '#c0c0c0',
    borderTop: '2px solid #fff',
    borderLeft: '2px solid #fff',
    borderRight: '2px solid #000',
    borderBottom: '2px solid #000',
    boxShadow: '2px 2px 0 rgba(0,0,0,0.4)',
    pointerEvents: 'auto',
    cursor: 'default',
    userSelect: 'none',
  });
  badge.title = 'Newgen test extension is running. Click to dismiss.';
  badge.addEventListener('click', () => badge.remove());

  const attach = () => document.body && document.body.appendChild(badge);
  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach, { once: true });
})();
