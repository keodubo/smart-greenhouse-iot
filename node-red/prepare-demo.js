'use strict';
const fs = require('node:fs');
const path = require('node:path');
const defaults = require('./flow-config.example.json');
const {buildFlow} = require('./build-flow');
const {buildDisplayFlow} = require('./build-display-flow');

const [device = '9', empty, full, ...extra] = process.argv.slice(2);
if (!/^\d+$/.test(device || '') || extra.length || (empty === undefined) !== (full === undefined)) {
  throw Error('Uso: node node-red/prepare-demo.js NUMERO_SONOFF [VACIO_CM LLENO_CM]');
}
const config = {...defaults, broker:'broker.hivemq.com', feedbackTopic:'IIoT/'+device+'/relay/0',
  onPayload:'1', offPayload:'0'};
config.relayTopic = config.feedbackTopic+'/set';
if (empty !== undefined) {
  config.emptyCm = Number(empty);
  config.fullCm = Number(full);
  if (!(config.emptyCm <= 400 && config.emptyCm > config.fullCm && config.fullCm >= 2)) {
    throw Error('Medí dos distancias entre 2 y 400 cm. Vacío debe ser mayor que lleno.');
  }
  config.calibrationConfirmed = true;
}
config.onBelow = Number(process.env.ON_BELOW_C ?? defaults.onBelow);
config.offAt = Number(process.env.OFF_AT_C ?? defaults.offAt);
if (!(Number.isFinite(config.onBelow) && Number.isFinite(config.offAt) && config.onBelow < config.offAt)) {
  throw Error('ON_BELOW_C y OFF_AT_C deben ser números, en orden creciente.');
}
const root = path.resolve(__dirname,'..');
const pi = path.join(root,'raspberry-pi');
const piConfig = {broker:config.broker, port:config.port, prefix:config.prefix, client_id:'greenhouse-grupo99-demo-pi'};
fs.writeFileSync(path.join(pi,'demo-pi.local.json'),JSON.stringify(piConfig,null,2)+'\n');
const python = path.join(pi,'.venv','bin','python');
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
const display = buildDisplayFlow();
display.find(n => n.type === 'exec').command = [python,path.join(pi,'mostrar-mqtt.py')].map(quote).join(' ');
const live = buildFlow(config).filter(n => n.id !== 'greenhouse-demo' && n.z !== 'greenhouse-demo');
const nodes = [...live,...display];
const file = path.join(__dirname,'demo.local.json');
fs.writeFileSync(file,JSON.stringify(nodes,null,2)+'\n');
console.log('Broker: '+config.broker+':'+config.port+' | Sensores: '+config.prefix);
console.log('SONOFF '+device+' | Comando: '+config.relayTopic+' | Estado: '+config.feedbackTopic);
console.log('Automático: ON debajo de '+config.onBelow+' °C, OFF desde '+config.offAt+' °C.');
console.log('Importá '+file);
console.log(config.calibrationConfirmed ? 'Nivel calibrado con las medidas indicadas.' : 'Distancia en cm disponible. Nivel pendiente de calibración.');
