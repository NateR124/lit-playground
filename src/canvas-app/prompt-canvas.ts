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
    
    .tooltip {
      position: absolute;
      background: rgba(50, 50, 50, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 100;
      pointer-events: none;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
      max-width: 200px;
      text-align: center;
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
  
  @state() private tooltipInfo: {
    visible: boolean;
    text: string;
    x: number;
    y: number;
  } = {
    visible: false,
    text: '',
    x: 0,
    y: 0
  };

  private tooltipTimer: number | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    try {
      const saved = localStorage.getItem('flow-data');
      if (saved) this.controller.deserialize(saved);
      else this.controller.addNode(200, 150);
      
      // Rebuild connections based on dependsOn arrays
      this.updateConnectionsFromNodes();
    } catch (error) {
      console.warn("Failed to load flow data:", error);
      this.controller.addNode(200, 150);
    }
    
    // Add event listener for potential connection drop outside nodes
    window.addEventListener('mouseup', this.handleGlobalMouseUp);
  }
  
  override disconnectedCallback(): void {
    window.removeEventListener('mouseup', this.handleGlobalMouseUp);
    if (this.tooltipTimer !== null) {
      window.clearTimeout(this.tooltipTimer);
      this.tooltipTimer = null;
    }
    super.disconnectedCallback();
  }

  private handleAddNode() {
    this.controller.addNode(100 + Math.random() * 400, 100 + Math.random() * 300);
    this.requestUpdate();
    this.save();
  }

  private handleDeleteNode(e: CustomEvent) {
    // Remove connections involving this node
    const { id } = e.detail;
    
    // Remove node from controller
    this.controller.removeNode(id);
    
    // Update connections
    this.updateConnectionsFromNodes();
    
    this.requestUpdate();
    this.save();
  }

  private handleResizeNode(e: CustomEvent) {
    const { id, w, h } = e.detail;
    this.controller.updateNodeSize(id, w, h);
    
    // Update connections after resize
    this.updateConnectionsFromNodes();
    
    this.requestUpdate();
    this.save();
  }

  private handleDragNode(e: CustomEvent) {
    const { id, x, y } = e.detail;
    this.controller.updateNodePosition(id, x, y);
    
    // Update connection positions
    this.updateConnectionsFromNodes();
    
    this.requestUpdate();
    this.save();
  }
  
  // Connection events
  private handleConnectionStart(e: CustomEvent) {
    const { id, x, y } = e.detail;
    console.log('Connection start', id, x, y);
    
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
    
    // Update target node highlighting
    this.findNodeAtPosition(x, y);
    
    this.requestUpdate();
  }
  
  private handleConnectionEnd(e: CustomEvent) {
    if (!this.draggingConnection) return;
    
    // Clear tooltip
    this.tooltipInfo = { ...this.tooltipInfo, visible: false };
    if (this.tooltipTimer !== null) {
      window.clearTimeout(this.tooltipTimer);
      this.tooltipTimer = null;
    }
    
    // Find which node (if any) the connection ends on
    const { x, y } = e.detail;
    const targetElement = this.findNodeAtPosition(x, y);
    
    if (targetElement && this.isValidConnectionTarget(this.draggingConnection.sourceId, targetElement)) {
      // Create a connection
      const targetId = (targetElement as any).nodeId || 
                       targetElement.getAttribute('nodeId') || 
                       targetElement.getAttribute('data-id');
      if (targetId) {
        this.createConnection(this.draggingConnection.sourceId, targetId);
      }
    }
    
    // Remove highlighting from all nodes
    const elements = this.shadowRoot?.querySelectorAll('node-box');
    if (elements) {
      elements.forEach(el => {
        el.classList.remove('connection-target');
        el.classList.remove('invalid-target');
      });
    }
    
    // Clear dragging state
    this.draggingConnection = null;
    this.requestUpdate();
  }
  
  private handleGlobalMouseUp = () => {
    if (this.draggingConnection) {
      // Clear tooltip
      this.tooltipInfo = { ...this.tooltipInfo, visible: false };
      if (this.tooltipTimer !== null) {
        window.clearTimeout(this.tooltipTimer);
        this.tooltipTimer = null;
      }
      
      this.draggingConnection = null;
      this.requestUpdate();
    }
  };
  
  // Helper methods
  private findNodeAtPosition(x: number, y: number) {
    const elements = this.shadowRoot?.querySelectorAll('node-box');
    if (!elements) return null;
    
    // First, remove highlight from all nodes
    elements.forEach(el => {
      el.classList.remove('connection-target');
      el.classList.remove('invalid-target');
    });
    
    // Clear any existing tooltip timer
    if (this.tooltipTimer !== null) {
      window.clearTimeout(this.tooltipTimer);
      this.tooltipTimer = null;
    }
    
    // Hide tooltip when not over any node
    this.tooltipInfo = { ...this.tooltipInfo, visible: false };
    
    for (const element of Array.from(elements)) {
      const rect = element.getBoundingClientRect();
      if (
        x >= rect.left && 
        x <= rect.right && 
        y >= rect.top && 
        y <= rect.bottom
      ) {
        // Get source node ID
        if (this.draggingConnection) {
          const sourceId = this.draggingConnection.sourceId;
          
          // Check if this is a valid target
          const validationResult = this.validateConnectionTarget(sourceId, element);
          
          if (validationResult.isValid) {
            element.classList.add('connection-target');
          } else {
            element.classList.add('invalid-target');
            
            // Set up tooltip with delay
            this.tooltipTimer = window.setTimeout(() => {
              this.tooltipInfo = {
                visible: true,
                text: validationResult.reason,
                x: x + 10, // Offset from cursor
                y: y + 20
              };
              this.requestUpdate();
            }, 500); // 500ms delay
          }
        }
        return element;
      }
    }
    
    return null;
  }
  
  // Enhanced validation that returns a reason
  private validateConnectionTarget(sourceId: string, targetElement: Element | null): { isValid: boolean; reason: string } {
    if (!targetElement) {
      return { isValid: false, reason: 'No target node found' };
    }
    
    // Try different ways to get the ID
    const targetId = targetElement.getAttribute('data-id');
    
    // Check if the targetId is null
    if (targetId === null) {
      return { isValid: false, reason: 'Target node has no ID' };
    }
    
    // Check if this is the same node (self-connection)
    if (sourceId === targetId) {
      return { isValid: false, reason: 'Cannot connect a node to itself' };
    }
    
    // Get target node data model
    const targetNode = this.controller.nodes.find(n => n.id === targetId);
    if (!targetNode) {
      return { isValid: false, reason: 'Target node not found in data model' };
    }
    
    // Check for cycle - if target already depends on source directly or indirectly
    if (this.wouldCreateCycle(sourceId, targetId)) {
      return { isValid: false, reason: 'This would create a circular dependency' };
    }
    
    // Add more validation criteria here as needed
    
    return { isValid: true, reason: '' };
  }
  
  private isValidConnectionTarget(sourceId: string, targetElement: Element | null): boolean {
    return this.validateConnectionTarget(sourceId, targetElement).isValid;
  }
  
  // Check if adding a connection would create a dependency cycle
  private wouldCreateCycle(sourceId: string, targetId: string): boolean {
    // Quick check - direct cycle
    const targetNode = this.controller.nodes.find(n => n.id === targetId);
    if (!targetNode) return false;
    
    // If source already depends on target, this would create a cycle
    if (this.isDependentOn(targetId, sourceId)) {
      return true;
    }
    
    return false;
  }
  
  // Recursively check if nodeA depends on nodeB
  private isDependentOn(nodeAId: string, nodeBId: string): boolean {
    const nodeA = this.controller.nodes.find(n => n.id === nodeAId);
    if (!nodeA) return false;
    
    // Direct dependency check
    if (nodeA.dependsOn.includes(nodeBId)) return true;
    
    // Recursive check through all dependencies
    for (const depId of nodeA.dependsOn) {
      if (this.isDependentOn(depId, nodeBId)) return true;
    }
    
    return false;
  }
  
  private createConnection(sourceId: string, targetId: string) {
    // Find the target node in our data model
    const targetNode = this.controller.nodes.find(n => n.id === targetId);
    if (!targetNode) return;
    
    // Add the dependency if it doesn't already exist
    if (!targetNode.dependsOn.includes(sourceId)) {
      targetNode.dependsOn.push(sourceId);
      this.updateConnectionsFromNodes();
      this.save();
    }
  }
  
  private updateConnectionsFromNodes() {
    const connections: ConnectionInfo[] = [];
    
    // Wait for rendering to complete before calculating positions
    requestAnimationFrame(() => {
      this.controller.nodes.forEach(targetNode => {
        targetNode.dependsOn.forEach(sourceId => {
          const sourceNode = this.controller.nodes.find(n => n.id === sourceId);
          if (!sourceNode) return;
          
          // Find the elements to get their positions
          const sourceEl = this.shadowRoot?.querySelector(`node-box[nodeId="${sourceId}"]`);
          const targetEl = this.shadowRoot?.querySelector(`node-box[nodeId="${targetNode.id}"]`);
          
          if (sourceEl && targetEl) {
            // Find the handle element to get its exact position
            const sourceHandle = sourceEl.shadowRoot?.querySelector('.handle.out');
            const sourceRect = sourceEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            
            let sourceX, sourceY;
            
            if (sourceHandle) {
              // Use the handle position if available
              const handleRect = sourceHandle.getBoundingClientRect();
              sourceX = handleRect.left + handleRect.width / 2;
              sourceY = handleRect.top + handleRect.height / 2;
            } else {
              // Fallback to the right center of the node
              sourceX = sourceRect.right;
              sourceY = sourceRect.top + sourceRect.height / 2;
            }
            
            connections.push({
              sourceId,
              targetId: targetNode.id,
              sourceX,
              sourceY,
              targetX: targetRect.left,
              targetY: targetRect.top + targetRect.height / 2
            });
          }
        });
      });
      
      this.connections = connections;
      this.requestUpdate();
    });
  }

  private save() {
    try {
      localStorage.setItem('flow-data', this.controller.serialize());
    } catch (error) {
      console.warn("Failed to save flow data:", error);
    }
  }

  // First update right after connecting to make sure connections are shown
  override firstUpdated() {
    this.updateConnectionsFromNodes();
  }

  // Also update whenever render completes to ensure connection positions are accurate
  override updated() {
    this.updateConnectionsFromNodes();
  }

  override render() {
    return html`
      <div class="canvas-container">
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
            @connection-start=${this.handleConnectionStart}
            @connection-move=${this.handleConnectionMove}
            @connection-end=${this.handleConnectionEnd}
          ></node-box>
        `)}
        
        ${this.tooltipInfo.visible ? html`
          <div class="tooltip" 
               style="top: ${this.tooltipInfo.y}px; left: ${this.tooltipInfo.x}px">
            ${this.tooltipInfo.text}
          </div>
        ` : ''}
      </div>
    `;
  } 
}