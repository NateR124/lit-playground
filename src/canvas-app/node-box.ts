// src/canvas-app/node-box.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('node-box')
export class NodeBox extends LitElement {
  static override styles = css`
  :host {
    position: absolute;
    display: inline-block;
  }

  .node-container {
    position: relative;
    display: inline-block;
  }

  .box {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 200px;
    height: 230px;
    min-width: 200px;
    min-height: 230px;
    background: #2b2b2b;
    border: 2px solid #555;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    color: #fff;
    font-family: sans-serif;
    cursor: grab;
    user-select: none;
    resize: both;
    overflow: hidden;
  }
  
  .box[execution-status="waiting"] {
    border-color: #ffc107;
  }
  
  .box[execution-status="running"] {
    border-color: #2196f3;
    animation: pulse 1.5s infinite;
  }
  
  .box[execution-status="complete"] {
    border-color: #4caf50;
  }
  
  .box[execution-status="error"] {
    border-color: #f44336;
  }

  .box[dragging] {
    cursor: grabbing;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
    100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: #444;
    border-bottom: 1px solid #555;
  }

  .body {
    flex: 1;
    display: flex;
    flex-direction: column;
    font-size: 0.8rem;
  }

  .input, .output {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .input textarea {
    background: #424242;
  }

  .handle {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #F5F5F5;
    cursor: pointer;
    z-index: 10;
    pointer-events: auto;
  }
  
  .handle.out {
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  .handle:hover {
    background: #6c9;
    box-shadow: 0 0 0 2px rgba(102, 204, 153, 0.5);
  }

  textarea {
    flex: 1;
    background: #333;
    margin: 0.5rem;
    color: #fff;
    border: 1px solid #555;
    border-radius: 4px;
    font-size: 0.8rem;
    resize: none;              
    box-sizing: border-box;
    min-height: 0;
  }

  button {
    background: none;
    border: none;
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
  }
  button:hover {
    color: #ff6666;
  }
  
  :host(.connection-target) .box {
    box-shadow: 0 0 0 2px #6c9, 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  :host(.invalid-target) .box {
    box-shadow: 0 0 0 2px #f66, 0 2px 4px rgba(0, 0, 0, 0.3);
  }
`;

  @property() nodeId!: string;
  @property({type: Number}) x = 0;
  @property({type: Number}) y = 0;
  @property({type: Number}) w = 200;
  @property({type: Number}) h = 230;
  @property({type: String}) executionStatus: 'idle' | 'waiting' | 'running' | 'complete' | 'error' = 'idle';
  @property({type: String}) output = '';
  @property({type: String}) input = '';
  @property({type: String}) systemPrompt = '';
  @property({type: Boolean}) dragging = false;
  @property({type: Boolean, reflect: true}) connectionTarget = false;
  @property({type: Boolean, reflect: true}) invalidTarget = false;

  private pointerId: number | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private boxElement: HTMLElement | null = null;


  /* --- Lifecycle --- */
  override connectedCallback() {
    super.connectedCallback();
    this.updatePosition();
  }
  
  override firstUpdated() {
    // Get a reference to the box element
    this.boxElement = this.shadowRoot?.querySelector('.box') as HTMLElement;
    if (this.boxElement) {
      this.ro = new ResizeObserver(([entry]) => {
        const {width, height} = entry.contentRect;
        this.w = width;
        this.h = height;
        this.dispatchEvent(new CustomEvent('node-resized', {
          detail: { id: this.nodeId, w: width, h: height },
          bubbles: true,
          composed: true
        }));
      });
      this.ro.observe(this.boxElement);
      
      // Set initial size
      this.updateSize();
    }
  }
  
  override updated(changedProperties: Map<string, any>) { 
    this.updatePosition();
    
    if (this.boxElement) {
      this.updateSize();
      
      // Update connection target classes based on property changes
      if (changedProperties.has('connectionTarget') || changedProperties.has('invalidTarget')) {
        this.boxElement.classList.toggle('connection-target', this.connectionTarget);
        this.boxElement.classList.toggle('invalid-target', this.invalidTarget);
      }
    }
  }
  
