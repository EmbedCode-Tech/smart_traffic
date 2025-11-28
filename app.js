// app.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAVWRJFpMoksy3PFetDie5hVXPI5tQJM4w",
  authDomain: "smart-traffic-c5998.firebaseapp.com",
  projectId: "smart-traffic-c5998",
  storageBucket: "smart-traffic-c5998.firebasestorage.app",
  messagingSenderId: "218505366734",
  appId: "1:218505366734:web:4beba71abf4f1df282d49f",
  measurementId: "G-QX4X5GD3WT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const usersCol = collection(db, "users");

/* ---------- DOM ---------- */
const registerForm = document.getElementById("registerForm");
const resultBox = document.getElementById("result");
const qrcodeWrap = document.getElementById("qrcode");
const docIdSpan = document.getElementById("docId");
const downloadBtn = document.getElementById("downloadQR");
const clearFormBtn = document.getElementById("clearForm");

const startScanBtn = document.getElementById("startScan");
const stopScanBtn = document.getElementById("stopScan");
const readerElem = document.getElementById("reader");
const verifyResult = document.getElementById("verifyResult");
const statusText = document.getElementById("statusText");
const detailsDiv = document.getElementById("details");

let qrcodeObj = null;
let html5QrcodeScanner = null;

/* ---------- Helpers ---------- */
function clearQRCode() {
  qrcodeWrap.innerHTML = "";
  docIdSpan.textContent = "";
  resultBox.classList.add("hidden");
}

function dataToHTML(data){
  return `
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Vehicle:</strong> ${data.vehicle}</p>
    <p><strong>License:</strong> ${data.license}</p>
    <p><strong>Insurance Expiry:</strong> ${data.expiry}</p>
    <p><strong>PUC Number:</strong> ${data.pucNumber}</p>
    <p><strong>PUC Expiry:</strong> ${data.pucExpiry}</p>
  `;
}

/* ---------- Register & Generate QR ---------- */
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const vehicle = document.getElementById("vehicle").value.trim();
  const license = document.getElementById("license").value.trim();
  const expiry = document.getElementById("expiry").value;

  const pucNumber = document.getElementById("pucNumber").value.trim();
  const pucExpiry = document.getElementById("pucExpiry").value;

  if (!name || !vehicle || !license || !expiry || !pucNumber || !pucExpiry)
    return alert("Please fill all fields.");

  // Save to Firestore
  try {
    const docRef = await addDoc(usersCol, {
      name,
      vehicle,
      license,
      expiry,
      pucNumber,
      pucExpiry,
      createdAt: new Date().toISOString()
    });

    const id = docRef.id;
    clearQRCode();

    qrcodeObj = new QRCode(qrcodeWrap, {
      text: id,
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.H
    });

    docIdSpan.textContent = id;
    resultBox.classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert("Error saving data. Check console.");
  }
});

/* ---------- Clear Form ---------- */
clearFormBtn.addEventListener("click", () => {
  registerForm.reset();
  clearQRCode();
});

/* ---------- Download QR ---------- */
downloadBtn.addEventListener("click", () => {
  const img = qrcodeWrap.querySelector("img") || qrcodeWrap.querySelector("canvas");
  if (!img) return alert("No QR generated yet.");

  const a = document.createElement("a");
  a.href = img.tagName.toLowerCase() === "img" ? img.src : img.toDataURL("image/png");
  a.download = `qr_${docIdSpan.textContent}.png`;
  a.click();
});

/* ---------- Verification Scanner ---------- */
startScanBtn.addEventListener("click", async () => {
  startScanBtn.disabled = true;
  stopScanBtn.disabled = false;

  verifyResult.classList.add("hidden");
  statusText.textContent = "Scanning...";
  detailsDiv.innerHTML = "";

  html5QrcodeScanner = new Html5Qrcode("reader");

  const config = { fps: 10, qrbox: { width: 300, height: 300 } };

  try {
    await html5QrcodeScanner.start(
      { facingMode: "environment" },
      config,
      async (decodedText) => {
        await html5QrcodeScanner.stop();
        startScanBtn.disabled = false;
        stopScanBtn.disabled = true;

        checkDocumentId(decodedText);
      }
    );
  } catch (err) {
    console.error("Scanner error:", err);
    alert("Camera permission denied or unavailable.");
    startScanBtn.disabled = false;
    stopScanBtn.disabled = true;
  }
});

stopScanBtn.addEventListener("click", async () => {
  if (html5QrcodeScanner) {
    try { await html5QrcodeScanner.stop(); } catch {}
  }
  startScanBtn.disabled = false;
  stopScanBtn.disabled = true;
  statusText.textContent = "Scanner stopped.";
});

/* ---------- Check Firestore ---------- */
async function checkDocumentId(docId) {
  verifyResult.classList.remove("hidden");
  statusText.textContent = "Checking...";

  try {
    const dRef = doc(db, "users", docId);
    const snap = await getDoc(dRef);

    if (snap.exists()) {
      const data = snap.data();
      statusText.innerHTML = `<span style="color:#16a34a">VALID</span>`;
      detailsDiv.innerHTML = dataToHTML(data);
    } else {
      statusText.innerHTML = `<span style="color:#ef4444">INVALID</span>`;
      detailsDiv.innerHTML = `<p>No record found for ID: <strong>${docId}</strong></p>`;
    }
  } catch (err) {
    console.error(err);
    statusText.textContent = "Error checking database.";
  }
}
