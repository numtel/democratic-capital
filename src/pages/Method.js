import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, isAddress} from '/utils/index.js';
import ERC20 from '/utils/ERC20.js';
import Input from '/components/Input.js';
import TopMenu from '/components/TopMenu.js';

export default class Details extends AsyncTemplate {
  constructor(address, method, parent) {
    super();
    this.set('address', address);
    this.set('method', method);
    this.set('parent', parent);
    this.set('needsApproval', null);
    this.set('insufficientBalance', null);
  }
  async init() {
    const BN = app.web3.utils.BN;
    this.contract = await selfDescribingContract(this.address);
    this.methodMeta = this.contract.metadata.methods[this.method];
    this.inputs = this.contract.options.jsonInterface
      .filter(x => x.name === this.method)[0].inputs
      .map((input, index) =>
        Object.assign(input,
          'fields' in this.methodMeta
          ? this.methodMeta.fields[index] : {}));
    this.tokens = []
    this.set('needsApproval', null);
    this.set('insufficientBalance', null);
    if(this.methodMeta.approve) {
      for(let tokenAddress of this.methodMeta.approve) {
        let args = [];
        if(Array.isArray(tokenAddress)) {
          args = tokenAddress.slice(1);
          tokenAddress = tokenAddress[0];
        }
        if(tokenAddress in this.contract.methods) {
          tokenAddress = await this.contract.methods[tokenAddress](args).call();
        }
        if(!isAddress(tokenAddress)) {
          this.tokens.push(null);
          continue;
        }
        const accounts = await app.wallet.accounts;
        const token = new ERC20(tokenAddress);
        const approval = await token.allowance(accounts[0], this.address);
        const balance = await token.balanceOf(accounts[0]);
        let value;
        if(('approveAmount' in this.methodMeta)
            && this.methodMeta.approveAmount[this.tokens.length]) {
          const amountFun = this.methodMeta.approveAmount[this.tokens.length];
          value = new BN(await this.contract.methods[amountFun]().call());
        } else {
          value = new BN(this[`arg_${this.tokens.length}`] || 0);
        }
        if((new BN(balance)).lt(value)) {
          this.set('insufficientBalance', this.tokens.length);
        }
        if((new BN(approval)).lt(value)) {
          this.set('needsApproval', this.tokens.length);
        }
        this.tokens.push({ token, approval, balance, value });
      }
    }
    if('thisToken' in this.methodMeta) {
      const accounts = await app.wallet.accounts;
      const token = new ERC20(this.address);
      const balance = await token.balanceOf(accounts[0]);
      const value = new BN(this[`arg_${this.thisToken}`] || 0);
      this.tokens[this.methodMeta.thisToken] = {token,approval:null,balance,value}
      if((new BN(balance)).lt(value)) {
        this.set('insufficientBalance', this.methodMeta.thisToken);
      }
    }
    document.title =`${this.contract.metadata.name}: ${this.method}`;
  }
  async render() {
    const BN = app.web3.utils.BN;
    const inputTpls = [];
    for(let index = 0; index < this.inputs.length; index++) {
      const input = this.inputs[index];
      if(this.tokens[index] && !('hint' in input)) {
        input.hint = 'Balance: ' + this.tokens[index].balance;
      }
      if(!(`arg_${index}` in this)) {
        this[`arg_${index}`] = input.internalType.endsWith('[]') ? [] : '';
      }
      inputTpls.push(new Input(
        input,
        `arg_${index}`,
        this.parent || this.address,
        (value) => {
          this[`arg_${index}`] = value;
          if(this.tokens[index]) {
            this.tokens[index].value = new BN(value);
          }
          this.set('needsApproval', null);
          this.set('insufficientBalance', null);
          for(let i = 0; i<this.tokens.length; i++) {
            const token = this.tokens[i];
            if((new BN(token.balance)).lt(token.value)) {
              this.set('insufficientBalance', i);
            }
            if(token.approval !== null && (new BN(token.approval)).lt(token.value)) {
              this.set('needsApproval', i);
            }
          }
        },
        this[`arg_${index}`],
        this.address
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
              ${this.insufficientBalance !== null ? html`
                <button type="submit">Insufficient Balance (${await this.tokens[this.insufficientBalance].value} ${await this.tokens[this.insufficientBalance].token.symbol()})</button>
              ` : this.needsApproval !== null ? html`
                <button type="submit">Approve Spend (${await this.tokens[this.needsApproval].value} ${await this.tokens[this.needsApproval].token.symbol()})</button>
              ` : html`
                <button type="submit">Submit</button>
              `}
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
      if(this.insufficientBalance !== null) {
        alert('Insufficient Balance!');
      } else if(this.needsApproval !== null) {
        const approval = this.tokens[this.needsApproval];
        await approval.token.approve(this.address, approval.value);
        await this.superInit();
      } else {
        await app.wallet.send(this.contract.methods[this.method](...args));
        let parentUrl = '/' + this.address;
        if(this.parent) parentUrl = '/' + this.parent + parentUrl;
        app.router.goto(parentUrl);
      }
    } catch(error) {
      alert(error);
    }
  }
}
