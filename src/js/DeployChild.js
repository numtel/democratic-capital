import {html, css} from 'lit';
import {ref} from 'lit/directives/ref.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {NewElectionsByMedian} from './NewElectionsByMedian.js';
import {NewElectionsSimple} from './NewElectionsSimple.js';
import {NewOpenRegistrations} from './NewOpenRegistrations.js';
import {NewOpenUnregistrations} from './NewOpenUnregistrations.js';

export class DeployChild extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _loading: {state: true},
    _selTypeValue: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._selType = null;
    this._selTypeValue = Object.keys(this.childTypes)[0];
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
      const factoryName = this.childTypes[this._selTypeValue].factory;
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
      <h2>Deploy New Child Contract</h2>
      <main>
      ${this._loading ? html`
        <p>Loading...</p>
      ` : html`
        <form @submit=${this.submit}>
          <fieldset>
            <label>
              <span>Select Contract Type to Deploy</span>
              <select ${ref(this.selType)} @change="${this.selTypeChanged}">
                ${Object.keys(this.childTypes).map(typeName => html`
                  <option>${typeName}</option>
                `)}
              </select>
            </label>
            <div ${ref(this.childOptions)}>
              ${this.childTypes[this._selTypeValue].tpl}
            </div>
            <div class="commands">
              <button type="submit">Deploy</button>
            </div>
          </fieldset>
        </form>
      `}
      </main>
    `;
  }
}
customElements.define('deploy-child', DeployChild);
