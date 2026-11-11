'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {step} = require('../node-red/controller');

const config = {prefix:'IIoT/test-only', relayTopic:'test-only/relay', onPayload:'1',
  offPayload:'0', calibrationConfirmed:true, emptyCm:20, fullCm:5,
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
  unit:kind==='temperatura'?'C':kind==='distancia'?'cm':'percent'},...extra});
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
test('calibrates usable height and applies low-water hysteresis', () => {
  const run=ready();
  assert.deepEqual([20,12.5,5].map(d=>run(reading('distancia',d)).level.value),[0,50,100]);
  assert.deepEqual([17.15,16.7,16.25].map(d=>run(reading('distancia',d)).status.lowWater),[true,true,false]);
});
test('invalid distance and expired water never appear as a valid zero', () => {
  const run=ready();
  assert.equal(run(reading('distancia',0)).level.valid,false);
  run(reading('distancia',12.5));
  const r=run({kind:'tick'},15000);
  assert.equal(r.level.value,null); assert.equal(r.status.lowWater,null);
});
test('calibration must be confirmed and physically ordered', () => {
  for(const cfg of [{calibrationConfirmed:false},{emptyCm:5,fullCm:20},{emptyCm:5,fullCm:5}]) {
    const run=session(cfg); const r=run(reading('distancia',10));
    assert.equal(r.level.valid,false);
  }
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
