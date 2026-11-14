export function createDemoHost(slot, pattern) {
  let frame = pattern.frames[0];
  let quality = 'polished';
  let mounted;
  let revision = 0;
  let destroyed = false;
  const events = new AbortController();
  const host = document.createElement('section');
  host.className = 'demo-host';
  host.setAttribute('aria-label', '触れる見本');
  const controls = document.createElement('div');
  controls.className = 'demo-controls';
  const frameButtons = [];
  const qualityButtons = [];

  function switchButton(group, label, key, value, buttons, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset[key] = value;
    button.addEventListener('click', action, { signal: events.signal });
    group.append(button);
    buttons.push(button);
  }
  function group(label) {
    const node = document.createElement('div');
    node.className = 'switch-group';
    node.setAttribute('role', 'group');
    node.setAttribute('aria-label', label);
    controls.append(node);
    return node;
  }
  if (pattern.frames.length > 1) {
    const frames = group('見本の枠');
    for (const value of pattern.frames) {
      switchButton(frames, value === 'phone' ? 'スマホ' : 'PC', 'frameSwitch', value, frameButtons, () => {
        if (frame === value) return;
        frame = value;
        refresh();
      });
    }
  }
  const qualities = group('作りの丁寧さ');
  for (const [value, label] of [['rough', '雑'], ['polished', '丁寧']]) {
    switchButton(qualities, label, 'qualitySwitch', value, qualityButtons, () => {
      if (quality === value) return;
      quality = value;
      refresh();
    });
  }
  const shell = document.createElement('div');
  const chrome = document.createElement('div');
  chrome.className = 'frame-chrome';
  chrome.setAttribute('aria-hidden', 'true');
  const viewport = document.createElement('div');
  viewport.dataset.role = 'viewport';
  shell.append(chrome, viewport);
  host.append(controls, shell);
  slot.replaceChildren(host);

  async function refresh() {
    const current = ++revision;
    mounted?.unmount();
    mounted = undefined;
    viewport.replaceChildren();
    for (const button of frameButtons) button.setAttribute('aria-pressed', String(button.dataset.frameSwitch === frame));
    for (const button of qualityButtons) button.setAttribute('aria-pressed', String(button.dataset.qualitySwitch === quality));
    shell.className = `demo-frame frame-${frame}`;
    chrome.textContent = frame === 'phone' ? '9:41　 ●●●　 ▰' : '● ● ●　 UI図鑑の見本';
    const options = { frame, quality };
    try {
      const demo = await import(`../demos/${pattern.id}.js`);
      // 同じimportを待つ古いrefreshや、取り外されたカードは組み込まない。
      if (destroyed || current !== revision) return;
      mounted = demo.mount(viewport, options);
    } catch {
      if (destroyed || current !== revision) return;
      const message = document.createElement('p');
      message.className = 'demo-placeholder';
      message.textContent = '準備中';
      viewport.replaceChildren(message);
    }
  }
  void refresh();
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      revision++;
      events.abort();
      mounted?.unmount();
      mounted = undefined;
      host.remove();
    },
  };
}
