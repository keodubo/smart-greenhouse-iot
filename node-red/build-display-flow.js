'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {toDisplayMessage} = require('./display-message');

function buildDisplayFlow() {
  const tab = 'mqtt-display-tab';
  const broker = 'mqtt-display-broker';
  return [
    {id:tab,type:'tab',label:'HiveMQ → Display Sense HAT',disabled:true,
      info:'Leer display-guide.md. Configurar la ruta en exec antes de habilitar. Muestra temperatura y humedad del grupo99.'},
    {id:broker,type:'mqtt-broker',name:'HiveMQ público — display',broker:'broker.hivemq.com',port:'1883',
      clientid:'',autoConnect:true,usetls:false,protocolVersion:'4',keepalive:'10',cleansession:true,
      autoUnsubscribe:true,birthTopic:'',closeTopic:'',willTopic:''},
    {id:'mqtt-display-note',z:tab,type:'comment',name:'Configurar ruta Python; después habilitar pestaña',x:370,y:60,wires:[]},
    {id:'mqtt-display-in',z:tab,type:'mqtt in',name:'Temperatura desde HiveMQ',topic:'IIoT/grupo99/temperatura',
      qos:'0',datatype:'utf8',broker,nl:false,rap:true,rh:0,inputs:0,x:180,y:160,
      wires:[['mqtt-display-validate','mqtt-display-raw']]},
    {id:'mqtt-display-humidity',z:tab,type:'mqtt in',name:'Humedad desde HiveMQ',topic:'IIoT/grupo99/humedad',
      qos:'0',datatype:'utf8',broker,nl:false,rap:true,rh:0,inputs:0,x:180,y:210,
      wires:[['mqtt-display-validate','mqtt-display-raw']]},
    {id:'mqtt-display-tick',z:tab,type:'inject',name:'Actualizar LEDs cada 10 s',props:[{p:'payload'}],
      repeat:'10',once:false,payload:'',payloadType:'date',x:180,y:60,wires:[['mqtt-display-validate']]},
    {id:'mqtt-display-validate',z:tab,type:'function',name:'Validar y agrupar lecturas',
      func:toDisplayMessage.toString()+`
const readings = context.get('readings') || {};
const now = Date.now();
if (msg.topic) {
  const result = toDisplayMessage(msg);
  if (result) {
    const key = msg.topic === 'IIoT/grupo99/humedad' ? 'humidity' : 'temperature';
    readings[key] = {value: result.payload, at: now};
    context.set('readings', readings);
    context.set('pending', true);
  }
  return null;
}
if (!context.get('pending')) return null;
context.set('pending', false);
const fresh = key => readings[key] && now - readings[key].at < 15000 ? readings[key].value : '';
const temperature = fresh('temperature');
const humidity = fresh('humidity');
if (!temperature && !humidity) return null;
return {payload: [temperature, humidity && '--humidity ' + humidity].filter(Boolean).join(' ')};
`,
      outputs:1,noerr:0,initialize:"context.set('readings', {}); context.set('pending', false);",finalize:'',libs:[],x:460,y:160,wires:[['mqtt-display-exec']]},
    {id:'mqtt-display-exec',z:tab,type:'exec',name:'Mostrar en LEDs físicos',
      command:'python3 /CAMBIAR_RUTA/mostrar-mqtt.py',addpay:'payload',append:'',
      useSpawn:'false',timer:'8',winHide:false,oldrc:false,x:1020,y:160,
      wires:[[],['mqtt-display-errors'],['mqtt-display-exit']]},
    {id:'mqtt-display-raw',z:tab,type:'debug',name:'Mensaje recibido (diagnóstico)',active:false,
      tosidebar:true,console:false,tostatus:false,complete:'payload',targetType:'msg',x:430,y:280,wires:[]},
    {id:'mqtt-display-errors',z:tab,type:'debug',name:'Errores de Python',active:true,
      tosidebar:true,console:false,tostatus:false,complete:'payload',targetType:'msg',x:1050,y:260,wires:[]},
    {id:'mqtt-display-exit',z:tab,type:'debug',name:'Fin de Python (code 0 = OK)',active:true,
      tosidebar:true,console:false,tostatus:false,complete:'payload',targetType:'msg',x:1050,y:320,wires:[]}
  ];
}

if (require.main === module) {
  fs.writeFileSync(path.join(__dirname,'mqtt-display-flow.json'), JSON.stringify(buildDisplayFlow(),null,2)+'\n');
  console.log('Flow del display generado; pestaña deshabilitada hasta configurar.');
}
module.exports = {buildDisplayFlow};
