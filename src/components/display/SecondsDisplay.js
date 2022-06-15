import {Template, html} from '/utils/Template.js';
import {remaining} from '/utils/index.js';

export default class SecondsDisplay extends Template {
  constructor(data) {
    super();
    this.set('data', data);
  }
  render() {
    return html`
      ${remaining(Number(this.data))}
    `;
  }
}


