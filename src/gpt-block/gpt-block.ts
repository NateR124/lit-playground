import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/button/filled-button.js';

@customElement('gpt-block')
export class GptBlock extends LitElement {
  static override styles = css`
  :host {
    display: block;
    width: 100%;
    max-width: 800px; /* Wider than before */
    border: 2px solid #ccc;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1rem auto;
    background: #fafafa;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    box-sizing: border-box;
  }

  div {
    margin-bottom: 1.25rem;
  }

  md-outlined-text-field {
    --md-outlined-text-field-container-height: auto;
    --md-outlined-text-field-input-text-size: 0.85rem; /* Smaller font */
    --md-outlined-text-field-label-text-size: 0.75rem;
    --md-outlined-text-field-container-padding-block: 0.75rem;
  }

  .output {
    background: #f0f0f0;
    padding: 1em;
    border-radius: 6px;
    border: 1px solid #ddd;
    white-space: pre-wrap;
    font-size: 0.85rem;
    min-height: 6em;
  }

  md-filled-button {
    font-size: 0.85rem;
    padding: 0.5rem 1rem;
  }
`;

  @state() private systemPrompt!: string;
  @state() private userInput!: string;
  @state() private output!: string;

  constructor() {
    super();
    this.systemPrompt = '';
    this.userInput = '';
    this.output = '';
  }

  private async handleRun() {
    // Fetch logic here
  }

  override render() {
    return html`
      <div>
        <md-outlined-text-field
          label="System Prompt"
          .value=${this.systemPrompt}
          @input=${(e: any) => this.systemPrompt = e.target.value}
          rows="3"
          textarea
          style="width: 100%;">
        </md-outlined-text-field>
      </div>
  
      <div>
        <md-outlined-text-field
          label="User Input (Optional)"
          .value=${this.userInput}
          @input=${(e: any) => this.userInput = e.target.value}
          rows="3"
          textarea
          style="width: 100%;">
        </md-outlined-text-field>
      </div>
      <div class="output">${this.output}</div>
       <md-filled-button @click=${this.handleRun}>
        ▶ Run
      </md-filled-button>
    `;
  }
}