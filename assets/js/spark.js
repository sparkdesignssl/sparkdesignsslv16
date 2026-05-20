if (!window.gsap) {
  window.gsap = {
    registerPlugin() {},
    set(targets, vars) { getTargets(targets).forEach(el => Object.assign(el.style, styleVars(vars))); },
    to(targets, vars) {
      getTargets(targets).forEach((el, i) => {
        el.style.transition = `all ${vars.duration || 0.4}s ease`;
        const delay = (vars.delay || 0) + (vars.stagger ? vars.stagger * i : 0);
        setTimeout(() => Object.assign(el.style, styleVars(vars)), delay * 1000);
      });
    },
    fromTo(targets, fromVars, toVars) {
      getTargets(targets).forEach(el => Object.assign(el.style, styleVars(fromVars)));
      this.to(targets, toVars);
    },
    timeline() { const api = { to(t,v) { window.gsap.to(t,v); return api; } }; return api; }
  };
}
function getTargets(t) {
  if (typeof t === 'string') return Array.from(document.querySelectorAll(t));
  if (t instanceof Element) return [t];
  return Array.from(t || []);
}
if (!window.ScrollTrigger) {
  window.ScrollTrigger = {
    create({ trigger, onEnter }) {
      const el = typeof trigger === 'string' ? document.querySelector(trigger) : trigger;
      if (!el || !onEnter) return;
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { onEnter(); obs.disconnect(); } });
      }, { threshold: 0.08 });
      obs.observe(el);
    }
  };
}
function styleVars(vars) {
  const out = {};
  if ('opacity' in vars) out.opacity = vars.opacity;
  if ('scale' in vars) out.transform = `scale(${vars.scale})`;
  if ('x' in vars || 'y' in vars) out.transform = `translate(${vars.x||0}px,${vars.y||0}px)`;
  if ('rotateX' in vars || 'rotateY' in vars) out.transform = `perspective(${vars.transformPerspective||800}px) rotateY(${vars.rotateY||0}deg) rotateX(${vars.rotateX||0}deg) scale(${vars.scale||1})`;
  if ('y' in vars && typeof vars.y === 'string') out.transform = `translateY(${vars.y})`;
  if ('y' in vars && typeof vars.y === 'number' && !('x' in vars)) out.transform = `translateY(${vars.y}px)`;
  return out;
}
try { gsap.registerPlugin(ScrollTrigger); } catch(e) {}

// ── LOADER
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loaderText');
const loaderBar = document.getElementById('loaderBarFill');
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#@!%&*';
const FINAL = 'SPARK';
document.body.style.overflow = 'hidden';

function scramble(cb) {
  let iter = 0;
  const iv = setInterval(() => {
    loaderText.textContent = FINAL.split('').map((c,i) => i < iter ? FINAL[i] : CHARS[Math.floor(Math.random()*CHARS.length)]).join('');
    iter += 0.35;
    if (iter >= FINAL.length + 1) { clearInterval(iv); loaderText.textContent = FINAL; cb && cb(); }
  }, 38);
}
function fillBar() {
  let p = 0;
  const iv = setInterval(() => {
    p += 1.6;
    loaderBar.style.width = Math.min(p,100) + '%';
    if (p >= 100) { clearInterval(iv); setTimeout(() => { loader.classList.add('hidden'); document.body.style.overflow = ''; boot(); }, 300); }
  }, 16);
}
scramble(fillBar);

function boot() {
  initLava();
  initThree();
  initLightning();
  animHero();
  initScrollAnim();
  initLetterGlow();
}

