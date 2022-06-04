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
      this.displayError(error);
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
      <nav class="breadcrumbs">
        <ol>
          <li><a @click="${this.route}" href="/groups">Groups</a></li>
          <li><a @click="${this.route}" href="/group/${this.groupAddress}">${this.ellipseAddress(this.groupAddress)}</a></li>
          <li>Deploy New Child Contract</li>
        </ol>
      </nav>
      <h2>Deploy New Child Contract for Group ${this.ellipseAddress(this.groupAddress)}</h2>
      ${this._loading ? html`
        <p>Loading...</p>
      ` : html`
        <form @submit=${this.submit}>
          <fieldset>
            <legend>Child Contract Options</legend>
            <label>
              <span>Select Contract Type to Deploy</span>
              <select ${ref(this.selType)} @change="${this.selTypeChanged}">
                ${Object.keys(DeployChild.types).map(typeName => html`
                  <option>${typeName}</option>
                `)}
              </select>
            </label>
            <div ${ref(this.childOptions)}>
              ${DeployChild.types[this._selTypeValue].tpl}
            </div>
            <div class="commands">
              <button type="submit">Deploy</button>
            </div>
          </fieldset>
        </form>
      `}
    `;
  }
}
customElements.define('deploy-child', DeployChild);
