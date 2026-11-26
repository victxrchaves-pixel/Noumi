/* Vídeo del portátil: se reproduce solo mientras está a la vista, se puede pausar y, con movimiento reducido, se queda en la primera imagen. */
(function(){
  'use strict';
  var reduced=window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-mac-video]').forEach(function(box){
    var v=box.querySelector('video'), btn=box.querySelector('.lx-mac-btn'), paused=reduced, seen=false;
    function sync(){
      box.classList.toggle('is-paused',paused);
      btn.setAttribute('aria-label',paused?'Reproducir el vídeo':'Pausar el vídeo');
      if(paused||!seen){ v.pause(); }
      else { v.preload='auto'; var p=v.play(); if(p&&p.catch) p.catch(function(){ paused=true; sync(); }); }
    }
    btn.addEventListener('click',function(){ paused=!paused; sync(); });
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ seen=es[0].isIntersecting; sync(); },{threshold:.25}).observe(box);
    } else { seen=true; sync(); }
    sync();
  });
})();
