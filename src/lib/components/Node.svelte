<script lang="ts">
  import type { Node as NodeType } from '../types/nodes.js';
  import { createEventDispatcher } from 'svelte';
  import { Command, Type, Clock, Repeat, GitBranch, Keyboard } from 'lucide-svelte';
  import { onMount, afterUpdate } from 'svelte';

  export let node: NodeType;
  export let selected = false;
  export let hasErrors = false;

  const dispatch = createEventDispatcher();
  
  let nodeElement: HTMLDivElement;
  let actualWidth = 112;
  let actualHeight = 50;

  function handleMouseDown(e: MouseEvent) {
    if (e.button === 0) { 
      e.stopPropagation(); 
      dispatch('select', { node, event: e });
    }
  }

  function handleDoubleClick() {
    dispatch('edit', { node });
  }

  function handleConnectionStart(e: MouseEvent) {
    e.stopPropagation();
    dispatch('connectionStart', { node, event: e });
  }

  function handleConnectionEnd(e: MouseEvent) {
    e.stopPropagation();
    dispatch('connectionEnd', { node, event: e });
  }

  function getNodeIcon(type: string) {
    switch (type) {
      case 'command': return Command;
      case 'key_combination': return Keyboard;
      case 'text_input': return Type;
      case 'delay': return Clock;
      case 'loop': return Repeat;
      case 'condition': return GitBranch;
      default: return Command;
    }
  }

  function getNodeColor(type: string) {
    switch (type) {
      case 'command': return 'bg-red-800';
      case 'key_combination': return 'bg-red-700';
      case 'text_input': return 'bg-red-600';
      case 'delay': return 'bg-red-900';
      case 'loop': return 'bg-red-800';
      case 'condition': return 'bg-red-500';
      default: return 'bg-red-700';
    }
  }

  function getPreviewText(node: NodeType): string {
    switch (node.type) {
      case 'command':
        const cmd = node.command || '[EMPTY]';
        return cmd.length > 20 ? cmd.substring(0, 20) + '...' : cmd;
      case 'key_combination':
        const keys = [...node.modifiers, ...node.keys].join(' + ');
        return keys.length > 0 ? (keys.length > 20 ? keys.substring(0, 20) + '...' : keys) : '[NO KEYS]';
      case 'text_input':
        const txt = node.text || '[EMPTY]';
        return txt.length > 20 ? txt.substring(0, 20) + '...' : txt;
      case 'delay':
        return `${node.duration || 0}ms`;
      case 'loop':
        return `${node.iterations || 1}x`;
      case 'condition':
        const cond = node.condition || '[NO CONDITION]';
        return cond.length > 20 ? cond.substring(0, 20) + '...' : cond;
      default:
        return '[UNKNOWN]';
    }
  }

  function updateNodeDimensions() {
    if (nodeElement) {
      const rect = nodeElement.getBoundingClientRect();
      const newWidth = Math.max(112, Math.ceil(rect.width));
      const newHeight = Math.max(50, Math.ceil(rect.height));
      
      if (newWidth !== actualWidth || newHeight !== actualHeight) {
        actualWidth = newWidth;
        actualHeight = newHeight;
        
        dispatch('dimensionsChanged', {
          nodeId: node.id,
          width: actualWidth,
          height: actualHeight
        });
      }
    }
  }

  onMount(() => {
    updateNodeDimensions();
  });

  afterUpdate(() => {
    updateNodeDimensions();
  });

  $: nodeColor = getNodeColor(node.type);
  $: NodeIcon = getNodeIcon(node.type);
  $: previewText = getPreviewText(node);
  
  $: if (node) {
    updateNodeDimensions();
  }
</script>

<div
  bind:this={nodeElement}
  class="node cyber-node absolute select-none cursor-move min-w-28 transition-all duration-300 {selected ? 'selected' : ''} {hasErrors ? 'error-highlight' : ''}"
  style="left: {node.x}px; top: {node.y}px; z-index: {selected ? 10 : 1}; width: fit-content; min-width: 112px;"
  on:mousedown={handleMouseDown}
  on:dblclick={handleDoubleClick}
  role="button"
  tabindex="0"
>
  <div class="flex items-center space-x-2 p-2 cyber-text cyber-label {nodeColor}">
    <svelte:component this={NodeIcon} size={12} />
    <span class="font-bold text-xs uppercase tracking-wider">{node.label}</span>
  </div>

  <div class="p-2 text-xs text-red-300 min-h-[20px] cyber-glass">
    <div class="cyber-text text-xs break-words">
      {previewText}
    </div>
  </div>

  <div
    class="connection-point input absolute w-2 h-2 bg-red-500 rounded-full border border-red-300 cursor-pointer hover:bg-red-300 transition-colors cyber-glow-red"
    style="left: 50%; top: -6px; transform: translateX(-50%);"
    on:mouseup={handleConnectionEnd}
    role="button"
    tabindex="0"
  ></div>

  <div
    class="connection-point output absolute w-2 h-2 bg-red-500 rounded-full border border-red-300 cursor-pointer hover:bg-red-300 transition-colors cyber-glow-red"
    style="left: 50%; bottom: -6px; transform: translateX(-50%);"
    on:mousedown={handleConnectionStart}
    role="button"
    tabindex="0"
  ></div>
</div>

<style>
  .node {
    user-select: none;
    -webkit-user-select: none;
  }
  
  .connection-point {
    z-index: 20;
  }
  
  .connection-point:hover {
    transform: translateY(-50%) scale(1.2);
  }
</style>
