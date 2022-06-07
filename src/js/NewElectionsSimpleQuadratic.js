import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {InvokePrefixesFieldset} from './InvokePrefixesFieldset.js';
import {remaining} from './utils.js';

export class NewElectionsSimpleQuadratic extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _duration: {state: true},
    _threshold: {state: true},
    _participation: {state: true},
  };
  constructor() {
    super();
    this._duration = 0;
    this._threshold = 0;
    this._participation = 0;
  }
  extractValues() {
    return [
      this.querySelector('invoke-prefixes-fieldset').extractPrefixes(),
      this._duration, this._threshold, this._participation,
      this.querySelector('input[name="token"]').value,
      this.querySelector('input[name="multiplier"]').value,
      this.querySelector('input[name="name"]').value
    ];
  }
  render() {
    return html`
      <p>Allow users to create proposals which call functions on the main group contract.</p>
      <p>The duration, majority threshold, minimum participation, quadratic token, and quadratic multiplier parameters of these elections are set now during deployment or later by the group.</p>
      <label>
        <span>Name</span>
        <input name="name">
      </label>
      <label>
        <span>Address of Token use for Quadratic Vote Payments</span>
        <input name="token" required pattern="^0x[a-fA-F0-9]{40}$">
      </label>
      <label>
        <span>Quadratic Multiplier</span>
        <input name="multiplier" type="number" min="1" step="1" value="1000000">
      </label>
      <p>The quadratic multiplier determines how much power each token has in an election. This value must account for any decimals of the token.</p>
      <p>For example:
      <ul>
        <li>The USDC token uses 6 decimals so any quadratic multiplier should have 6 trailing zeros in order to use whole tokens.</li>
        <li>Quadratic votes get one power free so to vote with a power of 4, a voter must supply 15 times the quadratic multiplier. (square root of 16 is 4)</li>
      </ul>
      <p>Therefore, a quadratic multiplier of 5000000 for a USDC token will require 5 USDC per quadratic unit.</p>
      <p>Resulting in a payment of 75 USDC (15 * 5) to vote with a power of 4 votes.</p>

      <fieldset>
        <legend>Election Parameters</legend>
        <div class="preview">
          <label>
            <span>Duration in Seconds</span>
            <input name="duration" @change="${this.paramChanged}" value="${this._duration}" type="number" min="0" step="1">
          </label>
          <span class="preview">
            ${remaining(this._duration)}
          </span>
        </div>
        <div class="preview">
          <label>
            <span>Majority Threshold</span>
            <input name="threshold" min="0" max="65535" type="range" step="1" @change="${this.paramChanged}" value="${this._threshold}">
          </label>
          <span class="preview">
            ${Math.round((this._threshold / 0xffff) * 100000) / 1000}%
          </span>
        </div>
        <div class="preview">
          <label>
            <span>Minimum Participation</span>
            <input name="participation" min="0" max="65535" type="range" step="1" @change="${this.paramChanged}" value="${this._participation}">
          </label>
          <span class="preview">
            ${Math.round((this._participation / 0xffff) * 100000) / 1000}%
          </span>
        </div>
      </fieldset>
      <invoke-prefixes-fieldset groupAddress="${this.groupAddress}"></invoke-prefixes-fieldset>
    `;
  }
  paramChanged(event) {
    this['_' + event.target.name] = Number(event.target.value);
  }
}
customElements.define('new-elections-simple-quadratic', NewElectionsSimpleQuadratic);


