// ===================== app.js (ES-модуль) =====================
import { pipeline, RawImage } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const SUPABASE_URL = "https://tpxpsalgvjoemldlnozj.supabase.co";
const SUPABASE_KEY = "sb_publishable_gCK8qSuVmAZ8OqMoqhWNqw_d1pdpPYR";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fileInput = document.getElementById("files");
const dropZone = document.getElementById("dropZone");
const table = document.getElementById("results");
const fileCount = document.getElementById("fileCount");

let selectedFiles = [];
let checkedFiles = [];
let DB_CACHE = [];
let clipPipeline = null;

// Инициализация CLIP для изображений
async function initClip() {
    console.log("⏳ Loading CLIP model...");
    clipPipeline = await pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");
    console.log("✅ CLIP model ready");
}
initClip();

// SHA-256
async function sha256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// dHash
async function dHash(file) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 9; canvas.height = 8;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 9, 8);
            const pixels = ctx.getImageData(0, 0, 9, 8).data;
            let hash = "";
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const i1 = (y * 9 + x) * 4;
                    const i2 = (y * 9 + x + 1) * 4;
                    const g1 = pixels[i1] * 0.299 + pixels[i1 + 1] * 0.587 + pixels[i1 + 2] * 0.114;
                    const g2 = pixels[i2] * 0.299 + pixels[i2 + 1] * 0.587 + pixels[i2 + 2] * 0.114;
                    hash += g1 > g2 ? "1" : "0";
                }
            }
            resolve(hash);
        };
        img.src = URL.createObjectURL(file);
    });
}

function hammingDistance(a, b) {
    if (!a || !b) return 999;
    let d = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
}

// CLIP-эмбеддинг
async function getClipEmbedding(file) {
    if (!clipPipeline) throw new Error("CLIP pipeline not loaded");
    try {
        const image = await RawImage.read(URL.createObjectURL(file));
        const output = await clipPipeline(image);
        return Array.from(output.data);
    } catch (e) {
        console.error("CLIP error:", e);
        return [];
    }
}

// Загрузка базы Supabase
async function loadDB() {
    const { data, error } = await supabase
        .from("images")
        .select("id, hash, phash, clip_embedding");
    if (error) {
        console.error(error);
        return [];
    }
    return data;
}

// Обработчики выбора файлов
fileInput.addEventListener("change", () => {
    selectedFiles = Array.from(fileInput.files);
    updateFileCount();
});

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("drag");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag");
    if (e.dataTransfer.files.length) {
        selectedFiles = Array.from(e.dataTransfer.files);
        updateFileCount();
    }
});

function updateFileCount() {
    fileCount.textContent = selectedFiles.length
        ? `Выбрано файлов: ${selectedFiles.length}`
        : "Файлы не выбраны";
}

// Проверка файлов
window.checkFiles = async function () {
    const files = selectedFiles.length ? selectedFiles : fileInput.files;
    if (!files.length) {
        alert("Выберите файлы");
        return;
    }

    table.innerHTML = "";
    checkedFiles = [];
    DB_CACHE = await loadDB();

    for (const file of files) {
        const hash = await sha256(file);
        const phash = await dHash(file);
        const clipVec = await getClipEmbedding(file);

        let exists = false;
        let similar = false;
        for (const row of DB_CACHE) {
            if (row.hash === hash) {
                exists = true;
                break;
            }
            if (row.phash) {
                const dist = hammingDistance(phash, row.phash);
                if (dist <= 10) similar = true;
            }
        }

        checkedFiles.push({ file, hash, phash, clipVec, exists, similar });

        // Определяем текст и класс для статуса
        let statusText = "";
        let statusClass = "";
        if (exists) {
            statusText = "❌ уже используется";
            statusClass = "bad";   // красный цвет
        } else if (similar) {
            statusText = "⚠️ похоже";
            statusClass = "bad";   // тоже красный (или можно убрать, если нужен обычный)
        } else {
            statusText = "✅ новое";
            statusClass = "good";  // зелёный цвет
        }

        const url = URL.createObjectURL(file);
        table.innerHTML += `
        <div class="card">
            <img src="${url}">
            <div class="card-body">
                <div class="card-name">${file.name}</div>
                <span class="${statusClass}">${statusText}</span>
            </div>
        </div>`;
    }
};

// Сохранение с подтверждением
window.saveNewFiles = async function () {
    const newFiles = checkedFiles.filter(x => !x.exists);
    if (!newFiles.length) {
        alert("Нет новых файлов для сохранения");
        return;
    }

    const confirmed = confirm(`Вы точно хотите сохранить ${newFiles.length} новых файлов?`);
    if (!confirmed) return;

    for (const item of newFiles) {
        await supabase.from("images").insert({
            hash: item.hash,
            phash: item.phash,
            clip_embedding: item.clipVec,
            filename: item.file.name
        });
    }

    alert("Сохранено: " + newFiles.length);
    selectedFiles = [];
    checkedFiles = [];
    fileInput.value = "";
    fileCount.textContent = "Файлы не выбраны";
    table.innerHTML = "";
};