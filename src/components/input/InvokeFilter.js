import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, isAddress, isFunSig} from '/utils/index.js';
import Input from '/components/Input.js';

export default class InvokeFilter extends AsyncTemplate {
  constructor(group, onChange) {
    super();
    this.set('groupAddress', group);
    this.set('onChange', onChange);
    this.set('entries', []);
  }
  async init() {
    this.set('contractInput', new Input({
      name: 'Contract',
      select: [ 'Allowed', 'Children', 'NewlyDeployed' ],
    }, 'invoke_to', this.groupAddress, (value) => {
      this.set('addFilterContract', isAddress(value) ? value : undefined);
    }));
  }
  async render() {
    const entries = []
    for(let index = 0; index < this.entries.length; index++) {
      const entry = this.entries[index];
      let funName;
      try {
        const contract = await selfDescribingContract(entry[0]);
        if(entry[1]) {
          funName = contract.options.jsonInterface.filter(x => x.signature === entry[1])[0].name;
        }
      } catch(error) {
        funName = 'Unknown Function';
      }
      entries.push(html`
        <tr>
          <td>
            <dl>
              <dt>Contract Address</dt>
              <dd>${entry[0]}</dd>
              <dt>Function</dt>
              <dd>${entry[1] ? html`${funName} (${entry[1]})` : 'Any Method'}</dd>
            </dl>
          </td>
          <td>
            <button onclick="tpl(this).removeFilter(${index}); return false;">Remove</button>
          </td>
        </tr>
      `);
    }
    return html`
      <fieldset>
        <legend>Add Invoke Filter</legend>
        ${this.contractInput}
        ${this.addFilterContract && new Input({
          name: 'Method',
          contract:  this.addFilterContract,
          select: [ 'Methods' ],
        }, 'invoke_method', this.groupAddress)}
        <div class="commands">
          <button onclick="tpl(this).addFilter(); return false;">Allow this Method</button>
        </div>
      </fieldset>
      ${entries.length === 0 ? html`
        <p>No filters set, elections will be able to invoke any contract and method.</p>
      ` : html`
        <fieldset>
          <legend>Proposal Invoke Filters</legend>
          <table>
            ${entries}
          </table>
        </fieldset>
      `}
    `;
  }
  async addFilter() {
    const values = Array.from(this.element.querySelectorAll('input'))
      .map(input => input.value);
    if(!isAddress(values[0]) || (values[1] && !isFunSig(values[1]))) {
      alert('Invalid contract address or function signature!');
    } else {
      this.entries.push(values);
      this.filterChanged();
    }
  }
  async removeFilter(index) {
    this.entries.splice(index, 1);
    this.filterChanged();
  }
  filterChanged() {
    this.onChange(this.entries.map(entry => {
      let out = entry[0];
      if(entry[1]) out += entry[1].slice(2);
      return out;
    }));
    this.set();
  }
}

