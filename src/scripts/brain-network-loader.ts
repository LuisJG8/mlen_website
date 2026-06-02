const mountWhenVisible = () => {
  const stage = document.querySelector<HTMLElement>('.brain-stage');

  if (!stage) {
    return;
  }

  let didLoad = false;
  let observer: IntersectionObserver | null = null;
  let timeoutId = 0;

  const cleanup = () => {
    window.removeEventListener('pagehide', cleanup);
    observer?.disconnect();
    observer = null;

    if (timeoutId) {
      globalThis.clearTimeout(timeoutId);
      timeoutId = 0;
    }
  };

  const loadBrainNetwork = async () => {
    if (didLoad) {
      return;
    }

    didLoad = true;
    cleanup();

    const { mountBrainNetwork } = await import('./brain-network');
    mountBrainNetwork();
  };

  window.addEventListener('pagehide', cleanup, { once: true });

  if (!('IntersectionObserver' in window)) {
    timeoutId = globalThis.setTimeout(loadBrainNetwork, 0);
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      void loadBrainNetwork();
    },
    {
      rootMargin: '0px',
      threshold: 0.01,
    },
  );

  observer.observe(stage);
};

mountWhenVisible();
