// signal が abort されたら timer を止める。
export function later(ms, fn, signal) {
  if (signal.aborted) return;
  const cancel = () => clearTimeout(timer);
  const timer = setTimeout(() => {
    signal.removeEventListener('abort', cancel);
    fn();
  }, ms);
  signal.addEventListener('abort', cancel, { once: true });
}

export function containLinks(root, onNavigate, signal) {
  root.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !root.contains(link)) return;
    event.preventDefault();
    onNavigate(link.getAttribute('href'));
  }, { signal });
}

export function reducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}
