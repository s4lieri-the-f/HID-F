<script lang="ts">
  import type { Connection as ConnectionType, Node } from '../types/nodes.js';
  import { createEventDispatcher } from 'svelte';
  import { calculateConnectionPath, getConnectionPoints, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../utils/pathCalculation.js';

  export let connection: ConnectionType;
  export let nodes: Node[];
  export let selected = false;
  export let draggedNodeId: string | null = null;
  export let currentDragPosition: { x: number; y: number } | null = null;

  const dispatch = createEventDispatcher();
  
  let isHovered = false;
  let hoverTimeout: number | null = null;

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dispatch('select', { connection, event: e });
  }

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    dispatch('delete', { connection });
  }

  function handleMouseEnter() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    isHovered = true;
  }

  function handleMouseLeave() {
    hoverTimeout = setTimeout(() => {
      isHovered = false;
    }, 100);
  }

  function getDeleteButtonPosition(fromNode: Node | null, toNode: Node | null): { x: number; y: number } {
    if (!fromNode || !toNode) return { x: 0, y: 0 };
    
    const { from, to } = getConnectionPoints(fromNode, toNode);
    return {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2
    };
  }

  function getEffectiveNode(nodeId: string): Node | null {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    
    if (draggedNodeId === nodeId && currentDragPosition) {
      return {
        ...node,
        x: currentDragPosition.x,
        y: currentDragPosition.y
      };
    }
    
    return node;
  }

  function getConnectionStyle() {
    if (selected) {
      return {
        stroke: '#ff4444',
        strokeWidth: '3',
        opacity: '1'
      };
    } else if (isHovered) {
      return {
        stroke: '#ff6666',
        strokeWidth: '2.5',
        opacity: '0.9'
      };
    } else {
      return {
        stroke: '#ff8888',
        strokeWidth: '2',
        opacity: '0.7'
      };
    }
  }

  function getArrowStyle() {
    if (selected) {
      return '#ff4444';
    } else if (isHovered) {
      return '#ff6666';
    } else {
      return '#ff8888';
    }
  }

  $: fromNode = getEffectiveNode(connection.from);
  $: toNode = getEffectiveNode(connection.to);
  $: pathData = fromNode && toNode ? calculateConnectionPath(fromNode, toNode, nodes) : '';
  $: deleteButtonPos = getDeleteButtonPosition(fromNode, toNode);
  $: connectionStyle = getConnectionStyle();
  $: arrowColor = getArrowStyle();
</script>

<g 
  class="connection-group" 
  on:mouseenter={handleMouseEnter} 
  on:mouseleave={handleMouseLeave}
  on:click={handleClick}
  on:mousedown={handleClick}
  style="pointer-events: auto; cursor: pointer;"
>
  <defs>
    <marker
      id="arrowhead-{connection.id}"
      markerWidth="10"
      markerHeight="8"
      refX="9"
      refY="4"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <polygon
        points="0 0, 10 4, 0 8"
        fill={arrowColor}
        class="transition-colors duration-200"
      />
    </marker>
    
    {#if selected}
      <filter id="glow-{connection.id}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    {/if}
  </defs>

  <path
    d={pathData}
    stroke={connectionStyle.stroke}
    stroke-width={connectionStyle.strokeWidth}
    fill="none"
    marker-end="url(#arrowhead-{connection.id})"
    opacity={connectionStyle.opacity}
    class="connection-path cursor-pointer transition-all duration-200"
    style={selected ? 'filter: url(#glow-{connection.id})' : ''}
    on:click={handleClick}
    on:mousedown={handleClick}
  />
  
  <path
    d={pathData}
    stroke="transparent"
    stroke-width="16"
    fill="none"
    class="cursor-pointer"
    on:click={handleClick}
    on:mousedown={handleClick}
  />

  {#if selected && fromNode && toNode}
    <g class="delete-button">
      <circle
        cx={deleteButtonPos.x}
        cy={deleteButtonPos.y}
        r="12"
        fill="rgba(255, 68, 68, 0.2)"
        class="transition-opacity duration-200"
      />
      <circle
        cx={deleteButtonPos.x}
        cy={deleteButtonPos.y}
        r="8"
        fill="#ff4444"
        stroke="#ffffff"
        stroke-width="2"
        class="cursor-pointer hover:fill-red-300 hover:scale-110 transition-all duration-200"
        on:click={handleDelete}
      />
      <text
        x={deleteButtonPos.x}
        y={deleteButtonPos.y}
        text-anchor="middle"
        dominant-baseline="central"
        fill="white"
        font-size="12"
        font-weight="bold"
        class="cursor-pointer pointer-events-none select-none"
      >×</text>
    </g>
  {/if}

  {#if isHovered && !selected}
    <circle
      cx={deleteButtonPos.x}
      cy={deleteButtonPos.y}
      r="6"
      fill="rgba(255, 102, 102, 0.3)"
      class="transition-opacity duration-200"
    />
  {/if}
</g>

<style>
  .connection-path {
    transition: all 0.2s ease;
  }
  
  .delete-button {
    transition: all 0.2s ease;
  }
  
  .connection-group {
    cursor: pointer;
  }
  
  .connection-group:hover .connection-path {
    filter: drop-shadow(0 0 4px rgba(255, 102, 102, 0.5));
  }
</style>
