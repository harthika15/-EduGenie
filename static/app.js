const modes = {
  qa: ["Ask anything","Ask EduGenie a question about any subject."],
  explain: ["Explain a concept","Turn a difficult topic into a simple explanation."],
  quiz: ["Generate quiz","Create five MCQs and test your understanding."],
  summarize: ["Summarize","Turn long notes into quick revision points."],
  learn: ["Learning path","Build a structured beginner-to-advanced study plan."]
};

let currentTask = "qa";
const form = document.getElementById("assistantForm");
const input = document.getElementById("inputText");
const conversation = document.getElementById("conversation");
const count = document.getElementById("charCount");
const send = document.querySelector(".send-btn");

function setMode(task){
  currentTask = task;
  document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x.dataset.task===task));
  document.getElementById("modeTitle").textContent = modes[task][0];
  document.getElementById("modeDesc").textContent = modes[task][1];
  input.focus();
}
document.querySelectorAll(".mode").forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.task)));
document.querySelectorAll("[data-suggest]").forEach(btn=>btn.addEventListener("click",()=>{
  input.value=btn.dataset.suggest; count.textContent=`${input.value.length} / 5000`; input.focus();
}));
input.addEventListener("input",()=>{ if(input.value.length>5000) input.value=input.value.slice(0,5000); count.textContent=`${input.value.length} / 5000`; });

function addMessage(role, text){
  const wrap=document.createElement("div"); wrap.className=`message ${role}`;
  const inner=document.createElement("div");
  inner.innerHTML=`<div class="label">${role==="user"?"YOU":"EDUGENIE"}</div><div class="bubble"></div>`;
  inner.querySelector(".bubble").textContent=text;
  wrap.appendChild(inner); conversation.appendChild(wrap);
  conversation.scrollTop=conversation.scrollHeight;
}

function addTyping(){
  const wrap=document.createElement("div"); wrap.className="message assistant"; wrap.id="typing";
  wrap.innerHTML='<div><div class="label">EDUGENIE</div><div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div></div>';
  conversation.appendChild(wrap); conversation.scrollTop=conversation.scrollHeight;
}
function renderQuiz(data){
  const wrap=document.createElement("div"); wrap.className="message assistant";
  let html='<div style="width:100%"><div class="label">EDUGENIE • QUIZ</div>';
  data.questions.forEach((q,i)=>{
    html+=`<div class="quiz-card"><h4>${i+1}. ${escapeHtml(q.question)}</h4>`;
    q.options.forEach((o,j)=>html+=`<button class="option" data-correct="${j===q.answer}" data-explanation="${escapeHtml(q.explanation)}">${String.fromCharCode(65+j)}. ${escapeHtml(o)}</button>`);
    html+='</div>';
  });
  html+='</div>'; wrap.innerHTML=html; conversation.appendChild(wrap);
  wrap.querySelectorAll(".option").forEach(btn=>btn.addEventListener("click",()=>{
    if(btn.parentElement.dataset.done) return;
    btn.parentElement.dataset.done="1";
    if(btn.dataset.correct==="true"){btn.classList.add("correct");}
    else {
      btn.classList.add("wrong");
      [...btn.parentElement.querySelectorAll(".option")].find(x=>x.dataset.correct==="true")?.classList.add("correct");
    }
    const p=document.createElement("div");p.style.cssText="font-size:11px;color:#687386;margin-top:8px";p.textContent=btn.dataset.explanation;btn.parentElement.appendChild(p);
  }));
  conversation.scrollTop=conversation.scrollHeight;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

form.addEventListener("submit", async e=>{
  e.preventDefault();
  const text=input.value.trim(); if(!text) return;
  addMessage("user",text); input.value=""; count.textContent="0 / 5000"; send.disabled=true; addTyping();
  try{
    const res=await fetch("/api/assist",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({task:currentTask,text})});
    const data=await res.json(); document.getElementById("typing")?.remove();
    if(!res.ok) throw new Error(data.error||"Something went wrong.");
    if(currentTask==="quiz") renderQuiz(data.result); else addMessage("assistant",data.result);
  }catch(err){document.getElementById("typing")?.remove(); addMessage("assistant","I couldn't complete that request. "+err.message);}
  finally{send.disabled=false;}
});
document.getElementById("clearBtn").addEventListener("click",()=>{
  conversation.innerHTML=`<div class="welcome"><div class="genie-icon">✦</div><h2>What are you learning today?</h2><p>Start with a question or choose a study mode from the left.</p><div class="suggestions"><button data-suggest="Explain the difference between supervised and unsupervised learning.">Explain machine learning</button><button data-suggest="What is the water cycle?">Explain a science topic</button><button data-suggest="Create a quiz about SQL joins.">Quiz me on SQL</button></div></div>`;
  document.querySelectorAll("[data-suggest]").forEach(btn=>btn.addEventListener("click",()=>{input.value=btn.dataset.suggest;count.textContent=`${input.value.length} / 5000`;input.focus();}));
});
