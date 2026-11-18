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

  /* Carrusel cóncavo: las tarjetas van por la cara interior de un cilindro (la central al fondo,
     las laterales curvándose hacia ti). aspect = ancho/alto de cada tarjeta, size = ancho de la tarjeta
     respecto al contenedor, radius = esquinas en px. Se arrastra con inercia, con flechas o con el teclado. */
  document.querySelectorAll('.cc').forEach(function(cc){
    var stage=cc.querySelector('.cc-stage'), items=[].slice.call(cc.querySelectorAll('.cc-item'));
    var cap=cc.querySelector('.cc-cap'), N=items.length; if(!stage||!N) return;
    var aspect=parseFloat(cc.dataset.aspect)||1.69, size=parseFloat(cc.dataset.size)||.51, radius=parseFloat(cc.dataset.radius)||10;
    var still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pos=0, target=0, w=0, h=0, R=0, step=0, raf=0, lastShown=-1;
    function mod(a,n){return ((a%n)+n)%n;}
    function layout(){
      var W=stage.clientWidth, s=W<560?Math.max(size,.66):size;  /* en móvil, tarjetas más anchas para que se lean */
      w=W*s; h=w/aspect; R=W*.95;
      var gap=Math.max(14,W*.018);
      step=2*Math.asin(Math.min(.99,(w+gap)/2/R));
      stage.style.height=Math.round(h*1.32)+'px';
      stage.style.perspective=Math.round(R*1.25)+'px';
      items.forEach(function(it){it.style.width=w+'px';it.style.height=h+'px';it.style.marginLeft=(-w/2)+'px';it.style.marginTop=(-h/2)+'px';it.style.borderRadius=radius+'px';});
      render();
    }
    function render(){
      items.forEach(function(it,i){
        var d=mod(i-pos+N/2,N)-N/2, a=d*step, ad=Math.abs(a);
        if(ad>1.25){it.style.visibility='hidden';return;}
        it.style.visibility='visible';
        var x=R*Math.sin(a), z=R*(1-Math.cos(a));
        it.style.transform='translate3d('+x.toFixed(1)+'px,0,'+z.toFixed(1)+'px) rotateY('+(-a*180/Math.PI).toFixed(2)+'deg)';
        it.style.zIndex=String(100-Math.round(Math.abs(d)*10));
        it.style.setProperty('--dim',Math.min(.3,Math.abs(d)*.18).toFixed(3));
      });
      var cur=mod(Math.round(pos),N);
      if(cur!==lastShown&&cap){
        lastShown=cur; var it=items[cur], tags=(it.dataset.tags||'').split('|');
        cap.innerHTML='<b>'+esc(it.dataset.name||'')+'</b>'+tags.map(function(t){return '<span>'+esc(t)+'</span>';}).join('');
      }
    }
    function tick(){
      var diff=target-pos;
      if(still||Math.abs(diff)<.001){pos=target;render();raf=0;return;}
      pos+=diff*.14; render(); raf=requestAnimationFrame(tick);
    }
    function go(t){target=t; if(!raf) raf=requestAnimationFrame(tick);}
    /* Arrastre con inercia */
    var drag=null, moved=false;
    stage.addEventListener('pointerdown',function(e){
      if(e.button!==0) return;
      drag={x:e.clientX,p:pos,t:performance.now(),v:0,lx:e.clientX}; moved=false;
      cancelAnimationFrame(raf); raf=0; stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove',function(e){
      if(!drag) return;
      var dx=e.clientX-drag.x; if(Math.abs(dx)>4){moved=true;cc.classList.add('dragging');}
      var now=performance.now(), dt=Math.max(1,now-drag.t);
      drag.v=(e.clientX-drag.lx)/dt; drag.lx=e.clientX; drag.t=now;
      pos=drag.p-dx/(w*1.05); target=pos; render();
    });
    function release(){
      if(!drag) return;
      var fling=-drag.v*260/(w*1.05);  /* velocidad al soltar: sigue girando y se queda en la tarjeta más cercana */
      drag=null; cc.classList.remove('dragging');
      go(Math.round(pos+Math.max(-3,Math.min(3,fling))));
      if(moved) track('carousel_drag','webs');
    }
    stage.addEventListener('pointerup',release);
    stage.addEventListener('pointercancel',release);
    /* Pulsar una tarjeta lateral la trae al centro */
    stage.addEventListener('click',function(e){
      if(moved){moved=false;return;}
      var it=e.target.closest('.cc-item'); if(!it) return;
      var i=items.indexOf(it), d=mod(i-target+N/2,N)-N/2;
      if(Math.abs(d)>.5) go(target+Math.round(d));
    });
    cc.querySelectorAll('.cc-btn').forEach(function(b){b.addEventListener('click',function(){go(Math.round(target)+parseInt(b.dataset.dir,10));});});
    cc.addEventListener('keydown',function(e){
      if(e.key==='ArrowLeft'){e.preventDefault();go(Math.round(target)-1);}
      else if(e.key==='ArrowRight'){e.preventDefault();go(Math.round(target)+1);}
    });
    window.addEventListener('resize',layout);
    layout();
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