// ── CURSOR + TRAIL (desktop only)
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (hasFinePointer) {
  const trailCanvas = document.getElementById('trailCanvas');
  const tCtx = trailCanvas.getContext('2d');
  const cOuter = document.getElementById('cursorOuter');
  const cInner = document.getElementById('cursorInner');
  let mx=0, my=0, ox=0, oy=0;
  const trail = Array.from({length:24}, () => ({x:0,y:0}));

  function resizeTrail() { trailCanvas.width=window.innerWidth; trailCanvas.height=window.innerHeight; }
  resizeTrail();
  // Debounced resize
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resizeTrail, 150); });

  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cInner.style.left=mx+'px'; cInner.style.top=my+'px';
  });

  // Set shadowBlur ONCE outside loop
  tCtx.shadowColor = '#ff0000';
  tCtx.shadowBlur = 6;

  function animCursor() {
    ox += (mx-ox)*0.1; oy += (my-oy)*0.1;
    cOuter.style.left=ox+'px'; cOuter.style.top=oy+'px';
    tCtx.clearRect(0,0,trailCanvas.width,trailCanvas.height);
    trail.unshift({x:mx,y:my}); trail.pop();
    for (let i=1; i<trail.length; i++) {
      const a = (1-i/trail.length)*0.5, w = (1-i/trail.length)*3.2;
      tCtx.beginPath();
      tCtx.moveTo(trail[i-1].x, trail[i-1].y);
      tCtx.lineTo(trail[i].x, trail[i].y);
      tCtx.strokeStyle = `rgba(210,0,0,${a})`;
      tCtx.lineWidth = w;
      tCtx.lineCap = 'round';
      tCtx.stroke();
    }
    requestAnimationFrame(animCursor);
  }
  animCursor();

  document.querySelectorAll('a,button,.album-card,.service-card,.contact-link').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
  });
}

// ── MAGNETIC
document.querySelectorAll('.magnetic').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX-r.left-r.width/2)*0.28;
    const dy = (e.clientY-r.top-r.height/2)*0.28;
    gsap.to(el, {x:dx, y:dy, duration:0.4, ease:'power2.out'});
  });
  el.addEventListener('mouseleave', () => gsap.to(el, {x:0, y:0, duration:0.6, ease:'elastic.out(1,0.4)'}));
});

// ── NAV + PARALLAX (RAF throttled, hero height cached)
const navbar = document.getElementById('navbar');
const heroEl = document.getElementById('hero');
let heroH = heroEl.offsetHeight;
let resizeNavTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeNavTimer);
  resizeNavTimer = setTimeout(() => { heroH = heroEl.offsetHeight; }, 150);
});
let rafPending = false;
window.addEventListener('scroll', () => {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    const sy = window.scrollY;
    navbar.classList.toggle('scrolled', sy > 60);
    if (sy < heroH) {
      gsap.set('.hero-content', {y: Math.min(sy*0.10, 30)});
      gsap.set('.hero-scattered', {y: sy*0.08});
    }
    rafPending = false;
  });
});


// ── HERO ANIMATION
function animHero() {
  const tl = gsap.timeline({delay: 0.1});
  tl.to('#hero .title-line', {y:'0%', opacity:1, duration:1.1, stagger:0.18, ease:'power4.out'})
    .to('.hero-btns', {opacity:1, y:0, duration:0.8, ease:'power3.out'}, '-=0.5');
  setTimeout(() => {
    document.querySelectorAll('#hero .title-line').forEach(el => el.classList.add('neon-active'));
  }, 1800);
}

// ── SCROLL ANIMATIONS
function initScrollAnim() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  const workSection = document.querySelector('#work');
  if (workSection) {
    const wObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        gsap.fromTo('.album-card', {opacity:0,y:30}, {opacity:1,y:0,duration:0.5,stagger:0.08,ease:'power3.out'});
        wObs.disconnect();
      }
    }, { threshold: 0.05 });
    wObs.observe(workSection);
  }
}

// ── SECTION TITLE LETTER GLOW (sweep ping-pong)
function initLetterGlow() {
  document.querySelectorAll('.section-title-glow').forEach(el => {
    const text = el.getAttribute('data-text') || el.textContent.trim();
    el.innerHTML = '';
    const n = text.length;
    // Each letter's peak is offset so the glow sweeps L→R then R→L
    // Total sweep cycle = sweepDuration. Each letter's delay staggers its peak.
    const sweepDuration = 3.2; // seconds for one full sweep
    const stagger = sweepDuration / n;
    [...text].forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'glow-letter';
      span.textContent = char === ' ' ? '\u00A0' : char;
      // Stagger delay so letter i peaks at i * stagger seconds into the cycle
      span.style.setProperty('--delay', `${(i * stagger).toFixed(2)}s`);
      span.style.setProperty('--sweep-duration', `${sweepDuration * 2}s`); // *2 for ping-pong feel
      el.appendChild(span);
    });
  });
}


