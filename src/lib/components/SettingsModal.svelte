<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Settings as SettingsIcon } from 'lucide-svelte';

  export let isOpen = false;
  export let defaultDelay = 10;
  export let duckyVersion = 3;
  
  $: isFlipperMode = false;

  const dispatch = createEventDispatcher();

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
    if (isFlipperMode) return;
    
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
    if (isFlipperMode) return;
    
    const button = event.currentTarget as HTMLElement;
    
    stopGlitchEffect(button);
    
    const state = glitchStates.get(button);
    if (state && state.originalText) {
      createGlitchEffect(button, state.originalText);
    }
  }

  let localSettings = {
    defaultDelay: defaultDelay,
    duckyVersion: duckyVersion
  };

  let overlayMouseDownTarget: EventTarget | null = null;

  $: if (isOpen) {
    localSettings = {
      defaultDelay: defaultDelay,
      duckyVersion: duckyVersion
    };
  }

  function handleSave() {
    dispatch('save', localSettings);
    isOpen = false;
  }

  function handleCancel() {
    localSettings = {
      defaultDelay: defaultDelay,
      duckyVersion: duckyVersion
    };
    isOpen = false;
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

  const duckyVersions = [
    { value: 1, label: 'CLASSIC 1.0' },
    { value: 2, label: 'EXTENDED 1.0' },
    { value: 3, label: '2.0' },
    { value: 4, label: '3.0' }
  ];
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cyber-fade-in" 
    on:mousedown={handleOverlayMouseDown} 
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && handleCancel()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-title"
    tabindex="-1"
  >
    <div 
      class="cyber-modal cyber-modal-enter p-6 w-full max-w-md mx-4 {isFlipperMode ? 'flipper-mode' : ''}" 
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <div class="flex items-center justify-between mb-4">
        <h2 id="settings-title" class="cyber-title text-lg cyber-text-glow flex items-center">
          <SettingsIcon class="w-5 h-5 mr-2" />
          {#if isFlipperMode}
            Settings
          {:else}
            [ SETTINGS ]
          {/if}
        </h2>
        <button 
          on:click={handleCancel}
          on:mouseenter={handleButtonHover}
          on:mouseleave={handleButtonLeave}
          class="cyber-button"
          aria-label="Close"
        >
          <span>X</span>
        </button>
      </div>

      <form on:submit|preventDefault={handleSave} class="space-y-6">
        <div>
          <label for="default-delay" class="cyber-label block mb-2">
            {#if isFlipperMode}
              Default Delay
            {:else}
              [ DEFAULT DELAY ]
            {/if}
          </label>
          <div class="flex items-center">
            <input
              id="default-delay"
              bind:value={localSettings.defaultDelay}
              on:keydown={handleKeyDown}
              on:input={(e) => {
                const target = e.target as HTMLInputElement;
                const value = parseInt(target.value) || 0;
                if (value < 0) localSettings.defaultDelay = 0;
                else if (value > 1000) localSettings.defaultDelay = 1000;
                else localSettings.defaultDelay = value;
              }}
              type="number"
              min="0"
              max="1000"
              placeholder="10"
              class="cyber-number-input w-20"
              required
            />
            <span class="cyber-text text-red-400 ml-2">ms</span>
          </div>
          <p class="cyber-text text-xs text-red-400 mt-1">DELAY ADDED AFTER EACH STATEMENT (EXCEPT DELAY NODES)</p>
        </div>

        <div>
          <label for="ducky-version" class="cyber-label block mb-2">
            {#if isFlipperMode}
              Ducky Version
            {:else}
              [ DUCKY VERSION ]
            {/if}
          </label>
          <select
            id="ducky-version"
            bind:value={localSettings.duckyVersion}
            on:keydown={handleKeyDown}
            class="cyber-select w-full"
          >
            {#each duckyVersions as version}
              <option value={version.value}>{version.label}</option>
            {/each}
          </select>
          <p class="cyber-text text-xs text-red-400 mt-1">SELECT DUCKY SCRIPT VERSION FOR COMPATIBILITY</p>
        </div>

        <div class="flex space-x-3 pt-4">
          <button
            type="submit"
            on:mouseenter={handleButtonHover}
            on:mouseleave={handleButtonLeave}
            class="cyber-button flex-1"
          >
            <span>{isFlipperMode ? 'Save Settings' : 'SAVE SETTINGS'}</span>
          </button>
          <button
            type="button"
            on:click={handleCancel}
            on:mouseenter={handleButtonHover}
            on:mouseleave={handleButtonLeave}
            class="cyber-button"
          >
            <span>{isFlipperMode ? 'Cancel' : 'CANCEL'}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
