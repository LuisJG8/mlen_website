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
const accentEdgeKeys = new Set(['0-1', '0-2', '0-6']);
const nodeRadius = {
  small: 19,
  medium: 25,
  large: 37,
} satisfies Record<BrainNode['size'], number>;

const colors = {
  active: '#35b8f5',
  cyan: '#5ccbff',
  dark: '#001f5f',
  focus: '#0f62fe',
  white: 'rgba(255, 255, 255, 0.88)',
};

const maxPixelRatio = 1.5;
const targetFrameInterval = 1000 / 30 - 2;
const floatAmplitude = 7;
const driftAmplitude = 4;
const stageInsetRatio = 0.07;

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

const getNodeColor = (node: BrainNode) => (node.tone === 'cyan' ? colors.cyan : colors.dark);

export const mountBrainNetwork = () => {
  const dataElement = document.querySelector<HTMLScriptElement>('#brain-network-data');
  const stage = document.querySelector<HTMLElement>('.brain-stage');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-brain-canvas]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!dataElement || !stage || !canvas || canvas.dataset.engine === '2d-canvas') {
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

  const getRenderNodes = (time: number) => {
    const seconds = time * 0.001;

    return data.nodes.map((node): RenderNode => {
      const float = prefersReducedMotion ? 0 : Math.sin(seconds * 0.42 + node.id * 0.62) * floatAmplitude;
      const drift = prefersReducedMotion ? 0 : Math.cos(seconds * 0.32 + node.id * 0.43) * driftAmplitude;

      return {
        ...node,
        renderRadius: nodeRadius[node.size],
        renderX: node.x + drift,
        renderY: node.y + float,
      };
    });
  };

  const toCanvasX = (x: number) => metrics.offsetX + x * metrics.scale;
  const toCanvasY = (y: number) => metrics.offsetY + y * metrics.scale;

  const drawLine = (source: RenderNode, target: RenderNode) => {
    const isAccent = accentEdgeKeys.has(getEdgeKey(source.id, target.id));

    context.beginPath();
    context.moveTo(toCanvasX(source.renderX), toCanvasY(source.renderY));
    context.lineTo(toCanvasX(target.renderX), toCanvasY(target.renderY));
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 4 * metrics.scale;
    context.globalAlpha = isAccent ? 0.9 : 0.76;
    context.strokeStyle = isAccent ? colors.active : colors.dark;
    context.stroke();
  };

  const drawNode = (node: RenderNode) => {
    const x = toCanvasX(node.renderX);
    const y = toCanvasY(node.renderY);
    const radius = node.renderRadius * metrics.scale;

    context.globalAlpha = 1;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = getNodeColor(node);
    context.fill();
    context.lineWidth = 3 * metrics.scale;
    context.strokeStyle = colors.white;
    context.stroke();
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

    const stageInset = cssWidth * stageInsetRatio;
    const drawableWidth = Math.max(1, cssWidth - stageInset * 2);
    const drawableHeight = Math.max(1, cssHeight - stageInset * 2);
    const scale = Math.min(drawableWidth / data.bounds.width, drawableHeight / data.bounds.height);

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

  document.addEventListener('visibilitychange', handleVisibilityChange);

  resize();
  stage.classList.add('is-canvas-ready');

  if (!prefersReducedMotion) {
    startAnimation();
  }

  window.addEventListener('pagehide', handlePageHide);
};
