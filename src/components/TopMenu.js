import {Template, html} from '/utils/Template.js';

export default class TopMenu extends Template {
  constructor(slot) {
    super();
    this.set('slot', slot);
  }
  render() {
    return html`
      <div class="top-menu-bar">
        <a href="/" $${this.link}>Home</a>
        <a href="/${config.contracts.VerifiedGroupFactory.address}" $${this.link}>All Groups<a>
        ${this.slot}
        <a href="https://github.com/numtel/democratic-capital" $${this.link}>Github</a>
      </div>
    `;
  }
}

