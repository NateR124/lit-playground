// canvas-app/connection-layer.ts
import { LitElement, html, svg, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('connection-layer')
export class ConnectionLayer extends LitElement {
  static override styles = css`
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    path {
      stroke: #66ccff;
      stroke-width: 2;
      fill: none;
    }
  `;

  @property({ type: Array }) connections: Array<{ from: DOMRect, to: DOMRect }> = [];

  private getPath(from: DOMRect, to: DOMRect): string {
    const startX = from.right;
    const startY = from.top + from.height * 0.75;
    const endX = to.left;
    const endY = to.top + to.height / 2;

    const dx = Math.abs(endX - startX) * 0.5;

    return `M ${startX} ${startY}
            C ${startX + dx} ${startY},
              ${endX - dx} ${endY},
              ${endX} ${endY}`;
  }

  override render() {
    return html`
      <svg>
        ${this.connections.map(({ from, to }) => svg`<path d=${this.getPath(from, to)} />`)}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'connection-layer': ConnectionLayer;
  }
}
