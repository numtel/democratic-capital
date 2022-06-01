import {html, css, ref} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {ElectionsByMedianDetails} from './ElectionsByMedianDetails.js';

export class ChildDetails extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    childType: {type: String},
    childAddress: {type: String},
    _loading: {state: true},
    _details: {state: true},
  };
  static typeDetails = {
    ElectionsByMedian: {
      tpl: (parent) => html`
        <elections-by-median-details address="${parent.childAddress}"></elections-by-median-details>
      `
    }
  };
  constructor() {
    super();
    this._loading = true;
    this._details = {};
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    const groupContract = await this.loadContract('VerifiedGroup', this.groupAddress);
    this._details.isAllowed = await groupContract.methods.contractAllowed(this.childAddress).call();
    
    this._loading = false;
  }
  render() {
    return html`
      <a @click="${this.route}" href="/">Home</a>
      <a @click="${this.route}" href="/group/${this.groupAddress}">Group Details</a>
      <h2>${this.childType} at ${this.childAddress}</h2>
      <p>
        ${this._details.isAllowed
          ? 'Contract allowed to invoke on behalf of group.'
          : 'Contract is NOT allowed to invoke on behalf of group.'}
      </p>
      ${this.childType in ChildDetails.typeDetails
        ? ChildDetails.typeDetails[this.childType].tpl(this)
        : html`<p>There are no specific details for this type of child contract.</p>`}
    `;
  }
}
customElements.define('child-details', ChildDetails);
