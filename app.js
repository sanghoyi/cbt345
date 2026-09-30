const G = window.CBT_G;
const DATA = window.CBT_DATA;
const SUBS = ['기관1','기관2','기관3','직무일반','영어'];
const MK = ['가','나','사','아'];
const MKC = ['㉮','㉯','㉴','㉵'];
const LS = G.ls;
const qid = q => `${q.y}-${q.s}-${q.sub}-${q.n}`;
DATA.forEach(q => q.id = qid(q));
const BYID = Object.fromEntries(DATA.map(q => [q.id, q]));
const EXPL = window.CBT_EXPL || {};
function explHTML(q){
  const e = EXPL[q.id]; if(!e) return '';
  const nl = s => fmt(s).replace(/\n/g,'<br>');
  const ansTxt = (q.pua||!q.o[q.a]) ? '' : ' '+fmt(q.o[q.a]);
  let h = `<div class="expl"><div class="exh">해설 <span class="ans">정답 ${MKC[q.a]}${ansTxt}</span></div>`;
  h += `<p class="exw">${nl(e.w)}</p>`;
  (Array.isArray(e.f)?e.f:(e.f?[e.f]:[])).forEach(k=>{ const F=FIGS[k]; if(F) h+=`<figure class="exfig">${F.svg}<figcaption>${esc(F.cap)}</figcaption></figure>`; });
  if(e.x) h += `<ul class="exo">${e.x.map((t,i)=>`<li class="${i===q.a?'ok':''}"><b>${MKC[i]}</b><span>${nl(t)}</span></li>`).join('')}</ul>`;
  if(e.t) h += `<div class="extip"><b>암기</b> ${nl(e.t)}</div>`;
  if(e.c) h += `<div class="exchk">⚠ ${nl(e.c)}</div>`;
  return h + '</div>';
}

let store = {wrong:{}, guess:{}, hist:[], memo:{}, prog:{}};
try { const s = JSON.parse(localStorage.getItem(LS)); if (s) store = Object.assign(store, s); } catch(e) {}
if(!store.guess) store.guess={};
if(!store.prog) store.prog={};
if(!store._pv){ store._pv=1;
  // 예전 기록(제목)으로 회차별 풀이 여부 복원
  store.hist.forEach(r=>{ const m=/^(\d{4}) 제([\d·]+)회 (.+)$/.exec(r.title||''); if(!m) return;
    const subs = m[3]==='전과목' ? SUBS : m[3].split('·');
    m[2].split('·').forEach(sn=>subs.forEach(sub=>{ if(!SUBS.includes(sub)) return; const k=`${m[1]}-${sn}-${sub}`;
      const p=store.prog[k]||{c:0,best:0}; p.c++; p.last=r.score; p.best=Math.max(p.best,r.score); p.d=r.date; store.prog[k]=p; })); });
}
/* 회차별 학습 현황 */
function sessInfo(y,s){
  const ps=SUBS.map(sub=>store.prog[`${y}-${s}-${sub}`]).filter(Boolean);
  if(!ps.length) return {state:'none'};
  const n=ps.length, avg=Math.round(ps.reduce((a,p)=>a+p.last,0)/n), min=Math.min(...ps.map(p=>p.last));
  const cnt=Math.max(...ps.map(p=>p.c)), d=ps.map(p=>p.d||'').sort().pop();
  const state = n<SUBS.length ? 'part' : (avg>=60&&min>=40 ? 'ok' : 'no');
  return {state,n,avg,min,cnt,d};
}
function progText(){
  const L=[`[${G.name} CBT 학습 기록]`];
  const ys=[...new Set(DATA.map(q=>q.y))].sort().reverse();
  ys.forEach(y=>{ [...new Set(DATA.filter(q=>q.y===y).map(q=>q.s))].sort().forEach(s=>{
    const i=sessInfo(y,s);
    if(i.state==='none'){ L.push(`${y}년 제${s}회: 안 풀었음`); return; }
    const det=SUBS.map(sub=>{ const p=store.prog[`${y}-${s}-${sub}`]; return p?`${sub} ${p.last}`:`${sub} -`; }).join(', ');
    L.push(`${y}년 제${s}회: ${i.state==='part'?`${i.n}/5과목 풀이`:(i.state==='ok'?'합격선':'불합격선')} 평균 ${i.avg}점, ${i.cnt}회 풀이 (${det})`);
  }); });
  L.push(`오답노트 ${Object.keys(store.wrong).length}개, 찍은 문제 ${Object.keys(store.guess).length}개`);
  return L.join('\n');
}
function save(){ try { localStorage.setItem(LS, JSON.stringify(store)); } catch(e) {} updateNoteCount(); }

const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = s => esc(s).replace(/\u0001/g,'<u>').replace(/\u0002/g,'</u>').replace(/\u0003/g,'<span class="ovl">').replace(/\u0004/g,'</span>').replace(/\u0005/g,'<sub>').replace(/\u0006/g,'</sub>').replace(/\u000f/g,'<sup>').replace(/\u0010/g,'</sup>');

function updateNoteCount(){ const n = Object.keys(store.wrong).length + Object.keys(store.guess).length; document.getElementById('noteCount').textContent = n ? `(${n})` : ''; }

/* ---------- HOME ---------- */
const years = [...new Set(DATA.map(q => q.y))].sort().reverse();
let sel = { y: years[0], s: new Set([1]), sub: new Set(SUBS), mode: 'exam', shuffle: false };
function sessionsOf(y){ return [...new Set(DATA.filter(q => q.y === y).map(q => q.s))].sort(); }

