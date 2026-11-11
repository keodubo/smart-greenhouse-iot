'use strict';
const fs=require('node:fs');
const path=require('node:path');

function functionBody(config, demo=false) {
  const source=fs.readFileSync(path.join(__dirname,'controller.js'),'utf8');
  return `// Generated from controller.js. Edit configuration via build-flow.js, then reimport.
const module = {exports:{}};
${source}
const config=${JSON.stringify(config)};
const demo=${demo};
let state=context.get('greenhouse');
let event;
if (demo && msg.kind === 'reset-demo') {
  state=module.exports.step(undefined,{kind:'connection',connected:true},Date.now(),config).state;
  event={kind:'arm'};
} else if (msg.status) {
  event={kind:'connection',connected:msg.status.fill === 'green'};
} else if (msg.kind) {
  event=msg;
} else {
  const prefix=config.prefix+'/';
  if (typeof msg.topic !== 'string' || !msg.topic.startsWith(prefix)) return null;
  const kind=msg.topic.slice(prefix.length);
  if (!['temperatura','humedad','distancia','manual'].includes(kind)) return null;
  event={kind,payload:msg.payload,retain:msg.retain};
}
const result=module.exports.step(state,event,Date.now(),config);
context.set('greenhouse',result.state);
const status={...result.status,simulation:demo};
node.status({fill:status.armed?'green':'yellow',shape:status.armed?'dot':'ring',text:status.mode+' / requested '+status.requested+' / actual UNKNOWN'});
const telemetry=(!demo && status.connected) ? [
  {topic:config.prefix+'/nivel',payload:JSON.stringify(result.level),qos:0,retain:false},
  {topic:config.prefix+'/estado',payload:JSON.stringify(status),qos:0,retain:false}
] : null;
return [result.relay,telemetry,{payload:status}];`;
}

