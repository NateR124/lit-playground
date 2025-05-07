// src/canvas-app/connection-layer.ts
import { LitElement, html, css, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';

interface Connection {
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

interface DraggingConnection {
  sourceId: string;
  sourceX: number;
  sourceY: number;
  mouseX: number;
  mouseY: number;
}

@customElement('connection-layer')
export class ConnectionLayer extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    
    svg {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      overflow: visible;
    }
    
    path {
      fill: none;
      stroke-width: 2px;
    }
    
    path.connection {
      stroke: #6c9;
      stroke-width: 2px;
    }
    
    path.dragging {
      stroke: #69c;
      stroke-width: 2px;
      stroke-dasharray: 5, 5;
    }
    
    path.outline {
      stroke: #333;
      stroke-width: 4px;
    }
  `;

  @property({ type: Array }) connections: Connection[] = [];
  @property({ type: Object }) draggingConnection: DraggingConnection | null = null;

  private createPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = Math.abs(x2 - x1) * 0.5;
    
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  override render() {
    return html`
      <svg>
        ${this.connections.map(conn => {
          const path = this.createPath(
            conn.sourceX, 
            conn.sourceY, 
            conn.targetX, 
            conn.targetY
          );
          
          return svg`
            <path class="outline" d="${path}"></path>
            <path class="connection" d="${path}"></path>
          `;
        })}
        
        ${this.draggingConnection ? svg`
          <path 
            class="dragging" 
            d="${this.createPath(
              this.draggingConnection.sourceX,
              this.draggingConnection.sourceY,
              this.draggingConnection.mouseX,
              this.draggingConnection.mouseY
            )}"
          ></path>
        ` : ''}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'connection-layer': ConnectionLayer;
  }
}