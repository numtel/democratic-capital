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
          ${key === 'registeredCount' && item.result === '1' && html`
            <tr>
              <td class="notice" colspan="2">
                This group only has one member. When a group only has one member, that person can perform any administrative action on the group contract directly.<br><br>Before another member is registered into the group, it is <strong>very</strong> important to allow a contract that has the capability to perform administrative actions, such as an elections contract or by allowing an individual's account as an allowed contract, in order to prevent the group from becoming stuck.
              </td>
            </tr>
          `}
        `})}
        </tbody>
      </table>
    `;
  }
}
