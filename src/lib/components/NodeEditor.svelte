<script lang="ts">
  import type { Node, CommandType } from '../types/nodes.js';
  import { PREDEFINED_COMMANDS } from '../types/nodes.js';
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';

  export let node: Node | null;
  export let isOpen = false;
  export let isFlipperMode = false;

  const dispatch = createEventDispatcher();

  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`№§';
  
  const glitchStates = new Map<HTMLElement, {
    interval: number | null;
    originalText: string;
    isGlitching: boolean;
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
      textElement?.offsetHeight;
    }
  }
  
  function createGlitchEffect(element: HTMLElement, originalText: string) {
    const textElement = element.querySelector('span') || element;
    if (!textElement) return;
    
    stopGlitchEffect(element);
    
    let state = glitchStates.get(element);
    if (!state) {
      state = { interval: null, originalText, isGlitching: false };
      glitchStates.set(element, state);
    }
    state.originalText = originalText;
    state.isGlitching = true;
    
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
    
    let state = glitchStates.get(button);
    if (!state) {
      state = { interval: null, originalText, isGlitching: false };
      glitchStates.set(button, state);
    } else {
      state.originalText = originalText;
    }
    
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
    if (state && state.originalText) {
      createGlitchEffect(button, state.originalText);
    }
  }

  let localNode: any = {};
  let isInitialized = false;
  let overlayMouseDownTarget: EventTarget | null = null;

  const keyOptions: CommandType[] = [
    'GUI', 'ALT', 'CTRL', 'SHIFT', 'TAB', 'ENTER', 'ESCAPE', 'SPACE',
    'CAPSLOCK', 'DELETE', 'BACKSPACE', 'PRINTSCREEN', 'SCROLLLOCK',
    'PAUSE', 'BREAK', 'INSERT', 'HOME', 'PAGEUP', 'PAGEDOWN', 'END',
    'UP', 'DOWN', 'LEFT', 'RIGHT',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ];

  const modifierOptions = ['CTRL', 'ALT', 'SHIFT', 'GUI'];

  function handleSave() {
    const nodeToSave = { ...localNode };
    
    if (node) {
      nodeToSave.id = node.id;
      nodeToSave.type = node.type;
      nodeToSave.x = node.x;
      nodeToSave.y = node.y;
    }
    
    if (!nodeToSave.label || nodeToSave.label.trim() === '') {
      nodeToSave.label = getDefaultLabel(nodeToSave.type);
    }
    
    switch (nodeToSave.type) {
      case 'command':
        if (nodeToSave.command === undefined || nodeToSave.command === null) nodeToSave.command = '';
        break;
      case 'text_input':
        if (nodeToSave.text === undefined || nodeToSave.text === null) nodeToSave.text = '';
        if (nodeToSave.useAltCodes === undefined) nodeToSave.useAltCodes = false;
        break;
      case 'key_combination':
        if (!Array.isArray(nodeToSave.keys)) nodeToSave.keys = [];
        if (!Array.isArray(nodeToSave.modifiers)) nodeToSave.modifiers = [];
        break;
      case 'delay':
        if (nodeToSave.duration === undefined || nodeToSave.duration === null) nodeToSave.duration = 1000;
        break;
      case 'loop':
        if (nodeToSave.iterations === undefined || nodeToSave.iterations === null) nodeToSave.iterations = 1;
        if (!Array.isArray(nodeToSave.children)) nodeToSave.children = [];
        break;
      case 'condition':
        if (nodeToSave.condition === undefined || nodeToSave.condition === null) nodeToSave.condition = '';
        if (!Array.isArray(nodeToSave.trueNodes)) nodeToSave.trueNodes = [];
        if (!Array.isArray(nodeToSave.falseNodes)) nodeToSave.falseNodes = [];
        break;
    }
    
    dispatch('save', nodeToSave);
    close();
  }

  function getDefaultLabel(type: string): string {
    switch (type) {
      case 'command': return 'Command';
      case 'key_combination': return 'Key Combo';
      case 'text_input': return 'Text Input';
      case 'delay': return 'Delay';
      case 'loop': return 'Loop';
      case 'condition': return 'Condition';
      default: return 'Node';
    }
  }

  function handleCancel() {
    localNode = { ...node };
    close();
  }

  function handleOverlayMouseDown(event: MouseEvent) {
    overlayMouseDownTarget = event.target;
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === overlayMouseDownTarget && event.target === event.currentTarget) {
      handleCancel();
    }
    overlayMouseDownTarget = null;
  }

  function close() {
    isOpen = false;
    isInitialized = false;
  }

  function addKey() {
    if (localNode.type === 'key_combination') {
      localNode.keys = [...localNode.keys, 'ENTER'];
    }
  }

  function removeKey(index: number) {
    if (localNode.type === 'key_combination') {
      localNode.keys = localNode.keys.filter((_, i) => i !== index);
    }
  }

  function addModifier() {
    if (localNode.type === 'key_combination') {
      localNode.modifiers = [...localNode.modifiers, 'CTRL'];
    }
  }

  function removeModifier(index: number) {
    if (localNode.type === 'key_combination') {
      localNode.modifiers = localNode.modifiers.filter((_, i) => i !== index);
    }
  }

  function usePredefinedCommand(command: string) {
    if (localNode.type === 'command') {
      localNode = {
        ...localNode,
        command: command
      };
    }
  }

  $: if (node && (!isInitialized || !isOpen)) {
    localNode = { ...node };
    
    if (!localNode.id) localNode.id = node.id;
    if (!localNode.type) localNode.type = node.type;
    if (localNode.x === undefined) localNode.x = node.x;
    if (localNode.y === undefined) localNode.y = node.y;
    if (!localNode.label) localNode.label = getDefaultLabel(localNode.type);
    
    switch (localNode.type) {
      case 'command':
        if (localNode.command === undefined || localNode.command === null) localNode.command = '';
        break;
      case 'text_input':
        if (localNode.text === undefined || localNode.text === null) localNode.text = '';
        if (localNode.useAltCodes === undefined) localNode.useAltCodes = false;
        break;
      case 'key_combination':
        if (!Array.isArray(localNode.keys)) localNode.keys = [];
        if (!Array.isArray(localNode.modifiers)) localNode.modifiers = [];
        break;
      case 'delay':
        if (localNode.duration === undefined || localNode.duration === null) localNode.duration = 1000;
        break;
      case 'loop':
        if (localNode.iterations === undefined || localNode.iterations === null) localNode.iterations = 1;
        if (!Array.isArray(localNode.children)) localNode.children = [];
        break;
      case 'condition':
        if (localNode.condition === undefined || localNode.condition === null) localNode.condition = '';
        if (!Array.isArray(localNode.trueNodes)) localNode.trueNodes = [];
        if (!Array.isArray(localNode.falseNodes)) localNode.falseNodes = [];
        break;
    }
    
    if (isOpen) {
      isInitialized = true;
    }
  }
</script>

{#if isOpen && node}
  <div class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cyber-fade-in" on:mousedown={handleOverlayMouseDown} on:click={handleOverlayClick}>
    <div class="cyber-modal cyber-modal-enter p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto {isFlipperMode ? 'flipper-mode' : ''}" on:click|stopPropagation>
      <div class="flex justify-between items-center mb-6">
        <h2 class="cyber-title text-xl cyber-text-glow">[ EDIT {localNode.type.replace('_', ' ').toUpperCase()} NODE ]</h2>
        <button 
          on:click={handleCancel} 
          on:mouseenter={handleButtonHover}
          on:mouseleave={handleButtonLeave}
          class="cyber-button">
          X
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="cyber-label block mb-2">[ NODE LABEL ]</label>
          <input
            type="text"
            bind:value={localNode.label}
            class="cyber-input w-full"
            placeholder="NODE LABEL"
            on:blur={(e) => {
              if (!e.target.value || e.target.value.trim() === '') {
                localNode.label = getDefaultLabel(localNode.type);
              }
            }}
          />
        </div>

        {#if localNode.type === 'command'}
          <div>
            <label class="cyber-label block mb-2">Command</label>
            <textarea
              bind:value={localNode.command}
              rows="4"
              class="cyber-input w-full"
              placeholder="Enter DuckyScript command(s)"
            ></textarea>
            
            <div class="mt-2">
              <label class="block text-sm font-medium text-red-400 mb-2">Predefined Commands</label>
              <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {#each Object.entries(PREDEFINED_COMMANDS) as [name, command]}
                  <button
                    type="button"
                    on:click|preventDefault={() => usePredefinedCommand(command)}
                    on:mouseenter={handleButtonHover}
                    on:mouseleave={handleButtonLeave}
                    class="cyber-button text-left text-sm w-full"
                    title="Click to use: {name}"
                  >
                    {name}
                  </button>
                {/each}
              </div>
            </div>
          </div>

        {:else if localNode.type === 'key_combination'}
          <div>
            <label class="cyber-label block mb-2">Modifiers</label>
            <div class="space-y-2">
              {#each localNode.modifiers as modifier, index}
                <div class="flex items-center space-x-2">
                  <select
                    bind:value={localNode.modifiers[index]}
                    class="cyber-select flex-1"
                  >
                    {#each modifierOptions as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                  <button
                    type="button"
                    on:click={() => removeModifier(index)}
                    on:mouseenter={handleButtonHover}
                    on:mouseleave={handleButtonLeave}
                    class="cyber-button text-xs px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              {/each}
              <button
                type="button"
                on:click={addModifier}
                on:mouseenter={handleButtonHover}
                on:mouseleave={handleButtonLeave}
                class="cyber-button text-xs px-3 py-1"
              >
                Add Modifier
              </button>
            </div>
          </div>

          <div>
            <label class="cyber-label block mb-2">Keys</label>
            <div class="space-y-2">
              {#each localNode.keys as key, index}
                <div class="flex items-center space-x-2">
                  <select
                    bind:value={localNode.keys[index]}
                    class="cyber-select flex-1"
                  >
                    {#each keyOptions as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                  <button
                    type="button"
                    on:click={() => removeKey(index)}
                    on:mouseenter={handleButtonHover}
                    on:mouseleave={handleButtonLeave}
                    class="cyber-button text-xs px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              {/each}
              <button
                type="button"
                on:click={addKey}
                on:mouseenter={handleButtonHover}
                on:mouseleave={handleButtonLeave}
                class="cyber-button text-xs px-3 py-1"
              >
                Add Key
              </button>
            </div>
          </div>

        {:else if localNode.type === 'text_input'}
          <div>
            <label class="cyber-label block mb-2">Text</label>
            <textarea
              bind:value={localNode.text}
              rows="4"
              class="cyber-input w-full"
              placeholder="Enter text to type"
            ></textarea>
          </div>
          
          <div class="flex items-center space-x-3">
            <input
              type="checkbox"
              id="useAltCodes"
              bind:checked={localNode.useAltCodes}
              class="cyber-checkbox"
            />
            <label for="useAltCodes" class="cyber-label text-sm">[ USE ALT CODES FOR SPECIAL CHARACTERS ]</label>
          </div>

        {:else if localNode.type === 'delay'}
          <div>
            <label class="cyber-label block mb-2">Duration (milliseconds)</label>
            <input
              type="number"
              bind:value={localNode.duration}
              min="0"
              step="100"
              class="cyber-number-input w-full"
              placeholder="1000"
            />
          </div>

        {:else if localNode.type === 'loop'}
          <div>
            <label class="cyber-label block mb-2">Iterations</label>
            <input
              type="number"
              bind:value={localNode.iterations}
              min="1"
              class="cyber-number-input w-full"
              placeholder="3"
            />
          </div>

        {:else if localNode.type === 'condition'}
          <div>
            <label class="cyber-label block mb-2">Condition</label>
            <input
              type="text"
              bind:value={localNode.condition}
              class="cyber-input w-full"
              placeholder="Condition description"
            />
          </div>
        {/if}
      </div>

      <div class="flex justify-end space-x-3 mt-6">
        <button
          on:click={handleCancel}
          on:mouseenter={handleButtonHover}
          on:mouseleave={handleButtonLeave}
          class="cyber-button"
        >
          CANCEL
        </button>
        <button
          on:click={handleSave}
          on:mouseenter={handleButtonHover}
          on:mouseleave={handleButtonLeave}
          class="cyber-button"
        >
          SAVE
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    animation: fadeIn 0.2s ease-out;
  }
  
  .modal-content {
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
