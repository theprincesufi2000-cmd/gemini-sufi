# Gemini AI Pro V3 — Firebase

نسخة متعددة المستخدمين تعتمد على Firebase Authentication وRealtime Database.

## ما الجديد؟

- تسجيل دخول بالبريد وكلمة المرور.
- إنشاء حساب جديد.
- لكل مستخدم UID خاص.
- ملف profile داخل `users/{uid}/profile`.
- ذاكرة مستقلة داخل `users/{uid}/memories`.
- محادثات مستقلة داخل `users/{uid}/chats`.
- Firebase Security Rules تمنع المستخدم من قراءة بيانات مستخدم آخر.
- Backend يتحقق من Firebase ID Token باستخدام Firebase Admin.
- Gemini API key موجود في Backend فقط.
- Streaming حقيقي من Gemini.
- استخراج ذاكرة تلقائي بعد الرد.
- ذاكرة يدوية.
- Android package: `com.ai.sufi`.

## 1. Firebase

أنشئ/فعّل:
- Authentication → Email/Password
- Realtime Database
- ضع قواعد `firebase/database.rules.json` في Realtime Database Rules.

ملف `firebase/firebase-config.js` يحتوي إعدادات عميل Firebase التي زودتني بها.

## 2. Firebase Admin

من Firebase Console:
Project Settings → Service accounts → Generate new private key.

احفظ الملف محلياً باسم:

`firebase/service-account.json`

ولا ترفعه إلى GitHub. `.gitignore` يمنع ذلك.

## 3. البيئة

```bash
cp .env.example .env
npm install
npm start
```

ضع مفتاح Gemini في `.env`.

## 4. Android

```bash
npx cap add android
npx cap sync android
npx cap open android
```

مهم: الـAPK لا يحتوي GEMINI_API_KEY. يجب أن يكون Backend منشوراً على HTTPS في الإنتاج.

## 5. قاعدة البيانات

البنية:

users/
  UID/
    profile/
    memories/
      MEMORY_ID/
        text
        createdAt
        source
    chats/
      CHAT_ID/
        createdAt
        userText
        assistantText

## 6. ملاحظة أمنية

مفتاح Firebase Web API الظاهر في كود العميل ليس بديلاً عن Security Rules. الحماية الحقيقية لبيانات RTDB تأتي من Authentication + Rules. أما مفتاح Gemini فيجب أن يبقى في الخادم.

## 7. Google Sign-In

هذا الإصدار يستخدم Email/Password لأنه يعمل مباشرة في WebView/Capacitor دون إدخال OAuth native configuration. يمكن إضافة Google Sign-In لاحقاً باستخدام Capacitor native plugin، مع إعداد SHA-1/SHA-256 وOAuth في Firebase.