function pool(){
  return DATA.filter(q => q.y === sel.y && sel.s.has(q.s) && sel.sub.has(q.sub));
}
function home(){
  const ss = sessionsOf(sel.y);
  const wrongN = Object.keys(store.wrong).length;
  const guessN = Object.keys(store.guess).filter(id=>BYID[id]).length;
  const h = store.hist.slice(-6).reverse();
  const totalSolved = store.hist.reduce((a,b)=>a+b.total,0);
  const avg = store.hist.length ? Math.round(store.hist.reduce((a,b)=>a+b.score,0)/store.hist.length) : '-';
  app.innerHTML = `
  <div class="home">
    <section class="panel">
      <div class="field"><div class="label">연도</div><div class="chips" id="cY">
        ${years.map(y=>{ const d=sessionsOf(y).filter(s=>sessInfo(y,s).state!=='none').length; return `<button class="chip" aria-pressed="${y===sel.y}" data-y="${y}">${y}년${d?`<span class="cb">${d}/${sessionsOf(y).length}</span>`:''}</button>`; }).join('')}</div></div>
      <div class="field"><div class="label">회차 (여러 개 선택 가능)</div><div class="chips" id="cS">
        ${ss.map(s=>{ const i=sessInfo(sel.y,s); const b=i.state==='none'?'':(i.state==='part'?`${i.n}/5`:`${i.avg}점`); return `<button class="chip" aria-pressed="${sel.s.has(s)}" data-s="${s}">제${s}회${b?`<span class="cb">✓ ${b}</span>`:''}</button>`; }).join('')}
        <button class="chip" data-s="all">전체</button></div></div>
      <div class="field"><div class="label">과목</div><div class="chips" id="cSub">
        ${SUBS.map(s=>`<button class="chip" aria-pressed="${sel.sub.has(s)}" data-sub="${s}">${s}</button>`).join('')}
        <button class="chip" data-sub="all">전과목</button></div></div>
      <div class="field"><div class="label">풀이 방식</div><div class="chips" id="cM">
        <button class="chip" aria-pressed="${sel.mode==='exam'}" data-m="exam">실전 모드 · 다 풀고 채점</button>
        <button class="chip" aria-pressed="${sel.mode==='practice'}" data-m="practice">연습 모드 · 한 문제씩 정답 확인</button>
        <button class="chip" aria-pressed="${sel.shuffle}" id="shuf">문제 순서 섞기</button>
      </div></div>
      <div class="startbar">
        <button class="btn primary" id="start">시험 시작</button>
        <span class="count" id="cnt"></span>
      </div>
      <p class="tip">확신 없이 고른 문제는 "찍었음"을 눌러 두면, 맞혀도 점수는 그대로 인정되고 "찍은 문제" 목록에 따로 모입니다. 실전 모드는 25문항당 25분 타이머가 돌아갑니다. 합격 기준은 평균 60점 이상, 과목별 40점 이상입니다.</p>
    </section>
    <aside class="panel">
      <div class="label">내 학습 기록</div>
      <div class="stats">
        <div class="stat"><b>${totalSolved}</b><span>푼 문항</span></div>
        <div class="stat"><b>${avg}</b><span>평균 점수</span></div>
        <div class="stat"><b>${wrongN}</b><span>오답노트</span></div>
        <div class="stat"><b>${guessN}</b><span>찍은 문제</span></div>
      </div>
      <div class="startbar" style="margin-bottom:14px">
        <button class="btn warn" id="retry" ${wrongN?'':'disabled'}>오답만 다시 풀기</button>
        <button class="btn" id="gretry" ${guessN?'':'disabled'}>찍은 문제 다시 풀기</button>
        <button class="btn" id="note2">오답·찍은 문제 보기·인쇄</button>
      </div>
      <button class="btn primary" id="card2" style="width:100%;margin-bottom:16px;padding:12px" ${(wrongN+guessN)?'':'disabled'}>암기 카드로 외우기 · 오늘 ${allCardCount().filter(isDue).length}장</button>
      <div class="label">회차별 학습 현황 <span class="small">(칸을 누르면 그 회차가 선택됩니다)</span></div>
      <table class="prog"><tr><th></th>${[1,2,3,4].map(s=>`<th>제${s}회</th>`).join('')}</tr>
      ${years.map(y=>`<tr><th class="y">${y}</th>${[1,2,3,4].map(s=>{ if(!sessionsOf(y).includes(s)) return '<td></td>'; const i=sessInfo(y,s);
        const tip=SUBS.map(sub=>{ const p=store.prog[`${y}-${s}-${sub}`]; return `${sub}: ${p?p.last+'점 ('+p.c+'회)':'안 풀었음'}`; }).join('\n');
        return `<td><div class="pc ${i.state}" data-py="${y}" data-ps="${s}" title="${esc(tip)}">${i.state==='none'?'<b>–</b><small>안 풀었음</small>':`<b>${i.avg}</b><small>${i.state==='part'?i.n+'/5과목':i.cnt+'회 풀이'}</small>`}</div></td>`; }).join('')}</tr>`).join('')}
      </table>
      <div class="legend"><span><i style="background:var(--ok-soft);border-color:var(--ok)"></i>합격선</span><span><i style="background:var(--bad-soft);border-color:var(--bad)"></i>불합격선</span><span><i style="background:var(--omr-soft);border-color:var(--omr)"></i>일부 과목만</span><span><i style="border-color:var(--line);border-style:dashed"></i>안 풀었음</span></div>
      <div class="bk"><button class="btn" id="pcopy">학습 기록 글로 복사</button><button class="btn" id="bsave">백업 파일 저장</button><button class="btn" id="bload">백업 불러오기</button><input type="file" id="bfile" accept=".json,application/json" hidden></div>
      <div class="label">최근 기록</div>
      ${h.length ? `<table class="hist">${h.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.title)}</td><td class="n">${r.score}점</td></tr>`).join('')}</table>`
        : `<p class="small">아직 기록이 없습니다. 왼쪽에서 회차와 과목을 고르고 시작하세요. 틀린 문제는 자동으로 오답노트에 쌓입니다.</p>`}
    </aside>
  </div>`;
  const cnt = () => { document.getElementById('cnt').textContent = `${pool().length}문항`; };
  cnt();
  app.querySelectorAll('.pc[data-py]').forEach(c=>c.onclick=()=>{ sel.y=c.dataset.py; sel.s=new Set([+c.dataset.ps]); sel.sub=new Set(SUBS); home(); window.scrollTo({top:0,behavior:'smooth'}); });
  document.getElementById('pcopy').onclick=async e=>{ const t=progText(); let ok=false; try{ await navigator.clipboard.writeText(t); ok=true; }catch(_){}
    if(!ok){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{ ok=document.execCommand('copy'); }catch(_){} ta.remove(); }
    e.target.textContent = ok ? '복사됨 · Claude에게 붙여넣기' : '복사 실패'; };
  document.getElementById('bsave').onclick=()=>{ const d=new Date(); const b=new Blob([JSON.stringify(store)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`${G.name}CBT_기록_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`; document.body.appendChild(a); a.click(); a.remove(); };
  document.getElementById('bload').onclick=()=>document.getElementById('bfile').click();
  document.getElementById('bfile').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const s=JSON.parse(r.result); if(!s||typeof s!=='object') throw 0;
      ['wrong','guess','memo','srs'].forEach(k=>Object.assign(store[k], s[k]||{}));
      Object.entries(s.prog||{}).forEach(([k,p])=>{ const o=store.prog[k]; if(!o || (p.c||0)>(o.c||0)) store.prog[k]=p; });
      const seen=new Set(store.hist.map(h=>h.date+h.title)); (s.hist||[]).forEach(h=>{ if(!seen.has(h.date+h.title)) store.hist.push(h); });
      store.hist=store.hist.slice(-50); save(); home(); }catch(_){ document.getElementById('bload').textContent='파일을 읽을 수 없음'; } };
    r.readAsText(f); };
  app.querySelectorAll('#cY .chip').forEach(b=>b.onclick=()=>{ sel.y=b.dataset.y; sel.s=new Set([sessionsOf(sel.y)[0]]); home(); });
  app.querySelectorAll('#cS .chip').forEach(b=>b.onclick=()=>{
    const v=b.dataset.s;
    if(v==='all'){ sel.s=new Set(ss); }
    else { const n=+v; sel.s.has(n)&&sel.s.size>1 ? sel.s.delete(n) : sel.s.add(n); }
    home(); });
  app.querySelectorAll('#cSub .chip').forEach(b=>b.onclick=()=>{
    const v=b.dataset.sub;
    if(v==='all'){ sel.sub=new Set(SUBS); }
    else if(sel.sub.size===SUBS.length){ sel.sub=new Set([v]); }
    else { sel.sub.has(v)&&sel.sub.size>1 ? sel.sub.delete(v) : sel.sub.add(v); }
    home(); });
  app.querySelectorAll('#cM [data-m]').forEach(b=>b.onclick=()=>{ sel.mode=b.dataset.m; home(); });
  document.getElementById('shuf').onclick=()=>{ sel.shuffle=!sel.shuffle; home(); };
  document.getElementById('start').onclick=()=>{
    const list = pool();
    const title = `${sel.y} 제${[...sel.s].sort().join('·')}회 ${sel.sub.size===5?'전과목':[...sel.sub].join('·')}`;
    startExam(list, title, sel.mode, sel.shuffle);
  };
  document.getElementById('retry').onclick=()=>{
    const list = Object.keys(store.wrong).map(id=>BYID[id]).filter(Boolean);
    startExam(list, '오답 다시 풀기', 'practice', true, 'wrong');
  };
  document.getElementById('gretry').onclick=()=>{
    const list = Object.keys(store.guess).map(id=>BYID[id]).filter(Boolean);
    startExam(list, '찍은 문제 다시 풀기', 'practice', true, 'guess');
  };
  document.getElementById('note2').onclick=note;
  document.getElementById('card2').onclick=cardHome;
}

/* ---------- EXAM ---------- */
let ex = null, tick = null;
function shuffleArr(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function startExam(list, title, mode, shuffle, isRetry){
  if(!list.length) return;
  if(shuffle) list = shuffleArr(list);
  ex = { list, title, mode, isRetry:!!isRetry, kind:(isRetry===true?'wrong':(isRetry||null)), ans:{}, guess:{}, gAdded:{}, cur:0, done:false, checked:{},
         end: mode==='exam' ? Date.now()+list.length*60*1000 : null };
  clearInterval(tick);
  if(ex.end) tick=setInterval(updTimer,1000);
  renderQ();
  window.scrollTo(0,0);
}
function updTimer(){
  const el=document.getElementById('timer'); if(!el||!ex||ex.done) return;
  const left=Math.max(0,Math.round((ex.end-Date.now())/1000));
  el.textContent=`남은 시간 ${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
  el.classList.toggle('low',left<300);
  if(left===0){ clearInterval(tick); finish(); }
}
function optText(q,i){
  if(q.pua || !q.o[i]) return q.full ? '(위 그림의 보기 참조)' : fmt(q.o[i]);
  return fmt(q.o[i]);
}
function qBody(q, numLabel){
  const stemHidden = q.full;   // 전체가 이미지로 들어간 문제
  let h='';
  if(!stemHidden) h+=`<p class="qtext"><span class="no">${numLabel}</span>${fmt(q.q)}</p>`;
  else h+=`<p class="qtext"><span class="no">${numLabel}</span><span class="small">아래 문제지 이미지를 보고 답을 고르세요.</span></p>`;
  q.img.forEach(src=>{ h+=`<div class="qimg"><img src="${src}" alt="문제 그림"></div>`; });
  return h;
}
function renderQ(){
  const q = ex.list[ex.cur], a = ex.ans[q.id];
  const showAns = ex.done || (ex.mode==='practice' && ex.checked[q.id]);
  const opts = q.o.map((_,i)=>{
    let c='opt';
    if(showAns){ if(i===q.a) c+=' right'; else if(i===a) c+=' wrong'; }
    else if(i===a) c+=' sel';
    return `<button class="${c}" data-i="${i}"><span class="mk">${MK[i]}</span><span>${optText(q,i)}</span></button>`;
  }).join('');
  let fb='';
  if(showAns){ fb = a===q.a ? `<div class="feedback ok">정답입니다.</div>` : `<div class="feedback no">${a==null?'미응답':'오답'} · 정답은 ${MKC[q.a]} 입니다.</div>`; }
  app.innerHTML = `
  <div class="exam">
    <section class="panel">
      <div class="qhead">
        <div class="chips"><span class="tag">${esc(q.y)} 제${q.s}회</span><span class="tag">${esc(q.sub)} ${q.n}번</span></div>
        ${ex.end && !ex.done ? `<span class="timer" id="timer"></span>` : `<span class="small">${esc(ex.title)}</span>`}
      </div>
      ${qBody(q, (ex.cur+1)+'.')}
      <div class="guessrow">${ex.done ? (ex.guess[q.id]?'<span class="gtag">찍은 문제로 표시됨</span>':'') : `<button class="guessbtn" id="gbtn" aria-pressed="${!!ex.guess[q.id]}">${ex.guess[q.id]?'찍었음 ✓':'찍었음 (확신 없음)'}</button><span class="small">확신이 없으면 눌러 두세요</span>`}</div>
      <div class="opts">${opts}</div>
      ${fb}
      ${showAns ? explHTML(q) : ''}
      <div class="nav">
        <button class="btn" id="prev" ${ex.cur?'':'disabled'}>← 이전</button>
        <span class="small" style="align-self:center">${ex.cur+1} / ${ex.list.length}</span>
        ${ex.cur<ex.list.length-1 ? `<button class="btn primary" id="next">다음 →</button>`
          : ex.done ? `<button class="btn primary" id="toRes">결과 보기</button>` : `<button class="btn warn" id="submit2">답안 제출</button>`}
      </div>
    </section>
    <aside class="panel omr">
      <h3>답안 표기란</h3>
      <div class="small">${Object.keys(ex.ans).length} / ${ex.list.length} 표기</div>
      <div class="omrscroll">${omrGrid()}</div>
      <div class="omrfoot">
        ${ex.done ? `<button class="btn primary" id="toRes2">결과 보기</button>` : `<button class="btn warn" id="submit">답안 제출</button>`}
      </div>
    </aside>
  </div>`;
  updTimer();
  app.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
    if(ex.done || (ex.mode==='practice' && ex.checked[q.id])) return;
    ex.ans[q.id]=+b.dataset.i;
    if(ex.mode==='practice'){ ex.checked[q.id]=true; recordOne(q); }
    renderQ();
  });
  app.querySelectorAll('.cell').forEach(b=>b.onclick=()=>{ ex.cur=+b.dataset.k; renderQ(); });
  const on=(id,f)=>{const e=document.getElementById(id); if(e) e.onclick=f;};
  on('gbtn',()=>{ ex.guess[q.id]=!ex.guess[q.id]; if(!ex.guess[q.id]) delete ex.guess[q.id];
    if(ex.mode==='practice' && ex.checked[q.id]) { applyGuess(q); save(); } renderQ(); });
  on('prev',()=>{ex.cur--;renderQ();});
  on('next',()=>{ex.cur++;renderQ();});
  on('submit',askSubmit); on('submit2',askSubmit);
  on('toRes',result); on('toRes2',result);
}
function omrGrid(){
  // 과목별로 묶어서 표시
  let h='', lastKey=null, buf=[];
  const flush=()=>{ if(buf.length) h+=`<div class="grid">${buf.join('')}</div>`; buf=[]; };
  ex.list.forEach((q,k)=>{
    const key = ex.isRetry ? (ex.kind==='guess'?'찍은 문제':'오답') : `${q.s}회 ${q.sub}`;
    if(key!==lastKey){ flush(); h+=`<div class="omrsub">${esc(key)}</div>`; lastKey=key; }
    const a=ex.ans[q.id]; let c='cell';
    const show = ex.done || (ex.mode==='practice'&&ex.checked[q.id]);
    if(show) c+= a===q.a ? ' r' : ' w'; else if(a!=null) c+=' done';
    if(k===ex.cur) c+=' cur';
    if(ex.guess[q.id]) c+=' g';
    buf.push(`<button class="${c}" data-k="${k}" aria-label="${k+1}번">${k+1}<i>${a!=null?MK[a]:''}</i></button>`);
  });
  flush();
  return h;
}
function askSubmit(){
  const left = ex.list.length - Object.keys(ex.ans).length;
  const foot = document.querySelector('.omrfoot');
  foot.innerHTML = `<span class="small">${left?`안 푼 문제 ${left}개. `:''}제출할까요?</span>
    <span class="chips"><button class="btn" id="no">계속 풀기</button><button class="btn warn" id="yes">제출</button></span>`;
  foot.scrollIntoView({block:'nearest'});
  document.getElementById('no').onclick=renderQ;
  document.getElementById('yes').onclick=finish;
}
function recordOne(q){
  const a=ex.ans[q.id];
  if(a===q.a){
    if(ex.kind==='wrong' && store.wrong[q.id]) { delete store.wrong[q.id]; }
  } else {
    const w=store.wrong[q.id]||{c:0};
    w.c++; w.last=a==null?null:a; w.t=Date.now();
    store.wrong[q.id]=w;
    store.srs[q.id]={lvl:0,due:0,n:(store.srs[q.id]&&store.srs[q.id].n)||0};   // 다시 틀리면 암기 카드 처음부터
    if(store.guess[q.id]) delete store.guess[q.id];   // 틀리면 오답노트로 이동
  }
  applyGuess(q);
  save();
}
// 맞힌 문제 중 '찍었음' 표시한 것 → 찍은 문제 목록
function applyGuess(q){
  if(ex.ans[q.id]!==q.a) return;
  if(ex.guess[q.id]){
    if(!ex.gAdded[q.id]){ const g=store.guess[q.id]||{c:0}; g.c++; g.t=Date.now(); store.guess[q.id]=g; ex.gAdded[q.id]=1; }
  } else {
    if(ex.gAdded[q.id]){ const g=store.guess[q.id]; if(g){ g.c--; if(g.c<=0) delete store.guess[q.id]; } delete ex.gAdded[q.id]; }
    else if(ex.kind==='guess' && store.guess[q.id]) delete store.guess[q.id];   // 확신 있게 맞히면 목록에서 제거
  }
}
function finish(){
  clearInterval(tick);
  ex.done=true;
  ex.list.forEach(q=>{ if(!(ex.mode==='practice'&&ex.checked[q.id])) recordOne(q); });
  const r=calc();
  const d=new Date();
  store.hist.push({date:`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`, title:ex.title, score:r.score, total:ex.list.length});
  if(store.hist.length>50) store.hist=store.hist.slice(-50);
  if(!ex.isRetry){ const g={}; ex.list.forEach(q=>{ const k=`${q.y}-${q.s}-${q.sub}`; g[k]=g[k]||{n:0,ok:0}; g[k].n++; if(ex.ans[q.id]===q.a) g[k].ok++; });
    const ds=store.hist[store.hist.length-1].date;
    Object.entries(g).forEach(([k,v])=>{ const sc=Math.round(v.ok/v.n*100); const p=store.prog[k]||{c:0,best:0}; p.c++; p.last=sc; p.best=Math.max(p.best,sc); p.d=ds; p.t=Date.now(); store.prog[k]=p; }); }
  save();
  result();
}
function calc(){
  const by={};
  ex.list.forEach(q=>{ const k=ex.isRetry?(ex.kind==='guess'?'찍은 문제':'오답'):q.sub; by[k]=by[k]||{n:0,ok:0}; by[k].n++; if(ex.ans[q.id]===q.a) by[k].ok++; });
  const ok=ex.list.filter(q=>ex.ans[q.id]===q.a).length;
  return {by, ok, score: Math.round(ok/ex.list.length*100)};
}
function result(){
  const r=calc();
  const rows=Object.entries(r.by).map(([k,v])=>{ const p=Math.round(v.ok/v.n*100); return {k,v,p}; });
  const fail=rows.some(x=>x.p<40);
  const pass = !ex.isRetry && r.score>=60 && !fail;
  const wrongList = ex.list.map((q,k)=>({q,k})).filter(({q})=>ex.ans[q.id]!==q.a);
  const guessOk = ex.list.filter(q=>ex.guess[q.id] && ex.ans[q.id]===q.a).length;
  app.innerHTML = `
  <section class="panel">
    <div class="label">${esc(ex.title)} · 결과</div>
    <div class="score">
      <div class="big">${r.score}<small style="font-size:1.1rem">점</small></div>
      <div>${r.ok} / ${ex.list.length} 정답</div>
      ${ex.isRetry?'':`<span class="pass ${pass?'y':'n'}">${pass?'합격권':'불합격권'}${fail?' · 과락 과목 있음':''}</span>`}
    </div>
    <div class="tblwrap"><table class="subtbl">
      <tr><th>과목</th><th>정답</th><th>점수</th><th style="width:40%"></th></tr>
      ${rows.map(x=>`<tr><td>${esc(x.k)}</td><td class="n">${x.v.ok}/${x.v.n}</td><td class="n">${x.p}</td>
        <td><div class="bar"><span class="${x.p<40?'low':''}" style="width:${x.p}%"></span></div></td></tr>`).join('')}
    </table></div>
    <div class="startbar" style="margin-top:18px">
      <button class="btn primary" id="review">문제별 해설 보기</button>
      <button class="btn" id="toNote">오답노트 (${Object.keys(store.wrong).length})</button>
      <button class="btn" id="toGuess">찍은 문제 (${Object.keys(store.guess).length})</button>
      <button class="btn warn" id="toCard">암기 카드</button>
      <button class="btn" id="again">다시 시작</button>
    </div>
    ${wrongList.length?`<p class="small" style="margin-top:14px">틀린 문제 ${wrongList.length}개가 오답노트에 저장되었습니다.</p>`:''}
    ${guessOk?`<p class="small"><span class="gtag">찍어서 맞힌 문제 ${guessOk}개</span>는 점수에 포함되었고, "찍은 문제" 목록에 따로 저장되었습니다.</p>`:''}
  </section>`;
  document.getElementById('review').onclick=()=>{ ex.cur = wrongList.length?wrongList[0].k:0; renderQ(); };
  document.getElementById('toNote').onclick=()=>{noteKind='wrong';note();};
  document.getElementById('toGuess').onclick=()=>{noteKind='guess';note();};
  document.getElementById('again').onclick=home;
  document.getElementById('toCard').onclick=cardHome;
}

