import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class InvokeFilterDisplay extends AsyncTemplate {
  constructor(data) {
    super();
    this.set('data', data);
  }
  async init() {
    const entries = [];
    for(let item of this.data) {
      const entry = { address: item.slice(0, 42) };
      if(item.length > 42) {
        const funSig = '0x' + item.slice(42, 50);
          console.log(entry.address, funSig);
        let funName;
        try {
          const contract = await selfDescribingContract(entry.address);
          funName = contract.options.jsonInterface.filter(x => x.signature === funSig)[0].name;
        } catch(error) {
          funName = 'Unknown Function';
        }
        entry.funSig = funSig;
        entry.funName = funName;
      }
      entries.push(entry);
    }
    this.set('entries', entries);
  }
  async render() {
    if(this.entries.length === 0) {
      return html`No Filter! Any contract/method allowed`;
    }
    return html`
      <ul>
      ${this.entries.map(entry => html`
        <li>
          <dl>
            <dt>Contract Address</dt>
            <dd>${entry.address}</dd>
            <dt>Function</dt>
            <dd>${entry.funSig ? html`${entry.funName} (${entry.funSig})` : 'Any Method'}</dd>
          </dl>
        </li>
      `)}
      </ul>
    `;
  }
}

