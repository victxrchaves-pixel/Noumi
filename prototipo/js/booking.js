/* Noumi · Reserva de llamada
   Un mismo componente en tres sitios: el pop-up que abre cualquier enlace a #reservar, la sección
   «Cuéntanos tu negocio» (elemento [data-booking]) y la página reservar.html.

   Pasos: 1) encuesta del negocio, 2) datos de contacto, 3) día y hora, y la confirmación.

   Datos reales: en Vercel, los huecos y la reserva van contra /api/booking/slots y /api/booking, que hablan
   con el Google Calendar de Noumi (api/ en la raíz del repositorio, ver docs/reservas.md).
   Modo de prueba: donde no hay servidor (GitHub Pages, el artifact o un archivo abierto en local) los huecos
   se calculan aquí con las mismas reglas y la reserva se simula, con un aviso visible. */
(function(){
  'use strict';

  var DEMO = null;   // null hasta saber si hay servidor; true = modo de prueba

  /* Mismas reglas que lib/booking.ts del calendario de reservas */
  var CONTACT_EMAIL = 'noumiconsultant@gmail.com';   // cuenta de Google que recibe las citas

  var RULES = {
    timeZone: 'Europe/Madrid',
    duration: 30,          // minutos
    buffer: 15,            // minutos libres entre llamadas
    minDaysAhead: 1,       // no se puede reservar para el mismo día
    maxDaysAhead: 14,      // hasta cuántos días vista
    hours: {               // 1 = lunes … 7 = domingo; sin entrada = cerrado
      1: [['09:30','13:00'],['14:30','18:00']],
      2: [['09:30','13:00'],['14:30','18:00']],
      3: [['09:30','13:00'],['14:30','18:00']],
      4: [['09:30','13:00'],['14:30','18:00']],
      5: [['10:00','13:00'],['14:30','16:00']]
    }
  };

  var GOALS = [
    {v:'commerce', t:'Vender productos online', s:'E-Commerce Growth'},
    {v:'leads', t:'Conseguir clientes para un servicio', s:'Lead Generation'},
    {v:'web', t:'Una web nueva o mejor', s:'Diseño web'}
  ];
  var BUDGETS = ['Aún no invierto','Menos de 1.000 €','De 1.000 a 3.000 €','De 3.000 a 10.000 €','Más de 10.000 €'];
  var TICKETS = {
    commerce: {label:'Ticket medio de tu tienda', options:['Menos de 30 €','De 30 a 80 €','De 80 a 200 €','Más de 200 €']},
    leads: {label:'Valor medio de un cliente', options:['Menos de 200 €','De 200 a 1.000 €','De 1.000 a 5.000 €','Más de 5.000 €']},
    any: {label:'Ticket medio o valor de un cliente', options:['Menos de 50 €','De 50 a 200 €','De 200 a 1.000 €','Más de 1.000 €']}
  };

  /* ---------- Fechas en la zona horaria del calendario ---------- */
  var ymdFmt = new Intl.DateTimeFormat('en-CA',{timeZone:RULES.timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  var timeFmt = new Intl.DateTimeFormat('es-ES',{timeZone:RULES.timeZone,hour:'2-digit',minute:'2-digit',hour12:false});
  var longDayFmt = new Intl.DateTimeFormat('es-ES',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});
  var monthFmt = new Intl.DateTimeFormat('es-ES',{timeZone:'UTC',month:'long',year:'numeric'});
  var shortDayFmt = new Intl.DateTimeFormat('es-ES',{timeZone:'UTC',weekday:'long',day:'numeric'});
  var offsetFmt;
  try{ offsetFmt = new Intl.DateTimeFormat('en-US',{timeZone:RULES.timeZone,timeZoneName:'longOffset'}); }catch(e){ offsetFmt=null; }

  function offsetMs(instant){
    if(!offsetFmt) return 3600000;
    var part = offsetFmt.formatToParts(instant).filter(function(p){return p.type==='timeZoneName';})[0];
    var m = part && part.value.match(/GMT([+-])(\d{2}):(\d{2})/);
    if(!m) return 0;
    return (m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3]))*60000;
  }
  function zonedTime(ymd, hm){            // "2026-12-01" + "09:30" en Madrid → instante UTC
    var a=ymd.split('-').map(Number), b=hm.split(':').map(Number);
    var wall=Date.UTC(a[0],a[1]-1,a[2],b[0],b[1]);
    return wall - offsetMs(wall - offsetMs(wall));
  }
  function addDays(ymd, n){ var a=ymd.split('-').map(Number); return new Date(Date.UTC(a[0],a[1]-1,a[2]+n)).toISOString().slice(0,10); }
  function isoWeekday(ymd){ var a=ymd.split('-').map(Number); return new Date(Date.UTC(a[0],a[1]-1,a[2])).getUTCDay()||7; }
  function keyNoon(ymd){ var a=ymd.split('-').map(Number); return new Date(Date.UTC(a[0],a[1]-1,a[2],12)); }
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function dayLabel(ymd){ return cap(longDayFmt.format(keyNoon(ymd))); }
  function timeRange(iso){ var s=new Date(iso), e=new Date(s.getTime()+RULES.duration*60000); return timeFmt.format(s)+' – '+timeFmt.format(e); }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  /* ---------- Fuente de datos (aquí se conecta el servidor) ---------- */
  function demoSlots(){
    var today=ymdFmt.format(Date.now()), out=[], len=RULES.duration*60000, step=(RULES.duration+RULES.buffer)*60000;
    for(var i=RULES.minDaysAhead;i<=RULES.maxDaysAhead;i++){
      var ymd=addDays(today,i);
      (RULES.hours[isoWeekday(ymd)]||[]).forEach(function(r){
        var limit=zonedTime(ymd,r[1]);
        for(var t=zonedTime(ymd,r[0]); t+len<=limit; t+=step){
          // En la demo, algunas horas salen ocupadas para que el calendario se vea real
          var h=(t/60000)%97; if(h%5===0||h%7===0) continue;
          out.push(new Date(t).toISOString());
        }
      });
    }
    return out;
  }
  function isJson(r){ return /application\/json/.test(r.headers.get('content-type')||''); }
  function setDemo(on){
    DEMO=on;
    if(on) document.querySelectorAll('.bk-demo').forEach(function(p){ p.hidden=false; });
  }
  function useDemo(){ setDemo(true); return new Promise(function(res){ setTimeout(function(){ res(demoSlots()); },350); }); }
  var slotsRequest=null;   // una sola consulta compartida por todos los calendarios de la página
  var BookingAPI = {
    slots: function(fresh){
      if(location.protocol==='file:') return useDemo();
      if(DEMO) return useDemo();
      if(slotsRequest && !fresh) return slotsRequest;
      slotsRequest=fetch('/api/booking/slots',{cache:'no-store',headers:{Accept:'application/json'}}).then(function(r){
        if(!isJson(r)) return useDemo();                // no hay servidor de reservas aquí
        return r.json().then(function(d){
          if(!r.ok || !Array.isArray(d.slots)) throw {status:r.status, code:d.error};
          setDemo(false); return d.slots;
        });
      });
      slotsRequest.catch(function(){ slotsRequest=null; });
      return slotsRequest;
    },
    book: function(payload){
      if(DEMO) return new Promise(function(res){ setTimeout(function(){ res({ok:true, eventId:'demo_'+Date.now(), start:payload.start, meetLink:null}); },900); });
      return fetch('/api/booking',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)}).then(function(r){
        return (isJson(r)?r.json():Promise.resolve({})).then(function(d){
          if(!r.ok || !d.ok) throw {status:r.status, code:d.error};
          return d;
        });
      });
    }
  };

  /* ---------- Medición: GTM/GA4, Meta y OpenAI cuando estén instalados, y el panel Know me ---------- */
  function measure(name, data){
    data=data||{};
    if(window.dataLayer) window.dataLayer.push(Object.assign({event:name},data));
    if(typeof window.noumiTrack==='function') window.noumiTrack(name, data.step||data.goal||'');
  }
  function measureLead(eventId, goal){
    var id=String(eventId||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64)||('lead_'+Date.now());
    if(window.dataLayer) window.dataLayer.push({event:'lead_created', event_id:id, goal:goal});
    if(window.fbq) window.fbq('track','Lead',{content_category:goal},{eventID:id});
    if(window.oaiq) window.oaiq('measure','lead_created',{type:'customer_action'},{event_id:id});
    if(typeof window.noumiTrack==='function') window.noumiTrack('lead_created', goal);
  }

  /* ---------- Validación ---------- */
  var EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // Comprobación rápida en el navegador; el servidor la repetirá con libphonenumber-js.
  function phoneOk(raw){
    var v=String(raw).replace(/[\s().-]/g,'');
    if(/(\d)\1{6,}/.test(v)) return false;
    if(/^\+/.test(v)) return /^\+\d{8,15}$/.test(v) && (v.indexOf('+34')!==0 || /^\+34[6789]\d{8}$/.test(v));
    return /^[6789]\d{8}$/.test(v);
  }

  var ARROW='<span class="ic"><svg class="i" viewBox="0 0 16 16"><path d="M5 11L11 5M6 5h5v5"/></svg></span>';
  var LOGO=(document.querySelector('.logo .logo-mark')||{}).outerHTML||'<b>noumi</b>';
  var uid=0;

  /* ---------- Componente ---------- */
  function Booking(root, opts){
    this.root=root; this.opts=opts||{}; this.id='bk'+(++uid);
    this.data={goal:this.opts.goal||'', web:'', budget:'', ticket:'', message:'', name:'', email:'', phone:'', website:''};
    this.step=1; this.slots=null; this.loadError=false; this.day=null; this.slot=null; this.month=null; this.busy=false;
    this.started=false;
    root.classList.add('bk');
    this.render();
    var self=this;
    root.addEventListener('click',function(e){ self.onClick(e); });
    root.addEventListener('submit',function(e){ e.preventDefault(); self.onSubmit(e.target); });
    root.addEventListener('input',function(e){ self.onInput(e.target); });
    root.addEventListener('change',function(e){ self.onInput(e.target); });
    root.addEventListener('focusin',function(){ if(!self.started){ self.started=true; self.load(); measure('booking_start',{source:self.opts.source||''}); } });
  }

  Booking.prototype.ticketSet=function(){ return TICKETS[this.data.goal]||TICKETS.any; };

  Booking.prototype.asideHtml=function(){
    var s=this.step;
    var steps=['Tu negocio','Tus datos','Día y hora'];
    var summary='';
    if(this.slot && s===4) summary='<p class="bk-when"><span>'+esc(dayLabel(ymdFmt.format(new Date(this.slot))))+'</span><b>'+esc(timeRange(this.slot))+'</b></p>';
    return '<aside class="bk-aside">'+
      '<div class="bk-host">'+LOGO+'</div>'+
      '<p class="bk-k">Llamada de descubrimiento</p>'+
      '<ul class="bk-meta">'+
        '<li><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.3 1.5"/></svg>30 min</li>'+
        '<li><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.8" y="4" width="8.6" height="8" rx="2"/><path d="M10.4 7l3.8-2v6l-3.8-2"/></svg>Google Meet</li>'+
        '<li><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c1.8 2 1.8 10.4 0 12.4M8 1.8c-1.8 2-1.8 10.4 0 12.4"/></svg>Hora de España</li>'+
      '</ul>'+ summary +
      (s<4?'<ol class="bk-steps">'+steps.map(function(t,i){
        var n=i+1, st=n<s?'done':(n===s?'now':'');
        var mark='<span class="bk-sn">'+(n<s?'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8.5l2.6 2.6L12 5.5"/></svg>':n)+'</span>';
        // Los pasos ya hechos se pueden pulsar para volver a ellos
        var inner=n<s?'<button type="button" data-go="'+n+'" aria-label="Volver a '+t.toLowerCase()+'">'+mark+'<span class="bk-st">'+t+'</span></button>':mark+'<span class="bk-st">'+t+'</span>';
        return '<li class="'+st+'"'+(n===s?' aria-current="step"':'')+'>'+inner+'</li>';
      }).join('')+'</ol>':'')+
    '</aside>';
  };

  Booking.prototype.render=function(){
    var s=this.step, body='';
    var dir=this.shown==null||this.shown===s?'':(s>this.shown?' bk-fwd':' bk-back');
    this.shown=s;
    if(s===1) body=this.viewSurvey();
    else if(s===2) body=this.viewContact();
    else if(s===3) body=this.viewPick();
    else body=this.viewDone();
    var demo=s<4?'<p class="bk-demo"'+(DEMO?'':' hidden')+'>Vista de prueba: los horarios son de ejemplo y no se crea ninguna cita.</p>':'';
    this.root.innerHTML='<div class="bk-card">'+this.asideHtml()+'<div class="bk-main'+dir+'">'+body+demo+'</div></div>';
  };

  Booking.prototype.viewSurvey=function(){
    var d=this.data, id=this.id, ts=this.ticketSet();
    return '<form class="bk-form" data-step="1" novalidate>'+
      '<h3 class="bk-h">Sobre tu negocio</h3>'+
      '<fieldset class="bk-field"><legend>¿Qué necesitas?</legend><div class="bk-goals">'+
        GOALS.map(function(g){ return '<label class="bk-goal"><input type="radio" name="goal" value="'+g.v+'"'+(d.goal===g.v?' checked':'')+' aria-describedby="'+id+'-err-goal"><span><b>'+g.t+'</b><em>'+g.s+'</em></span></label>'; }).join('')+
      '</div><p class="bk-err" id="'+id+'-err-goal" data-err="goal" hidden>Elige qué necesitas.</p></fieldset>'+
      '<div class="bk-row">'+
        '<div class="bk-field"><label for="'+id+'-budget">Inversión mensual en publicidad</label><select id="'+id+'-budget" name="budget" aria-describedby="'+id+'-err-budget"><option value="">Elige una opción</option>'+
          BUDGETS.map(function(o){return '<option'+(d.budget===o?' selected':'')+'>'+o+'</option>';}).join('')+'</select><p class="bk-err" id="'+id+'-err-budget" data-err="budget" hidden>Elige cuánto inviertes al mes.</p></div>'+
        '<div class="bk-field"><label for="'+id+'-ticket">'+ts.label+'</label><select id="'+id+'-ticket" name="ticket" aria-describedby="'+id+'-err-ticket"><option value="">Elige una opción</option>'+
          ts.options.map(function(o){return '<option'+(d.ticket===o?' selected':'')+'>'+o+'</option>';}).join('')+'</select><p class="bk-err" id="'+id+'-err-ticket" data-err="ticket" hidden>Elige una opción.</p></div>'+
      '</div>'+
      '<div class="bk-field"><label for="'+id+'-web">Web actual <span>(si tienes)</span></label><input id="'+id+'-web" name="web" autocomplete="url" placeholder="tuweb.com" value="'+esc(d.web)+'"></div>'+
      '<div class="bk-field"><label for="'+id+'-msg">¿Qué te preocupa ahora mismo? <span>(opcional)</span></label><textarea id="'+id+'-msg" name="message" rows="2" maxlength="2000">'+esc(d.message)+'</textarea></div>'+
      '<div class="bk-foot"><small>Te lleva menos de un minuto.</small><button class="btn btn-primary" type="submit">Continuar '+ARROW+'</button></div>'+
    '</form>';
  };

  Booking.prototype.viewContact=function(){
    var d=this.data, id=this.id;
    return '<form class="bk-form" data-step="2" novalidate>'+
      '<button class="bk-back" type="button" data-go="1"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>Atrás</button>'+
      '<h3 class="bk-h">Tus datos de contacto</h3>'+
      '<div class="bk-row">'+
        '<div class="bk-field"><label for="'+id+'-name">Nombre</label><input id="'+id+'-name" name="name" autocomplete="name" value="'+esc(d.name)+'" aria-describedby="'+id+'-err-name"><p class="bk-err" id="'+id+'-err-name" data-err="name" hidden>Escribe tu nombre.</p></div>'+
        '<div class="bk-field"><label for="'+id+'-email">Email</label><input id="'+id+'-email" name="email" type="email" autocomplete="email" value="'+esc(d.email)+'" aria-describedby="'+id+'-err-email"><p class="bk-err" id="'+id+'-err-email" data-err="email" hidden>Escribe un email válido, por ejemplo nombre@empresa.com.</p></div>'+
      '</div>'+
      '<div class="bk-field"><label for="'+id+'-phone">Teléfono</label><input id="'+id+'-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="612 345 678" value="'+esc(d.phone)+'" aria-describedby="'+id+'-hint-phone '+id+'-err-phone"><p class="bk-hint" id="'+id+'-hint-phone" data-hint="phone">Si no es un número español, añade el prefijo de tu país (+33, +52…).</p><p class="bk-err" id="'+id+'-err-phone" data-err="phone" hidden>Revisa el teléfono: no parece un número válido. Si no es español, añade el prefijo de tu país.</p></div>'+
      // Campo trampa para robots: invisible para personas y lectores de pantalla
      '<input class="bk-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" value="">'+
      '<div class="bk-foot"><small>Usamos tus datos solo para preparar la llamada.</small><button class="btn btn-primary" type="submit">Elegir día y hora '+ARROW+'</button></div>'+
    '</form>';
  };

  Booking.prototype.viewPick=function(){
    var self=this;
    if(!this.slots && !this.loadError){ this.load(); }
    var head='<button class="bk-back" type="button" data-go="2"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>Atrás</button><h3 class="bk-h">Elige día y hora</h3>';
    if(this.loadError) return head+'<div class="bk-empty"><span>No se pueden cargar los horarios ahora mismo. Vuelve a intentarlo o escríbenos a <a href="mailto:'+CONTACT_EMAIL+'">'+CONTACT_EMAIL+'</a>.</span><button class="btn btn-soft" type="button" data-retry>Reintentar</button></div>';
    if(!this.slots) return head+'<div class="bk-pick" aria-busy="true"><div class="bk-cal bk-skel"></div><div class="bk-times">'+'<span class="bk-skel-row"></span>'.repeat(5)+'</div></div>';
    var byDay=this.byDay(), days=Object.keys(byDay);
    if(!days.length) return head+'<div class="bk-empty"><span>No quedan huecos libres en los próximos días. Escríbenos a <a href="mailto:'+CONTACT_EMAIL+'">'+CONTACT_EMAIL+'</a> y buscamos una hora.</span></div>';
    if(!this.day||!byDay[this.day]) this.day=days[0];
    var first=days[0].split('-').map(Number), last=days[days.length-1].split('-').map(Number);
    var minM={y:first[0],m:first[1]-1}, maxM={y:last[0],m:last[1]-1};
    if(!this.month){ var a=this.day.split('-').map(Number); this.month={y:a[0],m:a[1]-1}; }
    var M=this.month, mIdx=M.y*12+M.m;
    var offset=(new Date(Date.UTC(M.y,M.m,1)).getUTCDay()+6)%7, dim=new Date(Date.UTC(M.y,M.m+1,0)).getUTCDate();
    var prefix=M.y+'-'+String(M.m+1).padStart(2,'0')+'-';
    var cells=['lu','ma','mi','ju','vi','sá','do'].map(function(w){return '<span class="bk-wd">'+w+'</span>';}).join('');
    for(var i=0;i<offset;i++) cells+='<span></span>';
    for(var dnum=1;dnum<=dim;dnum++){
      var key=prefix+String(dnum).padStart(2,'0'), av=!!byDay[key], sel=key===self.day;
      cells+='<button type="button" class="bk-day'+(sel?' is-sel':'')+'" '+(av?'data-day="'+key+'"':'disabled')+(sel?' aria-pressed="true"':'')+' aria-label="'+esc(dayLabel(key))+(av?'':', sin huecos')+'">'+dnum+'</button>';
    }
    return head+
      '<div class="bk-pick">'+
        '<div class="bk-cal">'+
          '<div class="bk-month"><button type="button" class="bk-nav" data-month="-1" aria-label="Mes anterior"'+(mIdx<=minM.y*12+minM.m?' disabled':'')+'><svg viewBox="0 0 16 16"><path d="M10 3L5 8l5 5"/></svg></button>'+
          '<span>'+cap(monthFmt.format(new Date(Date.UTC(M.y,M.m,1))))+'</span>'+
          '<button type="button" class="bk-nav" data-month="1" aria-label="Mes siguiente"'+(mIdx>=maxM.y*12+maxM.m?' disabled':'')+'><svg viewBox="0 0 16 16"><path d="M6 3l5 5-5 5"/></svg></button></div>'+
          '<div class="bk-grid">'+cells+'</div>'+
        '</div>'+
        '<div class="bk-side">'+this.sideHtml(byDay)+'</div>'+
      '</div>'+
      (this.err?'<p class="bk-alert" role="alert">'+esc(this.err)+'</p>':'')+
      '<div class="bk-foot bk-foot-pick">'+this.footHtml()+'</div>';
  };

  Booking.prototype.sideHtml=function(byDay){
    var self=this;
    return '<p class="bk-dayname">'+esc(cap(shortDayFmt.format(keyNoon(this.day))))+'</p><div class="bk-times" role="group" aria-label="Horas libres el '+esc(dayLabel(this.day))+'">'+
      (byDay||this.byDay())[this.day].map(function(iso,i){
        var on=iso===self.slot;
        return '<button type="button" class="bk-time'+(on?' is-sel':'')+'" style="--i:'+i+'" data-slot="'+iso+'" aria-pressed="'+on+'">'+timeFmt.format(new Date(iso))+'</button>';
      }).join('')+'</div>';
  };

  Booking.prototype.footHtml=function(){
    if(!this.slot) return '<small class="bk-tip">Elige una hora para continuar.</small>';
    var when='<small><b>'+esc(dayLabel(ymdFmt.format(new Date(this.slot))))+'</b>'+esc(timeRange(this.slot))+'</small>';
    var btn=this.busy
      ? '<button class="btn btn-primary bk-confirm is-busy" type="button" disabled aria-busy="true">Reservando <span class="bk-spin" aria-hidden="true"></span></button>'
      : '<button class="btn btn-primary bk-confirm" type="button" data-confirm>Confirmar llamada '+ARROW+'</button>';
    return when+btn;
  };

  /* Elegir día u hora solo cambia lo necesario: la columna de horas, el pie y el resumen,
     sin volver a pintar el paso entero (así no salta el foco y las transiciones se ven) */
  Booking.prototype.refreshPick=function(dayChanged){
    var side=this.root.querySelector('.bk-side'), foot=this.root.querySelector('.bk-foot-pick'), aside=this.root.querySelector('.bk-aside');
    if(!side||!foot){ this.render(); return; }
    var self=this;
    this.root.querySelectorAll('.bk-day[data-day]').forEach(function(b){ var on=b.getAttribute('data-day')===self.day; b.classList.toggle('is-sel',on); if(on) b.setAttribute('aria-pressed','true'); else b.removeAttribute('aria-pressed'); });
    if(dayChanged){ side.innerHTML=this.sideHtml(); side.classList.remove('bk-swap'); void side.offsetWidth; side.classList.add('bk-swap'); }
    else this.root.querySelectorAll('.bk-time').forEach(function(b){ var on=b.getAttribute('data-slot')===self.slot; b.classList.toggle('is-sel',on); b.setAttribute('aria-pressed',String(on)); });
    foot.innerHTML=this.footHtml();
    if(aside) aside.outerHTML=this.asideHtml();
    var al=this.root.querySelector('.bk-alert'); if(al&&!this.err) al.remove();
  };

  Booking.prototype.viewDone=function(){
    var d=this.data;
    return '<div class="bk-done" role="status">'+
      '<span class="bk-ok"><svg viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M6 12.5l4 4 8-9"/></svg></span>'+
      '<h3 class="bk-h">Llamada reservada</h3>'+
      '<p class="bk-donewhen">'+esc(dayLabel(ymdFmt.format(new Date(this.slot))))+', '+esc(timeRange(this.slot))+'</p>'+
      '<p>Te hemos enviado la invitación a <b>'+esc(d.email)+'</b> con el enlace de Google Meet. Antes de la llamada revisamos tus números para llegar con un diagnóstico.</p>'+
      (DEMO?'<p class="bk-demo">Vista de prueba: no se ha creado ninguna cita ni se ha enviado ningún correo.</p>':'')+
    '</div>';
  };

  Booking.prototype.byDay=function(){
    var map={}; (this.slots||[]).forEach(function(iso){ var k=ymdFmt.format(new Date(iso)); (map[k]=map[k]||[]).push(iso); }); return map;
  };

  Booking.prototype.load=function(){
    var self=this;
    if(this.loading) return; this.loading=true;
    BookingAPI.slots(this.slots===null&&this.stale).then(function(s){ self.slots=s; self.stale=false; }).catch(function(){ self.loadError=true; }).then(function(){ self.loading=false; if(self.step===3) self.render(); });
  };

  Booking.prototype.go=function(step, focus){
    this.step=step; this.err=null; this.render();
    measure('booking_step',{step:['','encuesta','contacto','dia_hora','reservada'][step]});
    var t=this.root.querySelector('.bk-h'); if(t&&focus!==false){ t.setAttribute('tabindex','-1'); t.focus({preventScroll:false}); }
  };

  Booking.prototype.onInput=function(el){
    if(!el.name||!(el.name in this.data)) return;
    if(el.type==='radio'){ if(el.checked){ this.data[el.name]=el.value; if(el.name==='goal'){ this.data.ticket=''; this.render(); var r=this.root.querySelector('input[name="goal"][value="'+el.value+'"]'); if(r) r.focus(); } } }
    else this.data[el.name]=el.value;
    var e=this.root.querySelector('[data-err="'+el.name+'"]'); if(e&&!e.hidden) this.check(el.name);
  };

  Booking.prototype.check=function(key){
    var d=this.data, ok=true;
    if(key==='goal') ok=!!d.goal;
    else if(key==='budget'||key==='ticket'||key==='name') ok=String(d[key]).trim().length>(key==='name'?1:0);
    else if(key==='email') ok=EMAIL_RE.test(d.email.trim());
    else if(key==='phone') ok=phoneOk(d.phone);
    var e=this.root.querySelector('[data-err="'+key+'"]'); if(e) e.hidden=ok;
    this.root.querySelectorAll('[name="'+key+'"]').forEach(function(f){ f.setAttribute('aria-invalid',ok?'false':'true'); });
    var h=this.root.querySelector('[data-hint="'+key+'"]'); if(h) h.hidden=!ok;
    return ok;
  };

  Booking.prototype.onSubmit=function(form){
    var self=this, keys=form.getAttribute('data-step')==='1'?['goal','budget','ticket']:['name','email','phone'];
    [].forEach.call(form.elements,function(el){ if(el.name&&el.name in self.data&&el.type!=='radio') self.data[el.name]=el.value; });
    var bad=keys.filter(function(k){ return !self.check(k); });
    if(bad.length){ var f=form.querySelector('[name="'+bad[0]+'"]'); if(f) f.focus(); measure('booking_error',{step:bad.join(',')}); return; }
    this.go(form.getAttribute('data-step')==='1'?2:3);
  };

  Booking.prototype.onClick=function(e){
    var t=e.target.closest('button'); if(!t||!this.root.contains(t)) return;
    if(t.hasAttribute('data-go')) this.go(Number(t.getAttribute('data-go')));
    else if(t.hasAttribute('data-retry')){ this.loadError=false; this.stale=true; this.render(); }
    else if(t.hasAttribute('data-month')){ var M=this.month, n=M.y*12+M.m+Number(t.getAttribute('data-month')); this.month={y:Math.floor(n/12),m:n%12}; this.render(); }
    else if(t.hasAttribute('data-day')){ var nd=t.getAttribute('data-day'); if(nd!==this.day){ this.day=nd; this.slot=null; this.err=null; this.refreshPick(true); } }
    else if(t.hasAttribute('data-slot')){ this.slot=t.getAttribute('data-slot'); this.err=null; this.refreshPick(false); }
    else if(t.hasAttribute('data-confirm')) this.book();
  };

  Booking.prototype.book=function(){
    var self=this, d=this.data; if(this.busy||!this.slot) return;
    if(d.website){ return; }   // robot
    this.busy=true; this.refreshPick(false);
    var payload={start:this.slot, duration:RULES.duration, goal:d.goal, web:d.web, budget:d.budget, ticket:d.ticket, message:d.message,
      name:d.name.trim(), email:d.email.trim(), phone:d.phone.trim(), website:d.website, source:this.opts.source||location.pathname};
    BookingAPI.book(payload).then(function(r){
      if(!r||!r.ok) throw r;
      self.busy=false; measureLead(r.eventId, d.goal); self.go(4);
    }).catch(function(r){
      self.busy=false;
      if(r&&r.status===409){ self.err='Esa hora se acaba de ocupar. Elige otra, por favor.'; self.slot=null; self.slots=null; self.stale=true; }
      else if(r&&r.code==='invalid_phone'){ self.go(2); self.check('phone'); var e=self.root.querySelector('[data-err="phone"]'); if(e) e.hidden=false; var f=self.root.querySelector('[name="phone"]'); if(f){ f.setAttribute('aria-invalid','true'); f.focus(); } return; }
      else self.err='No se ha podido completar la reserva. Inténtalo de nuevo en unos segundos o escríbenos a '+CONTACT_EMAIL+'.';
      self.render();
    });
  };

  /* ---------- Montaje: secciones, página y pop-up ---------- */
  document.querySelectorAll('[data-booking]').forEach(function(el){
    new Booking(el,{goal:el.getAttribute('data-goal')||'', source:el.getAttribute('data-source')||location.pathname});
  });

  var dialog=null, modalBooking=null, lastFocus=null;
  function openModal(goal, source){
    if(!dialog){
      dialog=document.createElement('dialog');
      dialog.className='bk-modal'; dialog.setAttribute('aria-label','Reservar llamada');
      dialog.innerHTML='<button class="bk-close" type="button" aria-label="Cerrar"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg></button><div class="bk-slot"></div>';
      document.body.appendChild(dialog);
      dialog.querySelector('.bk-close').addEventListener('click',closeModal);
      dialog.addEventListener('click',function(e){ if(e.target===dialog) closeModal(); });   // clic fuera
      dialog.addEventListener('cancel',function(e){ e.preventDefault(); closeModal(); });   // Escape, con la misma salida
      dialog.addEventListener('close',function(){ document.documentElement.classList.remove('bk-lock'); if(lastFocus) lastFocus.focus(); });
    }
    var inline=document.querySelector('[data-booking][data-goal]'), pageGoal=inline?inline.getAttribute('data-goal'):'';
    if(!modalBooking || modalBooking.step===4){
      var slot=dialog.querySelector('.bk-slot'); slot.innerHTML='';
      modalBooking=new Booking(slot,{goal:goal||pageGoal||'', source:source||'popup'});
      modalBooking.load();
    } else if(goal && modalBooking.step===1){ modalBooking.data.goal=goal; modalBooking.render(); }
    lastFocus=document.activeElement;
    document.documentElement.classList.add('bk-lock');
    if(dialog.showModal) dialog.showModal(); else dialog.setAttribute('open','');
    measure('booking_open',{source:source||'popup'});
  }
  // Al cerrar, una salida corta (fundido o bajada en el móvil) antes de quitar el pop-up
  function closeModal(){
    if(!dialog||!dialog.open||dialog.classList.contains('is-closing')) return;
    var done=false, finish=function(){ if(done) return; done=true; dialog.classList.remove('is-closing'); if(dialog.close) dialog.close(); else { dialog.removeAttribute('open'); document.documentElement.classList.remove('bk-lock'); } };
    dialog.classList.add('is-closing');
    dialog.addEventListener('animationend',function h(e){ if(e.target===dialog){ dialog.removeEventListener('animationend',h); finish(); } });
    setTimeout(finish,320);
  }

  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href$="#reservar"], [data-open-booking]');
    if(!a||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey) return;
    if(a.closest('.bk')) return;
    e.preventDefault();
    var own=document.querySelector('.book-wrap[data-booking]');   // en reservar.html el calendario ya está en la página
    if(own){ own.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    var nav=document.getElementById('nav'); if(nav&&nav.classList.contains('open')){ var mb=document.getElementById('menu-btn'); if(mb) mb.click(); }
    openModal(a.getAttribute('data-goal')||'', (a.textContent||'').trim().slice(0,30)||'popup');
  });

  // Desde otra página se llega con #reservar: se abre el pop-up nada más cargar
  if(location.hash==='#reservar' && !document.querySelector('[data-booking]')) openModal('', 'enlace');

  window.NoumiBooking={open:openModal};
})();
