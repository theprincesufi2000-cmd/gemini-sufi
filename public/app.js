import {
  auth,db,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,
  signOut,updateProfile,ref,get,set,push,remove,serverTimestamp
} from "../firebase/firebase-config.js";

const authView=document.querySelector("#authView"),appView=document.querySelector("#appView");
const authBtn=document.querySelector("#authBtn"),toggleAuth=document.querySelector("#toggleAuth"),authSub=document.querySelector("#authSub");
const nameInput=document.querySelector("#name"),email=document.querySelector("#email"),password=document.querySelector("#password"),authError=document.querySelector("#authError");
const chat=document.querySelector("#chat"),form=document.querySelector("#composer"),input=document.querySelector("#input"),send=document.querySelector("#send"),statusEl=document.querySelector("#status");
const panel=document.querySelector("#memoryPanel"),memoryList=document.querySelector("#memoryList");
let register=false,history=[];

function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function add(role,text="",stream=false){document.querySelector("#empty")?.remove();const row=document.createElement("div");row.className="msg "+role;const b=document.createElement("div");b.className="bubble"+(stream?" streaming":"");b.textContent=text;row.appendChild(b);chat.appendChild(row);chat.scrollTop=chat.scrollHeight;return b;}
function busy(v){send.disabled=v;input.disabled=v;statusEl.textContent=v?"يكتب الآن…":"متصل";}

toggleAuth.onclick=()=>{register=!register;nameInput.classList.toggle("hidden",!register);authBtn.textContent=register?"إنشاء الحساب":"تسجيل الدخول";toggleAuth.textContent=register?"لدي حساب بالفعل":"إنشاء حساب جديد";authSub.textContent=register?"أنشئ حسابك الآن":"سجّل الدخول للمتابعة";authError.textContent="";};

authBtn.onclick=async()=>{
 authError.textContent="";
 try{
  if(register){
   const c=await createUserWithEmailAndPassword(auth,email.value.trim(),password.value);
   if(nameInput.value.trim())await updateProfile(c.user,{displayName:nameInput.value.trim()});
   await set(ref(db,`users/${c.user.uid}/profile`),{uid:c.user.uid,email:c.user.email,displayName:c.user.displayName||nameInput.value.trim()||"",createdAt:Date.now()});
  }else await signInWithEmailAndPassword(auth,email.value.trim(),password.value);
 }catch(e){authError.textContent=mapError(e);}
};
function mapError(e){const c=e?.code||"";return c.includes("invalid-credential")?"بيانات الدخول غير صحيحة.":c.includes("email-already")?"البريد مستخدم مسبقاً.":c.includes("weak-password")?"كلمة المرور ضعيفة.":e?.message||"حدث خطأ.";}

onAuthStateChanged(auth,async user=>{
 if(user){authView.classList.add("hidden");appView.classList.remove("hidden");statusEl.textContent="متصل";await loadProfileAndHistory(user);}
 else{appView.classList.add("hidden");authView.classList.remove("hidden");}
});
async function loadProfileAndHistory(user){
 history=[];chat.innerHTML=`<section id="empty" class="welcome"><div class="orb">✦</div><h1>مرحباً ${esc(user.displayName||"بك")}</h1><p>هذه مساحة خاصة بحسابك.</p></section>`;
 const snap=await get(ref(db,`users/${user.uid}/chats`));const v=snap.val()||{};
 Object.values(v).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).slice(-40).forEach(x=>{add("user",x.userText);add("ai",x.assistantText);history.push({role:"user",text:x.userText},{role:"assistant",text:x.assistantText});});
}

form.onsubmit=async e=>{
 e.preventDefault();const msg=input.value.trim();const user=auth.currentUser;if(!msg||!user||send.disabled)return;
 add("user",msg);history.push({role:"user",text:msg});input.value="";input.style.height="auto";busy(true);const b=add("ai","",true);let full="";
 try{
  const token=await user.getIdToken();
  const r=await fetch("/api/chat/stream",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({message:msg,history})});
  if(!r.ok){const x=await r.json();throw Error(x.error||"فشل الاتصال");}
  const reader=r.body.getReader(),decoder=new TextDecoder();let buf="";
  while(true){const {value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const evs=buf.split("\n\n");buf=evs.pop();for(const ev of evs){const line=ev.split("\n").find(x=>x.startsWith("data: "));if(!line)continue;const d=JSON.parse(line.slice(6));if(d.type==="delta"){full+=d.text;b.textContent=full;chat.scrollTop=chat.scrollHeight}if(d.type==="error")throw Error(d.error);}}
  b.classList.remove("streaming");history.push({role:"assistant",text:full});
 }catch(err){b.classList.remove("streaming");b.textContent="حدث خطأ: "+err.message;}
 finally{busy(false);input.focus();}
};

input.oninput=()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,170)+"px";};
input.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();form.requestSubmit();}};
document.querySelectorAll(".chips button").forEach(x=>x.onclick=()=>{input.value=x.textContent;input.focus();});
document.querySelector("#logout").onclick=()=>signOut(auth);
document.querySelector("#newChat").onclick=()=>{history=[];chat.innerHTML=`<section id="empty" class="welcome"><div class="orb">✦</div><h1>محادثة جديدة</h1><p>اكتب رسالتك للبدء.</p></section>`;};
document.querySelector("#memoryBtn").onclick=async()=>{panel.classList.remove("hidden");await loadMemory();};
document.querySelector("#closeMemory").onclick=()=>panel.classList.add("hidden");
document.querySelector("#saveMemory").onclick=async()=>{const x=document.querySelector("#memoryInput"),t=x.value.trim(),u=auth.currentUser;if(!t||!u)return;const r=push(ref(db,`users/${u.uid}/memories`));await set(r,{text:t,createdAt:Date.now(),source:"manual"});x.value="";loadMemory();};
async function loadMemory(){const u=auth.currentUser;if(!u)return;const snap=await get(ref(db,`users/${u.uid}/memories`));const v=snap.val()||{};memoryList.innerHTML=Object.entries(v).map(([id,m])=>`<div class="memoryItem"><button class="delete" data-id="${id}">حذف</button>${esc(m.text)}<small>${m.source==="automatic"?"تلقائية":"يدوية"} · ${new Date(m.createdAt||Date.now()).toLocaleString("ar-IQ")}</small></div>`).join("")||"<p class='hint'>لا توجد ذكريات.</p>";memoryList.querySelectorAll(".delete").forEach(b=>b.onclick=async()=>{await remove(ref(db,`users/${u.uid}/memories/${b.dataset.id}`));loadMemory();});}
