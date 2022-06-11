import ABIDecoder from '/utils/ABIDecoder.js';
import {selfDescribingContract} from '/utils/index.js';
import {Template, html} from '/utils/Template.js';


const web3 = new Web3(config.rpc);
(async function() {
const test1 = await selfDescribingContract(web3, config.contracts.Test1.address);
const val = await test1.methods.test().call();
console.log('foo', val, test1.metadata);
})();

class Horse extends Template {
  constructor() {
    super();
    this.set('cow', new Cow);
    this.set('name', 'foo');
  }

  heyo() {
    this.set('name', prompt('Who?'));
  }
  link() {
    this.set('name', this.element.querySelector('input').value);
    return false;
  }

  render() {
    return html`
      <b>${this.name}</b>
      <button onclick="tpl(this).heyo()">Heyo</button>
      <a href="http://google.com" onclick="return tpl(this).link()">Foop</a>
      <form onsubmit="return tpl(this).link()">
        <input>
        <button type="submit">Fooooo</button>
      </form>
      ${this.cow}
    `
  }
}

class Cow extends Template {
  constructor() {
    super();
    this.set('name', 'foo');
  }
  heyo() {
    this.set('name', prompt('Who?'));
  }
  render() {
    return html`
      <em>${this.name}</em>
      <button onclick="tpl(this).heyo()">Heyo</button>
    `;
  }
}

const root = new Horse;
document.body.appendChild(root.element);


