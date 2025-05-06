// canvas-app/canvas-app.ts
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../node-box/node-box.js';

interface NodeData{
  id:string;
  x:number;
  y:number;
  w:number;
  h:number;
}

@customElement('prompt-canvas')
export class PromptCanvas extends LitElement {
  static override styles = css`
    :host{display:block;height:100vh;width:100vw;}
    .toolbar{
      position:fixed;top:10px;left:10px;z-index:10;
      display:flex;gap:.5rem;
    }
    button{
      padding:.4rem .6rem;border:none;border-radius:4px;
      background:#444;color:#fff;cursor:pointer;font-size:.9rem;
    }
  `;

  @state() private nodes: NodeData[] = [];

  override connectedCallback() {
    super.connectedCallback();
    const saved = localStorage.getItem('prompt-nodes');
    if (saved) this.nodes = JSON.parse(saved);
  }

  private save() {
    localStorage.setItem('prompt-nodes', JSON.stringify(this.nodes));
  }

  private addNode() {
    this.nodes = [...this.nodes, { id:crypto.randomUUID(), x:100, y:100, w:200, h:230 }];
    this.save();
  }

  private onNodeMoved(e:CustomEvent){
    const {id,x,y} = e.detail;
    this.nodes = this.nodes.map(n => n.id===id ? {...n,x,y} : n);
    this.save();
  }

  private onNodeResized(e:CustomEvent){
    const {id,w,h} = e.detail;
    this.nodes = this.nodes.map(n => n.id===id ? {...n,w,h} : n);
    this.save();
  }

  private onNodeDelete(e: CustomEvent) {
    const { id } = e.detail;
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.save();
  }

  override render() {
    return html`
      <link rel="stylesheet" href="./canvas-app/styles.css">
      <div class="toolbar">
        <button @click=${this.addNode}>＋ Node</button>
      </div>
      <div class="grid-bg"
        @node-dragged=${this.onNodeMoved}
        @node-delete=${this.onNodeDelete}
        @node-resized=${this.onNodeResized}  
      >    
        ${this.nodes.map(n => html`<prompt-node id=${n.id} .x=${n.x} .y=${n.y} .w=${n.w} .h=${n.h}></prompt-node>`)}
      </div>
    `;
  }
}