document.querySelectorAll('.tilt-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width-0.5;
    const y = (e.clientY-r.top)/r.height-0.5;
    gsap.to(card, {rotateY:x*14, rotateX:-y*10, scale:1.02, duration:0.4, ease:'power2.out', transformPerspective:800});
  });
  card.addEventListener('mouseleave', () => gsap.to(card, {rotateY:0, rotateX:0, scale:1, duration:0.6, ease:'elastic.out(1,0.4)'}));
});

// ── ALBUM VIEWER
const lightbox = document.getElementById('lightbox');
const albumStage = document.getElementById('albumStage');
const albumTitle = document.getElementById('albumTitle');
const albumCount = document.getElementById('albumCount');
let albumImages=[], albumIdx=0;
const slots = ['wheel-far-prev','wheel-prev','wheel-current','wheel-next','wheel-far-next'];
const slotEls = slots.map(c => albumStage.querySelector('.'+c));
const slotTransforms = [
  'translate(-50%,-50%) translateZ(-260px) translateY(-200px) rotateX(24deg) scale(0.6)',
  'translate(-50%,-50%) translateZ(-120px) translateY(-100px) rotateX(14deg) scale(0.78)',
  'translate(-50%,-50%) translateZ(0px) translateY(0px) rotateX(0deg) scale(1)',
  'translate(-50%,-50%) translateZ(-120px) translateY(100px) rotateX(-14deg) scale(0.78)',
  'translate(-50%,-50%) translateZ(-260px) translateY(200px) rotateX(-24deg) scale(0.6)',
];
const slotOpacity = [0.25,0.55,1,0.55,0.25];
const slotFilter = ['blur(4px)','blur(2px)','blur(0px)','blur(2px)','blur(4px)'];
let wheelLocked=false, wheelDelta=0;
const WHEEL_DURATION=340;

function applySlotStyle(el,i,animated=true){
  el.style.transform=slotTransforms[i]; el.style.opacity=slotOpacity[i];
  el.style.filter=slotFilter[i]; el.style.zIndex=i===2?10:5-Math.abs(i-2);
  el.style.transition=animated?`transform ${WHEEL_DURATION}ms cubic-bezier(.18,.86,.16,1), opacity ${WHEEL_DURATION}ms ease, filter ${WHEEL_DURATION}ms ease`:'none';
}
function renderWheel(animated=false){
  slotEls.forEach((el,i)=>{
    const idx=(albumIdx+i-2+albumImages.length*10)%albumImages.length;
    el.querySelector('img').src=albumImages[idx];
    applySlotStyle(el,i,animated);
  });
  albumCount.textContent=`${albumIdx+1} / ${albumImages.length}`;
}
function spinAlbum(dir){
  if(!albumImages.length||wheelLocked)return;
  wheelLocked=true;
  slotEls.forEach((el,i)=>{
    const target=i-dir;
    el.style.transition=`transform ${WHEEL_DURATION}ms cubic-bezier(.18,.86,.16,1), opacity ${WHEEL_DURATION}ms ease, filter ${WHEEL_DURATION}ms ease`;
    if(target>=0&&target<slotTransforms.length){
      el.style.transform=slotTransforms[target]; el.style.opacity=slotOpacity[target];
      el.style.filter=slotFilter[target]; el.style.zIndex=target===2?10:5-Math.abs(target-2);
    } else {
      const exitY=dir>0?-310:310;
      el.style.transform=`translate(-50%,-50%) translateZ(-360px) translateY(${exitY}px) rotateX(${dir>0?34:-34}deg) scale(0.48)`;
      el.style.opacity='0'; el.style.filter='blur(6px)'; el.style.zIndex='1';
    }
  });
  setTimeout(()=>{
    albumIdx=(albumIdx+dir+albumImages.length)%albumImages.length;
    renderWheel(false);
    requestAnimationFrame(()=>{ wheelLocked=false; });
  }, Math.round(WHEEL_DURATION*0.6));
}

