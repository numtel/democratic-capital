import {Template, html} from '/utils/Template.js';

export default class Home extends Template {
  constructor() {
    super();
  }
  render() {
    return html`
      <p>Welcome!</p>
      <a href="/groups" $${this.link}>Groups!</a>
    `;
  }
}
