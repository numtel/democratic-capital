import {Template, html} from '/utils/Template.js';

export default class Home extends Template {
  constructor() {
    super();
    document.title = 'Democratic Capital';
  }
  render() {
    return html`
      <p>Welcome!</p>
      <a href="/${config.contracts.VerifiedGroupFactory.address}" $${this.link}>Groups!</a>
    `;
  }
}
