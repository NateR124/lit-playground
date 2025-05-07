// node-box/node-box.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('node-box')
export class NodeBox extends LitElement {
  static override styles = css`
  :host {
    position:absolute;
    display:flex;
    flex-direction:column;

    width:200px;
    height:230px;

    min-width:200px;
    min-height:230px;

    background:#2b2b2b;
    border:2px solid #555;
    border-radius:8px;
    box-shadow:0 2px 4px rgba(0 0 0 /.3);
    color:#fff;
    font-family:sans-serif;
    cursor:grab;
    user-select:none;

    resize:both;
    overflow:hidden;
  }
  :host([dragging]){cursor:grabbing;}

  .header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:.5rem;
    background:#444;
    border-bottom:1px solid #555;
  }

  .body{
    flex:1;
    display:flex;
    flex-direction:column;
    font-size:.8rem;
  }

  .input,.output{
    flex:1;
    display:flex;
    flex-direction:column;
    position:relative;
  }

  .input textarea{background:#424242;}

  .handle{
    position:absolute;
    bottom:50%;
    width:12px;
    height:12px;
    border-radius:45%;
    background:#F5F5F5;
    cursor:pointer;
    z-index:4;
  }
    
  .handle.out{right:-6px;}

  textarea{
    flex:1;
    background:#333;
    margin:.5rem;
    color:#fff;
    border:1px solid #555;
    border-radius:4px;
    font-size:.8rem;
    resize:none;              
    box-sizing:border-box;
    min-height:0;
  }

  button{
    background:none;
    border:none;
    color:#fff;
    font-size:1rem;
    cursor:pointer;
  }
  button:hover{color:#ff6666;}
`;

  @property() nodeId!: string;
  @property({type: Number}) x = 0;
  @property({type: Number}) y = 0;
  @property({type: Number}) w = 200;
  @property({type: Number}) h = 230;

  @property(({type: String })) output = '';
  @property(({type: String })) input = '';
  @property(({type: String })) systemPrompt = '';

  private pointerId: number | null = null;
  private offsetX = 0;
  private offsetY = 0;

  /* --- Lifecycle --- */
  override connectedCallback() {
    super.connectedCallback();
    this.updatePosition();
    this.updateSize();

    this.ro = new ResizeObserver(([entry])=>{
      const {width,height} = entry.contentRect;
      this.w = width;
      this.h = height;
      this.dispatchEvent(new CustomEvent('node-resized',{
        detail:{ id:this.nodeId, w:width, h:height },
        bubbles:true,composed:true
      }));
    });
    this.ro.observe(this);
  }
  override updated() { this.updatePosition();   this.updateSize();}
  private updatePosition() {
    this.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  /* --- Drag --- */
  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const rect = this.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;

    this.pointerId = e.pointerId;
    this.setPointerCapture(this.pointerId);
    this.toggleAttribute('dragging', true);

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    document.body.style.userSelect = 'none';
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const newX = e.clientX - this.offsetX;
    const newY = e.clientY - this.offsetY;
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
    this.toggleAttribute('dragging', false);

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

  /* --- Resize --- */
  private ro?:ResizeObserver;

  override disconnectedCallback(){
    this.ro?.disconnect();
    super.disconnectedCallback();
  }

  private updateSize(){
    this.style.width  = `${this.w}px`;
    this.style.height = `${this.h}px`;
  }

  override render() {
    return html`
      <div class="header" @pointerdown=${this.onPointerDown}>
        <span></span>
        <button @pointerdown=${(e: PointerEvent)=>e.stopPropagation()} @click=${this.deleteSelf}>✕</button>
      </div>
      <div class="body">
        <div class="input">    
          <textarea
            .value=${this.systemPrompt}
            @input=${(e: any) => this.systemPrompt = e.target.value}
             placeholder="System Prompt"
          >
          </textarea>
          <textarea
            .value=${this.input}
            @input=${(e: any) => this.input = e.target.value}
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
          <div class="handle out"></div>
        </div>
      </div>
     
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'node-box': NodeBox; }
}
