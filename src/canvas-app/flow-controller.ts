// canvas-app/flow-controller.ts

export interface NodeData {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    dependsOn: string[];
  }
  
  export class FlowController {
    public nodes: NodeData[] = [];
    // TODO: Implement Zoom/offset
    // public zoom = 1;
    // public offset = { x: 0, y: 0 };

    constructor(initialNodes: NodeData[] = []) {
      this.nodes = initialNodes;
    }

    addNode(x = 100, y = 100) {
      const id = crypto.randomUUID();
      const w = 200;
      const h = 230;
      this.nodes.push({ id, x, y, w, h, dependsOn: [] });
      return id;
    }
  
    removeNode(id: string) {
      this.nodes = this.nodes.filter((n) => n.id !== id);
    }
  
    updateNodePosition(id: string, x: number, y: number) {
      const node = this.nodes.find((n) => n.id === id);
      if (node) {
        node.x = x;
        node.y = y;
      }
    }
  
    updateNodeSize(id: string, w: number, h: number) {
      const node = this.nodes.find((n) => n.id === id);
      if (node) {
        node.w = w;
        node.h = h;
      }
    }

    // updateZoomAndOffset(scale: number, x: number, y: number) {
    //   this.zoom = scale;
    //   this.offset = { x, y };
    // }
  
    serialize() {
      return JSON.stringify({ nodes: this.nodes });
    }
  
    deserialize(data: string) {
      try {
        const parsed = JSON.parse(data);
        this.nodes = parsed.nodes || [];
      } catch (e) {
        console.warn("Failed to deserialize flow data", e);
      }
    }
  }