import {Template, html} from '/utils/Template.js';

export default class Loader extends Template {
  render() {
    return html`
      <div class="loader">
        <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
      </div>
    `;
  }
}

