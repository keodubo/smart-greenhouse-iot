'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {buildFlow} = require('./build-flow');
const {buildDisplayFlow} = require('./build-display-flow');
const defaults = require('./flow-config.example.json');
const pi = require('../raspberry-pi/pi16.json');

const tab = 'pi16-invernadero';
const broker = 'pi16-hivemq';
const config = {...defaults, broker:pi.broker, prefix:pi.prefix, onBelow:30, offAt:31,
  relayTopic:'IIoT/9/relay/0/set', feedbackTopic:'IIoT/9/relay/0', onPayload:'1', offPayload:'0'};
const live = buildFlow(config).filter(n => n.z === 'greenhouse-live' && n.type !== 'comment');
const display = buildDisplayFlow(false).filter(n => n.z === 'mqtt-display-tab' &&
  !['mqtt in','comment'].includes(n.type) && n.id !== 'mqtt-display-raw');
const nodes = [
  {id:tab,type:'tab',label:'Invernadero · Raspberry 16',disabled:false},
  {id:broker,type:'mqtt-broker',name:'HiveMQ grupo99 · Pi 16',broker:pi.broker,port:String(pi.port),
   clientid:'',autoConnect:true,usetls:false,protocolVersion:'4',keepalive:'10',cleansession:true}
];
for (const n of [...live,...display]) {
  n.id = 'pi16-'+n.id;
  n.z = tab;
  if (n.broker) n.broker = broker;
  if (n.scope) n.scope = n.scope.map(id=>'pi16-'+id);
  n.wires = n.wires.map(output=>output.map(id=>'pi16-'+id));
  if (display.includes(n)) n.y += 600;
  if (n.type === 'exec') {
    n.command = '"$HOME/smart-greenhouse-iot/raspberry-pi/.venv/bin/python" "$HOME/smart-greenhouse-iot/raspberry-pi/mostrar-mqtt.py"';
  }
  if (n.id === 'pi16-greenhouse-live-status') n.name = 'Estado Pi 16';
  nodes.push(n);
}
for (const [i,kind] of ['temperatura','humedad'].entries()) {
  const input = nodes.find(n=>n.id==='pi16-live-'+kind);
  const topic = input.topic;
  input.topic = pi.prefix+'/pi16/'+kind;
  input.name = 'Pi 16 · '+kind;
  const normalize = 'pi16-normalizar-'+kind;
  input.wires = [[normalize,'pi16-lectura']];
  nodes.push({id:normalize,z:tab,type:'change',name:'Identificar '+kind,
    rules:[{t:'set',p:'topic',pt:'msg',to:topic,tot:'str'}],x:385,y:80+i*55,
    wires:[['pi16-live-controller','pi16-mqtt-display-validate']]});
}
nodes.push({id:'pi16-lectura',z:tab,type:'debug',name:'Lectura directa Pi 16',active:true,
  tosidebar:true,complete:'payload',targetType:'msg',x:520,y:30,wires:[]});
fs.writeFileSync(path.join(__dirname,'invernadero-pi16.json'),JSON.stringify(nodes,null,2)+'\n');
