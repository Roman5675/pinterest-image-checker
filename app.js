const API_URL =
"https://script.google.com/macros/s/AKfycbyFNpkRg8mGW7gd7E4T3AOaYyo1ffMZdhv7Ckvh9xVqwQ2eNuNdrCmFnvdfz_1zHETk/exec";

const fileInput =
document.getElementById("files");

const dropZone =
document.getElementById("dropZone");

let checkedFiles = [];

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

fileInput.files =
    e.dataTransfer.files;

});

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

async function checkFiles(){

const files =
    fileInput.files;

if(files.length === 0){
    alert("Выберите файлы");
    return;
}

const table =
    document.getElementById("results");

table.innerHTML =
`
<tr>
    <th>Файл</th>
    <th>Статус</th>
</tr>
`;

checkedFiles = [];

const hashes =
    await fetch(API_URL)
    .then(r => r.json());

for(const file of files){

    const hash =
        await sha256(file);

    const exists =
        hashes.includes(hash);

    checkedFiles.push({
        file,
        hash,
        exists
    });

    table.innerHTML +=
    `
    <tr>
        <td>${file.name}</td>
        <td class="${
            exists ? "bad" : "good"
        }">
            ${
                exists
                ? "❌ Уже использована"
                : "✅ Новая"
            }
        </td>
    </tr>
    `;
}

}

async function saveNewFiles(){

if(checkedFiles.length === 0){
    alert("Сначала выполните проверку");
    return;
}

const user =
    document.getElementById("user")
    .value || "Unknown";

let count = 0;

for(const item of checkedFiles){

    if(item.exists)
        continue;

    await fetch(API_URL,{
        method:"POST",
        body:JSON.stringify({
            hash:item.hash,
            fileName:item.file.name,
            user:user
        })
    });

    count++;
}

alert(
    "Добавлено: " + count
);

}