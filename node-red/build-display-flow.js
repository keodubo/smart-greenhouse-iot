'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {toDisplayMessage} = require('./display-message');

function buildDisplayFlow() {
  const tab = 'mqtt-display-tab';
  const broker = 'mqtt-display-broker';
  return [
    {id:tab,type:'tab',label:'HiveMQ → Display Sense HAT',disabled:true,
      info:'Leer display-guide.md. Configurar topic, broker y ruta en exec antes de habilitar. Solo muestra temperatura; no controla la lámpara.'},
    {id:broker,type:'mqtt-broker',name:'HiveMQ público — display',broker:'broker.hivemq.com',port:'1883',
      clientid:'',autoConnect:true,usetls:false,protocolVersion:'4',keepalive:'10',cleansession:true,
      autoUnsubscribe:true,birthTopic:'',closeTopic:'',willTopic:''},
    {id:'mqtt-display-note',z:tab,type:'comment',name:'Configurar topic + ruta Python; después habilitar pestaña',x:370,y:60,wires:[]},
    {id:'mqtt-display-in',z:tab,type:'mqtt in',name:'Temperatura desde HiveMQ',topic:'IIoT/CHANGE_ME/temperatura',
      qos:'0',datatype:'utf8',broker,nl:false,rap:true,rh:0,inputs:0,x:180,y:160,
      wires:[['mqtt-display-validate','mqtt-display-raw']]},
    {id:'mqtt-display-validate',z:tab,type:'function',name:'Validar temperatura',
      func:toDisplayMessage.toString()+
        '\nconst result = toDisplayMessage(msg);\nif (!result) node.warn("Lectura inválida o retenida: no se muestra");\nreturn result;',
      outputs:1,noerr:0,initialize:'',finalize:'',libs:[],x:440,y:160,wires:[['mqtt-display-rate']]},
    {id:'mqtt-display-rate',z:tab,type:'delay',name:'Máximo una lectura cada 5 s',pauseType:'rate',
      timeout:'5',timeoutUnits:'seconds',rate:'1',nbRateUnits:'5',rateUnits:'second',
      randomFirst:'1',randomLast:'5',randomUnits:'seconds',drop:true,allowrate:false,
      outputs:1,x:730,y:160,wires:[['mqtt-display-exec']]},
    {id:'mqtt-display-exec',z:tab,type:'exec',name:'Mostrar en LEDs físicos',
      command:'python3 /CAMBIAR_RUTA/mostrar-mqtt.py',addpay:'payload',append:'',
      useSpawn:'false',timer:'4',winHide:false,oldrc:false,x:1020,y:160,
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
