document.addEventListener("DOMContentLoaded", () => {

// =====================
// SUPABASE
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
// DOM
// =====================
const fileInput =
document.getElementById("files");

const dropZone =
document.getElementById("dropZone");

const table =
document.getElementById("results");

const userInput =
document.getElementById("user");

const fileCount =
document.getElementById("fileCount");

let selectedFiles = [];
let checkedFiles = [];

// =====================
// FILE PICKER
// =====================
dropZone.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {

    selectedFiles = [...fileInput.files];

    fileCount.textContent =
        `Выбрано файлов: ${selectedFiles.length}`;
});

// =====================
// DRAG & DROP
// =====================
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

    selectedFiles =
        [...e.dataTransfer.files];

    fileCount.textContent =
        `Выбрано файлов: ${selectedFiles.length}`;
});

// =====================
// SHA256
// =====================
async function sha256(file){

    const buffer =
        await file.arrayBuffer();

    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            buffer
        );

    return Array
        .from(
            new Uint8Array(hashBuffer)
        )
        .map(x =>
            x.toString(16)
             .padStart(2,"0")
        )
        .join("");
}

// =====================
// CHECK
// =====================
window.checkFiles = async function(){

    const files =
        selectedFiles.length
        ? selectedFiles
        : fileInput.files;

    if(!files.length){

        alert(
            "Выберите файлы"
        );

        return;
    }

    table.innerHTML = "";

    checkedFiles = [];

    for(const file of files){

        const hash =
            await sha256(file);

        const { data, error } =
            await supabase
            .from("images")
            .select(
                "id, user_name, created_at"
            )
            .eq("hash", hash)
            .limit(1);

        if(error){

            console.error(error);

            continue;
        }

        const exists =
            data &&
            data.length > 0;

        checkedFiles.push({

            file,
            hash,
            exists

        });

        let statusHtml = "";

        if(exists){

            const owner =
                data[0].user_name
                || "Неизвестно";

            const date =
                data[0].created_at
                ? new Date(
                    data[0].created_at
                  ).toLocaleDateString()
                : "";

            statusHtml =
            `
            ❌ Уже использована
            `;
        }
        else{

            statusHtml =
            `
            ✅ Новая
            `;
        }

        const previewUrl =
    URL.createObjectURL(file);

table.innerHTML += `
<div class="card">

    <img src="${previewUrl}">

    <div class="card-body">

        <div class="card-name">
            ${file.name}
        </div>

        <div class="${
            exists ? "bad" : "good"
        }">
            ${
                exists
                ? "❌ Уже использована" 
                : "✅ Новая"
            }
        </div>

    </div>

</div>
`;
    }
}

// =====================
// SAVE
// =====================
window.saveNewFiles = async function(){

    if(
        checkedFiles.length === 0
    ){

        alert(
            "Сначала выполните проверку"
        );

        return;
    }

    const user =
        userInput.value.trim()
        || "Unknown";

    let count = 0;

    for(const item of checkedFiles){

        if(item.exists)
            continue;

        const { error } =
            await supabase
            .from("images")
            .insert({

                hash:
                    item.hash,

                filename:
                    item.file.name,

                user_name:
                    user

            });

        if(!error){

            count++;
        }
        else{

            console.error(error);
        }
    }

    checkedFiles = [];

    alert(
        "Добавлено: "
        + count
    );
}

});