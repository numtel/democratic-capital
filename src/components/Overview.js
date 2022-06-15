import {Template, html} from '/utils/Template.js';
import SecondsDisplay from '/components/display/SecondsDisplay.js';
import PercentageDisplay from '/components/display/PercentageDisplay.js';
import InvokeFilterDisplay from '/components/display/InvokeFilterDisplay.js';

export default class Overview extends Template {
  constructor(data) {
    super();
    this.set('data', data);
  }
  render() {
    return html`
      <table>
        <tbody>
      ${Object.keys(this.data).map(key => {
        const item = this.data[key];
        return html`
          <tr>
            <td>${key}</td>
            <td>
              ${!item.display
                ? item.result
              : item.display[0] === 'invokeFilter'
                ? new InvokeFilterDisplay(item.result)
              : item.display[0] === 'percentage'
                ? new PercentageDisplay(item.result, item.outputs[0].type)
              : item.display[0] === 'seconds'
                ? new SecondsDisplay(item.result)
              : item.result}
            </td>
          </tr>
        `})}
        </tbody>
      </table>
    `;
  }
}
