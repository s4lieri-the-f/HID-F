import type { Node } from '../types/nodes.js';

export interface Point {
  x: number;
  y: number;
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ConnectionPath {
  path: string;
  controlPoints: Point[];
  length: number;
}

export const DEFAULT_NODE_WIDTH = 112;
export const DEFAULT_NODE_HEIGHT = 50;
export const CONNECTION_MARGIN = 15;
export const MIN_CURVE_RADIUS = 30;
export const MAX_CURVE_RADIUS = 80;

export function getNodeBounds(node: Node): NodeBounds {
  return {
    x: node.x,
    y: node.y,
    width: node.width || DEFAULT_NODE_WIDTH,
    height: node.height || DEFAULT_NODE_HEIGHT
  };
}

export function getConnectionPoints(fromNode: Node, toNode: Node): { from: Point; to: Point } {
  const fromBounds = getNodeBounds(fromNode);
  const toBounds = getNodeBounds(toNode);
  
  const fromCenterX = fromBounds.x + fromBounds.width / 2;
  const fromPoint: Point = {
    x: fromCenterX,
    y: fromBounds.y + fromBounds.height + 6
  };
  
  const toCenterX = toBounds.x + toBounds.width / 2;
  const toPoint: Point = {
    x: toCenterX,
    y: toBounds.y - 6
  };
  
  return { from: fromPoint, to: toPoint };
}

export function lineIntersectsRect(
  lineStart: Point,
  lineEnd: Point,
  rect: NodeBounds,
  margin: number = CONNECTION_MARGIN
): boolean {
  const expandedRect = {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2
  };

  const left = expandedRect.x;
  const right = expandedRect.x + expandedRect.width;
  const top = expandedRect.y;
  const bottom = expandedRect.y + expandedRect.height;

  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx !== 0) {
    const t_left = (left - lineStart.x) / dx;
    if (t_left >= 0 && t_left <= 1) {
      const y = lineStart.y + t_left * dy;
      if (y >= top && y <= bottom) return true;
    }
    
    const t_right = (right - lineStart.x) / dx;
    if (t_right >= 0 && t_right <= 1) {
      const y = lineStart.y + t_right * dy;
      if (y >= top && y <= bottom) return true;
    }
  }

  if (dy !== 0) {
    const t_top = (top - lineStart.y) / dy;
    if (t_top >= 0 && t_top <= 1) {
      const x = lineStart.x + t_top * dx;
      if (x >= left && x <= right) return true;
    }
    
    const t_bottom = (bottom - lineStart.y) / dy;
    if (t_bottom >= 0 && t_bottom <= 1) {
      const x = lineStart.x + t_bottom * dx;
      if (x >= left && x <= right) return true;
    }
  }

  return false;
}

export function checkPathCollision(
  fromPoint: Point,
  toPoint: Point,
  nodes: Node[],
  excludeNodeIds: string[]
): boolean {
  for (const node of nodes) {
    if (excludeNodeIds.includes(node.id)) continue;
    
    const bounds = getNodeBounds(node);
    if (lineIntersectsRect(fromPoint, toPoint, bounds)) {
      return true;
    }
  }
  return false;
}

export function calculateConnectionPath(
  fromNode: Node,
  toNode: Node,
  allNodes: Node[]
): string {
  const { from, to } = getConnectionPoints(fromNode, toNode);
  const excludeNodes = [fromNode.id, toNode.id];
  
  const pathOptions = calculatePathOptions(from, to, allNodes, excludeNodes);
  const bestPath = selectBestPath(pathOptions, from, to);
  
  
  return bestPath.path;
}

function calculatePathOptions(
  from: Point,
  to: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): ConnectionPath[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const isUpward = dy < 0;
  
  const options: ConnectionPath[] = [];
  
  if (!checkPathCollision(from, to, allNodes, excludeNodeIds)) {
    if (!isUpward || distance < 100) {
      options.push({
        path: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
        controlPoints: [],
        length: distance
      });
    }
  }
  
  const sPath = calculateSPath(from, to, allNodes, excludeNodeIds);
  if (sPath) options.push(sPath);
  
  const altSPath = calculateAlternativeSPath(from, to, allNodes, excludeNodeIds);
  if (altSPath) options.push(altSPath);
  return options;
}

