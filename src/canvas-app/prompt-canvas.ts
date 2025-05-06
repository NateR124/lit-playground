// canvas-app/prompt-canvas.ts
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { FlowController } from './flow-controller';
import '../node-box/node-box';

@customElement('prompt-canvas')
export class PromptCanvas extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }
  `;

  @state() private controller = new FlowController();

  override connectedCallback(): void {
    super.connectedCallback();
    const saved = localStorage.getItem('flow-data');
    if (saved) this.controller.deserialize(saved);
    else this.controller.addNode(200, 150);
  }

  private handleAddNode() {
    this.controller.addNode(100 + Math.random() * 400, 100 + Math.random() * 300);
    this.requestUpdate();
    this.save();
  }

  private handleDeleteNode(e: CustomEvent) {
    this.controller.removeNode(e.detail.id);
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
  
    this.requestUpdate();
    this.save();
  }

  private save() {
    localStorage.setItem('flow-data', this.controller.serialize());
  }

  override render() {
    const connections = this.controller.nodes
      .flatMap(target => target.dependsOn.map(depId => {
        const fromEl = this.shadowRoot?.querySelector(`[data-id="${depId}"]`);
        const toEl   = this.shadowRoot?.querySelector(`[data-id="${target.id}"]`);

        return (fromEl && toEl)
          ? { from: fromEl.getBoundingClientRect(), to: toEl.getBoundingClientRect() }
          : null;
      }))
      .filter((x): x is { from: DOMRect; to: DOMRect } => x !== null);
  
    return html`
      <button style="position: absolute; top: 1rem; left: 1rem; z-index: 10" @click=${this.handleAddNode}>
        +
      </button>
  
      <connection-layer .connections=${connections}></connection-layer>
  
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
    `;
  } 
}
