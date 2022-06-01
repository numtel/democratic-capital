import {html, css, ifDefined, repeat, ref} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

export class DeployChild extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _loading: {state: true},
  };
  static types = {
    ElectionsByMedian: {
      tpl: html`<new-elections-by-median></new-elections-by-median>`,
    }
  };
  constructor() {
    super();
    this._loading = true;
  }
  async connectedCallback() {
    super.connectedCallback();
    await app.initialized;
    this._loading = false;
  }
  submit(event) {
    event.preventDefault();
    console.log(event);
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
            <legend>Contract Type</legend>
          </fieldset>
          ${DeployChild.types.ElectionsByMedian.tpl}
          <button type="submit">Deploy</button>
        </form>
      `}
    `;
  }
}
customElements.define('deploy-child', DeployChild);

// TODO add special case for further invoke filtering
class NewElectionsByMedian extends BaseElement {
  static properties = {
    prefixes: {type: String, reflect: true},
    _loading: {state: true},
    _curAddPrefix: {state: true},
  };
  static available = {
    register: 'address',
    unregister: 'address',
    ban: 'address',
    setVerifications: 'address',
    allowContract: 'address',
    disallowContract: 'address',
    invoke: 'address,bytes',
  };
  constructor() {
    super();
    this.prefixes = '';
    this._loading = true;
    this._curAddPrefix = '';
    this._selAddPrefix = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    await app.initialized;
    this._loading = false;
  }
  async changeAddPrefix(event) {
    this._curAddPrefix = event.target.value;
  }
  selAddPrefix(select) {
    this._selAddPrefix = select;
  }
  addPrefix(event) {
    event.preventDefault();
    if(!this._curAddPrefix) return;
    const newPrefixes = this.prefixes.split(',').filter(x => !!x);
    if(newPrefixes.indexOf(this._curAddPrefix) > -1) return;
    newPrefixes.push(this._curAddPrefix);
    this._curAddPrefix = '';
    this._selAddPrefix.value = '';
    this.prefixes = newPrefixes.join(',');
  }
  removePrefix(event) {
    event.preventDefault();
    const toRemove = event.target.attributes['data-prefix'].value;
    const newPrefixes = this.prefixes.split(',').filter(x => x !== toRemove);
    this.prefixes = newPrefixes.join(',');
  }
  render() {
    return html`
      <fieldset>
        <legend>Allowed Invoke Prefixes</legend>
        <fieldset>
          <legend>Add New Prefix</legend>
          <label>
            <span>New Prefix</span>
            <select ${ref(this.selAddPrefix)} @change="${this.changeAddPrefix}">
              <option selected=${ifDefined(this._curAddPrefix === '' ? 'selected' : undefined)}></option>
              ${repeat(Object.keys(NewElectionsByMedian.available), p => p, prefix => html`
                <option selected=${ifDefined(this._curAddPrefix === prefix ? 'selected' : undefined)}>${prefix}</option>
              `)}
            </select>
          </label>
          <button @click="${this.addPrefix}">Add Prefix</button>
        </fieldset>
        ${this.prefixes === '' ? html`
          <p>No prefixes defined, allow any proposals</p>
        ` : html`
          <ul>
          ${this.prefixes.split(',').map(prefix => html`
            <li>
              ${prefix}
              <button @click="${this.removePrefix}" data-prefix="${prefix}">Remove</button>
            </li>
          `)}
          </ul>
        `}
      </fieldset>
    `;
  }
}
customElements.define('new-elections-by-median', NewElectionsByMedian);
