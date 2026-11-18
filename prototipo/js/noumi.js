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

  /* Carrusel cóncavo (WebGL). Las tarjetas se doblan sobre la cara interior de un cilindro: la del centro queda
     al fondo y las de los lados se curvan hacia ti. Cada tarjeta lleva un reflejo suave debajo y su texto, que solo
     se ve del todo en la del centro. Configuración (atributos data-): aspect, size, curvature, distance, tilt, gap,
     radius, reflection, dim, autoplay="drift", speed (tarjetas por segundo), interval (s de pausa tras tocarlo),
     inertia, snap, pauseOnHover, draggable, wheel, captions, controls. Sin WebGL, las webs se ven en una fila. */
  var VS='#version 300 es\nin vec2 aUV;uniform float uOff,uW,uH,uR,uP,uVW,uVH,uCy,uMirror,uGapR,uTilt;out vec2 vUV;'+
    'void main(){float s=uOff+(aUV.x-.5)*uW;float a=s/uR;float x=uR*sin(a);float z=uR*(1.-cos(a));'+
    'float y=uMirror>.5?(uH*.5+uGapR+(1.-aUV.y)*uH):(aUV.y-.5)*uH;z+=y*uTilt;float wq=uP-z;'+
    'gl_Position=vec4(x*uP/(uVW*.5),wq-(uCy*wq+y*uP)/(uVH*.5),0.,wq);vUV=aUV;}';
  var FS='#version 300 es\nprecision highp float;in vec2 vUV;uniform sampler2D uTex;uniform float uW,uH,uRad,uDim,uAlpha,uMirror,uCrop,uReady;uniform vec3 uBg,uPh;out vec4 o;'+
    'float sdr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}'+
    'void main(){vec2 p=(vUV-.5)*vec2(uW,uH);float d=sdr(p,vec2(uW,uH)*.5,uRad);float aa=max(fwidth(d),.0001);float m=1.-smoothstep(-aa,aa,d);'+
    'vec3 c=uReady>.5?texture(uTex,vec2(vUV.x,vUV.y*uCrop)).rgb:uPh;c=mix(c,uBg,uDim);float a=m*uAlpha;'+
    'if(uMirror>.5){a*=1.-smoothstep(0.,.55,1.-vUV.y);}o=vec4(c*a,a);}';

  document.querySelectorAll('.cc').forEach(function(cc){
    var ds=cc.dataset, num=function(k,d){var v=parseFloat(ds[k]);return isNaN(v)?d:v;}, has=function(k){return k in ds;};
    var cfg={aspect:num('aspect',1.69),size:num('size',.51),curvature:num('curvature',.72),distance:num('distance',4),tilt:num('tilt',0),
      gap:num('gap',16),radius:num('radius',10),reflection:num('reflection',.06),dim:num('dim',.35),speed:num('speed',.16),
      interval:num('interval',4),inertia:num('inertia',.5)};
    var stage=cc.querySelector('.cc-stage'), src=[].slice.call(cc.querySelectorAll('.cc-item'));
    if(!stage||!src.length) return;
    var canvas=document.createElement('canvas'); canvas.className='cc-canvas'; canvas.setAttribute('aria-hidden','true');
    var gl=canvas.getContext('webgl2',{premultipliedAlpha:true,antialias:true,alpha:true});
    if(!gl){ cc.classList.add('cc-flat'); return; }
    stage.insertBefore(canvas,stage.firstChild);
    var M=src.length, N=M; while(N<8) N+=M;   /* el anillo repite las webs hasta tener al menos 8 tarjetas */
    /* Programa */
    function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;}
    var pr=gl.createProgram(); gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS)); gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS)); gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){ canvas.remove(); cc.classList.add('cc-flat'); return; }
    gl.useProgram(pr);
    var U={}; ['uOff','uW','uH','uR','uP','uVW','uVH','uCy','uMirror','uGapR','uTilt','uTex','uRad','uDim','uAlpha','uCrop','uReady','uBg','uPh'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n);});
    var SEG=64, verts=[]; for(var k=0;k<=SEG;k++){verts.push(k/SEG,0,k/SEG,1);}
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'aUV'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    /* Texturas: una por web */
    var tex=src.map(function(fig){
      var t={tex:gl.createTexture(),ready:false,crop:1}, im=new Image(), el=fig.querySelector('img');
      im.decoding='async';
      im.onload=function(){
        gl.bindTexture(gl.TEXTURE_2D,t.tex);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        var ext=gl.getExtension('EXT_texture_filter_anisotropic'); if(ext) gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        t.crop=Math.min(1,(im.naturalWidth/im.naturalHeight)/cfg.aspect); t.ready=true; dirty=true;
      };
      im.src=el?(el.currentSrc||el.src):'';
      return t;
    });
    /* Textos de cada tarjeta */
    var caps=[];
    if(has('captions')){
      var layer=document.createElement('div'); layer.className='cc-caps'; layer.setAttribute('aria-hidden','true'); stage.appendChild(layer);
      for(var i=0;i<N;i++){ var f=src[i%M], c=document.createElement('div'); c.className='cc-cap';
        c.innerHTML='<b>'+esc(f.dataset.title||'')+'</b><span>'+esc(f.dataset.sub||'')+'</span>'; layer.appendChild(c); caps.push(c); }
    }
    var still=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W=0,H=0,dpr=1,w=0,h=0,R=0,P=0,cy=0,unit=0,pos=0,target=null,hover=false,visible=true,drag=null,moved=false,holdUntil=0,last=0,shown=-1,dirty=true,bg=[0,0,0],ph=[.5,.5,.5],centers=[];
    var countEl=cc.querySelector('.cc-count b'), totalEl=cc.querySelector('.cc-count span');
    if(totalEl) totalEl.textContent=String(M).padStart(2,'0');
    function mod(a,n){return ((a%n)+n)%n;}
    function rgb(s){var m=String(s).match(/\d+(\.\d+)?/g)||[0,0,0];return [m[0]/255,m[1]/255,m[2]/255];}
    function colors(){ var cs=getComputedStyle(document.body); bg=rgb(cs.backgroundColor); var btn=cc.querySelector('.cc-btn'); ph=rgb(getComputedStyle(btn||document.body).backgroundColor); dirty=true; }
    function layout(){
      W=stage.clientWidth;
      var frac=cfg.size*.66; if(W<700) frac=Math.max(frac,.62);   /* en móvil, tarjetas más anchas para que se lean */
      w=W*frac; h=w/cfg.aspect; unit=w+cfg.gap;
      R=W*.52/cfg.curvature;            /* más curvatura, cilindro más cerrado */
      P=W*cfg.distance*.25;             /* distancia de la cámara */
      cy=h*.62;
      H=Math.round(cy+h*.5+(has('captions')?96:24)+(cfg.reflection>0?h*.12:0));
      stage.style.height=H+'px';
      dpr=Math.min(2,window.devicePixelRatio||1);
      canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
      canvas.style.width=W+'px'; canvas.style.height=H+'px';
      caps.forEach(function(c){c.style.width=w+'px';});
      dirty=true;
    }
    function draw(){
      gl.viewport(0,0,canvas.width,canvas.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.uW,w); gl.uniform1f(U.uH,h); gl.uniform1f(U.uR,R); gl.uniform1f(U.uP,P);
      gl.uniform1f(U.uVW,W); gl.uniform1f(U.uVH,H); gl.uniform1f(U.uCy,cy); gl.uniform1f(U.uGapR,6);
      gl.uniform1f(U.uTilt,Math.tan(cfg.tilt*Math.PI/180)); gl.uniform1f(U.uRad,cfg.radius);
      gl.uniform3f(U.uBg,bg[0],bg[1],bg[2]); gl.uniform3f(U.uPh,ph[0],ph[1],ph[2]); gl.uniform1i(U.uTex,0);
      var maxA=Math.min(1.5,(W*.62)/R+.55), list=[];
      for(var i=0;i<N;i++){ var d=mod(i-pos+N/2,N)-N/2; if(Math.abs(d*unit/R)<=maxA) list.push([i,d]); }
      list.sort(function(a,b){return Math.abs(b[1])-Math.abs(a[1]);});   /* de atrás hacia delante */
      centers=[];
      list.forEach(function(it){
        var t=tex[it[0]%M], d=it[1];
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,t.tex);
        gl.uniform1f(U.uOff,d*unit); gl.uniform1f(U.uReady,t.ready?1:0); gl.uniform1f(U.uCrop,t.crop);
        gl.uniform1f(U.uDim,cfg.dim*Math.min(1,Math.abs(d)));
        if(cfg.reflection>0){ gl.uniform1f(U.uMirror,1); gl.uniform1f(U.uAlpha,Math.min(1,cfg.reflection*1.6)); gl.drawArrays(gl.TRIANGLE_STRIP,0,(SEG+1)*2); }
        gl.uniform1f(U.uMirror,0); gl.uniform1f(U.uAlpha,1); gl.drawArrays(gl.TRIANGLE_STRIP,0,(SEG+1)*2);
        var a0=d*unit/R, z0=R*(1-Math.cos(a0)), k=P/(P-z0), sx=W/2+R*Math.sin(a0)*k;
        centers.push([it[0],sx,d]);
      });
      caps.forEach(function(c,i){
        var d=mod(i-pos+N/2,N)-N/2, a0=d*unit/R;
        var ad=Math.abs(d), q=Math.min(1,Math.max(0,(ad-.2)/.95)), op=1-q*q*(3-2*q)*.92;  /* la del centro, entera; las demás se apagan */
        if(op<=0||Math.abs(a0)>1.4){ c.style.opacity='0'; return; }
        var z0=R*(1-Math.cos(a0)), k=P/(P-z0), sx=W/2+R*Math.sin(a0)*k, sy=cy+(h*.5)*k+20;
        c.style.opacity=op.toFixed(3);
        c.style.transform='translate('+(sx-w/2).toFixed(1)+'px,'+sy.toFixed(1)+'px)';
      });
      var cur=mod(Math.round(pos),M);
      if(cur!==shown&&countEl){ shown=cur; countEl.textContent=String(cur+1).padStart(2,'0'); }
      dirty=false;
    }
    function frame(t){
      var dt=last?Math.min(.05,(t-last)/1000):0; last=t;
      if(!drag&&visible){
        if(target!==null){
          var diff=target-pos; pos+=still?diff:diff*Math.min(1,dt*7); dirty=true;
          if(Math.abs(diff)<.0008){ pos=target; target=null; }
        } else if(ds.autoplay==='drift'&&!still&&!(hover&&has('pauseOnHover'))&&t>holdUntil){
          pos+=cfg.speed*dt; dirty=true;
        }
      }
      if(dirty&&visible) draw();
      requestAnimationFrame(frame);
    }
    function hold(){ holdUntil=performance.now()+cfg.interval*1000; }
    function go(t){ target=has('snap')?Math.round(t):t; hold(); }
    if(has('pauseOnHover')){ cc.addEventListener('mouseenter',function(){hover=true;}); cc.addEventListener('mouseleave',function(){hover=false;}); }
    if('IntersectionObserver' in window) new IntersectionObserver(function(en){visible=en[0].isIntersecting; if(visible) dirty=true;}).observe(cc);
    if(has('draggable')){
      stage.addEventListener('pointerdown',function(e){
        if(e.button!==0) return;
        drag={x:e.clientX,p:pos,t:performance.now(),v:0,lx:e.clientX}; moved=false; target=null;
        stage.setPointerCapture(e.pointerId);
      });
      stage.addEventListener('pointermove',function(e){
        if(!drag) return;
        var dx=e.clientX-drag.x; if(Math.abs(dx)>4){moved=true;cc.classList.add('dragging');}
        var now=performance.now(); drag.v=(e.clientX-drag.lx)/Math.max(1,now-drag.t); drag.lx=e.clientX; drag.t=now;
        pos=drag.p-dx/unit; dirty=true;
      });
      var release=function(){
        if(!drag) return;
        var fling=-drag.v*1000*cfg.inertia*.35/unit;   /* inercia: sigue girando según la velocidad al soltar */
        drag=null; cc.classList.remove('dragging');
        go(pos+Math.max(-3,Math.min(3,fling)));
        if(moved) track('carousel_drag','webs');
      };
      stage.addEventListener('pointerup',release); stage.addEventListener('pointercancel',release);
    }
    /* Pulsar una tarjeta lateral la trae al centro */
    stage.addEventListener('click',function(e){
      if(moved){moved=false;return;}
      var x=e.clientX-stage.getBoundingClientRect().left, best=null;
      centers.forEach(function(c){ if(!best||Math.abs(c[1]-x)<Math.abs(best[1]-x)) best=c; });
      if(best&&Math.abs(best[2])>.5) go(pos+best[2]);
    });
    if(has('wheel')){
      var wt=0;
      stage.addEventListener('wheel',function(e){
        if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)) return;   /* solo el desplazamiento lateral: la rueda vertical sigue moviendo la página */
        e.preventDefault(); target=null; pos+=e.deltaX/unit; dirty=true; hold();
        clearTimeout(wt); wt=setTimeout(function(){go(pos);},140);
      },{passive:false});
    }
    cc.querySelectorAll('.cc-btn').forEach(function(b){ b.addEventListener('click',function(){ go(Math.round(target!==null?target:pos)+parseInt(b.dataset.dir,10)); }); });
    cc.addEventListener('keydown',function(e){
      if(e.key==='ArrowLeft'){e.preventDefault();go(Math.round(pos)-1);}
      else if(e.key==='ArrowRight'){e.preventDefault();go(Math.round(pos)+1);}
    });
    new MutationObserver(colors).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change',colors);
    window.addEventListener('resize',function(){layout();});
    colors(); layout(); requestAnimationFrame(frame);
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
