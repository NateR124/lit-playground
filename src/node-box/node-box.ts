// node-box/node-box.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('node-box')
export class NodeBox extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      width: 220px;
      border-radius: 8px;
      background: #2d2d2d;
      color: #e2e2e2;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      cursor: grab;
      user-select: none;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.3rem 0.5rem;
      background: #3d3d3d;
      border-radius: 8px 8px 0 0;
      font-size: 0.8rem;
    }
    button {
      background: none;
      border: none;
      color: #bbb;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .content {
      padding: 0.5rem;
      font-size: 0.75rem;
    }
  `;

  @property({ type: String }) nodeId!: string;
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;

  private pointerMove = (e: PointerEvent) => {
    this.x += e.movementX;
    this.y += e.movementY;
    this.updatePosition();
  };

  private pointerUp = () => {
    window.removeEventListener('pointermove', this.pointerMove);
    window.removeEventListener('pointerup', this.pointerUp);
    document.body.style.userSelect = '';  
    this.style.cursor = 'grab';
    this.dispatchEvent(new CustomEvent('node-dragged', {
      detail: { id: this.nodeId, x: this.x, y: this.y },
      bubbles: true,
      composed: true
    }));
  };

  private pointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    window.addEventListener('pointermove', this.pointerMove);
    window.addEventListener('pointerup', this.pointerUp);
    document.body.style.userSelect = 'none';      
    this.style.cursor = 'grabbing';
  };

  private deleteMe() {
    this.dispatchEvent(new CustomEvent('node-delete', {
      detail: { id: this.nodeId },
      bubbles: true,
      composed: true
    }));
  }

  private updatePosition() {
    this.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.updatePosition();
  }

  override updated(): void {
    this.updatePosition();
  }

  override render() {
    return html`
      <header @pointerdown=${this.pointerDown}>
        <span>Node</span>
        <button @click=${this.deleteMe}>✖</button>
      </header>
      <div class="content">
        <div>System Prompt</div>
        <div>User Input</div>
        <div>Output</div>
      </div>
    `;
  }
}