// app.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
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
    <p><strong>Insurance expiry:</strong> ${data.expiry}</p>
  `;
}

/* ---------- Register & Generate QR ---------- */
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const vehicle = document.getElementById("vehicle").value.trim();
  const license = document.getElementById("license").value.trim();
  const expiry = document.getElementById("expiry").value;

  if (!name || !vehicle || !license || !expiry) return alert("Please fill all fields.");

  // Save to Firestore
  try {
    const docRef = await addDoc(usersCol, {
      name, vehicle, license, expiry, createdAt: new Date().toISOString()
    });

    // Show QR (we keep QR content as the doc id)
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

clearFormBtn.addEventListener("click", () => {
  registerForm.reset();
  clearQRCode();
});

/* ---------- Download QR (as image) ---------- */
downloadBtn.addEventListener("click", () => {
  // QRCode.js uses an inner <img> or <canvas> depending on browser
  const img = qrcodeWrap.querySelector("img") || qrcodeWrap.querySelector("canvas");
  if (!img) return alert("No QR generated yet.");
  // If it's an <img>:
  if (img.tagName.toLowerCase() === "img") {
    const src = img.src;
    const a = document.createElement("a");
    a.href = src;
    a.download = `qr_${docIdSpan.textContent}.png`;
    a.click();
  } else {
    // canvas
    const dataUrl = img.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr_${docIdSpan.textContent}.png`;
    a.click();
  }
});

/* ---------- Verification (Scanner) ---------- */
startScanBtn.addEventListener("click", async () => {
  startScanBtn.disabled = true;
  stopScanBtn.disabled = false;
  verifyResult.classList.add("hidden");
  statusText.textContent = "Scanning...";
  detailsDiv.innerHTML = "";

  // Create scanner
  html5QrcodeScanner = new Html5Qrcode("reader");

  const config = { fps: 10, qrbox: { width: 300, height: 300 } };

  try {
    await html5QrcodeScanner.start(
      { facingMode: "environment" },
      config,
      async (decodedText, decodedResult) => {
        // decodedText is the string inside QR (we used docId)
        // Stop scanner after successful read
        await html5QrcodeScanner.stop();
        startScanBtn.disabled = false;
        stopScanBtn.disabled = true;

        checkDocumentId(decodedText);
      },
      (errorMessage) => {
        // scanning in progress — can show progress if needed
        // console.log("scan", errorMessage);
      }
    );
  } catch (err) {
    console.error("Scanner start error:", err);
    alert("Unable to start camera. Allow camera permission and try again.");
    startScanBtn.disabled = false;
    stopScanBtn.disabled = true;
  }
});

stopScanBtn.addEventListener("click", async () => {
  if (html5QrcodeScanner) {
    try {
      await html5QrcodeScanner.stop();
    } catch (e) {
      console.warn(e);
    }
  }
  startScanBtn.disabled = false;
  stopScanBtn.disabled = true;
  statusText.textContent = "Scanner stopped.";
});

/* ---------- Check Firestore for docId ---------- */
async function checkDocumentId(docId) {
  verifyResult.classList.remove("hidden");
  statusText.textContent = "Checking...";

  try {
    const dRef = doc(db, "users", docId);
    const snap = await getDoc(dRef);

    if (snap.exists()) {
      const data = snap.data();
      statusText.style.color = ""; // reset
      statusText.innerHTML = `<span style="color:${'#16a34a'}">VALID</span>`;
      detailsDiv.innerHTML = dataToHTML(data);
    } else {
      statusText.innerHTML = `<span style="color:${'#ef4444'}">INVALID</span>`;
      detailsDiv.innerHTML = `<p>No record found for document ID <strong>${docId}</strong>.</p>`;
    }
  } catch (err) {
    console.error(err);
    statusText.textContent = "Error checking database. See console.";
  }
}
