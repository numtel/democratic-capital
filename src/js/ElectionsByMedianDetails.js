import {html, css, ref} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

export class ElectionsByMedianDetails extends BaseElement {
  static properties = {
    address: {type: String},
    _loading: {state: true},
    _details: {state: true},
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
  proposalConfigView(raw) {
    const rawThreshold = Number(raw._threshold);
    return {
      duration: Number(raw._duration),
      threshold: rawThreshold === 16 ? 100 : 50 + (rawThreshold - 1) * (50/15),
      minParticipation: ((Number(raw._minParticipation) - 1) / 15) * 100,
    }
  }
  render() {
    return html`
      <h3>Foo bar</h3>
    `;
  }
}
customElements.define('elections-by-median-details', ElectionsByMedianDetails);