function calculateLShapedPath(
  from: Point,
  to: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): ConnectionPath | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  const midX = to.x;
  const midY = from.y;
  const midPoint = { x: midX, y: midY };
  
  if (!checkPathCollision(from, midPoint, allNodes, excludeNodeIds) &&
      !checkPathCollision(midPoint, to, allNodes, excludeNodeIds)) {
    const path = `M ${from.x} ${from.y} L ${midX} ${midY} L ${to.x} ${to.y}`;
    return {
      path,
      controlPoints: [midPoint],
      length: Math.abs(dx) + Math.abs(dy)
    };
  }
  
  const midX2 = from.x;
  const midY2 = to.y;
  const midPoint2 = { x: midX2, y: midY2 };
  
  if (!checkPathCollision(from, midPoint2, allNodes, excludeNodeIds) &&
      !checkPathCollision(midPoint2, to, allNodes, excludeNodeIds)) {
    const path = `M ${from.x} ${from.y} L ${midX2} ${midY2} L ${to.x} ${to.y}`;
    return {
      path,
      controlPoints: [midPoint2],
      length: Math.abs(dx) + Math.abs(dy)
    };
  }
  
  return null;
}

function calculateUShapedPath(
  from: Point,
  to: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): ConnectionPath | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  const offset = Math.max(40, Math.abs(dx) * 0.3);
  const midY = Math.min(from.y, to.y) - offset;
  
  const p1 = { x: from.x, y: midY };
  const p2 = { x: to.x, y: midY };
  
  if (!checkPathCollision(from, p1, allNodes, excludeNodeIds) &&
      !checkPathCollision(p1, p2, allNodes, excludeNodeIds) &&
      !checkPathCollision(p2, to, allNodes, excludeNodeIds)) {
    const path = `M ${from.x} ${from.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${to.x} ${to.y}`;
    return {
      path,
      controlPoints: [p1, p2],
      length: Math.abs(from.y - midY) + Math.abs(dx) + Math.abs(to.y - midY)
    };
  }
  
  return null;
}

function calculateCurvedPath(
  from: Point,
  to: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): ConnectionPath | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const curveRadius = Math.min(MAX_CURVE_RADIUS, Math.max(MIN_CURVE_RADIUS, distance * 0.4));
  
  const perpX = -dy / distance;
  const perpY = dx / distance;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  const controlX = midX + perpX * curveRadius;
  const controlY = midY + perpY * curveRadius;
  
  if (!checkCurveCollision(from, to, { x: controlX, y: controlY }, allNodes, excludeNodeIds)) {
    const cp1X = from.x + dx * 0.3 + (controlX - midX) * 0.3;
    const cp1Y = from.y + dy * 0.3 + (controlY - midY) * 0.3;
    const cp2X = to.x - dx * 0.3 + (controlX - midX) * 0.3;
    const cp2Y = to.y - dy * 0.3 + (controlY - midY) * 0.3;
    
    const path = `M ${from.x} ${from.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${to.x} ${to.y}`;
    return {
      path,
      controlPoints: [{ x: controlX, y: controlY }],
      length: distance * 1.2
    };
  }
  
  return null;
}

function calculateAlternativeCurvedPath(
  from: Point,
  to: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): ConnectionPath | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const curveRadius = Math.min(MAX_CURVE_RADIUS, Math.max(MIN_CURVE_RADIUS, distance * 0.4));
  
  // Try left curve
  const perpX = dy / distance;
  const perpY = -dx / distance;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  const controlX = midX + perpX * curveRadius;
  const controlY = midY + perpY * curveRadius;
  
  if (!checkCurveCollision(from, to, { x: controlX, y: controlY }, allNodes, excludeNodeIds)) {
    const cp1X = from.x + dx * 0.3 + (controlX - midX) * 0.3;
    const cp1Y = from.y + dy * 0.3 + (controlY - midY) * 0.3;
    const cp2X = to.x - dx * 0.3 + (controlX - midX) * 0.3;
    const cp2Y = to.y - dy * 0.3 + (controlY - midY) * 0.3;
    
    const path = `M ${from.x} ${from.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${to.x} ${to.y}`;
    return {
      path,
      controlPoints: [{ x: controlX, y: controlY }],
      length: distance * 1.2
    };
  }
  
  return null;
}

function selectBestPath(pathOptions: ConnectionPath[], from: Point, to: Point): ConnectionPath {
  if (pathOptions.length === 0) {
    return {
      path: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
      controlPoints: [],
      length: Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
    };
  }
  
  const directPaths = pathOptions.filter(path => path.controlPoints.length === 0);
  if (directPaths.length > 0) {
    return directPaths[0];
  }
  
  const sPaths = pathOptions.filter(path => path.controlPoints.length >= 4);
  if (sPaths.length > 0) {
    return sPaths.reduce((best, current) => 
      current.length < best.length ? current : best
    );
  }
  
  return pathOptions.reduce((best, current) => 
    current.length < best.length ? current : best
  );
}

