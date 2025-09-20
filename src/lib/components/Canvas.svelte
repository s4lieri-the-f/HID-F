<script lang="ts">
  import type { Node, Connection, DuckyScript } from '../types/nodes.js';
  import { generateNodeId, generateConnectionId } from '../utils/fileOperations.js';
  import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, getConnectionPoints } from '../utils/pathCalculation.js';
  import { createEventDispatcher } from 'svelte';
  import NodeComponent from './Node.svelte';
  import ConnectionComponent from './Connection.svelte';

  export let script: DuckyScript;

  const dispatch = createEventDispatcher();

  let canvas: HTMLDivElement;
  let isDragging = false;
  let isConnecting = false;
  let isPanning = false;
  let draggedNode: Node | null = null;
  let currentDragPosition: { x: number; y: number } | null = null;
  let selectedNodes: Set<string> = new Set();
  let selectedConnections: Set<string> = new Set();
  let connectionStart: Node | null = null;
  let dragStartPos = { x: 0, y: 0 };
  let nodeStartPos = { x: 0, y: 0 };
  let tempConnection: { from: { x: number; y: number }, to: { x: number; y: number } } | null = null;
  let mousePos = { x: 0, y: 0 };
  let canvasOffset = { x: 0, y: 0 };
  let panStartPos = { x: 0, y: 0 };
  let panStartOffset = { x: 0, y: 0 };

  function handleCanvasMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const isEmptySpace = target === canvas || 
                        target.tagName === 'svg' || 
                        target.tagName === 'rect' ||
                        target.classList.contains('canvas') ||
                        target.closest('.canvas') === canvas;
    
    if (isEmptySpace) {
      if (e.button === 0) {
        e.preventDefault();
        isPanning = true;
        panStartPos = { x: e.clientX, y: e.clientY };
        panStartOffset = { ...canvasOffset };
        canvas.style.cursor = 'grabbing';
        
        selectedNodes.clear();
        selectedConnections.clear();
        selectedNodes = selectedNodes;
        selectedConnections = selectedConnections;
      } else if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        isPanning = true;
        panStartPos = { x: e.clientX, y: e.clientY };
        panStartOffset = { ...canvasOffset };
        canvas.style.cursor = 'grabbing';
      }
    }
  }

  function handleCanvasMouseMove(e: MouseEvent) {
    mousePos = { x: e.clientX, y: e.clientY };

    if (isPanning) {
      canvasOffset = {
        x: panStartOffset.x + (e.clientX - panStartPos.x),
        y: panStartOffset.y + (e.clientY - panStartPos.y)
      };
    } else if (isDragging && draggedNode) {
      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left - canvasOffset.x - dragStartPos.x;
      const newY = e.clientY - rect.top - canvasOffset.y - dragStartPos.y;

      const gridSize = 20;
      
      const nodeWidth = draggedNode.width || DEFAULT_NODE_WIDTH;
      const nodeHeight = draggedNode.height || DEFAULT_NODE_HEIGHT;
      
      const connectionX = newX + nodeWidth / 2;
      const connectionY = newY + nodeHeight / 2;
      
      const snappedConnectionX = Math.round(connectionX / gridSize) * gridSize;
      const snappedConnectionY = Math.round(connectionY / gridSize) * gridSize;
      
      const snappedX = snappedConnectionX - nodeWidth / 2;
      const snappedY = snappedConnectionY - nodeHeight / 2;

      currentDragPosition = { x: snappedX, y: snappedY };

      const nodeIndex = script.nodes.findIndex(n => n.id === draggedNode!.id);
      if (nodeIndex !== -1) {
        script.nodes[nodeIndex] = {
          ...script.nodes[nodeIndex],
          x: snappedX,
          y: snappedY
        };
        script = { ...script, nodes: [...script.nodes] };
        dispatch('change', script);
      }
    }

    if (isConnecting && connectionStart) {
      const rect = canvas.getBoundingClientRect();
      
      const nodeWidth = connectionStart.width || DEFAULT_NODE_WIDTH;
      const nodeHeight = connectionStart.height || DEFAULT_NODE_HEIGHT;
      
      const fromConnectionPoint = {
        x: connectionStart.x + nodeWidth / 2,
        y: connectionStart.y + nodeHeight + 6
      };
      
      const toPoint = {
        x: e.clientX - rect.left - canvasOffset.x,
        y: e.clientY - rect.top - canvasOffset.y
      };
      
      tempConnection = {
        from: fromConnectionPoint,
        to: toPoint
      };
    }
  }

  function handleCanvasMouseUp() {
    isDragging = false;
    draggedNode = null;
    currentDragPosition = null;
    
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = 'default';
    }
    
    if (isConnecting) {
      isConnecting = false;
      connectionStart = null;
      tempConnection = null;
    }
  }

  function handleNodeSelect(e: CustomEvent) {
    const { node, event } = e.detail;
    const rect = canvas.getBoundingClientRect();
    
    if (!event.ctrlKey && !event.metaKey) {
      selectedNodes.clear();
      selectedConnections.clear();
    }
    
    selectedNodes.add(node.id);
    selectedNodes = selectedNodes;
    selectedConnections = selectedConnections;

    isDragging = true;
    draggedNode = node;
    dragStartPos = {
      x: event.clientX - rect.left - canvasOffset.x - node.x,
      y: event.clientY - rect.top - canvasOffset.y - node.y
    };
  }

  function handleNodeEdit(e: CustomEvent) {
    const { node } = e.detail;
    dispatch('editNode', { node });
  }

  function handleNodeDimensionsChanged(e: CustomEvent) {
    const { nodeId, width, height } = e.detail;
    const nodeIndex = script.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      script.nodes[nodeIndex] = {
        ...script.nodes[nodeIndex],
        width,
        height
      };
      script = { ...script };
      dispatch('change', script);
    }
  }

  function handleConnectionStart(e: CustomEvent) {
    const { node, event } = e.detail;
    event.stopPropagation();
    isConnecting = true;
    connectionStart = node;
  }

  function handleConnectionEnd(e: CustomEvent) {
    const { node } = e.detail;
    
    if (isConnecting && connectionStart && connectionStart.id !== node.id) {
      const existingConnection = script.connections.find(
        c => c.from === connectionStart!.id && c.to === node.id
      );
      
      if (!existingConnection) {
        const newConnection: Connection = {
          id: generateConnectionId(),
          from: connectionStart!.id,
          to: node.id
        };
        
        script.connections = [...script.connections, newConnection];
        script = { ...script };
        dispatch('change', script);
      }
    }
    
    isConnecting = false;
    connectionStart = null;
    tempConnection = null;
  }

  function handleConnectionSelect(e: CustomEvent) {
    const { connection, event } = e.detail;
    
    if (!event.ctrlKey && !event.metaKey) {
      selectedNodes.clear();
      selectedConnections.clear();
    }
    
    if (selectedConnections.has(connection.id)) {
      selectedConnections.delete(connection.id);
    } else {
      selectedConnections.add(connection.id);
    }
    
    selectedNodes = selectedNodes;
    selectedConnections = selectedConnections;
  }

  function handleConnectionDelete(e: CustomEvent) {
    const { connection } = e.detail;
    script.connections = script.connections.filter(c => c.id !== connection.id);
    selectedConnections.delete(connection.id);
    selectedConnections = selectedConnections;
    script = { ...script };
    dispatch('change', script);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    const isEditingText = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]') ||
      target.closest('input') ||
      target.closest('textarea')
    );

    if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditingText) {
      e.preventDefault();
      
      if (selectedNodes.size > 0) {
        const nodeIds = Array.from(selectedNodes);
        script.nodes = script.nodes.filter(n => !nodeIds.includes(n.id));
        script.connections = script.connections.filter(
          c => !nodeIds.includes(c.from) && !nodeIds.includes(c.to)
        );
        selectedNodes.clear();
        selectedNodes = selectedNodes;
      }
      
      if (selectedConnections.size > 0) {
        const connectionIds = Array.from(selectedConnections);
        script.connections = script.connections.filter(c => !connectionIds.includes(c.id));
        selectedConnections.clear();
        selectedConnections = selectedConnections;
      }
      
      script = { ...script };
      dispatch('change', script);
    }
  }
  function setupEventListeners() {
    document.addEventListener('mousemove', handleCanvasMouseMove);
    document.addEventListener('mouseup', handleCanvasMouseUp);
    document.addEventListener('keydown', handleKeyDown);
  }

  function cleanupEventListeners() {
    document.removeEventListener('mousemove', handleCanvasMouseMove);
    document.removeEventListener('mouseup', handleCanvasMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
  }

  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  
  onMount(() => {
    if (browser) {
      setupEventListeners();
    }
  });
  onDestroy(() => {
    if (browser) {
      cleanupEventListeners();
    }
  });
</script>

<div
  bind:this={canvas}
  class="canvas relative w-full h-full overflow-hidden cursor-default select-none"
  on:mousedown={handleCanvasMouseDown}
  on:keydown={handleKeyDown}
  on:contextmenu={(e) => e.preventDefault()}
  role="application"
  tabindex="0"
  aria-label="HID-F Visual Editor Canvas"
>
  <div class="absolute inset-0">
    <svg width="100%" height="100%">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse" x="{canvasOffset.x % 20}" y="{canvasOffset.y % 20}">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 0, 60, 0.1)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  </div>

  <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 1;">
    <g style="transform: translate({canvasOffset.x}px, {canvasOffset.y}px);">
      {#each script.connections as connection (connection.id)}
        <g class="pointer-events-auto connection-layer" style="pointer-events: auto;">
          <ConnectionComponent
            {connection}
            nodes={script.nodes}
            selected={selectedConnections.has(connection.id)}
            draggedNodeId={draggedNode?.id || null}
            {currentDragPosition}
            on:select={handleConnectionSelect}
            on:delete={handleConnectionDelete}
          />
        </g>
      {/each}

      {#if tempConnection}
        <g class="temp-connection">
          <defs>
            <marker
              id="temp-arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 8 3, 0 6"
                fill="#ff4444"
                opacity="0.7"
              />
            </marker>
          </defs>
          <path
            d="M {tempConnection.from.x} {tempConnection.from.y} L {tempConnection.to.x} {tempConnection.to.y}"
            stroke="#ff4444"
            stroke-width="2"
            fill="none"
            stroke-dasharray="5,5"
            marker-end="url(#temp-arrowhead)"
            class="pointer-events-none"
            opacity="0.8"
          />
        </g>
      {/if}
    </g>
  </svg>

  <div class="absolute inset-0" style="z-index: 2; transform: translate({canvasOffset.x}px, {canvasOffset.y}px);">
    {#each script.nodes as node (node.id)}
      <NodeComponent
        {node}
        selected={selectedNodes.has(node.id)}
        on:select={handleNodeSelect}
        on:edit={handleNodeEdit}
        on:connectionStart={handleConnectionStart}
        on:connectionEnd={handleConnectionEnd}
        on:dimensionsChanged={handleNodeDimensionsChanged}
      />
    {/each}
  </div>

  {#if script.nodes.length === 0}
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center text-red-600 font-mono">
        <p class="cyber-title text-xl cyber-text-glow">[ HID-F PAYLOAD GENERATOR ]</p>
        <p class="mt-3 cyber-label text-red-400">
        <p class="mt-2 cyber-text text-red-500 text-xs">[ DRAG ] | [ CONNECT ] | [ EXECUTE ]</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .canvas {
    min-height: 600px;
  }
  
  .canvas:focus {
    outline: none;
  }
  
  .connection-layer {
    z-index: 1;
  }
  
  .temp-connection {
    z-index: 2;
  }
  
  .connection-layer:hover {
    z-index: 3;
  }
  
  .connection-layer.selected {
    z-index: 4;
  }
</style>
