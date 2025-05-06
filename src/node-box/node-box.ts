// node-box/node-box.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('node-box')
export class NodeBox extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      display: block;
      width: 200px;
      height: 120px;
      background: #2b2b2b;
      border: 2px solid #555;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      color: white;
      font-family: sans-serif;
      user-select: none;
      cursor: grab;
    }
    :host([dragging]) { cursor: grabbing; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: #444;
      border-bottom: 1px solid #555;
    }
    .body { padding: 0.5rem; font-size: 0.8rem; }

    /* single output dot */
    .handle.out {
      position: absolute;
      right: -6px;
      top: 50%;
      width: 12px;
      height: 12px;
      transform: translateY(-50%);
      border-radius: 50%;
      background: #66ccff;
      cursor: pointer;
      z-index: 2;
    }
    /* hide left input dot completely */
    .handle.in { display: none; }

    button {
      background: transparent;
      border: none;
      color: white;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { color: #ff6666; }
  `;

  @property() nodeId!: string;
  @property({type: Number}) x = 0;
  @property({type: Number}) y = 0;

  /* --- drag state --- */
  private pointerId: number | null = null;
  private offsetX = 0;
  private offsetY = 0;

  /* --- lifecycle --- */
  override connectedCallback() {
    super.connectedCallback();
    this.updatePosition();
  }
  override updated() { this.updatePosition(); }
  private updatePosition() {
    this.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  /* --- drag handlers --- */
  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;            // left‑click only
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

  /* --- delete & connect --- */
  private deleteSelf = (e: MouseEvent) => {
    e.stopPropagation();                   // don’t trigger a drag
    this.dispatchEvent(new CustomEvent('node-delete', {
      detail: { id: this.nodeId },
      bubbles: true,
      composed: true,
    }));
  };

  private startConnect = (e: PointerEvent) => {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('node-connect-start', {
      detail: {
        id: this.nodeId,
        x: this.x + this.offsetWidth,
        y: this.y + this.offsetHeight / 2,
      },
      bubbles: true,
      composed: true,
    }));
  };

  /* --- template --- */
  override render() {
    return html`
      <div class="header" @pointerdown=${this.onPointerDown}>
        <span>Node</span>
        <button @pointerdown=${(e: PointerEvent)=>e.stopPropagation()}
                @click=${this.deleteSelf}>✕</button>
      </div>
      <div class="body">Prompt content</div>
      <div class="handle out" @pointerdown=${this.startConnect}></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap { 'node-box': NodeBox; }
}
