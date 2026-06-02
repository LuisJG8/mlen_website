type BrainNode = {
  id: number;
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
  tone: 'cyan' | 'dark';
  interactive: boolean;
};

type BrainData = {
  bounds: {
    width: number;
    height: number;
  };
  nodes: BrainNode[];
  edges: [number, number][];
};

type RenderMetrics = {
  cssHeight: number;
  cssWidth: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

type RenderNode = BrainNode & {
  renderRadius: number;
  renderX: number;
  renderY: number;
};

const nodeSizes = new Set<BrainNode['size']>(['small', 'medium', 'large']);
const nodeTones = new Set<BrainNode['tone']>(['cyan', 'dark']);
const accentEdgeKeys = new Set(['0-1', '3-4']);
const nodeRadius = {
  small: 13,
  medium: 20,
  large: 31,
} satisfies Record<BrainNode['size'], number>;

const colors = {
  active: '#35b8f5',
  cyan: '#5ccbff',
  dark: '#001f5f',
  focus: '#0f62fe',
  white: 'rgba(255, 255, 255, 0.88)',
};

const maxPixelRatio = 1.5;
const targetFrameInterval = 1000 / 30;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isBrainNode = (value: unknown): value is BrainNode => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const node = value as Record<string, unknown>;

  return (
    isFiniteNumber(node.id) &&
    isFiniteNumber(node.x) &&
    isFiniteNumber(node.y) &&
    typeof node.size === 'string' &&
    nodeSizes.has(node.size as BrainNode['size']) &&
    typeof node.tone === 'string' &&
    nodeTones.has(node.tone as BrainNode['tone']) &&
    typeof node.interactive === 'boolean'
  );
};

const isBrainEdge = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

const isBrainData = (value: unknown): value is BrainData => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as {
    bounds?: { width?: unknown; height?: unknown };
    nodes?: unknown;
    edges?: unknown;
  };

  return (
    Boolean(data.bounds) &&
    isFiniteNumber(data.bounds?.width) &&
    data.bounds.width > 0 &&
    isFiniteNumber(data.bounds?.height) &&
    data.bounds.height > 0 &&
    Array.isArray(data.nodes) &&
    data.nodes.every(isBrainNode) &&
    Array.isArray(data.edges) &&
    data.edges.every(isBrainEdge)
  );
};

const getEdgeKey = (sourceId: number, targetId: number) => [sourceId, targetId].sort((a, b) => a - b).join('-');

const getNodeColor = (node: BrainNode, activeId: number) => {
  if (node.interactive && node.id === activeId) {
    return colors.active;
  }

  return node.tone === 'cyan' ? colors.cyan : colors.dark;
};

