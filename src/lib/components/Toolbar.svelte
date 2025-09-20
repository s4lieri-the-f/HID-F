<script lang="ts">
  import type { Node, NodeType } from '../types/nodes.js';
  import { generateNodeId } from '../utils/fileOperations.js';
  import MetadataEditor from '../components/MetadataEditor.svelte';
  import { createEventDispatcher } from 'svelte';
  import { 
    Command, 
    Keyboard, 
    Type, 
    Clock, 
    Repeat, 
    GitBranch, 
    Plus,
    Save,
    FolderOpen,
    Download,
    FileText,
    Settings,
    Play
  } from 'lucide-svelte';

  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`№§';
  
  const glitchStates = new Map<HTMLElement, {
    interval: number | null;
    originalText: string;
    isGlitching: boolean;
    lastAction: number;
  }>();
  
  function stopGlitchEffect(element: HTMLElement) {
    const state = glitchStates.get(element);
    if (state) {
      if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
      }
      const textElement = element.querySelector('span');
      if (textElement && state.originalText) {
        textElement.textContent = state.originalText;
      }
      state.isGlitching = false;
      element.classList.remove('cyber-glitch');
      textElement?.offsetHeight;
    }
  }
  
  function createGlitchEffect(element: HTMLElement, originalText: string) {
    const textElement = element.querySelector('span');
    if (!textElement) return;
    
    stopGlitchEffect(element);
    
    let state = glitchStates.get(element);
    if (!state) {
      state = { interval: null, originalText, isGlitching: false, lastAction: 0 };
      glitchStates.set(element, state);
    }
    state.originalText = originalText;
    state.isGlitching = true;
    state.lastAction = Date.now();
    
    let iterations = 0;
    const maxIterations = 6;
    
    state.interval = setInterval(() => {
      if (!state.isGlitching) {
        clearInterval(state.interval!);
        state.interval = null;
        textElement.textContent = state.originalText;
        element.classList.remove('cyber-glitch');
        return;
      }
      
      const glitchedText = originalText
        .split('')
        .map((char, index) => {
          if (Math.random() < 0.7 && char !== ' ') {
            return glitchChars[Math.floor(Math.random() * glitchChars.length)];
          }
          return char;
        })
        .join('');
      
      textElement.textContent = glitchedText;
      
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(state.interval!);
        state.interval = null;
        textElement.textContent = state.originalText;
        state.isGlitching = false;
        element.classList.remove('cyber-glitch');
        textElement.offsetHeight;
      }
    }, 25);
    
    return state.interval;
  }
  
  function handleButtonHover(event: MouseEvent) {
    const button = event.currentTarget as HTMLElement;
    const textElement = button.querySelector('span');
    if (!textElement) return;
    
    const originalText = textElement.textContent || '';
    
    const now = Date.now();
    let state = glitchStates.get(button);
    if (!state) {
      state = { interval: null, originalText, isGlitching: false, lastAction: 0 };
      glitchStates.set(button, state);
    }
    
    if (now - state.lastAction < 100) {
      return;
    }
    
    state.originalText = originalText;
    state.lastAction = now;
    
    button.classList.add('cyber-glitch');
    createGlitchEffect(button, originalText);
    
    setTimeout(() => {
      button.classList.remove('cyber-glitch');
    }, 200);
  }
  
  function handleButtonLeave(event: MouseEvent) {
    const button = event.currentTarget as HTMLElement;
    
    stopGlitchEffect(button);
    
    const textElement = button.querySelector('span');
    if (textElement) {
      const state = glitchStates.get(button);
      if (state && state.originalText) {
        textElement.textContent = state.originalText;
      }
    }
    
    button.classList.remove('cyber-glitch');
  }

  export let script: any;
  export let hasValidationErrors = false;
  export let supportsAdvancedNodes = true;
  export let isFlipperMode = false;

  const dispatch = createEventDispatcher();

  function createNode(type: NodeType): Node {
    const gridSize = 20;
    const gridX = Math.floor(Math.random() * 15) * gridSize + 60; 
    const gridY = Math.floor(Math.random() * 10) * gridSize + 60; 
    
    const baseNode = {
      id: generateNodeId(),
      type,
      x: gridX,
      y: gridY,
      label: getDefaultLabel(type)
    };

    switch (type) {
      case 'command':
        return {
          ...baseNode,
          command: 'GUI r'
        };
      case 'key_combination':
        return {
          ...baseNode,
          keys: ['ENTER'],
          modifiers: []
        };
      case 'text_input':
        return {
          ...baseNode,
          text: 'Hello World',
          useAltCodes: false
        };
      case 'delay':
        return {
          ...baseNode,
          duration: 1000
        };
      case 'loop':
        return {
          ...baseNode,
          iterations: 3,
          children: []
        };
      case 'condition':
        return {
          ...baseNode,
          condition: 'condition',
          trueNodes: [],
          falseNodes: []
        };
      default:
        throw new Error(`Unknown node type: ${type}`);
    }
  }

  function getDefaultLabel(type: NodeType): string {
    switch (type) {
      case 'command': return 'Command';
      case 'key_combination': return 'Key Combo';
      case 'text_input': return 'Text Input';
      case 'delay': return 'Delay';
      case 'loop': return 'Loop';
      case 'condition': return 'Condition';
      default: return 'Unknown';
    }
  }

  function addNode(type: NodeType) {
    const newNode = createNode(type);
    dispatch('addNode', { node: newNode });
  }

  function saveProject() {
    dispatch('saveProject');
  }

  function saveScript() {
    dispatch('saveScript');
  }

  function loadProject() {
    dispatch('loadProject');
  }

  function newProject() {
    dispatch('newProject');
  }

  function previewScript() {
    dispatch('previewScript');
  }

  function openSettings() {
    dispatch('openSettings');
  }

  function openMetadataEditor() {
    dispatch('openMetadataEditor');
  }

  const allNodeTypes = [
    { type: 'command', icon: Command, label: 'CMD', fullLabel: 'Command', color: 'bg-red-800' },
    { type: 'key_combination', icon: Keyboard, label: 'KEY', fullLabel: 'Key', color: 'bg-red-700' },
    { type: 'text_input', icon: Type, label: 'TXT', fullLabel: 'Text', color: 'bg-red-600' },
    { type: 'delay', icon: Clock, label: 'DLY', fullLabel: 'Delay', color: 'bg-red-900' },
    { type: 'loop', icon: Repeat, label: 'RPT', fullLabel: 'Loop', color: 'bg-red-800' },
    { type: 'condition', icon: GitBranch, label: 'IF', fullLabel: 'If', color: 'bg-red-500' }
  ] as const;
  
  // Filter node types based on version support
  $: nodeTypes = supportsAdvancedNodes 
    ? allNodeTypes 
    : allNodeTypes.filter(nodeType => !['loop', 'condition'].includes(nodeType.type));
</script>

<div class="toolbar cyber-panel p-2 flex flex-wrap items-center justify-between gap-1">
  <div class="flex items-center gap-2">
    <div class="flex items-center space-x-1 mr-4">
    <button
      on:click={newProject}
      on:mouseenter={handleButtonHover}
      on:mouseleave={handleButtonLeave}
      class="cyber-button text-xs"
      title="New"
    >
      <Plus size={14} />
      <span class="hidden sm:inline">NEW</span>
    </button>

    <button
      on:click={loadProject}
      on:mouseenter={handleButtonHover}
      on:mouseleave={handleButtonLeave}
      class="cyber-button text-xs"
      title="Load"
    >
      <FolderOpen size={14} />
      <span class="hidden sm:inline">LOAD</span>
    </button>

    <button
      on:click={saveProject}
      on:mouseenter={handleButtonHover}
      on:mouseleave={handleButtonLeave}
      class="cyber-button text-xs"
      title="Save (.json)"
    >
      <Save size={14} />
      <span class="hidden sm:inline">SAVE</span>
    </button>

    <button
      on:click={saveScript}
      on:mouseenter={handleButtonHover}
      on:mouseleave={handleButtonLeave}
      class="cyber-button text-xs"
      title="Export (.txt)"
    >
      <Download size={14} />
      <span class="hidden sm:inline">EXPORT</span>
    </button>
  </div>

  <div class="w-px h-6 bg-red-500 mr-2 cyber-glow-red"></div>

  <div class="flex items-center space-x-1 mr-4">
    {#each nodeTypes as nodeType}
      <button
        on:click={() => addNode(nodeType.type)}
        on:mouseenter={handleButtonHover}
        on:mouseleave={handleButtonLeave}
        class="cyber-button text-xs {nodeType.color}"
        title="{isFlipperMode ? nodeType.fullLabel : nodeType.label}"
      >
        <svelte:component this={nodeType.icon} size={12} />
        <span class="hidden lg:inline">{isFlipperMode ? nodeType.fullLabel : nodeType.label}</span>
      </button>
    {/each}
  </div>

  <div class="w-px h-6 bg-red-500 mr-2 cyber-glow-red"></div>

  <div class="flex items-center space-x-1">
    <button
      on:click={previewScript}
      on:mouseenter={handleButtonHover}
      on:mouseleave={handleButtonLeave}
      class="cyber-button text-xs"
      class:opacity-50={hasValidationErrors}
      class:cursor-not-allowed={hasValidationErrors}
      disabled={hasValidationErrors}
      title={hasValidationErrors ? "Fix validation errors to preview" : "Preview"}
    >
      <FileText size={14} />
      <span class="hidden sm:inline">VIEW</span>
    </button>

    <button
      on:click={openSettings}
      on:mouseenter={handleButtonHover}
      on:mouseleave={handleButtonLeave}
      class="cyber-button text-xs"
      title="Settings"
    >
      <Settings size={14} />
      <span class="hidden sm:inline">SETTINGS</span>
    </button>
  </div>
  </div>

  <div class="flex items-center space-x-3">
    <button 
      class="cyber-button"
      on:click={openMetadataEditor}
      on:mouseenter={handleButtonHover}
      on:mouseleave={handleButtonLeave}
      title="Click to edit script metadata"
    >
      {script.metadata.name}
    </button>
  </div>
</div>

<style>
  .toolbar {
    min-height: 60px;
  }
  
  @media (max-width: 640px) {
    .toolbar {
      padding: 0.75rem;
    }
  }
</style>
