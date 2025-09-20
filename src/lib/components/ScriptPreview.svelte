<script lang="ts">
  import type { DuckyScript } from '../types/nodes.js';
  import { compileDuckyScript, validateScript } from '../utils/compiler.js';
  import { createEventDispatcher } from 'svelte';
  import { X, Copy, CheckCircle, AlertCircle } from 'lucide-svelte';

  export let script: DuckyScript;
  export let isOpen = false;

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

  const dispatch = createEventDispatcher();

  let compiledScript = '';
  let validationErrors: string[] = [];
  let copySuccess = false;
  let overlayMouseDownTarget: EventTarget | null = null;

  function close() {
    isOpen = false;
  }

  function handleOverlayMouseDown(event: MouseEvent) {
    overlayMouseDownTarget = event.target;
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === overlayMouseDownTarget && event.target === event.currentTarget) {
      close();
    }
    overlayMouseDownTarget = null;
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(compiledScript).then(() => {
      copySuccess = true;
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    });
  }

  function updatePreview() {
    if (script && isOpen) {
      compiledScript = compileDuckyScript(script);
      validationErrors = validateScript(script);
    }
  }

  $: if (script && isOpen) {
    updatePreview();
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cyber-fade-in" on:mousedown={handleOverlayMouseDown} on:click={handleOverlayClick}>
    <div class="cyber-modal cyber-modal-enter max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" on:click|stopPropagation>
      <div class="flex justify-between items-center p-6 border-b border-red-900">
        <div>
          <h2 class="text-xl font-bold text-red-300">Script Preview</h2>
          <p class="text-sm text-red-600 mt-1">{script.metadata.name}</p>
        </div>
        <button on:click={close} class="text-red-600 hover:text-red-400 transition-colors">
          <X size={24} />
        </button>
      </div>

      {#if validationErrors.length > 0}
        <div class="p-4 bg-red-900 bg-opacity-50 border-b border-red-900">
          <div class="flex items-start space-x-2">
            <AlertCircle size={20} class="text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 class="font-medium text-red-300">Validation Errors</h3>
              <ul class="mt-1 text-sm text-red-400 list-disc list-inside">
                {#each validationErrors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      {/if}

      <div class="flex-1 overflow-hidden flex flex-col">
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-red-300">Generated DuckyScript</h3>
            <button
              on:click={copyToClipboard}
              on:mouseenter={handleButtonHover}
              on:mouseleave={handleButtonLeave}
              class="cyber-button"
            >
              {#if copySuccess}
                <CheckCircle size={16} />
                <span>Copied!</span>
              {:else}
                <Copy size={16} />
                <span>Copy</span>
              {/if}
            </button>
          </div>

          {#if compiledScript}
            <pre class="bg-black text-red-400 p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap border border-red-900"><code>{compiledScript}</code></pre>
          {:else}
            <div class="text-center py-8 text-red-600">
              <p>No script to preview. Add some nodes to get started!</p>
            </div>
          {/if}
        </div>

        <div class="p-4 bg-gray-800 border-t border-red-900">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div class="text-2xl font-bold text-red-400">{script.nodes.length}</div>
              <div class="text-sm text-red-600">Nodes</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-400">{script.connections.length}</div>
              <div class="text-sm text-red-600">Connections</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-400">{compiledScript.split('\n').length}</div>
              <div class="text-sm text-red-600">Lines</div>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-400">{compiledScript.length}</div>
              <div class="text-sm text-red-600">Characters</div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-red-900 bg-gray-800">
        <div class="flex justify-between items-center">
          <div class="text-sm text-red-600">
            Ready to load on Flipper Zero or Rubber Ducky
          </div>
          <button
            on:click={close}
            on:mouseenter={handleButtonHover}
            on:mouseleave={handleButtonLeave}
            class="cyber-button"
          >
            Close
          </button>
        </div>
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

  pre {
    scrollbar-width: thin;
    scrollbar-color: #4a5568 #2d3748;
  }

  pre::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  pre::-webkit-scrollbar-track {
    background: #2d3748;
  }

  pre::-webkit-scrollbar-thumb {
    background: #4a5568;
    border-radius: 4px;
  }

  pre::-webkit-scrollbar-thumb:hover {
    background: #718096;
  }
</style>
