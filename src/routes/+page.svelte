<script lang="ts">
  import type { DuckyScript, Node } from '../lib/types/nodes.js';
  import { createEmptyScript } from '../lib/utils/fileOperations.js';
  import { saveProjectAsJson, saveScriptAsTxt, loadProjectFromJson } from '../lib/utils/fileOperations.js';
  import { compileDuckyScript } from '../lib/utils/compiler.js';
  
  import Toolbar from '../lib/components/Toolbar.svelte';
  import Canvas from '../lib/components/Canvas.svelte';
  import NodeEditor from '../lib/components/NodeEditor.svelte';
  import ScriptPreview from '../lib/components/ScriptPreview.svelte';
  import MetadataEditor from '../lib/components/MetadataEditor.svelte';

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
      const textElement = element.querySelector('span') || element;
      if (textElement && state.originalText) {
        textElement.textContent = state.originalText;
      }
      state.isGlitching = false;
      element.classList.remove('cyber-glitch');
      // Force a reflow to ensure the text is properly restored
      textElement?.offsetHeight;
    }
  }
  
  function createGlitchEffect(element: HTMLElement, originalText: string) {
    const textElement = element.querySelector('span') || element;
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
      }
    }, 25);
    
    return state.interval;
  }
  
  function handleButtonHover(event: MouseEvent) {
    const button = event.currentTarget as HTMLElement;
    const originalText = button.textContent || '';
    
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
    
    const state = glitchStates.get(button);
    if (state && state.originalText && state.originalText.trim()) {
      setTimeout(() => {
        const currentState = glitchStates.get(button);
        if (currentState && !currentState.isGlitching) {
          createGlitchEffect(button, currentState.originalText);
        }
      }, 50);
    }
  }

  let script: DuckyScript = createEmptyScript('My DuckyScript');
  let editingNode: Node | null = null;
  let showNodeEditor = false;
  let showScriptPreview = false;
  let showMetadataEditor = false;
  let fileInput: HTMLInputElement;

  function handleScriptChange(event: CustomEvent<DuckyScript>) {
    script = event.detail;
    updateMetadata();
  }

  function handleAddNode(event: CustomEvent<{ node: Node }>) {
    script.nodes = [...script.nodes, event.detail.node];
    script = { ...script };
    updateMetadata();
  }

  function handleEditNode(event: CustomEvent<{ node: Node }>) {
    editingNode = { ...event.detail.node };
    showNodeEditor = true;
  }

  function handleNodeSave(event: CustomEvent<Node>) {
    if (editingNode) {
      const nodeIndex = script.nodes.findIndex(n => n.id === editingNode!.id);
      if (nodeIndex !== -1) {
        script.nodes[nodeIndex] = event.detail;
        script = { ...script };
        updateMetadata();
      }
    }
    editingNode = null;
    showNodeEditor = false;
  }

  function handleSaveProject() {
    saveProjectAsJson(script);
  }

  function handleSaveScript() {
    const compiledContent = compileDuckyScript(script);
    const filename = script.metadata.filename || script.metadata.name;
    saveScriptAsTxt({ ...script, metadata: { ...script.metadata, name: filename }}, compiledContent);
  }

  function handleMetadataSave(event: CustomEvent<DuckyScript>) {
    script = event.detail;
    updateMetadata();
  }

  function openMetadataEditor() {
    showMetadataEditor = true;
  }

  function handleLoadProject() {
    fileInput?.click();
  }

  function handleFileLoad(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      loadProjectFromJson(file)
        .then(loadedScript => {
          script = loadedScript;
          updateMetadata();
        })
        .catch(error => {
          alert('Error loading project: ' + error.message);
        });
    }
    target.value = '';
  }

  function handleNewProject() {
    if (script.nodes.length > 0) {
      if (confirm('Are you sure you want to create a new project? Unsaved changes will be lost.')) {
        script = createEmptyScript('My DuckyScript');
      }
    } else {
      script = createEmptyScript('My DuckyScript');
    }
  }

  function handlePreviewScript() {
    showScriptPreview = true;
  }

  function handleClearAll() {
    script.nodes = [];
    script.connections = [];
    script = { ...script };
    updateMetadata();
  }

  function updateMetadata() {
    script.metadata.modified = new Date().toISOString();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          if (event.shiftKey) {
            handleSaveScript();
          } else {
            handleSaveProject();
          }
          break;
        case 'o':
          event.preventDefault();
          handleLoadProject();
          break;
        case 'n':
          event.preventDefault();
          handleNewProject();
          break;
        case 'p':
          event.preventDefault();
          handlePreviewScript();
          break;
      }
    } else if (event.key === 'F5') {
      event.preventDefault();
      handlePreviewScript();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="app-container h-screen flex flex-col">
  <Toolbar
    {script}
    on:addNode={handleAddNode}
    on:saveProject={handleSaveProject}
    on:saveScript={handleSaveScript}
    on:loadProject={handleLoadProject}
    on:newProject={handleNewProject}
    on:previewScript={handlePreviewScript}
    on:clearAll={handleClearAll}
    on:openMetadataEditor={openMetadataEditor}
  />

  <div class="flex-1 overflow-hidden">
    <Canvas
      {script}
      on:change={handleScriptChange}
      on:editNode={handleEditNode}
    />
  </div>

  <footer class="cyber-panel p-3">
    <div class="flex items-center justify-between">
      <div class="cyber-text text-sm flex space-x-4">
        <span class="cyber-status-info">[ S:SAVE ]</span>
        <span class="cyber-status-info">[ E:EXPORT ]</span>
        <span class="cyber-status-info">[ L:LOAD ]</span>
        <span class="cyber-status-info">[ P:PREVIEW ]</span>
      </div>
    </div>
  </footer>

  <input
    bind:this={fileInput}
    type="file"
    accept=".json"
    class="hidden"
    on:change={handleFileLoad}
  />
</div>

<NodeEditor
  node={editingNode}
  bind:isOpen={showNodeEditor}
  on:save={handleNodeSave}
/>

<ScriptPreview
  {script}
  bind:isOpen={showScriptPreview}
/>

<MetadataEditor
  {script}
  bind:isOpen={showMetadataEditor}
  on:save={handleMetadataSave}
/>

<style>
  .app-container {
    background: 
      radial-gradient(circle at 20% 20%, rgba(255, 0, 60, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
      linear-gradient(135deg, #0a0a0a 0%, #111111 100%);
  }
</style>