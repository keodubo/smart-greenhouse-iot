'use strict';
const fs = require('node:fs');
const path = require('node:path');

const board = 'arduino99-panel', lamp = 'arduino99-lamp', broker = 'arduino99-broker';
const prefix = 'IIoT/grupo99/';
const defaults = {on:25, off:24.5, low:20, clear:25};
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
const settings=global.get('arduino99Settings') || ${JSON.stringify(defaults)};
const color=level===null?'off':level<settings.low?'red':level>=settings.clear?'green':context.get('color')==='red'?'red':'green';
flow.set('waterColor',color);
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
add(board,'panel-state','http in','GET /ui/panel',120,490,{method:'get',url:'/ui/panel'},[['snapshot']]);
add(board,'snapshot','function','Estado del panel',400,490,{outputs:1,func:`
msg.payload={samples:flow.get('status') || {},water:flow.get('waterColor') || 'off',
  settings:global.get('arduino99Settings') || ${JSON.stringify(defaults)},
  lamp:global.get('arduino99Lamp') || {},report:global.get('arduino99Report') || null};
msg.headers={'Cache-Control':'no-store'};
return msg;`},[['data-response']]);
add(lamp,'action','http in','POST /ui/control',130,430,{method:'post',url:'/ui/control'},[['control']]);
add(lamp,'reply','http response','Resultado',700,420,{});
sensor(lamp,'lamp-temp','temperatura',130,80,'control');
timer(lamp,'lamp-timer','control',130,160);
add(lamp,'connection','status','Conexión a HiveMQ',130,230,{scope:['arduino99-lamp-temp']},[['control']]);
add(lamp,'control','function','Control de temperatura y panel',420,130,{outputs:2,
  initialize:"context.set('at',0); context.set('last',null); context.set('mode','auto'); context.set('connected',false); global.set('arduino99Report',null); global.set('arduino99Lamp',{});",
  func:reading.toString()+`
let mode=context.get('mode') || 'auto';
let last=context.get('last');
let connected=context.get('connected');
let settings=global.get('arduino99Settings') || ${JSON.stringify(defaults)};
const respond=(code,message)=>{msg.statusCode=code;msg.payload={message};return msg;};
if(msg.status){
  const online=msg.status.fill==='green';
  if(online!==connected){
    connected=online; last=null; mode='auto';
    context.set('connected',online);context.set('at',0);
    global.set('arduino99Report',null);
  }
}
if(msg.topic && !msg.retain){
  const t=reading(msg.payload,'temperatura');
  if(t!==null){context.set('temperature',t);context.set('at',Date.now());}
}
const fresh=Date.now()-context.get('at')<15000;
let reply=null;
let force=false;
if(msg.req){
  if(!msg.req.is('application/json')) return [null,respond(415,'Se requiere JSON.')];
  const body=msg.payload || {};
  if(body.action==='settings'){
    const {on,off,low,clear}=body;
    if(![on,off,low,clear].every(Number.isFinite) || off < -40 || on > 100 || off>=on ||
       low<0 || clear>100 || low>=clear) return [null,respond(400,'Revisá el orden y el rango de los umbrales.')];
    settings={on,off,low,clear};global.set('arduino99Settings',settings);
  }else if(['auto','on','off'].includes(body.action)){
    if(!connected || (body.action==='on' && !fresh)) return [null,respond(409,'Se necesita conexión y, para encender, temperatura vigente.')];
    mode=body.action;force=mode!=='auto';
  }else return [null,respond(400,'Acción desconocida.')];
  reply=respond(200,'Cambio aplicado.');
}
let next=last || '0';
if(!fresh){next='0';if(mode==='on') mode='auto';}
else if(mode==='off') next='0';
else if(mode==='on') next='1';
else if(context.get('temperature')>settings.on) next='1';
else if(context.get('temperature')<=settings.off) next='0';
const command=connected && (next!==last || force) ? {payload:next} : null;
context.set('last',connected?next:null);context.set('mode',mode);
global.set('arduino99Lamp',{connected,mode,requested:connected?next:null,fresh});
node.status({fill:connected?'green':'grey',shape:'dot',text:connected?mode+' / '+next:'Sin conexión'});
return [command,reply];`},[['command'],['reply']]);
add(lamp,'command','mqtt out','SONOFF 9',700,130,{broker,topic:'IIoT/9/relay/0/set',qos:'0',retain:'false'});
add(lamp,'relay','mqtt in','Estado SONOFF 9',130,320,{broker,topic:'IIoT/9/relay/0',qos:'0',datatype:'utf8'},[['report','feedback']]);
add(lamp,'feedback','function','Último estado informado',480,360,{outputs:0,func:"if(!msg.retain && ['0','1'].includes(msg.payload)) global.set('arduino99Report',{value:msg.payload,at:Date.now()}); return null;"});
add(lamp,'report','debug','Estado recibido del SONOFF',450,320,{active:true,tosidebar:true,complete:'payload',targetType:'msg'});
fs.writeFileSync(path.join(__dirname,'demo-arduino-grupo99.json'),JSON.stringify(nodes,null,2)+'\n');
