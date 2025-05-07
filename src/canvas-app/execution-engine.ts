// src/canvas-app/execution-engine.ts

import { NodeData } from './flow-controller';

export interface ExecutionNodeState {
  id: string;
  status: 'idle' | 'waiting' | 'running' | 'complete' | 'error';
  output: string;
  error?: string;
}

export class ExecutionEngine {
  private nodeStates: Map<string, ExecutionNodeState> = new Map();
  private controller: any; // Reference to FlowController
  
  constructor(controller: any) {
    this.controller = controller;
  }
  
  async executeFlow() {
    // Initialize all nodes to idle state
    this.initNodeStates();
    
    // Get nodes with no dependencies (starting nodes)
    const startNodes = this.controller.nodes.filter(
      (node: NodeData) => !node.dependsOn || node.dependsOn.length === 0
    );
    
    // Start executing from start nodes
    const executionPromises: Promise<void>[] = startNodes.map((node: NodeData) => this.executeNode(node.id));
    
    // Wait for all executions to complete
    await Promise.all(executionPromises);
  }
  
  private initNodeStates() {
    this.nodeStates.clear();
    this.controller.nodes.forEach((node: NodeData) => {
      this.nodeStates.set(node.id, {
        id: node.id,
        status: 'idle',
        output: '',
      });
    });
  }
  
  private async executeNode(nodeId: string) {
    // Get node state
    const nodeState = this.nodeStates.get(nodeId);
    if (!nodeState) return;
    
    // Set status to waiting until dependencies are resolved
    nodeState.status = 'waiting';
    
    // Get node data
    const node = this.controller.nodes.find((n: NodeData) => n.id === nodeId);
    if (!node) return;
    
    // Check if dependencies are complete
    if (node.dependsOn && node.dependsOn.length > 0) {
      // Wait for all dependencies to complete
      const dependencyPromises: Promise<void>[] = node.dependsOn.map((depId: string) => this.waitForNodeCompletion(depId));
      await Promise.all(dependencyPromises);
      
      // Concatenate outputs from dependencies
      const inputText = this.concatenateDependencyOutputs(node.dependsOn);
      
      // Execute node with concatenated input
      await this.callOpenAI(nodeId, node.systemPrompt, inputText);
    } else {
      // Execute node with its own input
      await this.callOpenAI(nodeId, node.systemPrompt, node.input);
    }
    
    // Check for nodes that depend on this one and execute them
    const dependentNodes = this.controller.nodes.filter(
      (n: NodeData) => n.dependsOn && n.dependsOn.includes(nodeId)
    );
    
    // Start execution of dependent nodes (they will wait for their other dependencies)
    const executionPromises: Promise<void>[] = dependentNodes.map((n: NodeData) => this.executeNode(n.id));
    await Promise.all(executionPromises);
  }
  
  private async waitForNodeCompletion(nodeId: string) {
    // Wait until node status is complete
    while (true) {
      const state = this.nodeStates.get(nodeId);
      if (state && (state.status === 'complete' || state.status === 'error')) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  private concatenateDependencyOutputs(dependencyIds: string[]): string {
    return dependencyIds.map(id => {
      const state = this.nodeStates.get(id);
      return state ? state.output : '';
    }).join('\n\n');
  }
  
  private async callOpenAI(nodeId: string, systemPrompt: string, input: string) {
    const nodeState = this.nodeStates.get(nodeId);
    if (!nodeState) return;
    
    // Set status to running
    nodeState.status = 'running';
    
    try {
      // TODO: Replace with actual OpenAI API call
      // This is a placeholder for the actual API call
      nodeState.output = await this.mockOpenAICall(systemPrompt, input);
      nodeState.status = 'complete';
      
      // Update the node UI
      this.updateNodeUI(nodeId, nodeState.output);
    } catch (error) {
      nodeState.status = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      nodeState.error = errorMessage;
      this.updateNodeUI(nodeId, `Error: ${errorMessage}`);
    }
  }
  
  private async mockOpenAICall(systemPrompt: string, input: string): Promise<string> {
    // This is a placeholder for testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `Response to: ${input}\nWith system prompt: ${systemPrompt}`;
  }
  
  private updateNodeUI(nodeId: string, output: string) {
    // Find the node-box element and update its output
    const nodeBox = document.querySelector(`node-box[data-id="${nodeId}"]`);
    if (nodeBox) {
      (nodeBox as any).output = output;
    }
  }
  
  // Method to get current state of all nodes
  getNodeStates(): Map<string, ExecutionNodeState> {
    return this.nodeStates;
  }
}