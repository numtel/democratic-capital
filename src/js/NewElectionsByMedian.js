import {html, css} from 'lit';
import {ref} from 'lit/directives/ref.js';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

// TODO add special case for further invoke filtering
export class NewElectionsByMedian extends BaseElement {
  static properties = {
    prefixes: {type: String, reflect: true},
    _loading: {state: true},
    _curAddPrefix: {state: true},
  };
  static available = {
    register: 'address',
    unregister: 'address',
    ban: 'address,uint256',
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
  selAddPrefix(select) {
    this._selAddPrefix = select;
  }
  addPrefix(event) {
    event.preventDefault();
    if(!this._selAddPrefix.value) return;
    const newPrefixes = this.prefixes.split(',').filter(x => !!x);
    if(newPrefixes.indexOf(this._selAddPrefix.value) > -1) return;
    newPrefixes.push(this._selAddPrefix.value);
    this._selAddPrefix.value = '';
    this.prefixes = newPrefixes.join(',');
  }
  removePrefix(event) {
    event.preventDefault();
    const toRemove = event.target.attributes['data-prefix'].value;
    const newPrefixes = this.prefixes.split(',').filter(x => x !== toRemove);
    this.prefixes = newPrefixes.join(',');
  }
  extractValues() {
    const allowedInvokePrefixes = this.prefixes.split(',')
      .filter(x => !!x)
      .map(prefix =>
        app.web3.utils.sha3(`${prefix}(${NewElectionsByMedian.available[prefix]})`)
          .slice(0, 10));
    return [ allowedInvokePrefixes ];
  }
  render() {
    return html`
      <p>Allow users to create proposals which call functions on the main group contract.</p>
      <p>The duration, majority threshold, and minimum participation parameters of these elections are set by the median values specified by each user.</p>
      <fieldset>
        <legend>Allowed Invoke Prefixes</legend>
        <fieldset>
          <legend>Add New Prefix</legend>
          <label>
            <span>New Prefix</span>
            <select ${ref(this.selAddPrefix)}>
              <option></option>
              ${Object.keys(NewElectionsByMedian.available).map(prefix => html`
                <option>${prefix}</option>
              `)}
            </select>
          </label>
          <div class="commands">
            <button @click="${this.addPrefix}" class="secondary">Add Prefix</button>
          </div>
        </fieldset>
        ${this.prefixes === '' ? html`
          <p>No prefixes defined, allow any proposals</p>
        ` : html`
          <p>Elections through this contract will only be allowed to invoke the following methods:</p>
          <ul>
          ${this.prefixes.split(',').map(prefix => html`
            <li>
              ${prefix}
              <button @click="${this.removePrefix}" data-prefix="${prefix}" class="secondary">Remove</button>
            </li>
          `)}
          </ul>
        `}
      </fieldset>
    `;
  }
}
customElements.define('new-elections-by-median', NewElectionsByMedian);