export const mountBrainNetwork = () => {
  const dataElement = document.querySelector<HTMLScriptElement>('#brain-network-data');
  const map = document.querySelector<HTMLElement>('.brain-map');
  const stage = document.querySelector<HTMLElement>('.brain-stage');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-brain-canvas]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!dataElement || !map || !stage || !canvas || canvas.dataset.engine === '2d-canvas') {
    return;
  }

  let data: BrainData;

  try {
    const parsedData = JSON.parse(dataElement.textContent || '{}') as unknown;

    if (!isBrainData(parsedData)) {
      return;
    }

    data = parsedData;
  } catch {
    return;
  }

  const context = canvas.getContext('2d', { alpha: true });

  if (!context) {
    return;
  }

  const overlayNodes = new Map<number, HTMLElement>();
  const activeButton = map.querySelector<HTMLElement>('[data-topic-index].is-active');
  let activeId = Number(activeButton?.dataset.topicIndex ?? 0);
  let frameId = 0;
  let isDisposed = false;
  let isPageVisible = document.visibilityState === 'visible';
  let isStageVisible = true;
  let lastFrameTime = 0;
  let metrics: RenderMetrics = {
    cssHeight: 1,
    cssWidth: 1,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };

  canvas.dataset.engine = '2d-canvas';

  map.querySelectorAll<HTMLElement>('[data-brain-node-id]').forEach((element) => {
    overlayNodes.set(Number(element.dataset.brainNodeId), element);
  });

  const getRenderNodes = (time: number) => {
    const seconds = time * 0.001;

    return data.nodes.map((node): RenderNode => {
      const float = prefersReducedMotion ? 0 : Math.sin(seconds * 0.48 + node.id * 0.62) * 8;
      const drift = prefersReducedMotion ? 0 : Math.cos(seconds * 0.36 + node.id * 0.43) * 4;
      const isActive = node.id === activeId;

      return {
        ...node,
        renderRadius: nodeRadius[node.size] * (isActive ? 1.18 : 1),
        renderX: node.x + drift,
        renderY: node.y + float,
      };
    });
  };

  const toCanvasX = (x: number) => metrics.offsetX + x * metrics.scale;
  const toCanvasY = (y: number) => metrics.offsetY + y * metrics.scale;

  const updateOverlayPositions = (renderNodes: RenderNode[]) => {
    renderNodes.forEach((node) => {
      const element = overlayNodes.get(node.id);

      if (!element) {
        return;
      }

      element.style.setProperty('--x', `${(toCanvasX(node.renderX) / metrics.cssWidth) * 100}%`);
      element.style.setProperty('--y', `${(toCanvasY(node.renderY) / metrics.cssHeight) * 100}%`);
    });
  };

  const drawLine = (source: RenderNode, target: RenderNode) => {
    const isConnected = source.id === activeId || target.id === activeId;
    const isAccent = accentEdgeKeys.has(getEdgeKey(source.id, target.id));

    context.beginPath();
    context.moveTo(toCanvasX(source.renderX), toCanvasY(source.renderY));
    context.lineTo(toCanvasX(target.renderX), toCanvasY(target.renderY));
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = (isConnected ? 5 : 4) * metrics.scale;
    context.globalAlpha = isConnected ? 0.94 : isAccent ? 0.88 : 0.72;
    context.strokeStyle = isConnected || isAccent ? colors.active : colors.dark;
    context.stroke();
  };

  const drawNode = (node: RenderNode) => {
    const x = toCanvasX(node.renderX);
    const y = toCanvasY(node.renderY);
    const radius = node.renderRadius * metrics.scale;
    const isActive = node.id === activeId;

    context.globalAlpha = 1;

    if (isActive) {
      context.beginPath();
      context.arc(x, y, radius + 8 * metrics.scale, 0, Math.PI * 2);
      context.fillStyle = 'rgba(53, 184, 245, 0.16)';
      context.fill();
    }

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = getNodeColor(node, activeId);
    context.fill();
    context.lineWidth = 3 * metrics.scale;
    context.strokeStyle = colors.white;
    context.stroke();

    if (isActive) {
      context.beginPath();
      context.arc(x, y, radius * 0.42, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.22)';
      context.fill();
    }
  };

  const draw = (time = performance.now()) => {
    if (isDisposed) {
      return;
    }

    const renderNodes = getRenderNodes(time);
    const renderNodeById = new Map(renderNodes.map((node) => [node.id, node]));

    context.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);
    context.save();

    data.edges.forEach(([sourceId, targetId]) => {
      const source = renderNodeById.get(sourceId);
      const target = renderNodeById.get(targetId);

      if (!source || !target) {
        return;
      }

      drawLine(source, target);
    });

    renderNodes.forEach(drawNode);
    context.restore();
    updateOverlayPositions(renderNodes);
  };

  const resize = () => {
    if (isDisposed) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);

    canvas.width = Math.floor(cssWidth * pixelRatio);
    canvas.height = Math.floor(cssHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const scale = Math.min(cssWidth / data.bounds.width, cssHeight / data.bounds.height);

    metrics = {
      cssHeight,
      cssWidth,
      offsetX: (cssWidth - data.bounds.width * scale) / 2,
      offsetY: (cssHeight - data.bounds.height * scale) / 2,
      scale,
    };

    draw();
  };

  const renderFrame = (time: number) => {
    if (isDisposed) {
      frameId = 0;
      return;
    }

    if (time - lastFrameTime >= targetFrameInterval) {
      lastFrameTime = time;
      draw(time);
    }

    if (isStageVisible && isPageVisible) {
      frameId = window.requestAnimationFrame(renderFrame);
    } else {
      frameId = 0;
    }
  };

  const startAnimation = () => {
    if (isDisposed || prefersReducedMotion || frameId || !isStageVisible || !isPageVisible) {
      return;
    }

    frameId = window.requestAnimationFrame(renderFrame);
  };

  const stopAnimation = () => {
    if (!frameId) {
      return;
    }

    window.cancelAnimationFrame(frameId);
    frameId = 0;
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      isStageVisible = Boolean(entry?.isIntersecting);

      if (isStageVisible) {
        startAnimation();
      } else {
        stopAnimation();
      }
    },
    {
      rootMargin: '160px 0px',
      threshold: 0.02,
    },
  );
  visibilityObserver.observe(stage);

  const handleTopicChange = (event: Event) => {
    const detail = (event as CustomEvent<{ activeId: number }>).detail;

    if (typeof detail?.activeId !== 'number') {
      return;
    }

    activeId = detail.activeId;
    draw();
  };

  const handleVisibilityChange = () => {
    isPageVisible = document.visibilityState === 'visible';

    if (isPageVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  };

  const cleanup = () => {
    if (isDisposed) {
      return;
    }

    isDisposed = true;
    stopAnimation();

    map.removeEventListener('brain-topic-change', handleTopicChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    context.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);
    delete canvas.dataset.engine;
  };

  const handlePageHide = (event: PageTransitionEvent) => {
    if (event.persisted) {
      return;
    }

    cleanup();
  };

  map.addEventListener('brain-topic-change', handleTopicChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  resize();
  stage.classList.add('is-canvas-ready');

  if (!prefersReducedMotion) {
    startAnimation();
  }

  window.addEventListener('pagehide', handlePageHide);
};
