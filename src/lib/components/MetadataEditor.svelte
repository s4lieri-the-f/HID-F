<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { DuckyScript } from '../types/nodes.js';
  import { X, Edit3 } from 'lucide-svelte';

  export let script: DuckyScript;
  export let isOpen = false;

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
    
    let state = glitchStates.get(button);
    if (!state) {
      state = { interval: null, originalText, isGlitching: false, lastAction: 0 };
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

  const dispatch = createEventDispatcher();

  let localMetadata = { ...script.metadata };
  let nameInput: HTMLInputElement;
  let overlayMouseDownTarget: EventTarget | null = null;
  let isEditingName = false;
  let nameDisplayElement: HTMLElement;
  
  $: if (script && !isOpen) {
    localMetadata = { ...script.metadata };
  }

  $: if (isOpen && nameInput && isEditingName) {
    nameInput.focus();
    nameInput.select();
  }

  function handleSave() {
    script.metadata = {
      ...localMetadata,
      modified: new Date().toISOString()
    };
    
    dispatch('save', script);
    isOpen = false;
  }

  function handleCancel() {
    localMetadata = { ...script.metadata };
    isEditingName = false;
    isOpen = false;
  }

  function startEditingName() {
    isEditingName = true;
  }

  function stopEditingName() {
    isEditingName = false;
  }

  function handleNameKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      stopEditingName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      localMetadata.name = script.metadata.name; // Reset to original
      stopEditingName();
    }
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

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }

  function generateFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_')
      .substring(0, 50) || 'script';
  }

  $: {
    if (localMetadata.name && localMetadata.filename === script.metadata.filename) {
      localMetadata.filename = generateFilename(localMetadata.name);
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cyber-fade-in" 
    on:mousedown={handleOverlayMouseDown} 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && handleCancel()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div 
      class="cyber-modal cyber-modal-enter p-6 w-full max-w-md mx-4" 
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center flex-1 min-w-0">
          <h2 id="modal-title" class="cyber-title text-lg cyber-text-glow flex items-center min-w-0">
            <Edit3 class="w-5 h-5 mr-2 flex-shrink-0" />
            <div class="flex items-center min-w-0">
              <span class="cyber-text text-red-400 text-lg flex-shrink-0">[</span>
              <div class="min-w-0 flex-1 overflow-hidden">
                {#if isEditingName}
                  <input
                    bind:this={nameInput}
                    bind:value={localMetadata.name}
                    on:keydown={handleNameKeyDown}
                    on:blur={stopEditingName}
                    type="text"
                    class="cyber-title text-lg cyber-text-glow bg-transparent border-none outline-none px-1 py-0 w-full"
                  />
                {:else}
                  <button 
                    bind:this={nameDisplayElement}
                    on:click={startEditingName}
                    on:keydown={(e) => e.key === 'Enter' && startEditingName()}
                    class="cyber-title text-lg cyber-text-glow cursor-pointer hover:text-red-400 px-1 py-0 bg-transparent border-none outline-none transition-colors duration-200 w-full text-left truncate"
                    title="Click to edit name"
                    type="button"
                    aria-label="Edit script name"
                  >
                    {localMetadata.name || 'UNNAMED SCRIPT'}
                  </button>
                {/if}
              </div>
              <span class="cyber-text text-red-400 text-lg flex-shrink-0">]</span>
            </div>
          </h2>
        </div>
        <button 
          on:click={handleCancel}
          on:mouseenter={handleButtonHover}
          on:mouseleave={handleButtonLeave}
          class="cyber-button"
          aria-label="Close"
        >
          X
        </button>
      </div>

      <form on:submit|preventDefault={handleSave} class="space-y-4">
        <div>
          <label for="script-filename" class="cyber-label block mb-2">
            [ EXPORT FILENAME ]
          </label>
          <div class="flex">
            <input
              id="script-filename"
              bind:value={localMetadata.filename}
              on:keydown={handleKeyDown}
              type="text"
              placeholder="SCRIPT_FILENAME"
              class="cyber-input flex-1"
              pattern="[a-zA-Z0-9_-]+"
              title="Only letters, numbers, underscores, and hyphens allowed"
              required
            />
            <div class="px-3 py-2 cyber-glass border border-l-0 border-red-500 cyber-text text-sm">
              .TXT
            </div>
          </div>
          <p class="cyber-text text-xs text-red-400 mt-1">EXPORT FILENAME (LETTERS, NUMBERS, _, - ONLY)</p>
        </div>

        <div>
          <label for="script-description" class="cyber-label block mb-2">
            [ DESCRIPTION ]
          </label>
          <textarea
            id="script-description"
            bind:value={localMetadata.description}
            on:keydown={handleKeyDown}
            rows="3"
            placeholder="DESCRIBE WHAT THIS SCRIPT DOES..."
            class="cyber-input w-full resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4 cyber-glass p-3">
          <div>
            <span class="cyber-label text-red-400">[ CREATED ]</span>
            <div class="cyber-text text-sm text-red-300 mt-1">
              {new Date(script.metadata.created).toLocaleString()}
            </div>
          </div>
          <div>
            <span class="cyber-label text-red-400">[ MODIFIED ]</span>
            <div class="cyber-text text-sm text-red-300 mt-1">
              {new Date(script.metadata.modified).toLocaleString()}
            </div>
          </div>
        </div>

        <div class="flex space-x-3 pt-4">
          <button
            type="submit"
            on:mouseenter={handleButtonHover}
            on:mouseleave={handleButtonLeave}
            class="cyber-button flex-1"
          >
            SAVE CHANGES
          </button>
          <button
            type="button"
            on:click={handleCancel}
            on:mouseenter={handleButtonHover}
            on:mouseleave={handleButtonLeave}
            class="cyber-button"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
