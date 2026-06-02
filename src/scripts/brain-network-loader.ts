const stage = document.querySelector<HTMLElement>('.brain-stage');

if (stage) {
  let didLoad = false;

  const loadBrainNetwork = async () => {
    if (didLoad) {
      return;
    }

    didLoad = true;
    const { mountBrainNetwork } = await import('./brain-network');
    mountBrainNetwork();
  };

  if (!('IntersectionObserver' in window)) {
    globalThis.setTimeout(loadBrainNetwork, 0);
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();
        loadBrainNetwork();
      },
      {
        rootMargin: '0px',
        threshold: 0.01,
      },
    );

    observer.observe(stage);
  }
}
