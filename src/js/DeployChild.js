import {html, css} from 'lit';
import {ref} from 'lit/directives/ref.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {NewElectionsByMedian} from './NewElectionsByMedian.js';
import {NewOpenRegistrations} from './NewOpenRegistrations.js';
import {NewOpenUnregistrations} from './NewOpenUnregistrations.js';

export class DeployChild extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _loading: {state: true},
    _selTypeValue: {state: true},
  };
  static types = {
    ElectionsByMedian: {
      factory: 'ElectionsByMedianFactory',
      tpl: html`<new-elections-by-median></new-elections-by-median>`,
    },
    OpenRegistrations: {
      factory: 'OpenRegistrationsFactory',
      tpl: html`<new-open-registrations></new-open-registrations>`,
    },
    OpenUnregistrations: {
      factory: 'OpenUnregistrationsFactory',
      tpl: html`<new-open-unregistrations></new-open-unregistrations>`,
    },
  };
  constructor() {
    super();
    this._loading = true;
    this._selType = null;
    this._selTypeValue = Object.keys(DeployChild.types)[0];
    this._childOptions = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    await app.initialized;
    this._loading = false;
  }
  async submit(event) {
    event.preventDefault();
    try {
      const args = [ this.groupAddress ].concat(this._childOptions.children[0].extractValues());
      const factoryName = DeployChild.types[this._selTypeValue].factory;
      const factory = await this.loadContract(factoryName, window.config.contracts[factoryName].address);
      const events = (await this.send(factory.methods.deployNew(...args))).events;
      await this.route('/group/' + this.groupAddress + '/' + this._selTypeValue + '/' + events.NewDeployment.returnValues.deployed);
    } catch(error) {
      console.error(error);
      alert(error.reason || error.message || error);
    }
  }
  selType(select) {
    this._selType = select;
  }
  selTypeChanged(event) {
    this._selTypeValue = event.target.value;
  }
  childOptions(div) {
    this._childOptions = div;
  }
  render() {
    return html`
      <a @click="${this.route}" href="/">Home</a>
      <a @click="${this.route}" href="/group/${this.groupAddress}">Group Details</a>
      <h2>Deploy a new child contract for group ${this.groupAddress}</h2>
      ${this._loading ? html`
        <p>Loading...</p>
      ` : html`
        <form @submit=${this.submit}>
          <fieldset>
            <legend>Select Contract Type to Deploy</legend>
            <label>
              <select ${ref(this.selType)} @change="${this.selTypeChanged}">
                ${Object.keys(DeployChild.types).map(typeName => html`
                  <option>${typeName}</option>
                `)}
              </select>
            </label>
          </fieldset>
          <div ${ref(this.childOptions)}>
            ${DeployChild.types[this._selTypeValue].tpl}
          </div>
          <button type="submit">Deploy</button>
        </form>
      `}
    `;
  }
}
customElements.define('deploy-child', DeployChild);
