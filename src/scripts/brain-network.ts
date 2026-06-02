import * as THREE from 'three';

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

type EdgeRender = {
  sourceId: number;
  targetId: number;
  material: THREE.MeshBasicMaterial;
  points: [THREE.Vector3, THREE.Vector3];
  mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
};

const nodeSizes = new Set<BrainNode['size']>(['small', 'medium', 'large']);
const nodeTones = new Set<BrainNode['tone']>(['cyan', 'dark']);

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
    isFiniteNumber(data.bounds?.height) &&
    Array.isArray(data.nodes) &&
    data.nodes.every(isBrainNode) &&
    Array.isArray(data.edges) &&
    data.edges.every(isBrainEdge)
  );
};

export const mountBrainNetwork = () => {
  const dataElement = document.querySelector<HTMLScriptElement>('#brain-network-data');
  const map = document.querySelector<HTMLElement>('.brain-map');
  const stage = document.querySelector<HTMLElement>('.brain-stage');
  const canvas = document.querySelector<HTMLCanvasElement>('[data-brain-canvas]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!dataElement || !map || !stage || !canvas || canvas.dataset.engine === 'three.js r184') {
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

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-7.2, 7.2, 4.3, -4.3, 0.1, 100);
  const nodeMeshes = new Map<number, THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>();
  const nodeBasePositions = new Map<number, THREE.Vector3>();
  const overlayNodes = new Map<number, HTMLElement>();
  const edgeRenders: EdgeRender[] = [];
  const activeButton = map.querySelector<HTMLElement>('[data-topic-index].is-active');
  let activeId = Number(activeButton?.dataset.topicIndex ?? 0);
  let frameId = 0;
  let isStageVisible = true;
  let isPageVisible = document.visibilityState === 'visible';

  canvas.dataset.engine = 'three.js r184';
  camera.position.set(0, 0, 12);
  scene.add(camera);
  scene.add(new THREE.AmbientLight(0xffffff, 1.85));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(-3, 5, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x79b8ff, 0.9);
  fillLight.position.set(4, -3, 6);
  scene.add(fillLight);

  const nodeScale = {
    small: 0.2,
    medium: 0.28,
    large: 0.44,
  } satisfies Record<BrainNode['size'], number>;

  const accentEdgeKeys = new Set(['0-1', '3-4']);
  const edgeRadius = 0.027;
  const sceneWidth = 10.9;
  const sceneHeight = 7.1;

  const getEdgeKey = (sourceId: number, targetId: number) => [sourceId, targetId].sort((a, b) => a - b).join('-');

  const nodeColor = (node: BrainNode) => {
    if (node.interactive && node.id === activeId) {
      return 0x35b8f5;
    }

    if (node.tone === 'cyan') {
      return 0x5ccbff;
    }

    return 0x001f5f;
  };

  const toScenePosition = (node: BrainNode) => {
    const x = (node.x / data.bounds.width - 0.5) * sceneWidth;
    const y = (0.5 - node.y / data.bounds.height) * sceneHeight;
    const z = (Math.sin(node.id * 1.37) + Math.cos(node.x * 0.015)) * 0.18;

    return new THREE.Vector3(x, y, z);
  };

  const setEdgeTransform = (
    mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>,
    source: THREE.Vector3,
    target: THREE.Vector3,
  ) => {
    const direction = new THREE.Vector3().subVectors(target, source);
    const midpoint = new THREE.Vector3().addVectors(source, target).multiplyScalar(0.5);
    const length = direction.length();

    mesh.position.copy(midpoint);
    mesh.scale.set(1, length, 1);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  };

  map.querySelectorAll<HTMLElement>('[data-brain-node-id]').forEach((element) => {
    overlayNodes.set(Number(element.dataset.brainNodeId), element);
  });

  data.nodes.forEach((node) => {
    const geometry = new THREE.SphereGeometry(nodeScale[node.size], 32, 18);
    const material = new THREE.MeshStandardMaterial({
      color: nodeColor(node),
      emissive: node.interactive && node.id === activeId ? 0x0f62fe : 0x000000,
      emissiveIntensity: node.interactive && node.id === activeId ? 0.28 : 0,
      metalness: 0.05,
      roughness: 0.36,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const position = toScenePosition(node);

    mesh.position.copy(position);
    nodeBasePositions.set(node.id, position);
    nodeMeshes.set(node.id, mesh);
    scene.add(mesh);
  });

  data.edges.forEach(([sourceId, targetId]) => {
    const source = nodeBasePositions.get(sourceId);
    const target = nodeBasePositions.get(targetId);

    if (!source || !target) {
      return;
    }

    const isAccent = accentEdgeKeys.has(getEdgeKey(sourceId, targetId));
    const material = new THREE.MeshBasicMaterial({
      color: isAccent ? 0x35b8f5 : 0x001f5f,
      transparent: true,
      opacity: sourceId === activeId || targetId === activeId ? 0.92 : 0.74,
    });
    const geometry = new THREE.CylinderGeometry(edgeRadius, edgeRadius, 1, 12);
    const mesh = new THREE.Mesh(geometry, material);

    setEdgeTransform(mesh, source, target);

    edgeRenders.push({
      sourceId,
      targetId,
      material,
      points: [source.clone(), target.clone()],
      mesh,
    });
    scene.add(mesh);
  });

  const updateHighlights = () => {
    data.nodes.forEach((node) => {
      const mesh = nodeMeshes.get(node.id);

      if (!mesh) {
        return;
      }

      const isActive = node.id === activeId;
      mesh.material.color.setHex(nodeColor(node));
      mesh.material.emissive.setHex(isActive ? 0x0f62fe : 0x000000);
      mesh.material.emissiveIntensity = isActive ? 0.3 : 0;
      mesh.scale.setScalar(isActive ? 1.24 : 1);
    });

    edgeRenders.forEach((edge) => {
      const isConnected = edge.sourceId === activeId || edge.targetId === activeId;
      const isAccent = accentEdgeKeys.has(getEdgeKey(edge.sourceId, edge.targetId));
      edge.material.color.setHex(isAccent ? 0x35b8f5 : 0x001f5f);
      edge.material.opacity = isConnected ? 0.92 : 0.72;
    });
  };

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const aspect = width / height;
    const viewHeight = 8.5;
    const viewWidth = viewHeight * aspect;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height, false);
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    updateOverlayPositions();
    renderer.render(scene, camera);
  };

  const updateOverlayPositions = () => {
    const worldPosition = new THREE.Vector3();

    overlayNodes.forEach((element, id) => {
      const mesh = nodeMeshes.get(id);

      if (!mesh) {
        return;
      }

      mesh.getWorldPosition(worldPosition);
      worldPosition.project(camera);
      element.style.setProperty('--x', `${((worldPosition.x + 1) / 2) * 100}%`);
      element.style.setProperty('--y', `${((-worldPosition.y + 1) / 2) * 100}%`);
    });
  };

  const renderFrame = (time: number) => {
    const seconds = time * 0.001;

    data.nodes.forEach((node) => {
      const mesh = nodeMeshes.get(node.id);
      const base = nodeBasePositions.get(node.id);

      if (!mesh || !base) {
        return;
      }

      const float = Math.sin(seconds * 0.48 + node.id * 0.62) * 0.12;
      const drift = Math.cos(seconds * 0.36 + node.id * 0.43) * 0.06;
      mesh.position.set(base.x + drift, base.y + float, base.z + float * 1.35);
    });

    edgeRenders.forEach((edge) => {
      const source = nodeMeshes.get(edge.sourceId);
      const target = nodeMeshes.get(edge.targetId);

      if (!source || !target) {
        return;
      }

      edge.points[0].copy(source.position);
      edge.points[1].copy(target.position);
      setEdgeTransform(edge.mesh, edge.points[0], edge.points[1]);
    });

    scene.rotation.x = Math.sin(seconds * 0.18) * 0.018;
    scene.rotation.y = Math.cos(seconds * 0.15) * 0.026;
    scene.updateMatrixWorld();
    updateOverlayPositions();
    renderer.render(scene, camera);

    if (isStageVisible && isPageVisible) {
      frameId = window.requestAnimationFrame(renderFrame);
    } else {
      frameId = 0;
    }
  };

  const startAnimation = () => {
    if (prefersReducedMotion || frameId || !isStageVisible || !isPageVisible) {
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

  map.addEventListener('brain-topic-change', (event) => {
    const detail = (event as CustomEvent<{ activeId: number }>).detail;

    if (typeof detail?.activeId !== 'number') {
      return;
    }

    activeId = detail.activeId;
    updateHighlights();

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
    }
  });

  document.addEventListener('visibilitychange', () => {
    isPageVisible = document.visibilityState === 'visible';

    if (isPageVisible) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });

  updateHighlights();
  resize();
  stage.classList.add('is-three-ready');

  if (prefersReducedMotion) {
    renderer.render(scene, camera);
  } else {
    startAnimation();
  }

  window.addEventListener('pagehide', () => {
    stopAnimation();

    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    renderer.dispose();
  });
};