/* ---------- NOTE ---------- */
let noteFilter='all', noteExpl=true, noteKind='wrong';
function note(){
  clearInterval(tick);
  const G = noteKind==='guess'; const src = G ? store.guess : store.wrong;
  let ids = Object.keys(src).filter(id=>BYID[id]);
  ids.sort((a,b)=>{ const A=BYID[a],B=BYID[b]; return A.y.localeCompare(B.y)||A.s-B.s||SUBS.indexOf(A.sub)-SUBS.indexOf(B.sub)||A.n-B.n; });
  if(noteFilter!=='all') ids=ids.filter(id=>BYID[id].sub===noteFilter);
  const d=new Date();
  app.innerHTML = `
  <section class="panel">
    <div class="ntabs noprint">
      <button class="ntab" data-k="wrong" aria-pressed="${!G}">오답노트 (${Object.keys(store.wrong).filter(id=>BYID[id]).length})</button>
      <button class="ntab" data-k="guess" aria-pressed="${G}">찍은 문제 (${Object.keys(store.guess).filter(id=>BYID[id]).length})</button>
    </div>
    <div class="toolbar noprint">
      <div class="chips">
        <button class="chip" aria-pressed="${noteFilter==='all'}" data-f="all">전체</button>
        ${SUBS.map(s=>`<button class="chip" aria-pressed="${noteFilter===s}" data-f="${s}">${s}</button>`).join('')}
      </div>
      <div class="chips">
        <button class="btn warn" id="nRetry" ${ids.length?'':'disabled'}>이 문제들 다시 풀기</button>
        <button class="chip" aria-pressed="${noteExpl}" id="nExpl">해설 포함</button>
        <button class="btn primary" id="print" ${ids.length?'':'disabled'}>인쇄하기</button>
      </div>
    </div>
    <p class="small noprint">${G?'찍어서 맞힌 문제입니다. 다시 풀 때 "찍었음"을 누르지 않고 맞히면 목록에서 빠집니다. 틀리면 오답노트로 옮겨집니다.':'다시 풀어서 맞히면 오답노트에서 자동으로 빠집니다.'} 메모칸에 적은 내용은 인쇄에도 나옵니다. 인쇄는 PC 크롬에서 이 파일을 열었을 때 동작합니다.</p>
    <div class="printonly"><h2 style="margin:0">${window.CBT_G.name} ${G?'찍은 문제':'오답노트'}</h2><p class="small">${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} · ${ids.length}문항 · 굵은 테두리가 정답</p></div>
    ${ids.length? ids.map((id,k)=>{
      const q=BYID[id], w=src[id];
      return `<div class="nitem">
        <div class="nmeta"><span class="tag">${esc(q.y)} 제${q.s}회 ${esc(q.sub)} ${q.n}번</span>${G?`<span class="gtag">${w.c}회 찍어서 맞힘</span>`:`<span class="miss">${w.c}회 틀림</span>`}
          <button class="btn noprint" data-del="${id}" style="padding:2px 10px;font-size:.8rem">외웠음 · 삭제</button></div>
        ${qBody(q,(k+1)+'.')}
        <ul class="nopts">${q.o.map((_,i)=>`<li class="${i===q.a?'ans':(!G&&i===w.last?'mine':'')}">${MKC[i]} ${optText(q,i)}</li>`).join('')}</ul>
        ${noteExpl ? explHTML(q) : ''}
        <textarea class="memo" id="memo-${esc(id)}" data-memo="${esc(id)}" placeholder="${G?'메모 (헷갈린 이유, 외울 포인트)':'메모 (왜 틀렸는지, 외울 포인트)'}">${esc(store.memo[id]||'')}</textarea>
      </div>`; }).join('')
      : `<div class="empty">${G?'찍은 문제가 없습니다. 풀 때 "찍었음"을 누르고 맞힌 문제가 여기에 모입니다.':'오답노트가 비어 있습니다. 시험을 풀면 틀린 문제가 여기에 쌓입니다.'}</div>`}
  </section>`;
  app.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{noteFilter=b.dataset.f;note();});
  app.querySelectorAll('.ntab').forEach(b=>b.onclick=()=>{noteKind=b.dataset.k;note();});
  app.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{delete src[b.dataset.del]; save(); note();});
  app.querySelectorAll('[data-memo]').forEach(t=>t.oninput=()=>{store.memo[t.dataset.memo]=t.value; save();});
  document.getElementById('nExpl').onclick=()=>{noteExpl=!noteExpl;note();};
  const pr=document.getElementById('print'); if(pr) pr.onclick=()=>window.print();
  const rt=document.getElementById('nRetry'); if(rt) rt.onclick=()=>startExam(ids.map(i=>BYID[i]),G?'찍은 문제 다시 풀기':'오답 다시 풀기','practice',true,G?'guess':'wrong');
  window.scrollTo(0,0);
}