  private updatePosition() {
    this.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  /* --- Drag --- */
  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    
    // Get the rect from the host element (for accurate positioning)
    const rect = this.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;

    this.pointerId = e.pointerId;
    this.setPointerCapture(this.pointerId); // Set pointer capture on the host element
    
    // Add dragging attribute to the box element
    if (this.boxElement) {
      this.boxElement.toggleAttribute('dragging', true);
    }

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    document.body.style.userSelect = 'none';
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    
    // Calculate position based on the offset from when we started dragging
    const newX = e.clientX - this.offsetX;
    const newY = e.clientY - this.offsetY;
    
    // Dispatch event to update position in the parent
    this.dispatchEvent(new CustomEvent('node-dragged', {
      detail: { id: this.nodeId, x: newX, y: newY },
      bubbles: true,
      composed: true,
    }));
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    
    this.releasePointerCapture(this.pointerId!);
    this.pointerId = null;
    
    // Remove dragging attribute from the box
    if (this.boxElement) {
      this.boxElement.toggleAttribute('dragging', false);
    }

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    document.body.style.userSelect = '';
  };

  /* --- Delete --- */
  private deleteSelf = (e: MouseEvent) => {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('node-delete', {
      detail: { id: this.nodeId },
      bubbles: true,
      composed: true,
    }));
  };

  /* --- Connection --- */
  private handleOutPointerDown = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Get the position of the handle itself
    const handleElement = e.currentTarget as HTMLElement;
    const handleRect = handleElement.getBoundingClientRect();
    
    // Use the center of the handle as the starting point
    const handleX = handleRect.left + handleRect.width / 2;
    const handleY = handleRect.top + handleRect.height / 2;
    
    this.dispatchEvent(new CustomEvent('connection-start', {
      detail: { 
        id: this.nodeId, 
        x: handleX, 
        y: handleY
      },
      bubbles: true,
      composed: true
    }));
    
    // Add global event listeners
    window.addEventListener('mousemove', this.handleOutMouseMove);
    window.addEventListener('mouseup', this.handleOutMouseUp);
  };
  
  private handleOutMouseMove = (e: MouseEvent) => {
    this.dispatchEvent(new CustomEvent('connection-move', {
      detail: { 
        x: e.clientX, 
        y: e.clientY 
      },
      bubbles: true,
      composed: true
    }));
  };
  
  private handleOutMouseUp = (e: MouseEvent) => {
    this.dispatchEvent(new CustomEvent('connection-end', {
      detail: { 
        x: e.clientX, 
        y: e.clientY 
      },
      bubbles: true,
      composed: true
    }));
    
    window.removeEventListener('mousemove', this.handleOutMouseMove);
    window.removeEventListener('mouseup', this.handleOutMouseUp);
  };

  /* --- Connection Target Methods --- */
  // Public methods to mark the node as a connection target
  public markAsConnectionTarget(isValid = true) {
    this.connectionTarget = true;
    this.invalidTarget = !isValid;
  }
  
  public clearConnectionTarget() {
    this.connectionTarget = false;
    this.invalidTarget = false;
  }

  /* --- Resize --- */
  private ro?: ResizeObserver;

  override disconnectedCallback() {
    this.ro?.disconnect();
    super.disconnectedCallback();
  }

  private updateSize() {
    if (this.boxElement) {
      this.boxElement.style.width = `${this.w}px`;
      this.boxElement.style.height = `${this.h}px`;
    }
  }

  override render() {
    return html`
      <div class="node-container">
        <div class="box" ?dragging=${this.dragging} execution-status=${this.executionStatus}>
          <div class="header" @pointerdown=${this.onPointerDown}>
            <span></span>
            <button @pointerdown=${(e: Event) => e.stopPropagation()} @click=${this.deleteSelf}>✕</button>
          </div>
          <div class="body">
            <div class="input">
              <textarea
                .value=${this.systemPrompt}
                @input=${(e: Event) => this.systemPrompt = (e.target as HTMLTextAreaElement).value}
                placeholder="System Prompt"
              >
              </textarea>
              <textarea
                .value=${this.input}
                @input=${(e: Event) => this.input = (e.target as HTMLTextAreaElement).value}
                placeholder="User Text"
              >
              </textarea>
            </div>
            <div class="output">
              <textarea
                .value=${this.output}
                readonly=true
              >
              </textarea>
            </div>
          </div>
        </div>
        <div class="handle out" @mousedown=${this.handleOutPointerDown}></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'node-box': NodeBox; }
}