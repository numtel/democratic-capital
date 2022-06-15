import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';
import Input from '/components/Input.js';
import TopMenu from '/components/TopMenu.js';

export default class Details extends AsyncTemplate {
  constructor(address, method, parent) {
    super();
    this.set('address', address);
    this.set('method', method);
    this.set('parent', parent);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    this.inputs = this.contract.options.jsonInterface
      .filter(x => x.name === this.method)[0].inputs
      .map((input, index) =>
        Object.assign(input, this.contract.metadata.methods[this.method].fields[index]));
    document.title =`${this.contract.metadata.name}: ${this.method}`;
  }
  async render() {
    const inputTpls = [];
    for(let index = 0; index < this.inputs.length; index++) {
      const input = this.inputs[index];
      this[`arg_${index}`] =
        input.internalType.endsWith('[]') ? [] : '';
      inputTpls.push(new Input(
        input,
        `arg_${index}`,
        this.parent || this.address,
        (value) => this[`arg_${index}`] = value
      ));
    }
    let parentUrl = '/' + this.address;
    if(this.parent) parentUrl = '/' + this.parent + parentUrl;
    return html`
      ${new TopMenu(html`
        <a href="${parentUrl}" $${this.link}>Back to ${this.contract.metaname}</a>
      `)}
      <div class="white window">
        <form onsubmit="tpl(this).submit(); return false">
          <fieldset>
            <legend>${this.contract.metadata.name}: ${this.method}</legend>
            ${inputTpls}
            <div class="commands">
              <button type="submit">Submit</button>
            </div>
          </fieldset>
        </form>
      </div>
    `;
  }
  async submit() {
    const args = Object.keys(this)
      .filter(key => key.startsWith('arg_'))
      .map(key => this[key]);
    try {
      await app.wallet.send(this.contract.methods[this.method](...args));
      let parentUrl = '/' + this.address;
      if(this.parent) parentUrl = '/' + this.parent + parentUrl;
      app.router.goto(parentUrl);
    } catch(error) {
      alert(error);
    }
  }
}
