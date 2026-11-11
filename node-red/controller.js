'use strict';
function step(state, event, now, config) {
  const s = state ? JSON.parse(JSON.stringify(state)) : {
    connected:false, armed:false, mode:'AUTO', requested:'OFF', lastSent:null,
    temperatura:null, humedad:null, distancia:null, lowWater:null
  };
  const c = config;
  const finite = x => typeof x === 'number' && Number.isFinite(x);
  const topicOK = x => typeof x === 'string' && x.length > 0 && !/[+#\u0000]/.test(x);
  const prefixOK = topicOK(c.prefix) && !c.prefix.includes('CHANGE_ME') && !c.prefix.endsWith('/');
  const mappingOK = prefixOK && topicOK(c.relayTopic) &&
    !c.relayTopic.startsWith(c.prefix + '/') &&
    typeof c.onPayload === 'string' && c.onPayload.length > 0 &&
    typeof c.offPayload === 'string' && c.offPayload.length > 0 && c.onPayload !== c.offPayload;
  const controlOK = finite(c.onBelow) && finite(c.offAt) && c.onBelow < c.offAt &&
    finite(c.staleMs) && c.staleMs > 0;
  const calibrationOK = c.calibrationConfirmed === true && finite(c.emptyCm) &&
    finite(c.fullCm) && c.fullCm > 0 && c.emptyCm > c.fullCm &&
    finite(c.lowBelow) && finite(c.lowClearAt) && c.lowBelow >= 0 &&
    c.lowBelow < c.lowClearAt && c.lowClearAt <= 100;
  let forceOff = false;
  const reset = () => {
    s.armed=false; s.mode='AUTO'; s.requested='OFF'; s.lastSent=null;
    s.temperatura=null; s.humedad=null; s.distancia=null; s.lowWater=null;
  };
  if (event.kind === 'connection' && event.connected !== s.connected) {
    reset(); s.connected = event.connected === true; forceOff = s.connected;
  }
  if (event.kind === 'arm') {
    reset(); s.armed=s.connected && mappingOK && controlOK; forceOff=true;
  }
  if (event.kind === 'stop') { reset(); forceOff=true; }
  if (!mappingOK || !controlOK) { s.armed=false; s.mode='AUTO'; s.requested='OFF'; }

  const specs = {temperatura:['C',-40,100],humedad:['percent',0,100],distancia:['cm',2,400]};
  if (specs[event.kind] && event.retain !== true) {
    let p = event.payload;
    if (typeof p === 'string') { try { p=JSON.parse(p); } catch (_) { p=null; } }
    const [unit,min,max] = specs[event.kind];
    s[event.kind] = p && p.valid === true && p.unit === unit && finite(p.value) &&
      p.value >= min && p.value <= max ? {value:p.value,at:now} : null;
  }
  const fresh = key => s[key] !== null && now >= s[key].at && now-s[key].at < c.staleMs;
  const temperatureOK = fresh('temperatura');
  const humidityOK = fresh('humedad');
  const waterOK = calibrationOK && fresh('distancia');
  let level = {value:null,unit:'percent',valid:false};
  if (waterOK) {
    const percent = Math.max(0,Math.min(100,100*(c.emptyCm-s.distancia.value)/(c.emptyCm-c.fullCm)));
    level={value:Math.round(percent*100)/100,unit:'percent',valid:true};
    if (percent < c.lowBelow) s.lowWater=true;
    else if (percent >= c.lowClearAt || s.lowWater === null) s.lowWater=false;
  } else s.lowWater=null;

  if (event.kind === 'manual' && event.retain !== true && s.armed && temperatureOK &&
      ['ON','OFF','AUTO'].includes(event.payload)) s.mode=event.payload;
  if (!s.armed || !s.connected || !temperatureOK || !controlOK) {
    s.requested='OFF'; s.mode='AUTO';
  } else if (s.mode !== 'AUTO') s.requested=s.mode;
  else if (s.temperatura.value < c.onBelow) s.requested='ON';
  else if (s.temperatura.value >= c.offAt) s.requested='OFF';

  let relay=null;
  if (mappingOK && s.connected && (forceOff || (s.armed && s.requested !== s.lastSent))) {
    const requested=forceOff ? 'OFF' : s.requested;
    relay={topic:c.relayTopic,payload:requested === 'ON' ? c.onPayload : c.offPayload,qos:0,retain:false};
    s.lastSent=requested;
  }
  const faults=[];
  if (!s.connected) faults.push('mqtt-disconnected');
  if (!mappingOK) faults.push('relay-configuration');
  if (!controlOK) faults.push('control-configuration');
  if (!temperatureOK) faults.push('temperature-invalid-or-stale');
  if (!humidityOK) faults.push('humidity-invalid-or-stale');
  if (!calibrationOK) faults.push('water-calibration-unconfirmed');
  if (!waterOK) faults.push('water-invalid-or-stale');
  return {state:s, relay, level, status:{mode:s.mode,armed:s.armed,connected:s.connected,
    requested:s.requested,actual:'UNKNOWN',temperature:temperatureOK?s.temperatura.value:null,
    humidity:humidityOK?s.humedad.value:null,level:level.value,lowWater:s.lowWater,faults}};
}
module.exports = {step};
