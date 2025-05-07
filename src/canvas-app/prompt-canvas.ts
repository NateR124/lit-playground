// src/canvas-app/prompt-canvas.ts
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { FlowController } from './flow-controller.js';
import './node-box.js';
import './connection-layer.js';

interface ConnectionInfo {
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

@customElement('prompt-canvas')
export class PromptCanvas extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }
    
    .canvas-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    
    .toolbar {
      position: absolute;
      top: 1rem;
      left: 1rem;
      z-index: 10;
      display: flex;
      gap: 0.5rem;
    }
    
    button {
      padding: 0.4rem 0.6rem;
      border: none;
      border-radius: 4px;
      background: #444;
      color: #fff;
      cursor: pointer;
      font-size: 0.9rem;
    }
    
    button:hover {
      background: #555;
    }
  `;

  @state() private controller = new FlowController();
  @state() private connections: ConnectionInfo[] = [];
  @state() private draggingConnection: {
    sourceId: string;
    sourceX: number;
    sourceY: number;
    mouseX: number;
    mouseY: number;
  } | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    try {
      const saved = localStorage.getItem('flow-data');
      if (saved) this.controller.deserialize(saved);
      else this.controller.addNode(200, 150);
      
      this.updateConnectionsFromNodes();
    } catch (error) {
      console.warn("Failed to load flow data:", error);
      this.controller.addNode(200, 150);
    }
    
    window.addEventListener('pointerup', this.handleGlobalPointerUp);
  }
  
  override disconnectedCallback(): void {
    window.removeEventListener('pointerup', this.handleGlobalPointerUp);
    super.disconnectedCallback();
  }

  private handleAddNode() {
    this.controller.addNode(100 + Math.random() * 400, 100 + Math.random() * 300);
    this.requestUpdate();
    this.save();
  }

  private handleDeleteNode(e: CustomEvent) {
    const { id } = e.detail;
    
    this.controller.removeNode(id);
    
    this.updateConnectionsFromNodes();
    
    this.requestUpdate();
    this.save();
  }

  private handleResizeNode(e: CustomEvent) {
    const { id, w, h } = e.detail;
    this.controller.updateNodeSize(id, w, h);
    this.requestUpdate();
    this.save();
  }

  private handleDragNode(e: CustomEvent) {
    const { id, x, y } = e.detail;
    this.controller.updateNodePosition(id, x, y);
    
    this.updateConnectionsFromNodes();
    
    this.requestUpdate();
    this.save();
  }
  
  private handleConnectionStart(e: CustomEvent) {
    const { id, x, y } = e.detail;
    
    this.draggingConnection = {
      sourceId: id,
      sourceX: x,
      sourceY: y,
      mouseX: x,
      mouseY: y
    };
    
    this.requestUpdate();
  }
  
  private handleConnectionMove(e: CustomEvent) {
    if (!this.draggingConnection) return;
    
    const { x, y } = e.detail;
    this.draggingConnection.mouseX = x;
    this.draggingConnection.mouseY = y;
    
    this.requestUpdate();
  }
  
  private handleConnectionEnd(e: CustomEvent) {
    if (!this.draggingConnection) return;
    
    const { x, y } = e.detail;
    const targetElement = this.findNodeAtPosition(x, y);
    
    if (targetElement && targetElement.nodeId !== this.draggingConnection.sourceId) {
      this.createConnection(this.draggingConnection.sourceId, targetElement.nodeId);
    }
    
    this.draggingConnection = null;
    this.requestUpdate();
  }
  
  private handleGlobalPointerUp = () => {
    if (this.draggingConnection) {
      this.draggingConnection = null;
      this.requestUpdate();
    }
  };
  
  // Helper methods
  private findNodeAtPosition(x: number, y: number): NodeBox | null {
    const elements = this.shadowRoot?.querySelectorAll('node-box');
    if (!elements) return null;
    
    for (const element of Array.from(elements)) {
      const rect = element.getBoundingClientRect();
      if (
        x >= rect.left && 
        x <= rect.right && 
        y >= rect.top && 
        y <= rect.bottom
      ) {
        return element as NodeBox;
      }
    }
    
    return null;
  }
  
  private createConnection(sourceId: string, targetId: string) {
    const targetNode = this.controller.nodes.find(n => n.id === targetId);
    if (!targetNode) return;
    
    if (!targetNode.dependsOn.includes(sourceId)) {
      targetNode.dependsOn.push(sourceId);
      this.updateConnectionsFromNodes();
      this.save();
    }
  }
  
  private updateConnectionsFromNodes() {
    const connections: ConnectionInfo[] = [];
    
    this.controller.nodes.forEach(targetNode => {
      targetNode.dependsOn.forEach(sourceId => {
        const sourceNode = this.controller.nodes.find(n => n.id === sourceId);
        if (!sourceNode) return;
        
        const sourceEl = this.shadowRoot?.querySelector(`node-box[nodeId="${sourceId}"]`);
        const targetEl = this.shadowRoot?.querySelector(`node-box[nodeId="${targetNode.id}"]`);
        
        if (sourceEl && targetEl) {
          const sourceRect = sourceEl.getBoundingClientRect();
          const targetRect = targetEl.getBoundingClientRect();
          
          connections.push({
            sourceId,
            targetId: targetNode.id,
            sourceX: sourceRect.right,
            sourceY: sourceRect.top + sourceRect.height / 2,
            targetX: targetRect.left,
            targetY: targetRect.top + targetRect.height / 2
          });
        }
      });
    });
    
    this.connections = connections;
  }

  private save() {
    try {
      localStorage.setItem('flow-data', this.controller.serialize());
    } catch (error) {
      console.warn("Failed to save flow data:", error);
    }
  }

  override render() {
    return html`
      <div class="canvas-container"
        @connection-start=${this.handleConnectionStart}
        @connection-move=${this.handleConnectionMove}
        @connection-end=${this.handleConnectionEnd}
      >
        <div class="toolbar">
          <button @click=${this.handleAddNode}>+ Add Node</button>
        </div>
        
        <connection-layer 
          .connections=${this.connections}
          .draggingConnection=${this.draggingConnection}
        ></connection-layer>
        
        ${this.controller.nodes.map(node => html`
          <node-box
            data-id=${node.id}
            .nodeId=${node.id}
            .x=${node.x}
            .y=${node.y}
            .w=${node.w}
            .h=${node.h}
            @node-dragged=${this.handleDragNode}
            @node-resized=${this.handleResizeNode}
            @node-delete=${this.handleDeleteNode}
          ></node-box>
        `)}
      </div>
    `;
  } 
}

interface NodeBox extends HTMLElement {
  nodeId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}