/* ---------- 암기 카드 (Anki식 반복) ---------- */
// store.srs[id] = {lvl, due, n}  lvl: 외운 단계, due: 다음 복습 시각
const DAY = 86400000;
const INTV = [0, 0.5*DAY, 2*DAY, 5*DAY, 12*DAY, 30*DAY];   // 단계별 다음 복습까지
if(!store.srs) store.srs = {};
let cardSel = { wrong:true, guess:true, sub:'all' };
let cs = null;   // 진행 중인 카드 세션

function cardDeck(){
  const ids = new Set();
  if(cardSel.wrong) Object.keys(store.wrong).forEach(i=>ids.add(i));
  if(cardSel.guess) Object.keys(store.guess).forEach(i=>ids.add(i));
  return [...ids].filter(id=>BYID[id] && (cardSel.sub==='all' || BYID[id].sub===cardSel.sub));
}
const isDue = id => { const r=store.srs[id]; return !r || (r.due||0) <= Date.now(); };
function allCardCount(){ const ids=new Set([...Object.keys(store.wrong),...Object.keys(store.guess)]); return [...ids].filter(id=>BYID[id]); }
function dueLabel(ms){
  const h = Math.round((ms-Date.now())/3600000);
  if(h<1) return '곧'; if(h<24) return `${h}시간 뒤`; return `${Math.round(h/24)}일 뒤`;
}