let savedScrollY=0;
function openAlbum(card){
  albumImages=card.dataset.images.split('|'); albumTitle.textContent=card.dataset.title; albumIdx=0;
  renderWheel(false); savedScrollY=window.scrollY;
  document.body.style.top=`-${savedScrollY}px`;
  lightbox.classList.add('open'); lightbox.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeAlbum(){
  lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open'); document.body.style.top='';
  window.scrollTo({top:savedScrollY,behavior:'instant'});
}

document.querySelectorAll('.album-card').forEach(card => card.addEventListener('click', () => openAlbum(card)));
document.getElementById('lightboxClose').addEventListener('click', closeAlbum);
lightbox.addEventListener('click', e => { if(e.target===lightbox) closeAlbum(); });
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key==='Escape') closeAlbum();
  if (e.key==='ArrowDown'||e.key==='ArrowRight') spinAlbum(1);
  if (e.key==='ArrowUp'||e.key==='ArrowLeft') spinAlbum(-1);
});
albumStage.addEventListener('wheel', e => {
  if (!lightbox.classList.contains('open')) return;
  e.preventDefault();
  const delta = Math.abs(e.deltaY)>Math.abs(e.deltaX)?e.deltaY:e.deltaX;
  wheelDelta += delta;
  if (Math.abs(wheelDelta)<3||wheelLocked) return;
  spinAlbum(wheelDelta>0?1:-1); wheelDelta=0;
}, {passive:false});

let dragStart = null;
albumStage.addEventListener('mousedown', e => { dragStart = e.clientY; });
albumStage.addEventListener('mousemove', e => {
  if (dragStart === null) return;
  if (Math.abs(e.clientY - dragStart) > 22) { spinAlbum(e.clientY < dragStart ? 1 : -1); dragStart = e.clientY; }
});
albumStage.addEventListener('mouseup', () => { dragStart = null; });
albumStage.addEventListener('mouseleave', () => { dragStart = null; });

let touchStartY=null, touchLastY=null;
albumStage.addEventListener('touchstart', e => { touchStartY=e.touches[0].clientY; touchLastY=e.touches[0].clientY; }, {passive:true});
albumStage.addEventListener('touchmove', e => {
  if (touchStartY===null) return;
  const diff = touchLastY-e.touches[0].clientY;
  if (Math.abs(diff)>18&&!wheelLocked) { spinAlbum(diff>0?1:-1); touchLastY=e.touches[0].clientY; touchStartY=e.touches[0].clientY; }
}, {passive:true});
albumStage.addEventListener('touchend', e => {
  if (touchStartY!==null) { const d=touchStartY-e.changedTouches[0].clientY; if(Math.abs(d)>8&&!wheelLocked)spinAlbum(d>0?1:-1); }
  touchStartY=null; touchLastY=null;
});

// ── WORK FILTERS
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    const grid = document.getElementById('workGrid');
    const allCards = document.querySelectorAll('.album-card');

    // Fade out entire grid first
    grid.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    grid.style.opacity = '0';
    grid.style.transform = 'translateY(18px)';

    setTimeout(() => {
      allCards.forEach(card => {
        card.classList.toggle('card-hidden', f !== 'all' && card.dataset.category !== f);
      });
      // Fade in
      grid.style.opacity = '1';
      grid.style.transform = 'translateY(0)';
    }, 260);
  });
});

// ── CONTACT FORM
const cf = document.getElementById('contactForm');
if (cf) {
  cf.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = cf.querySelector('.form-submit');
    btn.textContent = 'SENDING...';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {method:'POST', body:new FormData(cf)});
      const data = await res.json();
      if (data.success) { cf.style.display='none'; document.getElementById('formSuccess').style.display='block'; }
      else { btn.innerHTML='TRY AGAIN'; }
    } catch(err) { btn.innerHTML='TRY AGAIN'; }
  });
}

