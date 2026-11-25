const {test} = require('node:test');
const assert = require('node:assert/strict');
const {functionBody} = require('../node-red/build-flow');
const config = {prefix:'IIoT/test-only',relayTopic:'test-only/relay',onPayload:'1',offPayload:'0',
  onBelow:18,offAt:22,lowBelow:20,lowClearAt:25,staleMs:15000};
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
  assert.equal(JSON.parse(telemetry[0].payload).requested,'ON');
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

test('Arduino level updates status without echoing on the input topic',()=>{
  const run=functionNode(); run({status:{fill:'green'}});
  for (const payload of ['68','{"value":68,"unit":"percent","valid":true}']) {
    const [relay,telemetry,debug]=run({topic:config.prefix+'/nivel',payload});
    assert.equal(relay,null);
    assert.deepEqual(telemetry.map(m=>m.topic),[config.prefix+'/estado']);
    assert.equal(debug.payload.level,68);
  }
});
