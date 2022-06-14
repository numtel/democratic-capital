import {Template, html} from '/utils/Template.js';

export default class Verify extends Template {
  constructor() {
    super();
    document.title = 'Verification Required';
  }
  render() {
    return html`
      <p>Must be verified on Coinpassport!</p>
      <a href="https://coinpassport.net/" $${this.link}>Coinpassport</a>
    `;
  }
}