function cardHome(){
  clearInterval(tick); cs=null;
  const deck = cardDeck();
  const due = deck.filter(isDue);
  const solid = deck.filter(id=>(store.srs[id]?.lvl||0)>=3).length;
  const nextDue = deck.filter(id=>!isDue(id)).map(id=>store.srs[id].due).sort((a,b)=>a-b)[0];
  const wN=Object.keys(store.wrong).filter(i=>BYID[i]).length, gN=Object.keys(store.guess).filter(i=>BYID[i]).length;
  app.innerHTML = `
  <section class="panel cardhome">
    <div class="label">암기 카드 · 기억날 때까지 반복</div>
    <p class="small" style="margin-top:0">틀렸던 문제가 카드로 한 장씩 나옵니다. 답을 고르고 나서 <b>다시 / 헷갈림 / 알았음</b> 중 하나를 누르세요. "다시"를 누른 카드는 몇 장 뒤에 또 나오고, 연속으로 맞혀야 오늘 목록에서 빠집니다. 외운 카드는 반나절 → 2일 → 5일 뒤처럼 점점 늦게 다시 나옵니다.</p>
    <div class="field"><div class="label">어떤 문제로</div><div class="chips">
      <button class="chip" aria-pressed="${cardSel.wrong}" data-cw="wrong">오답노트 <span class="cb">${wN}</span></button>
      <button class="chip" aria-pressed="${cardSel.guess}" data-cw="guess">찍은 문제 <span class="cb">${gN}</span></button>
    </div></div>
    <div class="field"><div class="label">과목</div><div class="chips">
      <button class="chip" aria-pressed="${cardSel.sub==='all'}" data-cf="all">전체</button>
      ${SUBS.map(s=>`<button class="chip" aria-pressed="${cardSel.sub===s}" data-cf="${s}">${s}</button>`).join('')}
    </div></div>
    <div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat"><b>${due.length}</b><span>오늘 복습할 카드</span></div>
      <div class="stat"><b>${deck.length}</b><span>전체 카드</span></div>
      <div class="stat"><b>${solid}</b><span>확실히 외운 카드</span></div>
    </div>
    <div class="startbar">
      <button class="btn warn big-btn" id="cStart" ${due.length?'':'disabled'}>오늘 복습 시작 (${due.length}장)</button>
      <button class="btn" id="cAll" ${deck.length?'':'disabled'}>기한 무시하고 전부 (${deck.length}장)</button>
    </div>
    <p class="tip">${!deck.length ? '아직 카드가 없습니다. 시험이나 연습 모드에서 틀린 문제가 자동으로 카드가 됩니다.'
      : !due.length ? `오늘 복습할 카드를 모두 끝냈습니다. 다음 카드는 ${dueLabel(nextDue)} 나옵니다. 시험 직전이면 "전부"로 한 번 더 도세요.`
      : '시험 직전에는 "기한 무시하고 전부"로 모든 카드를 한 바퀴 도는 것을 추천합니다.'}</p>
  </section>`;
  app.querySelectorAll('[data-cw]').forEach(b=>b.onclick=()=>{ const k=b.dataset.cw; cardSel[k]=!cardSel[k]; if(!cardSel.wrong&&!cardSel.guess) cardSel[k==='wrong'?'guess':'wrong']=true; cardHome(); });
  app.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>{ cardSel.sub=b.dataset.cf; cardHome(); });
  document.getElementById('cStart').onclick=()=>cardStart(due);
  document.getElementById('cAll').onclick=()=>cardStart(deck);
  window.scrollTo(0,0);
}

