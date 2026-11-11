const {test} = require('node:test');
const assert = require('node:assert/strict');
const {toDisplayMessage} = require('../node-red/display-message');

test('converts plain MQTT numbers and project JSON to display arguments', () => {
  for (const payload of [23.5, '23.5', '{"value":23.5,"unit":"C","valid":true}',
    {value:23.5,unit:'C',valid:true}]) {
    assert.deepEqual(toDisplayMessage({payload}), {payload:'23.5'});
  }
  assert.deepEqual(toDisplayMessage({payload:'-40'}), {payload:'-40.0'});
  assert.deepEqual(toDisplayMessage({payload:'100'}), {payload:'100.0'});
});

test('drops malformed, invalid and out-of-range measurements before exec', () => {
  for (const payload of ['', 'hello', '23.5; touch /tmp/not-a-command', null, true,
    [], '"23.5"', 101, -41, Infinity, NaN, {value:23.5,unit:'C',valid:false},
    {value:23.5,unit:'F',valid:true}, {value:'23.5',unit:'C',valid:true}]) {
    assert.equal(toDisplayMessage({payload}), null);
  }
});

test('does not display retained readings or forward exec control fields', () => {
  assert.equal(toDisplayMessage({payload:23.5,retain:true}), null);
  assert.deepEqual(toDisplayMessage({payload:23.5,kill:'SIGTERM',pid:123}), {payload:'23.5'});
});
