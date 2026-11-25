'use strict';
const fs = require('node:fs');
const path = require('node:path');

const board = 'arduino99-panel', lamp = 'arduino99-lamp', broker = 'arduino99-broker';
const prefix = 'IIoT/grupo99/';
const nodes = [
  {id:board,type:'tab',label:'Dashboard & SenseHAT · Arduino',disabled:false},
  {id:lamp,type:'tab',label:'Arduino → SONOFF 9',disabled:false},
  {id:broker,type:'mqtt-broker',name:'HiveMQ · grupo99',broker:'broker.hivemq.com',port:'1883',
    protocolVersion:'4',clientid:'',autoConnect:true,usetls:false,keepalive:'10',cleansession:true}
];
function add(z,id,type,name,x,y,props,wires=[]) {
  nodes.push({id:'arduino99-'+id,z,type,name,x,y,...props,wires:wires.map(w=>w.map(v=>'arduino99-'+v))});
}
function sensor(z,id,kind,x,y,target) {
  add(z,id,'mqtt in',kind,x,y,{broker,topic:prefix+kind,qos:'0',datatype:'utf8',nl:false,rap:true,rh:0,inputs:0},[[target]]);
}
function timer(z,id,target,x,y) {
  add(z,id,'inject','Revisar vigencia',x,y,{props:[{p:'payload'}],payloadType:'date',repeat:'1',once:true,onceDelay:0.2},[[target]]);
}
function reading(payload,kind) {
  let value;
  try { value=JSON.parse(payload); } catch { return null; }
  if (kind==='nivel' && value && typeof value==='object' && value.valid===true && value.unit==='percent') value=value.value;
  const min=kind==='temperatura'?-40:0;
  return Number.isFinite(value) && value>=min && value<=100 ? value : null;
}
for (const [i,kind] of ['temperatura','humedad','nivel'].entries()) sensor(board,'in-'+kind,kind,120,70+i*50,'values');
timer(board,'panel-timer','values',120,230);
add(board,'values','function','Lecturas del Arduino',400,140,{outputs:2,func:reading.toString()+`
if (msg.retain) return null;
const now=Date.now(), data=flow.get('samples') || {};
if (msg.topic) {
  const kind=msg.topic.split('/').pop();
  const value=reading(msg.payload,kind);
  if (value===null && kind!=='nivel') return null;
  data[kind]={value,at:now};
  flow.set('samples',data);
}
const status={};
for (const k of ['temperatura','humedad','nivel']) status[k]=data[k] && now-data[k].at<15000 ? data[k].value : null;
flow.set('status',status);
const level=status.nivel;
const color=level===null?'off':level<20?'red':level>=25?'green':context.get('color')==='red'?'red':'green';
const changed=color!==context.get('color');
context.set('color',color);
return [changed?{payload:color}:null,msg.topic?{payload:status}:null];`,initialize:"flow.set('samples',{}); flow.set('status',{}); context.set('color',null);"},[['led'],['debug']]);
add(board,'debug','debug','Datos Arduino',690,150,{active:true,tosidebar:true,complete:'payload',targetType:'msg'});
add(board,'led','exec','Nivel en matriz LED',700,80,{command:'python3 "$HOME/smart-greenhouse-iot/raspberry-pi/indicador-agua.py"',addpay:'payload',append:'',useSpawn:'false',timer:'5'},[[],['errors'],[]]);
add(board,'errors','debug','Error del display',950,80,{active:true,tosidebar:true,complete:'payload',targetType:'msg'});

for(const [id,url,target,y] of [['page','/ui','html',330],['api','/ui/datos','json',410]]) {
  add(board,id,'http in','GET '+url,120,y,{method:'get',url,upload:false},[[target]]);
}
const html=fs.readFileSync(path.join(__dirname,'panel-arduino.html'),'utf8');
add(board,'html','template','Panel del invernadero',400,330,{field:'payload',fieldType:'msg',format:'html',syntax:'plain',template:html,output:'str'},[['page-response']]);
add(board,'page-response','http response','Página',700,330,{headers:{'Content-Type':'text/html; charset=utf-8'}});
add(board,'json','function','Valores actuales',400,410,{outputs:1,func:"msg.payload=flow.get('status') || {}; msg.headers={'Cache-Control':'no-store'}; return msg;"},[['data-response']]);
add(board,'data-response','http response','Datos',700,410,{});
sensor(lamp,'lamp-temp','temperatura',130,80,'control');
timer(lamp,'lamp-timer','control',130,160);
add(lamp,'connection','status','Conexión a HiveMQ',130,230,{scope:['arduino99-lamp-temp']},[['control']]);
add(lamp,'control','function','ON > 25 · OFF ≤ 24,5',420,130,{outputs:1,initialize:"context.set('last',null); context.set('at',0); context.set('connected',false);",func:reading.toString()+`
if(msg.status){
  const connected=msg.status.fill==='green';
  if(connected!==context.get('connected')){context.set('last',null);context.set('at',0);}
  context.set('connected',connected);
}
if(!context.get('connected') || msg.retain) return null;
let next=context.get('last') || '0';
if(msg.topic){
  const t=reading(msg.payload,'temperatura');
  if(t===null) return null;
  context.set('at',Date.now());
  if(t>25) next='1';
  else if(t<=24.5) next='0';
}
if(Date.now()-context.get('at')>=15000) next='0';
if(next===context.get('last')) return null;
context.set('last',next);
node.status({fill:next==='1'?'green':'grey',shape:'dot',text:next==='1'?'Orden ON':'Orden OFF'});
return {payload:next};`},[['command']]);
add(lamp,'command','mqtt out','SONOFF 9',700,130,{broker,topic:'IIoT/9/relay/0/set',qos:'0',retain:'false'});
add(lamp,'relay','mqtt in','Estado SONOFF 9',130,320,{broker,topic:'IIoT/9/relay/0',qos:'0',datatype:'utf8'},[['report']]);
add(lamp,'report','debug','Estado recibido del SONOFF',450,320,{active:true,tosidebar:true,complete:'payload',targetType:'msg'});
fs.writeFileSync(path.join(__dirname,'demo-arduino-grupo99.json'),JSON.stringify(nodes,null,2)+'\n');
