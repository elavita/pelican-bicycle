<script>
(function(){
  const out=[];
  window.addEventListener('error', e=>out.push('JSERROR: '+e.message+' @'+e.filename+':'+e.lineno));
  const $=id=>document.getElementById(id);
  const snap=()=>({running:window.__s?1:0, play:$('btnPlay').textContent, aria:$('btnPlay').getAttribute('aria-pressed'),
    speed:$('speed').value, speedOut:$('speedOut').textContent, skelAria:$('btnSkel').getAttribute('aria-pressed'),
    skelClass:$('scene').classList.contains('show-skel'), bellT:$('bell').getAttribute('transform')});
  try{
    $('btnPlay').click(); out.push('after play click: '+JSON.stringify(snap()));
    $('btnPlay').click(); out.push('after 2nd play click: '+JSON.stringify(snap()));
    $('btnSkel').click(); out.push('after skel click: '+JSON.stringify(snap()));
    $('btnSkel').click(); out.push('after 2nd skel click: '+JSON.stringify(snap()));
    $('btnBell').click(); out.push('after bell btn click: bellTransform='+$('bell').getAttribute('transform'));
    $('bell').click(); out.push('after bell svg click: bellTransform='+$('bell').getAttribute('transform'));
    ['Space','ArrowRight','ArrowRight','ArrowLeft','KeyB','KeyK'].forEach(code=>{
      window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code==='KeyB'?'b':code==='KeyK'?'k':' ',code}));
    });
    out.push('after keys: '+JSON.stringify(snap()));
    // speed clamp test
    $('speed').value='999'; $('speed').dispatchEvent(new Event('input'));
    out.push('speed clamp: '+$('speed').value+' / '+$('speedOut').textContent);
    $('speed').value='-50'; $('speed').dispatchEvent(new Event('input'));
    out.push('speed clamp low: '+$('speed').value+' / '+$('speedOut').textContent);
  }catch(e){ out.push('THROWN: '+e.message); }
  const pre=document.createElement('pre'); pre.id='itest'; pre.textContent='ITEST\n'+out.join('\n');
  document.body.appendChild(pre);
})();
</script>
