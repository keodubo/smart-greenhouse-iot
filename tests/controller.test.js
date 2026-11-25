'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {step} = require('../node-red/controller');

const config = {prefix:'IIoT/test-only', relayTopic:'test-only/relay', onPayload:'1',
  offPayload:'0',
  onBelow:18, offAt:22, lowBelow:20, lowClearAt:25, staleMs:15000};
function session(overrides = {}) {
  let state; let time = 0; const cfg = {...config,...overrides};
  return (event, advance = 0) => {
    time += advance;
    const result = step(state, event, time, cfg);
    state = result.state;
    return result;
  };
}
const reading = (kind,value,extra={}) => ({kind,payload:{value,valid:true,
  unit:kind==='temperatura'?'C':'percent'},...extra});
function ready() { const run=session(); run({kind:'connection',connected:true}); run({kind:'arm'}); return run; }

test('starts disarmed and rejects manual ON without fresh temperature', () => {
  const run=session();
  assert.equal(run(reading('temperatura',17)).relay,null);
  run({kind:'connection',connected:true}); run({kind:'arm'});
  const r=run({kind:'manual',payload:'ON'});
  assert.equal(r.status.requested,'OFF'); assert.equal(r.status.mode,'AUTO');
});
test('hysteresis avoids switching in the middle band', () => {
  const run=ready();
  assert.deepEqual([17,20,22,20,17].map(t=>run(reading('temperatura',t)).status.requested),
    ['ON','ON','OFF','OFF','ON']);
});
test('manual OFF persists, AUTO resumes, and stale input cancels manual ON', () => {
  const run=ready(); run(reading('temperatura',17));
  assert.equal(run({kind:'manual',payload:'OFF'}).status.requested,'OFF');
  assert.equal(run(reading('temperatura',16)).status.requested,'OFF');
  assert.equal(run({kind:'manual',payload:'AUTO'}).status.requested,'ON');
  run({kind:'manual',payload:'ON'});
  const r=run({kind:'tick'},15000);
  assert.equal(r.status.requested,'OFF'); assert.equal(r.status.mode,'AUTO');
  assert.equal(r.relay.payload,'0');
});
test('invalid, malformed and retained temperature cannot turn the relay on', () => {
  for(const payload of [null,'bad',{value:'17',valid:true,unit:'C'},
    {value:NaN,valid:true,unit:'C'},{value:17,valid:false,unit:'C'},
    {value:17,valid:true,unit:'F'}]) {
    const run=ready(); run(reading('temperatura',17));
    assert.equal(run({kind:'temperatura',payload}).status.requested,'OFF');
  }
  const run=ready();
  assert.equal(run(reading('temperatura',17,{retain:true})).status.requested,'OFF');
});
test('Arduino percentages cover empty, full and low-water hysteresis', () => {
  const run=ready();
  for (const value of [0,50.5,100]) assert.equal(run(reading('nivel',value)).status.level,value);
  assert.deepEqual([19,22,25].map(v=>run(reading('nivel',v)).status.lowWater),[true,true,false]);
});
test('invalid, retained and expired levels cannot masquerade as a fresh percentage', () => {
  const run=ready();
  assert.equal(run(reading('nivel',0,{retain:true})).status.level,null);
  for (const payload of [-1,101,'bad',{value:0,unit:'cm',valid:true},{value:0,unit:'percent',valid:false}]) {
    run(reading('nivel',50));
    assert.equal(run({kind:'nivel',payload}).status.level,null);
  }
  run(reading('nivel',10));
  const r=run({kind:'tick'},15000);
  assert.equal(r.status.level,null); assert.equal(r.status.lowWater,null);
});
test('disconnect disarms, clears readings, and requires explicit rearming', () => {
  const run=ready(); run(reading('temperatura',17)); run({kind:'manual',payload:'ON'});
  const lost=run({kind:'connection',connected:false});
  assert.equal(lost.relay,null); assert.equal(lost.status.actual,'UNKNOWN');
  const back=run({kind:'connection',connected:true});
  assert.equal(back.relay.payload,'0'); assert.equal(back.status.armed,false);
  assert.equal(run(reading('temperatura',17)).relay,null);
  assert.equal(run({kind:'arm'}).status.requested,'OFF');
  assert.equal(run(reading('temperatura',17)).relay.payload,'1');
});
test('missing or ambiguous actuator mapping cannot arm', () => {
  for(const cfg of [{relayTopic:''},{onPayload:''},{offPayload:''},{offPayload:'1'},
    {relayTopic:'IIoT/test-only/temperatura'},{relayTopic:'other/#'},{prefix:'IIoT/CHANGE_ME'}]) {
    const run=session(cfg); run({kind:'connection',connected:true});
    assert.equal(run({kind:'arm'}).status.armed,false);
    assert.equal(run(reading('temperatura',17)).relay,null);
  }
});
test('relay messages are explicit, nonretained and suppressed when unchanged', () => {
  const run=ready(); const r=run(reading('temperatura',17));
  assert.deepEqual(r.relay,{topic:'test-only/relay',payload:'1',qos:0,retain:false});
  assert.equal(run(reading('temperatura',17)).relay,null);
  assert.equal(r.status.actual,'UNKNOWN');
});
test('STOP requests OFF, disarms, and ignores retained manual ON', () => {
  const run=ready(); run(reading('temperatura',17));
  assert.equal(run({kind:'manual',payload:'ON',retain:true}).status.mode,'AUTO');
  const r=run({kind:'stop'});
  assert.equal(r.status.armed,false); assert.equal(r.relay.payload,'0');
});
test('reports live relay messages separately from requests until disconnect', () => {
  const run=ready();
  assert.equal(run({kind:'feedback',payload:'1',retain:true}).status.relayReported,null);
  const r=run({kind:'feedback',payload:'1'});
  assert.equal(r.status.relayReported,'ON');
  assert.equal(r.status.requested,'OFF');
  assert.equal(run({kind:'feedback',payload:'0'}).status.relayReported,'OFF');
  assert.equal(run({kind:'connection',connected:false}).status.relayReported,null);
});
test('interleaved scalar messages neither overwrite nor refresh Sense HAT measurements', () => {
  const run=ready();
  run(reading('temperatura',17));
  run(reading('humedad',30.83));
  assert.equal(run({kind:'humedad',payload:45.30}).status.humidity,30.83);
  const mixed=run({kind:'temperatura',payload:'24.04'},5000);
  assert.equal(mixed.status.temperature,17);
  assert.equal(mixed.status.requested,'ON');
  const expired=run({kind:'temperatura',payload:'24.04'},10000);
  assert.equal(expired.status.temperature,null);
  assert.equal(expired.status.humidity,null);
  assert.equal(expired.relay.payload,'0');
});
