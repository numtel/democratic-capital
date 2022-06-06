import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {InvokePrefixesFieldset} from './InvokePrefixesFieldset.js';

export class NewElectionsByMedian extends BaseElement {
  static properties = {
    groupAddress: {type: String},
  };
  constructor() {
    super();
  }
  extractValues() {
    return [ this.querySelector('invoke-prefixes-fieldset').extractPrefixes(), this.querySelector('input[name="name"]').value];
  }
  render() {
    return html`
      <p>Allow users to create proposals which call functions on the main group contract.</p>
      <p>The duration, majority threshold, and minimum participation parameters of these elections are set by the median values specified by each user.</p>
      <label>
        <span>Name</span>
        <input name="name">
      </label>
      <invoke-prefixes-fieldset groupAddress="${this.groupAddress}"></invoke-prefixes-fieldset>
    `;
  }
}
customElements.define('new-elections-by-median', NewElectionsByMedian);
