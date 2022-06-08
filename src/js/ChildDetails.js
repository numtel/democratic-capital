import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {ElectionsByMedianDetails} from './ElectionsByMedianDetails.js';
import {ElectionsSimpleDetails} from './ElectionsSimpleDetails.js';
import {ElectionsSimpleQuadraticDetails} from './ElectionsSimpleQuadraticDetails.js';
import {OpenRegistrationsDetails} from './OpenRegistrationsDetails.js';
import {OpenUnregistrationsDetails} from './OpenUnregistrationsDetails.js';
import {MemberTokenEmissionsDetails} from './MemberTokenEmissionsDetails.js';
import {RegistrationsByElectionsDetails} from './RegistrationsByElectionDetails.js';
import {RegistrationsByFeeDetails} from './RegistrationsByFeeDetails.js';
import {FundraiserDetails} from './FundraiserDetails.js';
import {GroupComments} from './GroupComments.js'

export class ChildDetails extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    childTypeStr: {type: String},
    childAddress: {type: String},
    _loading: {state: true},
    _error: {state: true},
    _details: {state: true},
  };
  static typeDetails = {
    ElectionsByMedian: {
      tpl: (parent) => html`
        <elections-by-median-details address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></elections-by-median-details>
      `
    },
    ElectionsSimple: {
      tpl: (parent) => html`
        <elections-simple-details address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></elections-simple-details>
      `
    },
    ElectionsSimpleQuadratic: {
      tpl: (parent) => html`
        <elections-simple-quadratic-details address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></elections-simple-quadratic-details>
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
    MemberTokenEmissions: {
      tpl: (parent) => html`
        <member-token-emissions-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></member-token-emissions-details>
      `
    },
    RegistrationsByElection: {
      tpl: (parent) => html`
        <registrations-by-election-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></registrations-by-election-details>
      `
    },
    RegistrationsByFee: {
      tpl: (parent) => html`
        <registrations-by-fee-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></registrations-by-fee-details>
      `
    },
    Fundraiser: {
      tpl: (parent) => html`
        <fundraiser-details groupAddress="${parent.groupAddress}" address="${parent.childAddress}" allowed="${parent._details.isAllowed}"></fundraiser-details>
      `
    },
  };
  constructor() {
    super();
    this._loading = true;
    this._error = false;
    this._details = {};
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    try {
      const groupContract = await this.loadContract('VerifiedGroup', this.groupAddress);
      this._details.isAllowed = await groupContract.methods.contractAllowed(this.childAddress).call();
      const childContract = await this.loadContract(this.childTypeStr, this.childAddress);
      this._details.name = await childContract.methods.name().call();
    } catch(error) {
      console.error(error);
      this._error = true;
    }
    
    this._loading = false;
  }
  render() {
    if(this._loading) return html`
      <main><p>Loading...</p></main>
    `;
    if(this._error) return html`
      <main><p>Invalid Contract!</p></main>
    `;
    return html`
      <nav class="breadcrumbs">
        <ol>
          <li><a @click="${this.route}" href="/groups">Groups</a></li>
          <li><a @click="${this.route}" href="/group/${this.groupAddress}">${this.ellipseAddress(this.groupAddress)}</a></li>
          <li>${this.childTypeStr}: ${this.ellipseAddress(this.childAddress)}</li>
        </ol>
      </nav>
      <h2>${this._details.name} <span class="child-type">${this.childTypeStr}</span></h2>
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
