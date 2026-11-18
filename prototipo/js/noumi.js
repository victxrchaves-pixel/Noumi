/* Noumi Consultant: comportamiento compartido de todas las páginas.
   Cada bloque comprueba que sus elementos existen, así el mismo archivo sirve para todas. */
(function(){
  function $(id){return document.getElementById(id);}
  function setText(id,t){var el=$(id); if(el) el.textContent=t;}
  var CHECK='<svg class="i" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  var DOT='<i class="dot"></i>';

  /* Menú móvil */
  var nav=$('nav'), btn=$('menu-btn');
  if(nav&&btn){
    var setOpen=function(open){nav.classList.toggle('open',open);btn.setAttribute('aria-expanded',open?'true':'false');btn.textContent=open?'Cerrar':'Menú';};
    btn.addEventListener('click',function(){setOpen(!nav.classList.contains('open'));});
    nav.addEventListener('click',function(e){if(e.target.closest('a'))setOpen(false);});
  }

  /* Tema claro / oscuro */
  var root=document.documentElement, tb=$('theme-btn');
  function currentTheme(){return root.getAttribute('data-theme')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}
  function applyTheme(t){root.setAttribute('data-theme',t);if(tb)tb.setAttribute('aria-label',t==='dark'?'Cambiar a tema claro':'Cambiar a tema oscuro');}
  try{var saved=localStorage.getItem('noumi-theme');if(saved==='dark'||saved==='light')applyTheme(saved);}catch(e){}
  if(tb) tb.setAttribute('aria-label',currentTheme()==='dark'?'Cambiar a tema claro':'Cambiar a tema oscuro');

  /* Know me: tracking local de la visita (nada sale del navegador) */
  var t0=Date.now(), events=[], seen={}, maxScroll=0, engaged=false, started=false;
  var sections=[].slice.call(document.querySelectorAll('main [data-section]'));
  var total=sections.length;
  function fmt(ms){var s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function track(name,detail){events.push({n:name,d:detail||'',t:Date.now()-t0});render();}
  function render(){
    var log=$('kme-log');
    if(log) log.innerHTML=events.slice(-8).reverse().map(function(e){return '<li><span class="tm">'+fmt(e.t)+'</span><span>'+esc(e.n)+'</span><span class="dt">'+esc(e.d)+'</span></li>';}).join('');
    var hev=$('hero-ev');
    if(hev){
      var last=events.slice(-4);
      hev.innerHTML=last.map(function(e,i){var isLast=i===last.length-1;return '<div'+(isLast?' class="hit"':'')+'><span>'+esc(e.n)+'</span>'+(isLast?DOT:CHECK)+'</div>';}).join('');
    }
    setText('kme-count',events.length+(events.length===1?' evento':' eventos'));
    setText('kme-secs',Object.keys(seen).length+'/'+total);
  }
  setInterval(function(){
    var el=Date.now()-t0, txt=fmt(el);
    setText('kme-time',txt); setText('hero-time',txt);
    if(!engaged&&el>=30000){engaged=true;track('user_engagement','30 s');}
  },1000);

  var marks=[25,50,75,90];
  function onScroll(){
    var h=document.documentElement, max=h.scrollHeight-h.clientHeight;
    var pct=max>0?Math.round(h.scrollTop/max*100):0;
    if(pct>maxScroll){maxScroll=pct;setText('kme-scroll',pct+'%');setText('hero-scroll',pct+'%');}
    while(marks.length&&maxScroll>=marks[0]){track('scroll_'+marks[0],'');marks.shift();}
  }
  window.addEventListener('scroll',onScroll,{passive:true});

  if('IntersectionObserver' in window&&sections.length){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        var name=en.target.getAttribute('data-section');
        if(en.isIntersecting&&!seen[name]){seen[name]=true;track('section_view',name);}
      });
    },{threshold:.25});
    sections.forEach(function(el){io.observe(el);});
  }

  document.addEventListener('click',function(e){
    var a=e.target.closest('a,button');
    if(!a||a.closest('#kme')||a.closest('.s3')||a.id==='menu-btn'||a.id==='theme-btn')return;
    var label=(a.textContent||'').trim().slice(0,22);
    if(a.closest('.goal'))track('select_solution',label);
    else if(/#reservar$/.test(a.getAttribute('href')||'')||a.classList.contains('btn'))track('cta_click',label);
    else if(a.closest('nav'))track('nav_click',label);
  });
  document.querySelectorAll('.faq details').forEach(function(d){
    d.addEventListener('toggle',function(){if(d.open)track('faq_open',d.querySelector('summary').textContent.slice(0,22));});
  });

  if(tb) tb.addEventListener('click',function(){
    var t=currentTheme()==='dark'?'light':'dark';
    applyTheme(t);
    try{localStorage.setItem('noumi-theme',t);}catch(e){}
    track('theme_change',t);
  });

  /* Servicios: tres pasos. En escritorio avanzan solos (la barra marca el tiempo) y se pueden pulsar;
     se pausan con el ratón encima, con el foco dentro o fuera de pantalla. En móvil se ven todos. */
  var s3=document.querySelector('.s3');
  if(s3){
    var tabs=[].slice.call(s3.querySelectorAll('.s3-tab'));
    var panels=[].slice.call(s3.querySelectorAll('.s3-panel'));
    var desk=window.matchMedia?matchMedia('(min-width: 901px)'):{matches:true};
    var show=function(i,byUser){
      tabs.forEach(function(t,j){t.classList.toggle('is-active',j===i);t.setAttribute('aria-expanded',(j===i||!desk.matches)?'true':'false');});
      panels.forEach(function(p,j){p.classList.toggle('is-active',j===i);});
      if(byUser) track('service_step',tabs[i].getAttribute('data-name'));
    };
    tabs.forEach(function(t,i){t.addEventListener('click',function(){ if(desk.matches) show(i,true); });});
    s3.addEventListener('animationend',function(e){
      if(e.animationName!=='s3fill'||!desk.matches) return;
      var i=tabs.findIndex(function(t){return t.classList.contains('is-active');});
      show((i+1)%tabs.length,false);
    });
    var pb=$('s3-pause');
    if(pb) pb.addEventListener('click',function(){
      var p=!s3.classList.contains('paused');
      s3.classList.toggle('paused',p); pb.setAttribute('aria-pressed',p?'true':'false');
      pb.querySelector('span').textContent=p?'Reanudar pasos':'Pausar pasos';
    });
    s3.addEventListener('mouseenter',function(){s3.classList.add('hold');});
    s3.addEventListener('mouseleave',function(){s3.classList.remove('hold');});
    s3.addEventListener('focusin',function(){s3.classList.add('hold');});
    s3.addEventListener('focusout',function(e){if(!s3.contains(e.relatedTarget))s3.classList.remove('hold');});
    if('IntersectionObserver' in window){
      s3.classList.add('away');
      new IntersectionObserver(function(en){s3.classList.toggle('away',!en[0].isIntersecting);},{threshold:.35}).observe(s3);
    }
    show(0,false);
    if(desk.addEventListener) desk.addEventListener('change',function(){show(tabs.findIndex(function(t){return t.classList.contains('is-active');}),false);});
  }

  /* Formulario de contacto: validación con un mensaje junto a cada campo */
  var form=$('discovery'), ok=$('form-ok');
  if(form){
    form.addEventListener('focusin',function(){if(!started){started=true;track('form_start','discovery');}});
    form.addEventListener('change',function(e){if(e.target.name==='goal')track('select_goal',e.target.value);});
    var RULES=[
      {key:'name',el:$('f-name'),msg:'Escribe tu nombre.',ok:function(el){return el.value.trim().length>1;}},
      {key:'email',el:$('f-email'),msg:'Escribe un email válido, por ejemplo nombre@empresa.com.',ok:function(el){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());}},
      {key:'goal',el:form.querySelector('fieldset.goal-field'),msg:'Elige qué necesitas.',ok:function(){return !!form.querySelector('input[name="goal"]:checked');}},
      {key:'budget',el:$('f-budget'),msg:'Elige cuánto inviertes al mes en publicidad.',ok:function(el){return !!el.value;}},
      {key:'ticket',el:$('f-ticket'),msg:'Elige el ticket medio o el valor de un cliente.',ok:function(el){return !!el.value;}}
    ].filter(function(r){return !!r.el;});
    RULES.forEach(function(r){
      var p=document.createElement('p'); p.className='err'; p.id='err-'+r.key; p.hidden=true;
      (r.key==='goal'?r.el:r.el.parentNode).appendChild(p); r.err=p;
      var targets=r.key==='goal'?r.el.querySelectorAll('input'):[r.el];
      [].forEach.call(targets,function(t){t.setAttribute('aria-describedby',p.id);});
    });
    var check=function(r){
      var valid=r.ok(r.el);
      r.err.hidden=valid; r.err.textContent=valid?'':r.msg;
      if(r.key==='goal') r.el.classList.toggle('invalid',!valid); else r.el.setAttribute('aria-invalid',valid?'false':'true');
      return valid;
    };
    RULES.forEach(function(r){
      var ev=r.key==='goal'||r.el.tagName==='SELECT'?'change':'blur';
      r.el.addEventListener(ev,function(){ if(r.touched||!r.err.hidden) check(r); },true);
      r.el.addEventListener('input',function(){ if(!r.err.hidden) check(r); });
      r.el.addEventListener('focusout',function(){ r.touched=true; },true);
    });
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var bad=RULES.filter(function(r){return !check(r);});
      if(bad.length){
        ok.hidden=true;
        var f=bad[0].key==='goal'?bad[0].el.querySelector('input'):bad[0].el; f.focus();
        track('form_error',bad.map(function(r){return r.key;}).join(','));
        return;
      }
      ok.hidden=false;
      var g=form.querySelector('input[name="goal"]:checked')||form.querySelector('input[name="goal"][type="hidden"]');
      track('generate_lead',g?g.value:'');
    });
  }

  /* Las tarjetas de soluciones preseleccionan el objetivo en el formulario */
  document.querySelectorAll('a[data-goal]').forEach(function(a){
    a.addEventListener('click',function(){
      var r=$('f-goal-'+a.getAttribute('data-goal'));
      if(r){r.checked=true; r.dispatchEvent(new Event('change',{bubbles:true}));}
    });
  });

  /* Menú: marca la sección que está en pantalla (solo enlaces a esta misma página) */
  if(nav&&'IntersectionObserver' in window){
    var navLinks=[].slice.call(nav.querySelectorAll('a[href^="#"]:not(.nav-cta)'));
    var spy=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(!en.isIntersecting) return;
        navLinks.forEach(function(l){ if(l.getAttribute('href')==='#'+en.target.id) l.setAttribute('aria-current','true'); else l.removeAttribute('aria-current'); });
      });
    },{rootMargin:'-45% 0px -50% 0px'});
    navLinks.forEach(function(l){var t=document.querySelector(l.getAttribute('href')); if(t) spy.observe(t);});
  }

  var kb=$('kme-btn'), kp=$('kme-panel');
  if(kb&&kp) kb.addEventListener('click',function(){var open=kp.hidden;kp.hidden=!open;kb.setAttribute('aria-expanded',open?'true':'false');});

  track('page_view',location.pathname.split('/').pop()||'/');
  onScroll();
})();
