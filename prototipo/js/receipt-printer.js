/* Impresora de tickets: imprime un ticket línea a línea, lo deja un momento, lo arranca e imprime el siguiente.
   El ticket se puede arrancar arrastrándolo hacia arriba (o con un gesto rápido), con Intro o con la barra espaciadora.
   Uso: <figure data-receipt-printer> con un <script type="application/json"> dentro que lleva { receipts:[…], options:{…} }.
   Cada ticket es una lista de líneas: {t:'title'|'text'|'row'|'divider'|'total'|'barcode'|'space', …}.
   Opciones: width, speed, hold, autoplay, loop, intro, curl, tearable. */
(function(){
  'use strict';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DEFAULTS = { width:300, speed:1, hold:2600, autoplay:true, loop:1, intro:true, curl:0.5, tearable:true };

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  // Código de barras a partir del número de pedido: cada cifra da un patrón de barras finas y gruesas
  function barcode(code){
    var digits=String(code).replace(/\D/g,'')||'0', bars='', x=0, h=44;
    var patterns=['3211','2221','2122','1411','1132','1231','1114','1312','1213','3112'];
    function bar(w,on){ if(on) bars+='<rect x="'+x+'" y="0" width="'+w+'" height="'+h+'"/>'; x+=w; }
    bar(1,1);bar(1,0);bar(1,1);bar(1,0);
    digits.split('').forEach(function(d){ var p=patterns[+d]; for(var i=0;i<4;i++) bar(+p[i], i%2===0); });
    bar(1,0);bar(1,1);bar(1,0);bar(1,1);
    return '<svg class="rp-bar" viewBox="0 0 '+x+' '+h+'" preserveAspectRatio="none" aria-hidden="true">'+bars+'</svg><span class="rp-code">'+esc(code)+'</span>';
  }

  function renderLine(l){
    switch(l.t){
      case 'title': return '<p class="rp-title">'+esc(l.text)+'</p>';
      case 'text': return '<p class="rp-text'+(l.muted?' rp-muted':'')+(l.center?' rp-center':'')+'">'+esc(l.text)+'</p>';
      case 'row': return '<p class="rp-row'+(l.muted?' rp-muted':'')+'"><span>'+esc(l.left)+'</span><span>'+esc(l.right)+'</span></p>';
      case 'divider': return '<hr class="rp-div'+(l.solid?' rp-solid':'')+'">';
      case 'total': return '<p class="rp-total"><span>'+esc(l.left)+'</span><b>'+esc(l.right)+'</b></p>';
      case 'barcode': return '<div class="rp-code-wrap">'+barcode(l.code)+'</div>';
      default: return '<div class="rp-space"></div>';
    }
  }

  function Printer(root){
    var cfg={};
    try{ cfg=JSON.parse(root.querySelector('script[type="application/json"]').textContent); }catch(e){}
    this.receipts=cfg.receipts||[];
    this.o=Object.assign({},DEFAULTS,cfg.options||{});
    this.root=root; this.i=-1; this.printed=0; this.timer=0; this.busy=false; this.inView=false; this.hover=false;
    if(!this.receipts.length) return;
    root.style.setProperty('--rp-w',this.o.width+'px');
    root.classList.add('rp');
    root.innerHTML=
      '<div class="rp-stage">'+
        '<div class="rp-printer'+(this.o.intro&&!REDUCED?' is-off':'')+'">'+
          '<div class="rp-top"><span class="rp-slot"></span></div>'+
          '<div class="rp-paper-slot"></div>'+
          '<div class="rp-front"><span class="rp-led"></span><span class="rp-grille" aria-hidden="true"></span></div>'+
        '</div>'+
      '</div>';
    this.slot=root.querySelector('.rp-paper-slot');
    this.printerEl=root.querySelector('.rp-printer');
    var self=this;
    root.addEventListener('pointerenter',function(){ self.hover=true; });
    root.addEventListener('pointerleave',function(){ self.hover=false; self.schedule(); });
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        self.inView=es[0].isIntersecting;
        if(self.inView && self.i<0) self.start(); else self.schedule();
      },{threshold:.35}).observe(root);
    } else { this.inView=true; this.start(); }
  }

  Printer.prototype.start=function(){
    var self=this;
    if(this.o.intro && !REDUCED){
      this.printerEl.classList.add('is-rising');
      setTimeout(function(){ self.printerEl.classList.remove('is-off'); },520);
      setTimeout(function(){ self.print(); },1250);
    } else { this.printerEl.classList.remove('is-off'); this.print(); }
  };

  Printer.prototype.print=function(){
    var self=this, o=this.o;
    this.i=(this.i+1)%this.receipts.length;
    var r=this.receipts[this.i];
    var paper=document.createElement('div');
    paper.className='rp-paper';
    paper.innerHTML='<div class="rp-ink">'+r.lines.map(renderLine).join('')+'</div>';
    if(o.tearable){
      paper.setAttribute('role','button'); paper.tabIndex=0;
      paper.setAttribute('aria-label','Arrancar el ticket e imprimir el siguiente');
    }
    this.slot.appendChild(paper);
    this.paper=paper; this.busy=true;
    if(r.label) this.root.setAttribute('aria-label',r.label);
    var full=paper.firstChild.offsetHeight;
    paper._full=full;
    // Paradas en el borde inferior de cada línea: el papel avanza a tirones, como una impresora térmica
    var stops=[].map.call(paper.firstChild.children,function(el){ return el.offsetTop+el.offsetHeight; });
    stops.push(full);
    var pxPerMs=0.32*o.speed, h=0, k=0, pause=0, last=performance.now();
    function frame(now){
      var dt=Math.min(40,now-last); last=now;
      if(pause>0){ pause-=dt; }
      else {
        h=Math.min(stops[k],h+pxPerMs*dt);
        if(h>=stops[k]){ k++; pause=k<stops.length?45:0; }
      }
      self.setHeight(paper,h,full);
      if(h<full && paper.isConnected) requestAnimationFrame(frame);
      else self.done(paper);
    }
    if(REDUCED){ this.setHeight(paper,full,full); this.done(paper); }
    else requestAnimationFrame(frame);
  };

  Printer.prototype.setHeight=function(paper,h,full){
    paper.style.height=h+'px';
    paper.style.setProperty('--rp-lean',(this.o.curl*16*(h/full)).toFixed(2)+'deg');
  };

  Printer.prototype.done=function(paper){
    if(paper!==this.paper) return;
    this.busy=false; this.printed++;
    paper.classList.add('is-done');
    if(this.o.tearable) this.bindTear(paper);
    this.schedule();
  };

  // Arranca solo si está a la vista, nadie lo está tocando y no ha terminado la vuelta
  Printer.prototype.schedule=function(){
    clearTimeout(this.timer);
    if(!this.o.autoplay || REDUCED || this.busy || !this.paper || !this.paper.classList.contains('is-done')) return;
    if(this.printed>=this.receipts.length*this.o.loop) return;
    var self=this;
    this.timer=setTimeout(function(){
      if(self.inView && !self.hover && !self.dragging) self.tear(0,0); else self.schedule();
    },this.o.hold);
  };

  Printer.prototype.tear=function(dx,vx){
    var paper=this.paper, self=this;
    if(!paper || this.busy || paper.classList.contains('is-torn')) return;
    clearTimeout(this.timer);
    paper.classList.add('is-torn');
    paper.style.setProperty('--rp-tx',(dx+vx*120)+'px');
    paper.style.setProperty('--rp-rot',(Math.max(-14,Math.min(14,(dx/12)+vx*6))||-5)+'deg');
    var wasFocused=document.activeElement===paper;
    setTimeout(function(){
      paper.remove();
      self.print();
      if(wasFocused && self.paper) self.paper.focus({preventScroll:true});
    },REDUCED?0:430);
  };

  Printer.prototype.bindTear=function(paper){
    var self=this, sx=0, sy=0, dy=0, dx=0, lt=0, ly=0, lx=0, vy=0, vx=0, id=null;
    paper.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); self.tear(0,0); } });
    paper.addEventListener('pointerdown',function(e){
      if(paper.classList.contains('is-torn')) return;
      id=e.pointerId; paper.setPointerCapture(id); self.dragging=true; clearTimeout(self.timer);
      sx=lx=e.clientX; sy=ly=e.clientY; lt=performance.now(); dx=dy=vx=vy=0;
      paper.classList.add('is-drag');
    });
    paper.addEventListener('pointermove',function(e){
      if(e.pointerId!==id) return;
      var now=performance.now(), dt=Math.max(1,now-lt);
      vy=(e.clientY-ly)/dt; vx=(e.clientX-lx)/dt; ly=e.clientY; lx=e.clientX; lt=now;
      dy=e.clientY-sy; dx=e.clientX-sx;
      // Al tirar hacia arriba sale más papel de la impresora; hacia abajo no cede
      // Con un tirón corto basta: el ticket se corta justo bajo la última línea, sin papel de sobra
      if(dy<-40){ id=null; self.dragging=false; paper.classList.remove('is-drag'); self.tear(dx*0.2,vx); return; }
      var pull=dy<0?Math.min(14,-dy*0.35):0;
      paper.style.height=(paper._full+pull)+'px';
      paper.style.setProperty('--rp-dx',(dx*0.2)+'px');
    });
    function end(e){
      if(e.pointerId!==id) return;
      id=null; self.dragging=false; paper.classList.remove('is-drag');
      if(dy<-24 || vy<-0.5){ self.tear(dx*0.2,vx); }
      else { paper.style.height=paper._full+'px'; paper.style.setProperty('--rp-dx','0px'); self.schedule(); }
    }
    paper.addEventListener('pointerup',end);
    paper.addEventListener('pointercancel',end);
  };

  function init(){ document.querySelectorAll('[data-receipt-printer]').forEach(function(el){ if(!el._rp) el._rp=new Printer(el); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
