<script lang="ts">
  import type { DuckyScript, Node } from '../lib/types/nodes.js';
  import { createEmptyScript } from '../lib/utils/fileOperations.js';
  import { saveProjectAsJson, saveScriptAsTxt, loadProjectFromJson } from '../lib/utils/fileOperations.js';
  import { compileDuckyScript, validateScript, type ValidationError } from '../lib/utils/compiler.js';
  
  import Toolbar from '../lib/components/Toolbar.svelte';
  import Canvas from '../lib/components/Canvas.svelte';
  import NodeEditor from '../lib/components/NodeEditor.svelte';
  import ScriptPreview from '../lib/components/ScriptPreview.svelte';
  import MetadataEditor from '../lib/components/MetadataEditor.svelte';
  import SettingsModal from '../lib/components/SettingsModal.svelte';

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
    // Disable glitch effects in Flipper Zero mode
    if (isFlipperMode) return;
    
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
    // Disable glitch effects in Flipper Zero mode
    if (isFlipperMode) return;
    
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
  let showSettings = false;
  let fileInput: HTMLInputElement;
  
  // Settings state
  let settings = {
    defaultDelay: 10,
    duckyVersion: 4
  };
  
  // Check if Flipper Zero mode is active
  // Temporarily disabled Flipper mode logic
  $: isFlipperMode = false; // settings.duckyVersion === 2;
  
  // Check if advanced nodes (LOOP, IF) should be available
  $: supportsAdvancedNodes = settings.duckyVersion === 4; // Only 3.0 supports advanced nodes
  
  // Validation state
  let validationErrors: ValidationError[] = [];
  let hasValidationErrors = false;
  let mostSevereError: ValidationError | null = null;

  function updateValidation() {
    validationErrors = validateScript(script);
    hasValidationErrors = validationErrors.some(error => error.severity === 'error') || script.nodes.length === 0;
    mostSevereError = getMostSevereError();
    console.log('Updated validation - nodes:', script.nodes.length, 'errors:', validationErrors.length, 'most severe:', mostSevereError?.message);
  }

  function handleScriptChange(event: CustomEvent<DuckyScript>) {
    script = event.detail;
    updateMetadata();
    updateValidation();
  }
  
  
  function removeAdvancedNodes() {
    // Remove LOOP and IF nodes when downgrading from 3.0
    const advancedNodeTypes = ['loop', 'condition'];
    const nodesToRemove = script.nodes.filter(node => advancedNodeTypes.includes(node.type));
    
    if (nodesToRemove.length > 0) {
      // Remove the nodes
      script.nodes = script.nodes.filter(node => !advancedNodeTypes.includes(node.type));
      
      // Remove connections that reference these nodes
      const nodeIdsToRemove = nodesToRemove.map(node => node.id);
      script.connections = script.connections.filter(conn => 
        !nodeIdsToRemove.includes(conn.from) && !nodeIdsToRemove.includes(conn.to)
      );
      
      script = { ...script };
      updateMetadata();
      updateValidation();
      
      alert(`Removed ${nodesToRemove.length} advanced node(s) due to version downgrade.`);
    }
  }
  
  function getMostSevereError(): ValidationError | null {
    if (script.nodes.length === 0) {
      return {
        message: "No nodes in script",
        severity: 'error'
      };
    }
    
    if (validationErrors.length === 0) return null;
    
    const error = validationErrors.find(e => e.severity === 'error');
    if (error) return error;
    
    // If no errors, return first warning
    return validationErrors[0];
  }

  function handleAddNode(event: CustomEvent<{ node: Node }>) {
    script.nodes = [...script.nodes, event.detail.node];
    script = { ...script };
    updateMetadata();
    updateValidation();
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
        updateValidation();
      }
    }
    editingNode = null;
    showNodeEditor = false;
  }

  function handleSaveProject() {
    saveProjectAsJson(script, settings);
  }

  function handleSaveScript() {
    if (hasValidationErrors) {
      alert('Cannot compile script with validation errors. Please fix the errors first.');
      return;
    }
    
    const compiledContent = compileDuckyScript(script, settings);
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
        .then(({ script: loadedScript, settings: loadedSettings }) => {
          script = loadedScript;
          if (loadedSettings) {
            settings = loadedSettings;
            // Save loaded settings to localStorage
            localStorage.setItem('duckycode-settings', JSON.stringify(settings));
          }
          updateMetadata();
          updateValidation();
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
        updateValidation();
      }
    } else {
      script = createEmptyScript('My DuckyScript');
      updateValidation();
    }
  }

  function handlePreviewScript() {
    showScriptPreview = true;
  }

  function openSettings() {
    showSettings = true;
  }

  function handleSettingsSave(event: CustomEvent) {
    const newSettings = event.detail;
    const previousVersion = settings.duckyVersion;
    
    // Update settings
    settings = { ...newSettings };
    showSettings = false;
    
    // Check if we're downgrading from 3.0 to a lower version
    if (previousVersion === 4 && newSettings.duckyVersion !== 4) {
      removeAdvancedNodes();
    }
    
    // Check if we're switching from EXTENDED 1.0 to any other version
    // This handles the case where nodes are present and user wants to switch away from Flipper mode
    if (previousVersion === 2 && newSettings.duckyVersion !== 2) {
      // Force a complete re-render by updating the script reference
      script = { ...script };
      updateValidation();
    }
    
    // Save settings to localStorage
    localStorage.setItem('duckycode-settings', JSON.stringify(settings));
    
    // Force reactivity update
    settings = { ...settings };
  }

  function updateMetadata() {
    script.metadata.modified = new Date().toISOString();
  }

  // Initialize validation on mount
  updateValidation();

  // Load settings from localStorage on mount
  if (typeof window !== 'undefined') {
    const savedSettings = localStorage.getItem('duckycode-settings');
    if (savedSettings) {
      try {
        settings = JSON.parse(savedSettings);
      } catch (e) {
        console.warn('Failed to parse saved settings:', e);
      }
    }
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

<div class="app-container h-screen flex flex-col {isFlipperMode ? 'flipper-mode' : ''}">
  <Toolbar
    {script}
    {hasValidationErrors}
    {supportsAdvancedNodes}
    {isFlipperMode}
    on:addNode={handleAddNode}
    on:saveProject={handleSaveProject}
    on:saveScript={handleSaveScript}
    on:loadProject={handleLoadProject}
    on:newProject={handleNewProject}
    on:previewScript={handlePreviewScript}
    on:openSettings={openSettings}
    on:openMetadataEditor={openMetadataEditor}
  />

  <div class="flex-1 overflow-hidden">
    <Canvas
      {script}
      {validationErrors}
      {supportsAdvancedNodes}
      on:change={handleScriptChange}
      on:editNode={handleEditNode}
    />
  </div>

  <footer class="cyber-panel p-3">
    <div class="flex items-center justify-between">
      <div class="cyber-text text-sm flex space-x-4">
        {#if isFlipperMode}
          <span class="cyber-status-info">S: Save</span>
          <span class="cyber-status-info">E: Export</span>
          <span class="cyber-status-info">L: Load</span>
          <span class="cyber-status-info">P: Preview</span>
        {:else}
          <span class="cyber-status-info">[ S:SAVE ]</span>
          <span class="cyber-status-info">[ E:EXPORT ]</span>
          <span class="cyber-status-info">[ L:LOAD ]</span>
          <span class="cyber-status-info">[ P:PREVIEW ]</span>
        {/if}
      </div>
      <div class="cyber-text text-sm">
        {#if mostSevereError}
          <span class="text-red-400 cyber-text-glow">
            {#if isFlipperMode}
              ERROR: {mostSevereError.message}
            {:else}
              [ ERROR: {mostSevereError.message} ]
            {/if}
          </span>
        {/if}
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
  {isFlipperMode}
  on:save={handleNodeSave}
/>

<ScriptPreview
  {script}
  bind:isOpen={showScriptPreview}
  {settings}
  {hasValidationErrors}
  {isFlipperMode}
/>

<MetadataEditor
  {script}
  bind:isOpen={showMetadataEditor}
  {isFlipperMode}
  on:save={handleMetadataSave}
/>

<SettingsModal
  bind:isOpen={showSettings}
  defaultDelay={settings.defaultDelay}
  duckyVersion={settings.duckyVersion}
  on:save={handleSettingsSave}
/>

<style>
  .app-container {
    background: 
      radial-gradient(circle at 20% 20%, rgba(255, 0, 60, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
      linear-gradient(135deg, #0a0a0a 0%, #111111 100%);
  }
</style>