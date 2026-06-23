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
// dHash
// =====================
async function dHash(file){

    return new Promise(resolve => {

        const img = new Image();

        img.onload = () => {

            const canvas =
                document.createElement("canvas");

            canvas.width = 9;
            canvas.height = 8;

            const ctx =
                canvas.getContext("2d");

            ctx.drawImage(
                img,
                0,
                0,
                9,
                8
            );

            const pixels =
                ctx.getImageData(
                    0,
                    0,
                    9,
                    8
                ).data;

            let hash = "";

            for(let y = 0; y < 8; y++){

                for(let x = 0; x < 8; x++){

                    const left =
                        ((y * 9) + x) * 4;

                    const right =
                        ((y * 9) + x + 1) * 4;

                    const leftGray =
                        pixels[left] +
                        pixels[left+1] +
                        pixels[left+2];

                    const rightGray =
                        pixels[right] +
                        pixels[right+1] +
                        pixels[right+2];

                    hash +=
                        leftGray > rightGray
                        ? "1"
                        : "0";
                }
            }

            resolve(hash);
        };

        img.src =
            URL.createObjectURL(file);
    });
}

function hammingDistance(a, b){

    if(!a || !b) return 999;

    let distance = 0;

    for(let i = 0; i < a.length; i++){

        if(a[i] !== b[i]){
            distance++;
        }
    }

    return distance;
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
        
        const phash =
            await dHash(file);

        const { data, error } =
            await supabase
            .from("images")
            .select(
                "id, hash, phash"
            );

        if(error){

            console.error(error);
            continue;
        }

        let exists = false;
        let similar = false;

        let similarityPercent = 0;

        for(const row of data){

            // точное совпадение
            if(row.hash === hash){

                exists = true;
                break;
            }

            // похожее изображение
            if(row.phash){

                const distance =
                    hammingDistance(
                        phash,
                        row.phash
                    );

                const percent =
                    Math.round(
                        (1 - distance / 64) * 100
                    );

                if(percent > similarityPercent){
                    similarityPercent = percent;
                }

                if(distance <= 10){

                    similar = true;
                }
            }
        }

        checkedFiles.push({

            file,
            hash,
            phash,
            exists: exists || similar

        });

        let statusClass = "good";
        let statusText = "✅ Новая";

        if(exists){

            statusClass = "bad";
            statusText = "❌ Уже использована";

        }
        else if(similar){

            statusClass = "bad";

            statusText =
                `⚠️ Похожее изображение<br>
                Сходство: ${similarityPercent}%`;
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

        <div class="${statusClass}">
            ${statusText}
        </div>

    </div>

</div>
`;
    }
}

// =====================
// SAVE
// =====================
// =====================
// SAVE
// =====================
window.saveNewFiles = async function(){

    if(checkedFiles.length === 0){

        alert(
            "Сначала выполните проверку"
        );

        return;
    }

    const newFiles =
        checkedFiles.filter(
            x => !x.exists
        );

    if(newFiles.length === 0){

        alert(
            "Новых изображений нет"
        );

        return;
    }

    const confirmed = confirm(
        `Будет добавлено ${newFiles.length} изображений.\n\nПродолжить?`
    );

    if(!confirmed){
        return;
    }

    
    let count = 0;

    for(const item of newFiles){

        const { error } =
            await supabase
            .from("images")
            .insert({

            hash: item.hash,

            phash: item.phash,

            filename:
                item.file.name

        });

        if(error){

            console.error(error);

        } else {

            count++;
        }
    }

    checkedFiles = [];
    selectedFiles = [];

    fileInput.value = "";

    fileCount.textContent =
        "Файлы не выбраны";

    alert(
        `Успешно добавлено: ${count}`
    );
}

});