// ── LAVA WEBGL — half resolution for performance
function initLava() {
  const canvas = document.getElementById('lavaCanvas');
  if (!canvas) return;
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const SCALE = 0.5; // render at 50%, CSS scales up — visually identical
  function resize() {
    canvas.width = canvas.offsetWidth * SCALE;
    canvas.height = canvas.offsetHeight * SCALE;
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  resize();
  let resizeLavaTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeLavaTimer); resizeLavaTimer = setTimeout(resize, 150); });

  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `
    precision mediump float;
    uniform float t; uniform vec2 r;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float sn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<7;i++){v+=a*sn(p);p=p*2.06+vec2(1.7,9.2);a*=.52;}return v;}
    vec2 swirl(vec2 p,float a,float power){
      float d=length(p);
      float s=sin(a+power/(d+.22));
      float c=cos(a+power/(d+.22));
      return mat2(c,-s,s,c)*p;
    }
    void main(){
      vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);
      p.x*=.82;
      float tm=t*.022;
      vec2 a=swirl(p+vec2(.18*sin(tm*.8),.10*cos(tm*.7)),tm*.28,1.05);
      vec2 b=swirl(p*1.22+vec2(.45,-.18),-tm*.22,.78);
      vec2 q=vec2(fbm(a*1.35+vec2(tm,-tm*.4)),fbm(b*1.12+vec2(-tm*.65,tm*.5)));
      vec2 flow=p+.74*sin(vec2(q.y,q.x)*6.283+vec2(tm*1.8,-tm*1.35));
      flow=swirl(flow+q*.32,tm*.18,.9);
      float river=flow.x*3.2+flow.y*2.35+fbm(flow*2.6+q*2.2)*3.4;
      float bands=sin(river*5.7);
      float fine=sin(river*15.5+fbm(flow*8.0-tm)*4.2);
      float contour=1.0-smoothstep(.035,.18,abs(bands));
      float hairline=1.0-smoothstep(.02,.075,abs(fine));
      float redMass=smoothstep(-.56,.72,bands+fbm(flow*3.1+tm)*.82);
      float blackPool=smoothstep(.18,.88,fbm(flow*1.55-q*1.4)-.08+abs(bands)*.22);
      vec3 deep=vec3(.018,0.,0.);
      vec3 darkRed=vec3(.18,.0,.0);
      vec3 hotRed=vec3(.95,.0,.0);
      vec3 c=mix(deep,darkRed,redMass);
      c=mix(c,hotRed,pow(redMass,4.0)*.55);
      c=mix(c,vec3(0.),blackPool*.82);
      c=mix(c,vec3(.02,0.,0.),contour*.92);
      c+=vec3(.85,.0,.0)*hairline*.18*(1.0-blackPool);
      float shine=smoothstep(.965,1.0,sin((flow.x-flow.y)*10.0+fbm(flow*6.0)*5.0));
      c+=vec3(1.0,.08,.04)*shine*.13;
      float vignette=smoothstep(1.02,.18,length(p));
      c*=mix(.48,1.06,vignette);
      gl_FragColor=vec4(c,1.);
    }`;

  function sh(type,src){ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));
  gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog,'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const uT=gl.getUniformLocation(prog,'t'), uR=gl.getUniformLocation(prog,'r');
  const start = performance.now();
  let lavaRunning = true;

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => { lavaRunning = !document.hidden; if (!document.hidden) drawLava(); });

  function drawLava() {
    if (!lavaRunning) return;
    gl.uniform1f(uT,(performance.now()-start)/1000);
    gl.uniform2f(uR,canvas.width,canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    requestAnimationFrame(drawLava);
  }
  drawLava();
}


