import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {ElectionsByMedianDetails} from './ElectionsByMedianDetails.js';
import {OpenRegistrationsDetails} from './OpenRegistrationsDetails.js';
import {OpenUnregistrationsDetails} from './OpenUnregistrationsDetails.js';
import {GroupComments} from './GroupComments.js'

export class ChildDetails extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    childTypeStr: {type: String},
    childAddress: {type: String},
    _loading: {state: true},
    _details: {state: true},
  };
  static typeDetails = {
    ElectionsByMedian: {
      tpl: (parent) => html`
        <elections-by-median-details address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></elections-by-median-details>
      `
    },
    OpenRegistrations: {
      tpl: (parent) => html`
        <open-registrations-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></open-registrations-details>
      `
    },
    OpenUnregistrations: {
      tpl: (parent) => html`
        <open-unregistrations-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></open-unregistrations-details>
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
      <main><p>Loading...</p></main>
    `;
    return html`
      <nav class="breadcrumbs">
        <ol>
          <li><a @click="${this.route}" href="/groups">Groups</a></li>
          <li><a @click="${this.route}" href="/group/${this.groupAddress}">${this.ellipseAddress(this.groupAddress)}</a></li>
          <li>${this.childTypeStr}: ${this.ellipseAddress(this.childAddress)}</li>
        </ol>
      </nav>
      <h2>${this.childTypeStr}</h2>
      ${this.childTypeStr in ChildDetails.typeDetails
        ? ChildDetails.typeDetails[this.childTypeStr].tpl(this)
        : html`
          <main>
            <h3>Overview</h3>
            <dl>
            <dt>Contract</dt>
            <dd><a href="${this.explorer(this.childAddress)}" @click="${this.open}">${this.childAddress}</a></dd>
            <dt>Allowed to Invoke</dt>
            <dd>
              ${this._details.isAllowed
                ? html`Yes`
                : html`<strong>No</strong>`}
            </dd>
          </main>
        `}
        <group-comments groupAddress="${this.groupAddress}" itemAddress="${this.childAddress}"></group-comments>
    `;
  }
}
customElements.define('child-details', ChildDetails);
