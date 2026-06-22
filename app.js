const API_URL =
"https://script.google.com/macros/s/AKfycbyGSugGmzHlFHDmLj_Pe8YqYfbpTTM8HCPhLDSVI9PfLIW6VjlOekcy1pSywyQDviW2/exec";

let currentHash = "";
let currentFile = "";

async function sha256(file) {

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
        .map(b =>
            b.toString(16)
             .padStart(2,"0"))
        .join("");
}

async function checkImage() {

    const file =
      document.getElementById("file")
      .files[0];

    if(!file){
        alert("Выберите файл");
        return;
    }

    currentHash =
        await sha256(file);

    currentFile =
        file.name;

    const hashes =
        await fetch(API_URL)
        .then(r=>r.json());

    const exists =
        hashes.includes(currentHash);

    const result =
      document.getElementById("result");

    const saveBtn =
      document.getElementById("saveBtn");

    if(exists){

        result.innerHTML =
          "❌ Уже использовалась";

        saveBtn.style.display =
          "none";

    }else{

        result.innerHTML =
          "✅ Свободна";

        saveBtn.style.display =
          "inline-block";
    }
}

async function saveImage() {

    const user =
      document.getElementById("user")
      .value || "Unknown";

    await fetch(API_URL,{
        method:"POST",
        body:JSON.stringify({
            hash:currentHash,
            fileName:currentFile,
            user:user
        })
    });

    document
      .getElementById("result")
      .innerHTML =
      "✅ Сохранено";

    document
      .getElementById("saveBtn")
      .style.display =
      "none";
}