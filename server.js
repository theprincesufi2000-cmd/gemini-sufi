import express from "express";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

dotenv.config();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const PORT=Number(process.env.PORT||3000), HOST=process.env.HOST||"0.0.0.0";
const MODEL=process.env.GEMINI_MODEL||"gemini-3.5-flash";
const RULES=path.join(__dirname,"rules.txt");

function serviceAccount(){
  if(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64){
    return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,"base64").toString("utf8"));
  }
  const p=process.env.FIREBASE_SERVICE_ACCOUNT_JSON||"./firebase/service-account.json";
  return JSON.parse(require("fs").readFileSync(path.resolve(__dirname,p),"utf8"));
}
if(!getApps().length){
  initializeApp({
    credential: cert(serviceAccount()),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://gemini-ff6e0-default-rtdb.firebaseio.com"
  });
}
const db=getDatabase();
const {getAuth}=await import("firebase-admin/auth");
const adminAuth=getAuth();
const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY||""});

app.use(express.json({limit:"2mb"}));
app.use(express.static(path.join(__dirname,"public")));

async function readRules(){try{return await fs.readFile(RULES,"utf8")}catch{return ""}}

async function authMiddleware(req,res,next){
  try{
    const h=req.headers.authorization||"";
    if(!h.startsWith("Bearer ")) return res.status(401).json({error:"غير مصادق عليه"});
    const token=h.slice(7);
    req.user=await adminAuth.verifyIdToken(token);
    next();
  }catch(e){return res.status(401).json({error:"جلسة Firebase غير صالحة أو منتهية"});}
}

function cleanHistory(h){
  return (Array.isArray(h)?h:[]).slice(-30).map(x=>({
    role:x.role==="assistant"?"model":"user",
    parts:[{text:String(x.text||"").slice(0,12000)}]
  }));
}
async function getMemories(uid){
  const snap=await db.ref(`users/${uid}/memories`).get();
  const v=snap.val()||{};
  return Object.entries(v).map(([id,x])=>({id,...x})).slice(-200);
}
function memoryText(mem){
  return mem.length?mem.map(m=>`[${m.id}] ${m.text}`).join("\n"):"لا توجد ذكريات محفوظة.";
}

app.get("/api/health",(_req,res)=>res.json({ok:true,model:MODEL,firebase:true,time:new Date().toISOString()}));

app.post("/api/chat/stream",authMiddleware,async(req,res)=>{
  if(!process.env.GEMINI_API_KEY)return res.status(500).json({error:"GEMINI_API_KEY غير مضبوط"});
  const message=String(req.body?.message||"").trim();
  if(!message)return res.status(400).json({error:"الرسالة فارغة"});
  const memories=await getMemories(req.user.uid);
  const contents=[...cleanHistory(req.body?.history),{role:"user",parts:[{text:message}]}];
  res.setHeader("Content-Type","text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control","no-cache, no-transform");
  res.setHeader("Connection","keep-alive");
  res.flushHeaders?.();
  const send=o=>res.write(`data: ${JSON.stringify(o)}\n\n`);
  try{
    send({type:"meta",model:MODEL});
    const system=`${await readRules()}

=== بيانات المستخدم ===
UID: ${req.user.uid}
Email: ${req.user.email||"غير متاح"}

=== الذاكرة طويلة الأمد الخاصة بهذا المستخدم ===
${memoryText(memories)}

استخدم هذه البيانات فقط لهذا المستخدم ولا تكشفها للمستخدمين الآخرين.`;
    const stream=await ai.models.generateContentStream({
      model:MODEL,contents,
      config:{systemInstruction:system}
    });
    let full="";
    for await(const chunk of stream){
      const text=chunk.text||"";
      if(text){full+=text;send({type:"delta",text});}
    }
    send({type:"done",text:full});res.end();
    await saveChat(req.user.uid,message,full);
    await extractMemory(req.user.uid,message,full,memories);
  }catch(e){console.error(e);send({type:"error",error:e?.message||"فشل الرد"});res.end();}
});

async function saveChat(uid,userText,assistantText){
  const r=db.ref(`users/${uid}/chats`).push();
  await r.set({createdAt:Date.now(),userText,assistantText});
}

async function extractMemory(uid,user,assistant,current){
  try{
    const schema={type:"object",properties:{actions:{type:"array",items:{type:"object",properties:{
      action:{type:"string",enum:["save","update","delete","none"]},
      id:{type:["string","null"]},text:{type:["string","null"]}
    },required:["action","id","text"]}}},required:["actions"]};
    const prompt=`استخرج فقط المعلومات المفيدة على المدى الطويل لهذا المستخدم.
لا تحفظ الأسرار أو كلمات المرور أو مفاتيح API أو معلومات حساسة.
save لمعلومة جديدة، update لتصحيح ذاكرة موجودة، delete فقط إذا طلب المستخدم الحذف بوضوح، وإلا none.

الرسالة:
${user}

الرد:
${assistant}

الذكريات:
${memoryText(current)}`;
    const r=await ai.models.generateContent({
      model:MODEL,contents:prompt,
      config:{responseMimeType:"application/json",responseSchema:schema}
    });
    const parsed=JSON.parse(r.text||'{"actions":[]}');
    for(const a of parsed.actions||[]){
      if(a.action==="save"&&a.text){
        const duplicate=current.some(m=>m.text?.trim().toLowerCase()===a.text.trim().toLowerCase());
        if(!duplicate)await db.ref(`users/${uid}/memories`).push().set({text:a.text.trim(),createdAt:Date.now(),source:"automatic"});
      }else if(a.action==="update"&&a.id&&a.text){
        if(current.some(m=>m.id===a.id))await db.ref(`users/${uid}/memories/${a.id}`).update({text:a.text.trim(),updatedAt:Date.now()});
      }else if(a.action==="delete"&&a.id){
        await db.ref(`users/${uid}/memories/${a.id}`).remove();
      }
    }
  }catch(e){console.warn("memory extraction:",e?.message)}
}

app.get("/api/user/memories",authMiddleware,async(req,res)=>{
  res.json(await getMemories(req.user.uid));
});
app.delete("/api/user/memories/:id",authMiddleware,async(req,res)=>{
  await db.ref(`users/${req.user.uid}/memories/${req.params.id}`).remove();
  res.json({ok:true});
});
app.post("/api/user/memories",authMiddleware,async(req,res)=>{
  const text=String(req.body?.text||"").trim();
  if(!text||text.length>2000)return res.status(400).json({error:"ذاكرة غير صالحة"});
  const r=db.ref(`users/${req.user.uid}/memories`).push();
  const item={text,createdAt:Date.now(),source:"manual"};
  await r.set(item);res.json({id:r.key,...item});
});
app.get("/api/user/chats",authMiddleware,async(req,res)=>{
  const snap=await db.ref(`users/${req.user.uid}/chats`).orderByChild("createdAt").limitToLast(50).get();
  const v=snap.val()||{};res.json(Object.entries(v).map(([id,x])=>({id,...x})));
});

app.listen(PORT,HOST,()=>console.log(`Gemini AI Pro V3: http://${HOST}:${PORT}`));
