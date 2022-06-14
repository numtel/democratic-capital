import {Template, html} from '/utils/Template.js';
import TopMenu from '/components/TopMenu.js';

export default class Verify extends Template {
  constructor() {
    super();
    document.title = 'Verification Required';
  }
  render() {
    return html`
      ${new TopMenu}
      <div class="blue window">
        <h2>Must be verified on Coinpassport!</h2>
        <p>All contributors to Democratic Capital must prove that they are a unique person by verifying their passport.</p>
        <p><a class="button" href="https://coinpassport.net/" $${this.link}>Open Coinpassport...</a></p>
      </div>
      </div>
    `;
  }
}

