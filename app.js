(function(){
  const $ = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));

  const raw = $("#QUESTION_DATA").textContent.trim();
  const DATA = JSON.parse(raw);

  const setupView = $("#setupView");
  const quizView = $("#quizView");
  const resultView = $("#resultView");
  const modal = $("#modal");

  const chapterList = $("#chapterList");
  const modeSelect = $("#modeSelect");
  const countInput = $("#countInput");
  const timerInput = $("#timerInput");
  const shuffleQ = $("#shuffleQ");
  const shuffleOpt = $("#shuffleOpt");
  const dedupeStem = $("#dedupeStem");
  const availableHint = $("#availableHint");

  const btnStart = $("#btnStart");
  const btnQuick50 = $("#btnQuick50");
  const btnHome = $("#btnHome");
  const btnReset = $("#btnReset");

  // Quiz UI
  const quizMeta = $("#quizMeta");
  const progressBar = $("#progressBar");
  const timerBox = $("#timerBox");
  const btnFlag = $("#btnFlag");
  const qNum = $("#qNum");
  const qText = $("#qText");
  const optList = $("#optList");
  const feedback = $("#feedback");
  const btnPrev = $("#btnPrev");
  const btnNext = $("#btnNext");
  const btnJump = $("#btnJump");
  const btnSubmit = $("#btnSubmit");

  // Modal
  const jumpGrid = $("#jumpGrid");
  const btnCloseModal = $("#btnCloseModal");

  // Results UI
  const scoreLine = $("#scoreLine");
  const resultList = $("#resultList");
  const btnReviewWrong = $("#btnReviewWrong");
  const btnReviewFlag = $("#btnReviewFlag");
  const btnNewQuiz = $("#btnNewQuiz");

  // State
  let selectedChapters = new Set(DATA.c.map(x=>x.id)); // default all
  let quiz = null; // {items:[...], mode, startedAt, durationMs, timerId, endAt, ...}
  let currentIndex = 0;

  function show(view){
    setupView.classList.add("hidden");
    quizView.classList.add("hidden");
    resultView.classList.add("hidden");
    modal.classList.add("hidden");
    view.classList.remove("hidden");
  }

  function normalizeStem(s){
    return (s||"").toLowerCase().replace(/\s+/g," ").trim();
  }

  function shuffle(arr){
    for(let i=arr.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
    return arr;
  }

  function buildChapterChips(){
    chapterList.innerHTML = "";
    const allChip = document.createElement("button");
    allChip.className = "chip";
    allChip.textContent = "Tất cả";
    allChip.setAttribute("aria-pressed", selectedChapters.size === DATA.c.length ? "true" : "false");
    allChip.onclick = ()=>{
      if(selectedChapters.size === DATA.c.length){
        // if all selected -> keep all (no-op)
      } else {
        selectedChapters = new Set(DATA.c.map(x=>x.id));
      }
      updateChips();
      updateAvailable();
    };
    chapterList.appendChild(allChip);

    DATA.c.forEach(ch=>{
      const b=document.createElement("button");
      b.className="chip";
      b.textContent = `Chương ${ch.id}: ${ch.t}`;
      b.dataset.id = ch.id;
      b.setAttribute("aria-pressed", selectedChapters.has(ch.id) ? "true":"false");
      b.onclick = ()=>{
        if(selectedChapters.has(ch.id)) selectedChapters.delete(ch.id);
        else selectedChapters.add(ch.id);
        if(selectedChapters.size===0) selectedChapters.add(ch.id); // prevent empty
        updateChips();
        updateAvailable();
      };
      chapterList.appendChild(b);
    });
  }

  function updateChips(){
    const chips = Array.from(chapterList.querySelectorAll(".chip"));
    const all = chips[0];
    all.setAttribute("aria-pressed", selectedChapters.size === DATA.c.length ? "true" : "false");
    chips.slice(1).forEach(chip=>{
      const id = Number(chip.dataset.id);
      chip.setAttribute("aria-pressed", selectedChapters.has(id) ? "true":"false");
    });
  }

  function getPool(){
    const pool=[];
    DATA.c.forEach(ch=>{
      if(selectedChapters.has(ch.id)){
        ch.q.forEach(q=>{
          pool.push({ch: ch.id, chTitle: ch.t, ...q});
        });
      }
    });
    return pool;
  }

  function uniquePoolByStem(pool){
    // group by stem; pick one representative per stem (random).
    const map = new Map();
    pool.forEach(q=>{
      const stem = normalizeStem(q.s);
      if(!map.has(stem)) map.set(stem, []);
      map.get(stem).push(q);
    });
    const unique=[];
    map.forEach(list=>{
      unique.push(list[Math.floor(Math.random()*list.length)]);
    });
    return unique;
  }

  function updateAvailable(){
    const pool=getPool();
    const unique = uniquePoolByStem(pool);
    const a = dedupeStem.checked ? unique.length : pool.length;
    availableHint.textContent = `Có thể chọn tối đa: ${a} câu (theo tuỳ chọn hiện tại).`;
    // clamp count
    const n=parseInt(countInput.value||"0",10);
    if(n>a && a>0) countInput.value = a;
  }

  function makeQuiz(config){
    let pool=getPool();
    const totalOriginal = pool.length;
    if(config.dedupeStem){
      pool = uniquePoolByStem(pool);
    }
    const totalAvailable = pool.length;

    if(config.shuffleQ) shuffle(pool);

    const count = Math.min(config.count, totalAvailable);
    const items = pool.slice(0, count).map((q, idx)=>{
      const base = {
        idx,
        id: q.id,
        ch: q.ch,
        chTitle: q.chTitle,
        number: q.n,
        text: q.s,
        // original answer letter is q.a (A/B/C/D)
        flagged: false,
        chosen: null,
        correct: q.a,
        options: [
          {origKey:"A", text:q.A},
          {origKey:"B", text:q.B},
          {origKey:"C", text:q.C},
          {origKey:"D", text:q.D},
        ]
      };

      if(config.shuffleOpt){
        shuffle(base.options);
        // assign display keys A-D
        const keys = ["A","B","C","D"];
        base.options = base.options.map((o,i)=>({key: keys[i], text:o.text, origKey:o.origKey}));
        const correctOpt = base.options.find(o=>o.origKey===q.a);
        base.correct = correctOpt ? correctOpt.key : q.a;
      } else {
        base.options = base.options.map(o=>({key:o.origKey, text:o.text, origKey:o.origKey}));
        base.correct = q.a;
      }
      return base;
    });

    const durationMs = (config.timerMin>0) ? config.timerMin*60*1000 : 0;

    return {
      mode: config.mode,
      totalOriginal,
      totalAvailable,
      items,
      startedAt: Date.now(),
      durationMs,
      endAt: durationMs ? Date.now() + durationMs : 0,
      timerId: null
    };
  }

  function formatTime(ms){
    const s = Math.max(0, Math.floor(ms/1000));
    const mm = String(Math.floor(s/60)).padStart(2,"0");
    const ss = String(s%60).padStart(2,"0");
    return `${mm}:${ss}`;
  }

  function render(){
    if(!quiz) return;
    const it = quiz.items[currentIndex];

    // meta
    const chapSet = new Set(quiz.items.map(x=>x.ch));
    const chapText = (chapSet.size === DATA.c.length) ? "Tất cả chương" : `Chương: ${Array.from(chapSet).sort((a,b)=>a-b).join(", ")}`;
    quizMeta.textContent = `${chapText} • ${quiz.mode === "practice" ? "Luyện" : "Thi"} • ${quiz.items.length} câu`;

    // progress
    const answered = quiz.items.filter(x=>x.chosen!==null).length;
    const pct = (answered/quiz.items.length)*100;
    progressBar.style.width = `${pct}%`;

    // timer
    if(quiz.durationMs){
      timerBox.textContent = "⏱ " + formatTime(quiz.endAt - Date.now());
      timerBox.style.display = "block";
    } else {
      timerBox.textContent = "";
      timerBox.style.display = "none";
    }

    // question
    qNum.textContent = `Câu ${currentIndex+1}/${quiz.items.length}`;
    qText.textContent = it.text;

    // flag
    btnFlag.textContent = it.flagged ? "🚩 Bỏ cờ" : "🚩 Gắn cờ";

    // options
    optList.innerHTML = "";
    feedback.textContent = "";
    feedback.className = "feedback";

    it.options.forEach(opt=>{
      const row = document.createElement("label");
      row.className="option";
      const input = document.createElement("input");
      input.type="radio";
      input.name="opt";
      input.value=opt.key;
      input.checked = (it.chosen === opt.key);

      const key = document.createElement("div");
      key.className="key";
      key.textContent = opt.key + ".";

      const txt = document.createElement("div");
      txt.className="txt";
      txt.textContent = opt.text;

      row.appendChild(input);
      row.appendChild(key);
      row.appendChild(txt);

      row.onclick = (e)=>{
        if(e.target && e.target.tagName.toLowerCase()==="a") return;
        choose(opt.key);
      };

      optList.appendChild(row);
    });

    // practice feedback
    if(quiz.mode==="practice" && it.chosen!==null){
      showPracticeFeedback();
    }

    btnPrev.disabled = currentIndex===0;
    btnNext.disabled = currentIndex===quiz.items.length-1;
  }

  function showPracticeFeedback(){
    const it = quiz.items[currentIndex];
    const rows = Array.from(optList.querySelectorAll(".option"));
    rows.forEach(r=>{
      const key = r.querySelector(".key").textContent.trim().replace(".","");
      if(key === it.correct) r.classList.add("correct");
      if(it.chosen && key === it.chosen && it.chosen !== it.correct) r.classList.add("wrong");
    });
    if(it.chosen === it.correct){
      feedback.textContent = "✅ Đúng";
      feedback.classList.add("good");
    } else {
      feedback.textContent = `❌ Sai • Đáp án đúng: ${it.correct}`;
      feedback.classList.add("bad");
    }
  }

  function choose(key){
    const it = quiz.items[currentIndex];
    it.chosen = key;
    render();
  }

  function openModal(){
    modal.classList.remove("hidden");
    jumpGrid.innerHTML = "";
    quiz.items.forEach((it, idx)=>{
      const b=document.createElement("button");
      b.className="jump-btn";
      b.textContent = String(idx+1);
      if(it.chosen!==null) b.classList.add("answered");
      if(idx===currentIndex) b.classList.add("current");
      b.onclick = ()=>{
        currentIndex = idx;
        closeModal();
        render();
      };
      jumpGrid.appendChild(b);
    });
  }
  function closeModal(){ modal.classList.add("hidden"); }

  function finish(reason){
    // stop timer
    if(quiz && quiz.timerId){
      clearInterval(quiz.timerId);
      quiz.timerId = null;
    }
    // compute score
    const total = quiz.items.length;
    const correct = quiz.items.filter(it=>it.chosen===it.correct).length;
    const unanswered = quiz.items.filter(it=>it.chosen===null).length;
    const flags = quiz.items.filter(it=>it.flagged).length;

    scoreLine.textContent = `Điểm: ${correct}/${total} • Chưa làm: ${unanswered} • Gắn cờ: ${flags}` + (reason ? ` • (${reason})` : "");
    resultList.innerHTML = "";

    quiz.items.forEach((it, idx)=>{
      const box = document.createElement("div");
      box.className="result-item";
      const isCorrect = (it.chosen===it.correct);
      const badge = document.createElement("div");
      badge.className="badge " + (isCorrect ? "good":"bad");
      badge.textContent = isCorrect ? "ĐÚNG" : "SAI";
      const t = document.createElement("div");
      t.textContent = `Câu ${idx+1} • ${it.chTitle}`;
      const detail = document.createElement("div");
      detail.style.marginTop="6px";
      const chosen = it.chosen ?? "—";
      detail.textContent = `Bạn chọn: ${chosen} • Đúng: ${it.correct}`;
      if(it.flagged){
        const f=document.createElement("div");
        f.className="badge flag";
        f.textContent="🚩 Đã gắn cờ";
        f.style.marginTop="6px";
        box.appendChild(f);
      }
      box.appendChild(badge);
      box.appendChild(t);
      box.appendChild(detail);
      resultList.appendChild(box);
    });

    show(resultView);
  }

  function startTimer(){
    if(!quiz.durationMs) return;
    timerBox.textContent = "⏱ " + formatTime(quiz.endAt - Date.now());
    quiz.timerId = setInterval(()=>{
      const left = quiz.endAt - Date.now();
      timerBox.textContent = "⏱ " + formatTime(left);
      if(left<=0){
        finish("Hết giờ");
      }
    }, 250);
  }

  function start(config){
    quiz = makeQuiz(config);
    currentIndex = 0;
    show(quizView);
    render();
    startTimer();
  }

  function getConfig(extraCount){
    const pool = getPool();
    const poolUnique = uniquePoolByStem(pool);
    const available = dedupeStem.checked ? poolUnique.length : pool.length;

    const rawCount = extraCount ?? parseInt(countInput.value || "0",10);
    const count = Math.max(1, Math.min(rawCount || 1, available || 1));
    const timerMin = Math.max(0, parseInt(timerInput.value || "0",10) || 0);
    return {
      mode: modeSelect.value,
      count,
      timerMin,
      shuffleQ: shuffleQ.checked,
      shuffleOpt: shuffleOpt.checked,
      dedupeStem: dedupeStem.checked
    };
  }

  // Events
  btnStart.onclick = ()=> start(getConfig());
  btnQuick50.onclick = ()=> start(getConfig(50));
  btnHome.onclick = ()=> show(setupView);
  btnReset.onclick = ()=>{
    // reset state
    quiz = null;
    currentIndex = 0;
    selectedChapters = new Set(DATA.c.map(x=>x.id));
    modeSelect.value="practice";
    countInput.value=30;
    timerInput.value=0;
    shuffleQ.checked=true;
    shuffleOpt.checked=true;
    dedupeStem.checked=true;
    buildChapterChips();
    updateAvailable();
    show(setupView);
  };

  btnPrev.onclick = ()=>{ if(currentIndex>0){ currentIndex--; render(); } };
  btnNext.onclick = ()=>{ if(currentIndex<quiz.items.length-1){ currentIndex++; render(); } };

  btnJump.onclick = ()=> openModal();
  btnCloseModal.onclick = ()=> closeModal();
  modal.addEventListener("click",(e)=>{ if(e.target===modal) closeModal(); });

  btnFlag.onclick = ()=>{
    const it = quiz.items[currentIndex];
    it.flagged = !it.flagged;
    render();
  };

  btnSubmit.onclick = ()=>{
    const unanswered = quiz.items.filter(it=>it.chosen===null).length;
    const msg = unanswered ? `Bạn còn ${unanswered} câu chưa làm. Vẫn nộp bài?` : "Nộp bài?";
    if(confirm(msg)) finish("Nộp bài");
  };

  btnNewQuiz.onclick = ()=> show(setupView);

  btnReviewWrong.onclick = ()=>{
    if(!quiz) return;
    const wrong = quiz.items.filter(it=>it.chosen!==null && it.chosen!==it.correct);
    if(!wrong.length){ alert("Không có câu sai để ôn 🎉"); return; }
    // convert to practice review
    quiz = {
      ...quiz,
      mode:"practice",
      durationMs:0,
      endAt:0,
      timerId:null,
      items: wrong.map((it,idx)=>({...it, idx}))
    };
    currentIndex=0;
    show(quizView);
    render();
  };

  btnReviewFlag.onclick = ()=>{
    if(!quiz) return;
    const flagged = quiz.items.filter(it=>it.flagged);
    if(!flagged.length){ alert("Bạn chưa gắn cờ câu nào."); return; }
    quiz = {
      ...quiz,
      mode:"practice",
      durationMs:0,
      endAt:0,
      timerId:null,
      items: flagged.map((it,idx)=>({...it, idx}))
    };
    currentIndex=0;
    show(quizView);
    render();
  };

  // Keep available hint up to date
  [dedupeStem, countInput].forEach(el=>{
    el.addEventListener("change", updateAvailable);
    el.addEventListener("input", updateAvailable);
  });

  // init
  buildChapterChips();
  updateAvailable();
  show(setupView);
})();