function cardStart(ids){
  if(!ids.length) return;
  cs = { queue: shuffleArr(ids), total: ids.length, done: [], st:{}, pick:null, shown:false, agains:0 };
  ids.forEach(id=>cs.st[id]={streak:0, lapsed:false, again:0});
  cardRender();
}

function cardRender(){
  if(!cs.queue.length) return cardEnd();
  const id = cs.queue[0], q = BYID[id], s = cs.st[id];
  const shown = cs.shown, a = cs.pick;
  const opts = q.o.map((_,i)=>{
    let c='opt';
    if(shown){ if(i===q.a) c+=' right'; else if(i===a) c+=' wrong'; }
    return `<button class="${c}" data-i="${i}"><span class="mk">${MK[i]}</span><span>${optText(q,i)}</span></button>`;
  }).join('');
  const pct = Math.round(cs.done.length/cs.total*100);
  const need = (s.lapsed || (shown && a!=null && a!==q.a)) ? 2 : 1;
  let fb='';
  if(shown){
    fb = a==null ? `<div class="feedback no">정답은 ${MKC[q.a]} 입니다.</div>`
       : a===q.a ? `<div class="feedback ok">맞았습니다.</div>` : `<div class="feedback no">틀렸습니다 · 정답은 ${MKC[q.a]}</div>`;
  }
  const good = s.streak+1 >= need ? '통과' : '한 번 더 확인';
  const lv = store.srs[id]?.lvl||0;
  app.innerHTML = `
  <section class="panel card">
    <div class="cprog"><div class="cbar"><span style="width:${pct}%"></span></div>
      <span class="small">외움 <b>${cs.done.length}</b> / ${cs.total} · 남은 카드 ${cs.queue.length}</span></div>
    <div class="qhead">
      <div class="chips"><span class="tag">${esc(q.y)} 제${q.s}회</span><span class="tag">${esc(q.sub)} ${q.n}번</span>
        ${s.again?`<span class="tag tagbad">오늘 ${s.again}번 다시</span>`:''}${lv?`<span class="tag">${lv}단계</span>`:''}</div>
      <button class="btn small-btn" id="cQuit">그만하기</button>
    </div>
    ${qBody(q,'Q.')}
    <div class="opts">${opts}</div>
    ${shown ? '' : `<div class="startbar" style="margin-top:14px"><button class="btn" id="cReveal">모르겠음 · 정답 보기</button></div>`}
    ${fb}
    ${shown ? `
      <div class="rate">
        <button class="rbtn again" data-r="again"><b>다시</b><small>몰랐음 · 3장 뒤</small></button>
        <button class="rbtn hard" data-r="hard"><b>헷갈림</b><small>조금 뒤 또</small></button>
        <button class="rbtn good" data-r="good"><b>알았음</b><small>${good}</small></button>
      </div>
      ${explHTML(q)}
      <textarea class="memo" data-memo="${esc(id)}" placeholder="메모 (외울 포인트)" style="margin-top:12px">${esc(store.memo[id]||'')}</textarea>` : ''}
  </section>`;
  app.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{ if(cs.shown) return; cs.pick=+b.dataset.i; cs.shown=true; cardRender(); scrollRate(); });
  const rv=document.getElementById('cReveal'); if(rv) rv.onclick=()=>{ cs.pick=null; cs.shown=true; cardRender(); scrollRate(); };
  app.querySelectorAll('.rbtn').forEach(b=>b.onclick=()=>cardRate(b.dataset.r));
  app.querySelectorAll('[data-memo]').forEach(t=>t.oninput=()=>{store.memo[t.dataset.memo]=t.value; save();});
  document.getElementById('cQuit').onclick=cardEnd;
}
function scrollRate(){ const r=document.querySelector('.rate'); if(r) r.scrollIntoView({block:'center',behavior:'smooth'}); }