// ── LIGHTNING — optimized: shadowBlur set once, single draw pass, 30fps cap
// ── THREE.JS — square-base pyramid flythrough (site-wide, fixed canvas)
function initThree() {
  const canvas = document.getElementById('threeCanvas');
  if (!canvas || typeof THREE === 'undefined') { document.body.classList.add('no-three'); return; }
  document.body.classList.remove('no-three');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;
  renderer.setSize(W(), H());
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 120);
  camera.position.set(0, 0, 0);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderer.setSize(W(), H());
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
    }, 150);
  });

  // Lighting — strong contrast so each face reads distinctly
  scene.add(new THREE.AmbientLight(0x0a0000, 1.0));
  const keyLight = new THREE.PointLight(0xff2200, 20, 55); keyLight.position.set(-6, 8, 8); scene.add(keyLight);
  const rimLight = new THREE.PointLight(0xffffff, 7, 40); rimLight.position.set(8, -5, 5); scene.add(rimLight);
  const fillLight = new THREE.PointLight(0xcc0000, 8, 45); fillLight.position.set(5, 6, -4); scene.add(fillLight);
  const topLight = new THREE.DirectionalLight(0xff3300, 4); topLight.position.set(-1, 3, 2); scene.add(topLight);

  // Shared material pool — 3 variants, reused across all pyramids
  const mats = [
    new THREE.MeshPhysicalMaterial({ color: 0x1a0000, roughness: 0.55, metalness: 0.6, clearcoat: 1.0, clearcoatRoughness: 0.35, emissive: 0x440000, emissiveIntensity: 0.2 }),
    new THREE.MeshPhysicalMaterial({ color: 0x0d0d0d, roughness: 0.62, metalness: 0.55, clearcoat: 0.9, clearcoatRoughness: 0.28, emissive: 0x220000, emissiveIntensity: 0.12 }),
    new THREE.MeshPhysicalMaterial({ color: 0x2a0000, roughness: 0.50, metalness: 0.65, clearcoat: 1.0, clearcoatRoughness: 0.22, emissive: 0x880000, emissiveIntensity: 0.35 }),
  ];

  function rnd(min, max) { return min + Math.random() * (max - min); }

  // Proper square-base pyramid — unique verts per face for flat normals
  function makePyramidGeo(size) {
    const h = size * 1.7;
    const b = size;
    const ax = rnd(-b * 0.1, b * 0.1), ay = h * rnd(0.92, 1.08), az = rnd(-b * 0.1, b * 0.1);
    const bl = [-b * rnd(0.88, 1.12), 0,  b * rnd(0.88, 1.12)];
    const br = [ b * rnd(0.88, 1.12), 0,  b * rnd(0.88, 1.12)];
    const tr = [ b * rnd(0.88, 1.12), 0, -b * rnd(0.88, 1.12)];
    const tl = [-b * rnd(0.88, 1.12), 0, -b * rnd(0.88, 1.12)];
    const verts = new Float32Array([
      bl[0],bl[1],bl[2], br[0],br[1],br[2], ax,ay,az, // front
      br[0],br[1],br[2], tr[0],tr[1],tr[2], ax,ay,az, // right
      tr[0],tr[1],tr[2], tl[0],tl[1],tl[2], ax,ay,az, // back
      tl[0],tl[1],tl[2], bl[0],bl[1],bl[2], ax,ay,az, // left
      bl[0],bl[1],bl[2], tr[0],tr[1],tr[2], br[0],br[1],br[2], // base 1
      bl[0],bl[1],bl[2], tl[0],tl[1],tl[2], tr[0],tr[1],tr[2], // base 2
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }

  function spawnPyramid(initScatter) {
    const size = rnd(0.3, 1.3);
    const mat = mats[Math.floor(Math.random() * mats.length)];
    const mesh = new THREE.Mesh(makePyramidGeo(size), mat);
    mesh.rotation.set(rnd(0, Math.PI * 2), rnd(0, Math.PI * 2), rnd(0, Math.PI * 2));
    const spread = 18;
    mesh.position.x = rnd(-spread, spread);
    mesh.position.y = rnd(-spread * 0.55, spread * 0.55);
    mesh.position.z = initScatter ? rnd(-100, -4) : rnd(-110, -75);
    mesh.userData = {
      vz: rnd(0.005, 0.011),
      vx: rnd(-0.0012, 0.0012),
      vy: rnd(-0.0008, 0.0008),
      rx: rnd(0.0003, 0.0012) * (Math.random() < 0.5 ? 1 : -1),
      ry: rnd(0.0005, 0.0018) * (Math.random() < 0.5 ? 1 : -1),
      rz: rnd(0.0002, 0.0008) * (Math.random() < 0.5 ? 1 : -1),
      size,
    };
    scene.add(mesh);
    return mesh;
  }

  // Fewer pyramids on mobile for performance
  const COUNT = window.innerWidth <= 760 ? 8 : 14;
  const pyramids = [];
  for (let i = 0; i < COUNT; i++) pyramids.push(spawnPyramid(true));

  // Pause when tab hidden — no hero observer, runs site-wide
  let tabVisible = true;
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; if (tabVisible) animate(); });

  const clock = new THREE.Clock();
  function animate() {
    if (!tabVisible) return;
    const t = clock.getElapsedTime();

    pyramids.forEach((mesh, i) => {
      const d = mesh.userData;
      mesh.position.z += d.vz;
      mesh.position.x += d.vx;
      mesh.position.y += d.vy;
      mesh.rotation.x += d.rx;
      mesh.rotation.y += d.ry;
      mesh.rotation.z += d.rz;

      // Respawn when fully past camera — size*2 buffer so nothing pops
      if (mesh.position.z > d.size * 2 + 2) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        pyramids[i] = spawnPyramid(false);
      }
    });

    // Animate lights for shimmering gloss
    keyLight.position.x = -6 + Math.sin(t * 0.28) * 1.2;
    keyLight.position.y = 8 + Math.cos(t * 0.2) * 0.8;
    rimLight.position.x = 8 + Math.sin(t * 0.16 + 1) * 1;
    keyLight.intensity = 18 + Math.sin(t * 0.42) * 2;
    fillLight.intensity = 7 + Math.sin(t * 0.36 + 1.5) * 1.2;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

