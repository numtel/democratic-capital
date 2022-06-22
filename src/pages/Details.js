import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, explorer, applyDecimals, ZERO_ACCOUNT} from '/utils/index.js';
import FactoryBrowser from '/components/FactoryBrowser.js';
import AllowedContracts from '/components/AllowedContracts.js';
import Proposals from '/components/Proposals.js';
import TopMenu from '/components/TopMenu.js';
import Overview from '/components/Overview.js';
import Swap from '/components/Swap.js';
import Comments from '/components/Comments.js';
import ERC20 from '/utils/ERC20.js';

export default class Details extends AsyncTemplate {
  constructor(address, parent) {
    super();
    this.set('address', address);
    this.set('parent', parent);
    document.title = 'Item Details';
  }
  async init() {
    let accounts;
    // Instantiate contracts in first frame
    await Promise.all([
      (async () => accounts = await app.wallet.accounts)(),
      (async () => this.contract = await selfDescribingContract(this.address))(),
      (async () => this.parentContract = this.parent && await selfDescribingContract(this.parent))(),
    ]);

    // Load all other content in second frame
    this.display = [];
    if('display' in this.contract.metadata) {
      this.display =  Object.keys(this.contract.metadata.display).map(key => {
        const item = this.contract.metadata.display[key];
        return (
          key === 'FactoryBrowser' ?
            new FactoryBrowser(item.root
              ? ZERO_ACCOUNT
              : this.address) :
          key === 'Allowed' ? new AllowedContracts(this.address, this.parent) :
          key === 'Proposals' ? new Proposals(this.address, this.parent) :
          key === 'Swap' ? new Swap(this.address) :
          '');
      })
    }
    if(this.contract.metaname === 'VerifiedGroup') {
      this.display.push(new Comments(this.address, this.address));
    } else if(this.parent) {
      this.display.push(new Comments(this.address, this.parent));
    }
    const group = this.parent ? this.parentContract : this.contract;
    this.overview = this.contract.metadata.overview;
    const detailsTxs = [
      (async () => this.set('isAllowed', 'contractAllowed' in group.methods &&
        await group.methods.contractAllowed(accounts[0]).call()))(),
      (async () => this.set('isMember', 'isRegistered' in group.methods &&
        await group.methods.isRegistered(accounts[0]).call()))(),
      (async () => this.set('name', ('name' in this.contract.methods &&
        await this.contract.methods.name().call()) || this.contract.metaname))(),
      (async () => this.set('text', 'text' in this.contract.methods &&
        await this.contract.methods.text().call()))(),
    ];
    if(this.overview) {
      for(let key of Object.keys(this.overview)) {
        let funName = key;
        if('function' in this.overview[key]) {
          funName = this.overview[key].function;
        }
        const input = this.contract.options.jsonInterface
          .filter(x => x.name === funName)[0];
        this.overview[key] = Object.assign(this.overview[key], input);
        let args = [];
        if('args' in this.overview[key]) {
          args = this.overview[key].args.map(arg =>
            arg === 'account' ? accounts[0]
            : arg);
        }
        detailsTxs.push((async () => {
          try {
            this.overview[key].result = await this.contract.methods[funName](...args).call();
          } catch(error) {
            this.overview[key].result = null;
            console.error(error);
          }
        })());

        if('decimals' in this.overview[key]) {
          const tokenMethod = this.overview[key].decimals;
          detailsTxs.push((async () => {
            let decimals;
            if(tokenMethod === 'this') {
              this.overview[key].decimals = await this.contract.methods.decimals().call();
            } else if(Array.isArray(tokenMethod)) {
              const tokenAddress = await this.contract.methods[tokenMethod[0]](...tokenMethod.slice(1)).call();
              const token = new ERC20(tokenAddress);
              this.overview[key].decimals = await token.decimals();
            } else {
              const tokenAddress = await this.contract.methods[tokenMethod]().call();
              const token = new ERC20(tokenAddress);
              this.overview[key].decimals = await token.decimals();
            }
          })());
        }
      }
    }
    // Request second frame of RPC calls
    await Promise.all(detailsTxs);
    if(this.overview) {
      for(let key of Object.keys(this.overview)) {
        if('decimals' in this.overview[key] && this.overview[key].result !== null) {
          this.overview[key].result = applyDecimals(this.overview[key].result, this.overview[key].decimals);
        }
        if(typeof this.overview[key].result !== 'object' || this.overview[key].result === null) {
          this.overview[key].result = [this.overview[key].result];
        }
      }
    }
    document.title = this.name;
  }
  async render() {
    return html`
      ${new TopMenu(html`
        ${this.parent && html`
          <a href="/${this.parent}" $${this.link}>Back to Group</a>
        `}
      `)}
      <div class="blue window">
        <h2>${this.name}</h2>
        <p>Type: ${this.contract.metadata.name || this.contract.metaname}</p>
        <p><a href="${explorer(this.address)}" $${this.link}>${this.address}</a> ${this.contract.metaname}</p>
        ${this.text && html`<p>${this.text}</p>`}
        ${this.overview && new Overview(this.overview)}
        ${'methods' in this.contract.metadata && html`
          <menu>
            ${Object.keys(this.contract.metadata.methods).map(method =>
              (!this.contract.metadata.methods[method].onlyAllowed || this.isAllowed) &&
              (!this.contract.metadata.methods[method].onlyMember || this.isMember) && html`
                <li><a class="button" href="${app.router.path}/${method}" $${this.link}>${method}</a></li>
              `)}
          </menu>
        `}
      </div>
      ${this.display}
    `;
  }
}
