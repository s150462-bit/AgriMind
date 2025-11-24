// === Robust loader: wait for tmImage before enabling buttons ===
const libStatus = document.getElementById("libStatus");
const testBtn = document.getElementById("testBtn");
const loadModelBtn = document.getElementById("loadModelBtn");
const modelStatus = document.getElementById("modelStatus");
const testResults = document.getElementById("testResults");
const modelUrlEl = document.getElementById("modelUrl");
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const predictBtn = document.getElementById("predictBtn");
const resultEl = document.getElementById("result");
const probsEl = document.getElementById("probs");
const planEl = document.getElementById("plan");

let model, maxPredictions, labels = [];

// Wait loop for tmImage
(function waitForTm(){
  if (window.tmImage && window.tmImage.load) {
    libStatus.textContent = "مكتبة TM جاهزة ✓";
    testBtn.disabled = false;
    loadModelBtn.disabled = false;
  } else {
    libStatus.textContent = "جاري تحميل مكتبة TM…";
    setTimeout(waitForTm, 250);
  }
})();

function buildBase() {
  const base = (modelUrlEl.value || "").trim();
  if (!base) throw new Error("لم يتم إدخال رابط.");
  return base.endsWith("/") ? base : base + "/";
}

async function urlExists(url) {
  try { const res = await fetch(url, {method:"GET", mode:"cors"}); return res.ok; }
  catch(e){ return false; }
}

testBtn.addEventListener("click", async () => {
  testResults.textContent = "جاري اختبار الرابط…";
  const baseUrl = buildBase();
  const modelURL = baseUrl + "model.json";
  const metadataURL = baseUrl + "metadata.json";
  const [mOk, mdOk] = await Promise.all([urlExists(modelURL), urlExists(metadataURL)]);
  testResults.innerHTML = `model.json: ${mOk ? "✅" : "❌"}\nmetadata.json: ${mdOk ? "✅" : "❌"}\n${baseUrl}`.replaceAll("\n","<br>");
  if (!mOk || !mdOk) testResults.innerHTML += "<br><b>أعيدي التصدير واختاري TensorFlow.js ثم Upload my model.</b>";
});

loadModelBtn.addEventListener("click", async () => {
  try {
    const baseUrl = buildBase();
    const modelURL = baseUrl + "model.json";
    const metadataURL = baseUrl + "metadata.json";

    modelStatus.textContent = "جاري تحميل النموذج…";
    // fetch first to surface clearer errors
    const [mRes, mdRes] = await Promise.all([fetch(modelURL), fetch(metadataURL)]);
    if (!mRes.ok || !mdRes.ok) throw new Error("ملفات النموذج غير متاحة.");
    // Now load via tmImage
    const tm = window.tmImage;
    model = await tm.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    labels = model.getClassLabels ? model.getClassLabels() : Array.from({length:maxPredictions}, (_,i)=>"Class "+(i+1));
    modelStatus.textContent = `تم التحميل ✓ — الفئات: ${labels.join(", ")}`;
    predictBtn.disabled = false;
  } catch (e) {
    modelStatus.textContent = "تعذّر تحميل النموذج: " + (e && e.message ? e.message : e);
  }
});

// Preview
imageInput.addEventListener("change", e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  preview.src = URL.createObjectURL(f);
});

// Plans
const PLANS = {
  "Healthy": {
    en: "**Status: Healthy**\n• Maintain moderate irrigation; allow the top 2–3 cm of soil to dry before the next watering.\n• Provide bright, indirect light and adequate air circulation.\n• Gently dust leaves and monitor for early signs of pests or nutrient stress.\n• Apply a balanced fertilizer at low dose every 3–4 weeks as appropriate.",
    ar: "**الحالة: سليمة**\n• حافظي على ري معتدل، واتركي السطح 2–3 سم من التربة ليجف قبل الري التالي.\n• وفّري ضوءًا ساطعًا غير مباشر مع تهوية مناسبة.\n• نظّفي الأوراق برفق وراقبي العلامات المبكرة للآفات أو نقص العناصر.\n• استخدمي سمادًا متوازنًا بجرعة خفيفة كل 3–4 أسابيع حسب النوع."
  },
  "Sick": {
    en: "**Diagnosis:** Plant stress (possible overwatering, poor ventilation, nutrient imbalance, or pests).\n\n**Treatment:**\n• Reduce watering; allow soil to dry slightly between sessions.\n• Indirect sunlight + proper air circulation.\n• Inspect for pests; remove manually or use a mild organic pesticide.\n• Prune affected leaves with disinfected scissors.\n• If fungal, apply diluted fungicide or neem/vinegar solution.\n\n**Prevention:** Monitor moisture, ensure light, and apply balanced fertilizer monthly; avoid overwatering and overcrowding.",
    ar: "**التشخيص:** إجهاد نباتي (قد يكون من زيادة الري، ضعف التهوية، اختلال العناصر، أو الآفات).\n\n**العلاج:**\n• قلّلي الري ودَعي التربة تجف قليلًا بين الريّات.\n• وفّري ضوءًا غير مباشر مع تهوية جيدة.\n• افحصي الآفات وأزيليها يدويًا أو بمبيد عضوي لطيف.\n• قصّي الأوراق المصابة بمقص معقّم.\n• عند الاشتباه بالفطريات، استخدمي مبيدًا فطريًا مخففًا أو زيت النيم/خل مخفف.\n\n**الوقاية:** راقبي الرطوبة، ووفّري ضوءًا كافيًا، وسمادًا متوازنًا شهريًا؛ وتجنّبي الإفراط في الري والازدحام."
  },
  "__DEFAULT__": {
    en: "**General Guidance:**\n• Check soil moisture; avoid waterlogging.\n• Provide indirect light and ventilation.\n• Inspect for pests; wash gently or use mild organic pesticide.\n• Prune damaged tissue with disinfected tools.",
    ar: "**إرشادات عامة:**\n• افحصي رطوبة التربة وتجنّبي التشبع بالماء.\n• وفّري ضوءًا غير مباشر وتهوية.\n• افحصي الآفات وعالجيها بغسل لطيف أو مبيد عضوي.\n• أزيلي الأنسجة التالفة بأداة معقمة."
  }
};

document.getElementById("predictBtn").addEventListener("click", async () => {
  if (!model) return alert("حمّلي النموذج أولاً.");
  if (!preview.src) return alert("ارفعي صورة أولاً.");
  try {
    const predictions = await model.predict(preview);
    predictions.sort((a,b)=>b.probability - a.probability);
    const top = predictions[0];
    resultEl.innerHTML = `<div class="badge">${top.className}</div><div class="conf">Confidence: ${(top.probability*100).toFixed(1)}%</div>`;
    probsEl.innerHTML = predictions.map(p=>`<div class="row"><span>${p.className}</span><span>${(p.probability*100).toFixed(1)}%</span></div>`).join("");
    const plan = PLANS[top.className] || PLANS["__DEFAULT__"];
    planEl.innerHTML = `<div class="plan-block"><h3>English</h3><pre>${plan.en}</pre></div><div class="plan-block"><h3>العربية</h3><pre>${plan.ar}</pre></div>`;
  } catch(e){
    resultEl.textContent = "خطأ أثناء التنبؤ: " + (e && e.message ? e.message : e);
  }
});