function checkCurveCollision(
  from: Point,
  to: Point,
  control: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): boolean {
  const samples = 20;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const curvePoint = sampleQuadraticCurve(from, control, to, t);
    
    for (const node of allNodes) {
      if (excludeNodeIds.includes(node.id)) continue;
      
      const bounds = getNodeBounds(node);
      const margin = CONNECTION_MARGIN;
      
      if (
        curvePoint.x >= bounds.x - margin &&
        curvePoint.x <= bounds.x + bounds.width + margin &&
        curvePoint.y >= bounds.y - margin &&
        curvePoint.y <= bounds.y + bounds.height + margin
      ) {
        return true;
      }
    }
  }
  return false;
}

function calculateSPath(
  from: Point,
  to: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): ConnectionPath | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  const distance = Math.sqrt(dx * dx + dy * dy);
  const baseOffset = Math.max(60, distance * 0.25);
  
  const minVerticalOffset = 20;
  const maxVerticalOffset = 40;
  const verticalOffset = Math.min(maxVerticalOffset, Math.max(minVerticalOffset, distance * 0.1));
  
  const offsets = [baseOffset, baseOffset * 1.2, baseOffset * 1.5, baseOffset * 2];
  
  for (const offset of offsets) {
    const p1 = { x: from.x, y: from.y + verticalOffset };
    const p2 = { x: from.x + offset, y: from.y + verticalOffset };
    const p3 = { x: from.x + offset, y: to.y - verticalOffset };
    const p4 = { x: to.x, y: to.y - verticalOffset };
    
    if (!checkPathCollision(from, p1, allNodes, excludeNodeIds) &&
        !checkPathCollision(p1, p2, allNodes, excludeNodeIds) &&
        !checkPathCollision(p2, p3, allNodes, excludeNodeIds) &&
        !checkPathCollision(p3, p4, allNodes, excludeNodeIds) &&
        !checkPathCollision(p4, to, allNodes, excludeNodeIds)
    ) {
      const path = `M ${from.x} ${from.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${to.x} ${to.y}`;
      return {
        path,
        controlPoints: [p1, p2, p3, p4],
        length: Math.abs(from.y - p1.y) + Math.abs(p1.x - p2.x) + Math.abs(p2.y - p3.y) + Math.abs(p3.x - p4.x)
      };
    }
  }
  return null;
}

function calculateAlternativeSPath(
  from: Point,
  to: Point,
  allNodes: Node[],
  excludeNodeIds: string[]
): ConnectionPath | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  const distance = Math.sqrt(dx * dx + dy * dy);
  const baseOffset = Math.max(60, distance * 0.25);
  
  const minVerticalOffset = 20;
  const maxVerticalOffset = 40;
  const verticalOffset = Math.min(maxVerticalOffset, Math.max(minVerticalOffset, distance * 0.1));
  
  const offsets = [baseOffset, baseOffset * 1.2, baseOffset * 1.5, baseOffset * 2];
  
  for (const offset of offsets) {
    const p1 = { x: from.x, y: from.y + verticalOffset };
    const p2 = { x: from.x - offset, y: from.y + verticalOffset };
    const p3 = { x: from.x - offset, y: to.y - verticalOffset };
    const p4 = { x: to.x, y: to.y - verticalOffset };
    
    if (!checkPathCollision(from, p1, allNodes, excludeNodeIds) &&
        !checkPathCollision(p1, p2, allNodes, excludeNodeIds) &&
        !checkPathCollision(p2, p3, allNodes, excludeNodeIds) &&
        !checkPathCollision(p3, p4, allNodes, excludeNodeIds) &&
        !checkPathCollision(p4, to, allNodes, excludeNodeIds)) {
      const path = `M ${from.x} ${from.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${to.x} ${to.y}`;
      return {
        path,
        controlPoints: [p1, p2, p3, p4],
        length: Math.abs(from.y - p1.y) + Math.abs(p1.x - p2.x) + Math.abs(p2.y - p3.y) + Math.abs(p3.x - p4.x)
      };
    }
  }
  
  return null;
}

function sampleQuadraticCurve(start: Point, control: Point, end: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y
  };
}
