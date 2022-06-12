import {Template, html} from '/utils/Template.js';

export default class GroupList extends Template {
  constructor(foo) {
    super();
    this.set('foo', foo);
  }
  render() {
    return html`
      <p>Groups! ${this.foo}</p>
      <a href="/deploy/${config.contracts.VerifiedGroupFactory.address}" $${this.link}>Deploy new</a>
    `;
  }
}