function buildFlow(config) {
  const live='greenhouse-live'; const demo='greenhouse-demo'; const broker='greenhouse-broker';
  const nodes=[
    {id:demo,type:'tab',label:'Greenhouse — OFFLINE DEMO',disabled:false,info:'No MQTT outputs. Click Reset demo, then sensor inputs. Relay output goes ONLY to Debug.'},
    {id:live,type:'tab',label:'Greenhouse — LIVE (enable in lab)',disabled:true,info:'Read setup-guide.md. Configure broker/prefix/SONOFF mapping, verify wiring, then enable. ARM requires a subsequent fresh temperature reading. STOP before disabling/deploying.'},
    {id:broker,type:'mqtt-broker',name:'Greenhouse lab broker',broker:config.broker,port:String(config.port),
      clientid:'',autoConnect:true,usetls:false,protocolVersion:'4',keepalive:'10',cleansession:true,
      autoUnsubscribe:true,birthTopic:'',closeTopic:'',willTopic:''}
  ];
  const add=(z,id,type,name,x,y,properties,wires=[])=>nodes.push({id,z,type,name,x,y,...properties,wires});
  const inject=(z,id,name,x,y,event,target,repeat='')=>add(z,id,'inject',name,x,y,{
    props:Object.entries(event).map(([p,v])=>({p,v:typeof v==='string'?v:JSON.stringify(v),vt:typeof v==='string'?'str':'json'})),
    repeat,crontab:'',once:repeat!=='',onceDelay:1,topic:''},[[target]]);
  const debug=(z,id,name,x,y)=>add(z,id,'debug',name,x,y,{active:true,tosidebar:true,console:false,tostatus:false,complete:'payload',targetType:'msg'});
  const controller=(z,id,c,demoMode)=>add(z,id,'function',demoMode?'Demo controller':'Live controller',600,240,{
    func:functionBody(c,demoMode),outputs:3,timeout:0,noerr:0,
    initialize:"context.set('greenhouse', undefined);",finalize:'',libs:[],
    outputLabels:['Relay request','Level + status MQTT','Readable status']
  },[[z+'-relay'],demoMode?[]:[z+'-telemetry'],[z+'-status']]);
  const dc={...config,prefix:'IIoT/offline-demo',relayTopic:'offline-demo/relay',onPayload:'ON',offPayload:'OFF',calibrationConfirmed:true,emptyCm:20,fullCm:5};
  controller(demo,'demo-controller',dc,true);
  debug(demo,demo+'-relay','SIMULATED relay request',960,180);
  debug(demo,demo+'-status','SIMULATED full status',960,300);
  const demoEvents=[['Reset demo',{kind:'reset-demo'}],
    ['Temperature 17 C',{kind:'temperatura',payload:{value:17,unit:'C',valid:true}}],
    ['Temperature 20 C',{kind:'temperatura',payload:{value:20,unit:'C',valid:true}}],
    ['Temperature 22 C',{kind:'temperatura',payload:{value:22,unit:'C',valid:true}}],
    ['Invalid temperature',{kind:'temperatura',payload:{value:null,unit:'C',valid:false}}],
    ['Water 19%',{kind:'distancia',payload:{value:17.15,unit:'cm',valid:true}}],
    ['Water 22%',{kind:'distancia',payload:{value:16.7,unit:'cm',valid:true}}],
    ['Water 25%',{kind:'distancia',payload:{value:16.25,unit:'cm',valid:true}}],
    ['Humidity 55%',{kind:'humedad',payload:{value:55,unit:'percent',valid:true}}],
    ['Manual ON',{kind:'manual',payload:'ON'}],['Manual OFF',{kind:'manual',payload:'OFF'}],
    ['AUTO',{kind:'manual',payload:'AUTO'}]];
  demoEvents.forEach(([name,event],i)=>inject(demo,'demo-input-'+i,name,190,60+i*45,event,'demo-controller'));
  inject(demo,'demo-tick','Freshness check (1 s)',600,440,{kind:'tick'},'demo-controller','1');
  add(demo,'demo-note','comment','Offline only — no hardware commands',650,60,{});

  controller(live,'live-controller',config,false);
  ['temperatura','humedad','distancia','manual'].forEach((suffix,i)=>add(live,'live-'+suffix,'mqtt in',suffix,180,80+i*55,{
    topic:config.prefix+'/'+suffix,qos:'0',datatype:'utf8',broker,nl:false,rap:true,rh:0,inputs:0
  },[['live-controller']]));
  add(live,'live-connection','status','MQTT connection',180,330,{scope:['live-temperatura']},[['live-controller']]);
  inject(live,'live-arm','ARM (then fresh sample)',180,400,{kind:'arm'},'live-controller');
  inject(live,'live-stop','STOP / DISARM',180,450,{kind:'stop'},'live-controller');
  inject(live,'live-tick','Freshness check (1 s)',180,500,{kind:'tick'},'live-controller','1');
  add(live,live+'-relay','mqtt out','Verified SONOFF command',970,160,{topic:'',qos:'0',retain:'false',respTopic:'',contentType:'',userProps:'',correl:'',expiry:'',broker});
  add(live,live+'-telemetry','mqtt out','Level / status',970,240,{topic:'',qos:'0',retain:'false',respTopic:'',contentType:'',userProps:'',correl:'',expiry:'',broker});
  debug(live,live+'-status','LIVE full status',970,320);
  add(live,'live-note','comment','Disabled until configured — actual relay state is UNKNOWN',660,60,{});
  return nodes;
}

if (require.main===module) {
  const input=path.resolve(process.argv[2] || path.join(__dirname,'flow-config.example.json'));
  const output=path.resolve(process.argv[3] || path.join(__dirname,'greenhouse-flow.json'));
  const config=JSON.parse(fs.readFileSync(input,'utf8'));
  if (typeof config.broker!=='string' || !config.broker || !Number.isInteger(config.port) || config.port<1 || config.port>65535 ||
      typeof config.prefix!=='string' || !config.prefix || /[+#\u0000]/.test(config.prefix) || config.prefix.endsWith('/')) {
    throw new Error('Invalid broker, port or topic prefix. See flow-config.example.json.');
  }
  fs.writeFileSync(output,JSON.stringify(buildFlow(config),null,2)+'\n');
  console.log('Wrote importable flow (live tab disabled): '+output);
}
module.exports={functionBody,buildFlow};