function initLightning() {
  const canvas = document.getElementById('lightningCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
  resize();
  let resizeLightTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeLightTimer); resizeLightTimer=setTimeout(resize,150); });

  // Set shadowBlur ONCE
  ctx.shadowColor = '#ff0000';
  ctx.lineCap = 'round';

  const bolts = [];
  const MAX_BOLTS = 4;

  function randomBolt() {
    const x=Math.random()*canvas.width, y=Math.random()*canvas.height*0.72;
    const len=150+Math.random()*220, angle=-Math.PI/2+(Math.random()-0.5)*0.58;
    const branches=[];
    let cx=x, cy=y;
    const segs=6+Math.floor(Math.random()*5);
    for (let i=0; i<segs; i++) {
      const nx=cx+(Math.random()-0.5)*42+Math.cos(angle)*len/segs;
      const ny=cy+(Math.random()-0.5)*28+Math.sin(angle)*len/segs;
      branches.push({x1:cx,y1:cy,x2:nx,y2:ny});
      if (Math.random()<0.24) branches.push({x1:nx,y1:ny,x2:nx+(Math.random()-0.5)*68,y2:ny+Math.random()*56,branch:true});
      cx=nx; cy=ny;
    }
    return {branches, life:1, decay:0.007+Math.random()*0.01, flicker:Math.random()<0.35};
  }

  function maybeSpawn() {
    if (bolts.length<MAX_BOLTS && Math.random()<0.16) bolts.push(randomBolt());
    setTimeout(maybeSpawn, 420+Math.random()*620);
  }
  bolts.push(randomBolt());
  maybeSpawn();

  // 30fps cap for lightning
  let lastLightFrame = 0;
  function drawFrame(ts) {
    if (ts-lastLightFrame < 33) { requestAnimationFrame(drawFrame); return; } // ~30fps
    lastLightFrame = ts;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let i=bolts.length-1; i>=0; i--) {
      const bolt = bolts[i];
      if (bolt.flicker && Math.random()<0.12) bolt.life -= 0.003;
      const alpha = bolt.life*(0.24+Math.random()*0.08);
      ctx.shadowBlur = 20; // set once per bolt, not per segment
      bolt.branches.forEach(seg => {
        const mx=(seg.x1+seg.x2)*0.5+(Math.random()-0.5)*18;
        const my=(seg.y1+seg.y2)*0.5+(Math.random()-0.5)*18;
        ctx.beginPath();
        ctx.moveTo(seg.x1,seg.y1);
        ctx.quadraticCurveTo(mx,my,seg.x2,seg.y2);
        ctx.strokeStyle = `rgba(255,18,18,${alpha})`;
        ctx.lineWidth = seg.branch?0.7:1.8;
        ctx.stroke();
      });
      bolt.life -= bolt.decay;
      if (bolt.life<=0) bolts.splice(i,1);
    }
    requestAnimationFrame(drawFrame);
  }
  requestAnimationFrame(drawFrame);
}
