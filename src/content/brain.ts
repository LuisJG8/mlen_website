export const brainTopics = [
  {
    title: 'Practical discussions',
    body: 'Bring concrete questions about models, data, evaluation, deployment, and the decisions that shape real ML systems.',
    x: 252,
    y: 222,
    size: 'large',
    tone: 'cyan',
  },
  {
    title: 'Learning & Growth',
    body: 'Build sharper judgment through peer learning, shared resources, project reviews, and practical lessons from real work.',
    x: 353,
    y: 69,
    size: 'small',
    tone: 'cyan',
  },
  {
    title: 'Content and resources',
    body: 'Find papers, implementation notes, guides, talks, and field-tested patterns that are worth coming back to.',
    x: 387,
    y: 290,
    size: 'medium',
    tone: 'cyan',
  },
  {
    title: 'Events',
    body: 'Join talks, meetups, reading groups, demos, and hands-on sessions that turn community discussion into shared context.',
    x: 552,
    y: 170,
    size: 'small',
    tone: 'dark',
  },
  {
    title: 'Agentic ML',
    body: 'Compare notes on AI agents, new tooling, and automated workflows changing how ML systems are built and operated.',
    x: 411,
    y: 148,
    size: 'medium',
    tone: 'dark',
  },
  {
    title: 'Project demos',
    body: 'Show what you are building, get lightweight feedback, and learn from how other builders approach similar tradeoffs.',
    x: 309,
    y: 342,
    size: 'small',
    tone: 'dark',
  },
] as const;

export const brainBounds = {
  width: 714,
  height: 465,
} as const;

export const brainNodes = [
  ...brainTopics.map((topic, index) => ({
    id: index,
    x: topic.x,
    y: topic.y,
    size: topic.size,
    tone: topic.tone,
    interactive: true,
  })),
  { id: 6, x: 126, y: 267, size: 'small', tone: 'cyan', interactive: false },
  { id: 7, x: 151, y: 170, size: 'small', tone: 'dark', interactive: false },
  { id: 8, x: 235, y: 101, size: 'small', tone: 'dark', interactive: false },
  { id: 9, x: 467, y: 101, size: 'small', tone: 'dark', interactive: false },
  { id: 10, x: 517, y: 269, size: 'small', tone: 'dark', interactive: false },
  { id: 11, x: 576, y: 267, size: 'small', tone: 'dark', interactive: false },
  { id: 12, x: 529, y: 326, size: 'small', tone: 'dark', interactive: false },
  { id: 13, x: 416, y: 374, size: 'small', tone: 'dark', interactive: false },
  { id: 14, x: 400, y: 429, size: 'small', tone: 'dark', interactive: false },
  { id: 15, x: 204, y: 319, size: 'small', tone: 'dark', interactive: false },
] as const;

export const brainEdges = [
  [6, 7],
  [7, 8],
  [8, 1],
  [1, 9],
  [9, 3],
  [3, 11],
  [11, 12],
  [12, 13],
  [14, 13],
  [14, 5],
  [6, 15],
  [15, 5],
  [10, 3],
  [10, 11],
  [10, 12],
  [3, 4],
  [4, 9],
  [4, 2],
  [4, 1],
  [2, 13],
  [2, 5],
  [2, 10],
  [0, 2],
  [0, 4],
  [0, 1],
  [0, 8],
  [0, 10],
  [0, 6],
  [0, 7],
  [0, 15],
  [0, 5],
] as const;

export const accentBrainEdges = new Set(['0-1', '3-4']);
export const getBrainEdgeKey = (sourceId: number, targetId: number) =>
  [sourceId, targetId].sort((a, b) => a - b).join('-');
export const brainNodeRadius = {
  small: 13,
  medium: 20,
  large: 31,
} as const;
