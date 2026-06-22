
document.addEventListener("DOMContentLoaded", () => {

// =====================
// SUPABASE INIT
// =====================
const SUPABASE_URL =
"https://tpxpsalgvjoemldlnozj.supabase.co";

const SUPABASE_KEY =
"sb_publishable_gCK8qSuVmAZ8OqMoqhWNqw_d1pdpPYR";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// =====================
// DOM ELEMENTS
// =====================
const fileInput = document.getElementById("files");
const dropZone = document.getElementById("dropZone");
const table = document.getElementById("results");
const userInput = document.getElementById("user");

// локальное хранение файлов (ВАЖНО)
let selectedFiles = [];
let checkedFiles = [];

// =====================
// DROP ZONE EVENTS
// =====================
dropZone.addEventListener("click", () => {
    fileInput.click();
});

dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("drag");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag");
});

dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("drag");

    selectedFiles = [...e.dataTransfer.files];

    alert("Файлов добавлено: " + selectedFiles.length);
});

// =====================
// HASH FUNCTION
// =====================
async function sha256(file){

    const buffer = await file.arrayBuffer();

    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        buffer
    );

    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2,"0"))
        .join("");
}

// =====================
// CHECK FILES
// =====================
window.checkFiles = async function(){

    const files = selectedFiles.length
        ? selectedFiles
        : fileInput.files;

    if(!files.length){
        alert("Выберите файлы");
        return;
    }

    table.innerHTML = `
        <tr>
            <th>Файл</th>
            <th>Статус</th>
        </tr>
    `;

    checkedFiles = [];

    for(const file of files){

        const hash = await sha256(file);

        const { data, error } = await supabase
            .from("images")
            .select("id")
            .eq("hash", hash)
            .limit(1);

        const exists = data && data.length > 0;

        checkedFiles.push({
            file,
            hash,
            exists
        });

        table.innerHTML += `
            <tr>
                <td>${file.name}</td>
                <td class="${exists ? "bad" : "good"}">
                    ${exists ? "❌ Уже использована" : "✅ Новая"}
                </td>
            </tr>
        `;
    }
}

// =====================
// SAVE NEW FILES
// =====================
window.saveNewFiles = async function(){

    if(!checkedFiles.length){
        alert("Сначала выполните проверку");
        return;
    }

    const user = userInput.value || "Unknown";

    let count = 0;

    for(const item of checkedFiles){

        if(item.exists) continue;

        const { error } = await supabase
            .from("images")
            .insert({
                hash: item.hash,
                filename: item.file.name,
                user_name: user
            });

        if(!error) count++;
    }

    alert("Добавлено: " + count);
}

});