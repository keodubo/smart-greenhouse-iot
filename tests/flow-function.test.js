const {test} = require('node:test');
const assert = require('node:assert/strict');
const {functionBody} = require('../node-red/build-flow');
const config = {prefix:'IIoT/test-only',relayTopic:'test-only/relay',onPayload:'1',offPayload:'0',
  calibrationConfirmed:true,emptyCm:20,fullCm:5,onBelow:18,offAt:22,lowBelow:20,lowClearAt:25,staleMs:15000};
function functionNode(demo=false) {
  const storage=new Map();
  const context={get:key=>storage.get(key),set:(key,value)=>storage.set(key,value)};
  const invoke=new Function('msg','context','node',functionBody(config,demo));
  return msg=>invoke(msg,context,{status:()=>{}});
}
test('live function routes MQTT measurements to relay, level and status outputs',()=>{
  const run=functionNode(); run({status:{fill:'green',text:'node-red:common.status.connected'}});
  run({kind:'arm'});
  const [relay,telemetry,status]=run({topic:'IIoT/test-only/temperatura',payload:'{"value":17,"unit":"C","valid":true}'});
  assert.equal(relay.payload,'1'); assert.equal(relay.retain,false);
  assert.equal(status.payload.requested,'ON');
  assert.equal(JSON.parse(telemetry[1].payload).requested,'ON');
});
test('unrelated topics and MQTT payloads cannot request arming',()=>{
  const run=functionNode(); run({status:{fill:'green'}});
  assert.equal(run({topic:'another/group/temperatura',payload:'17'}),null);
  const r=run({topic:'IIoT/test-only/manual',payload:'{"kind":"arm"}'});
  assert.equal(r[2].payload.armed,false);
});
test('demo reset enables debug-only simulation without MQTT telemetry',()=>{
  const run=functionNode(true); run({kind:'reset-demo'});
  const r=run({kind:'temperatura',payload:{value:17,unit:'C',valid:true}});
  assert.equal(r[2].payload.requested,'ON'); assert.equal(r[2].payload.simulation,true);
  assert.equal(r[1],null);
});