function cardRate(r){
  const id = cs.queue.shift(), s = cs.st[id], q = BYID[id];
  // 틀린 답을 골랐으면 "알았음"이어도 통과 조건은 엄격하게
  if(cs.pick!=null && cs.pick!==q.a && r==='good') s.lapsed = true;
  const put = n => cs.queue.splice(Math.min(n, cs.queue.length), 0, id);
  if(r==='again'){ s.streak=0; s.lapsed=true; s.again++; cs.agains++; put(3); }
  else if(r==='hard'){ s.lapsed=true; s.streak=0; put(7); }
  else {
    s.streak++;
    if(s.streak >= (s.lapsed?2:1)){
      const o = store.srs[id] || {lvl:0, n:0};
      o.lvl = s.lapsed ? 1 : Math.min((o.lvl||0)+1, INTV.length-1);
      o.due = Date.now() + INTV[o.lvl]; o.n=(o.n||0)+1;
      store.srs[id] = o; cs.done.push(id); save();
    } else put(10);
  }
  cs.pick=null; cs.shown=false;
  cardRender(); window.scrollTo(0,0);
}

function cardEnd(){
  if(!cs) return cardHome();
  const hard = cs.done.concat(cs.queue).filter(id=>cs.st[id].again).sort((a,b)=>cs.st[b].again-cs.st[a].again).slice(0,8);
  const left = cs.queue.length;
  app.innerHTML = `
  <section class="panel">
    <div class="label">암기 카드 · 오늘 결과</div>
    <div class="score"><div class="big">${cs.done.length}<small style="font-size:1.1rem">장 외움</small></div>
      <div>${left?`${left}장은 아직 남았습니다`:'모든 카드를 통과했습니다'} · "다시" ${cs.agains}번</div></div>
    ${hard.length?`<div class="label" style="margin-top:18px">오늘 가장 많이 헷갈린 문제</div>
      <table class="hist">${hard.map(id=>{const q=BYID[id]; return `<tr><td>${esc(q.y)} 제${q.s}회 ${esc(q.sub)} ${q.n}번</td><td>${esc(String(q.q).replace(/[\u0001\u0002]/g,'').slice(0,50))}</td><td class="n miss">${cs.st[id].again}번</td></tr>`;}).join('')}</table>`:''}
    <div class="startbar" style="margin-top:18px">
      ${left?`<button class="btn warn" id="cCont">남은 ${left}장 계속</button>`:''}
      <button class="btn primary" id="cBack">암기 카드 처음으로</button>
      <button class="btn" id="cHome">시험 화면으로</button>
    </div>
  </section>`;
  const rest = cs.queue.slice();
  const c=document.getElementById('cCont'); if(c) c.onclick=()=>cardStart(rest);
  document.getElementById('cBack').onclick=cardHome;
  document.getElementById('cHome').onclick=home;
  cs=null; window.scrollTo(0,0);
}

document.getElementById('goHome').onclick=()=>{clearInterval(tick);home();};
document.getElementById('goCard').onclick=cardHome;
document.getElementById('goNote').onclick=note;
updateNoteCount();
home();

