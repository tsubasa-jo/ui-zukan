// ?fixture=1 からだけ開く、組み込みと取り外しを確かめる見本。
export function mount(viewport, options) {
  const node = document.createElement('p');
  node.dataset.mounted = '';
  node.dataset.quality = options.quality;
  node.dataset.frame = options.frame;
  node.textContent = 'テスト用の見本';
  viewport.append(node);
  window.__fixtureMounts = (window.__fixtureMounts ?? 0) + 1;
  let active = true;
  return {
    unmount() {
      if (!active) return;
      active = false;
      node.remove();
      window.__fixtureMounts--;
    },
  };
}
