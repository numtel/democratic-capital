import {html, css, LitElement} from './lit-all.min.js';
import {AppRouter} from './AppRouter.js';

export class SimpleGreeting extends LitElement {

  static styles = css`p { color: blue }`;


  static properties = {

    name: {type: String},

  };


  constructor() {

    super();

    this.name = 'Somebody';

  }


  render() {

    return html`<p>Hello, ${this.name}!</p>`;

  }

}

customElements.define('simple-greeting', SimpleGreeting);
