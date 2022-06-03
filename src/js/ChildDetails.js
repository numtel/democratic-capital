import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {ElectionsByMedianDetails} from './ElectionsByMedianDetails.js';
import {OpenRegistrationsDetails} from './OpenRegistrationsDetails.js';
import {OpenUnregistrationsDetails} from './OpenUnregistrationsDetails.js';

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
    },
    OpenRegistrations: {
      tpl: (parent) => html`
        <open-registrations-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}"></open-registrations-details>
      `
    },
    OpenUnregistrations: {
      tpl: (parent) => html`
        <open-unregistrations-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}"></open-unregistrations-details>
      `
    },
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
    if(this._loading) return html`
      <p>Loading...</p>
    `;
    return html`
      <nav class="breadcrumbs">
        <ol>
          <li><a @click="${this.route}" href="/groups">Groups</a></li>
          <li><a @click="${this.route}" href="/group/${this.groupAddress}">${this.ellipseAddress(this.groupAddress)}</a></li>
          <li>${this.childType}: ${this.ellipseAddress(this.childAddress)}</li>
        </ol>
      </nav>
      <h2>${this.childType} at <a href="${this.explorer(this.childAddress)}" @click="${this.open}">${this.ellipseAddress(this.childAddress)}</a></h2>
      <p>
        ${this._details.isAllowed
          ? html`Contract allowed to invoke on behalf of group.`
          : html`Contract is <strong>not</strong> allowed to invoke on behalf of group.`}
      </p>
      ${this.childType in ChildDetails.typeDetails
        ? ChildDetails.typeDetails[this.childType].tpl(this)
        : html`<p>There are no specific details for this type of child contract.</p>`}
    `;
  }
}
customElements.define('child-details', ChildDetails);
