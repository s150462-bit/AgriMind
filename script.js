const libStatus = document.getElementById("libStatus");
const loadModelBtn = document.getElementById("loadModelBtn");
const modelStatus = document.getElementById("modelStatus");
const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const predictBtn = document.getElementById("predictBtn");
const resultEl = document.getElementById("result");
const probsEl = document.getElementById("probs");
const planEl = document.getElementById("plan");

let model, maxPredictions, labels = [];

// Wait for tmImage
(function waitForTM() {
    if (window.tmImage && window.tmImage.load) {
        libStatus.textContent = "📦 مكتبة TM جاهزة ✔";
        loadModelBtn.disabled = false;
    } else {
        libStatus.textContent = "⏳ تحميل مكتبة TM...";
        setTimeout(waitForTM, 200);
    }
})();

async function loadModel() {
    const URL = document.getElementById("modelUrl").value.trim();
    if (!URL.endsWith("/")) {
        alert("يجب أن ينتهي رابط TM بـ /");
        return;
    }

    try {
        modelStatus.textContent = "⏳ جاري تحميل النموذج...";
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        maxPredictions = model.getTotalClasses();
        labels = model.getClassLabels();

        modelStatus.textContent = "✔ تم تحميل النموذج بنجاح!";
        predictBtn.disabled = false;
    } catch (err) {
        modelStatus.textContent = "❌ خطأ في تحميل النموذج";
        console.error(err);
    }
}

loadModelBtn.addEventListener("click", loadModel);

// Preview image
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    preview.src = URL.createObjectURL(file);
});

// Predict
predictBtn.addEventListener("click", async () => {
    if (!model) return alert("حمّلي النموذج أولاً");

    const prediction = await model.predict(preview);

    let resultText = "";
    let probsText = "";

    prediction.forEach((p) => {
        probsText += `${p.className}: ${(p.probability * 100).toFixed(1)}%<br>`;
    });

    const best = prediction.reduce((a, b) => (a.probability > b.probability ? a : b));
    resultText = best.className;

    resultEl.innerHTML = resultText;
    probsEl.innerHTML = probsText;

    // علاج مقترح
    if (best.className === "Healthy_Plant") {
        planEl.textContent = "🌿 النبات سليم ✔ — لا يحتاج علاج.";
    } else if (best.className === "Diseased_Plant") {
        planEl.textContent = "⚠ النبات مريض — يفضل رش مبيد فطري مناسب ومعالجة الري والتربة.";
    } else {
        planEl.textContent = "❓ غير معروف — يرجى رفع صورة أوضح.";
    }
});
