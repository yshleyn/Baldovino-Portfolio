import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6ULRVUAac6fzu3Ce7Pkq8La90cm__QGg",
  authDomain: "lynx-l10ynx.firebaseapp.com",
  projectId: "lynx-l10ynx",
  storageBucket: "lynx-l10ynx.firebasestorage.app",
  messagingSenderId: "478584531467",
  appId: "1:478584531467:web:c264ba69dd7e339583b50e",
  measurementId: "G-EM2S5LNYZ2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

const categories = ['activities', 'quizzes', 'exams', 'projects'];

// Listen to Firestore real-time updates for each category
document.addEventListener('DOMContentLoaded', () => {
  categories.forEach(cat => listenToCategory(cat));
  setupDragAndDrop();
});

// Realtime Sync Listener from Firestore
function listenToCategory(category) {
  const q = query(collection(db, "works"), where("category", "==", category));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById(`list-${category}`);
    if (!container) return;
    container.innerHTML = '';

    snapshot.forEach((docSnapshot) => {
      const item = docSnapshot.data();
      const itemId = docSnapshot.id;

      const card = document.createElement('div');
      card.className = 'work-card';
      card.innerHTML = `
        <div class="work-card-info">
          <div class="work-file-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div class="work-file-details">
            <div class="work-file-name" title="${item.name}">${item.name}</div>
            <div class="work-file-meta">
              <span>${item.size}</span>
              <span>•</span>
              <span>${item.date}</span>
            </div>
          </div>
        </div>
        <div class="work-card-actions">
          <a href="${item.fileData}" target="_blank" download="${item.name}" class="btn-action view">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            Download / View
          </a>
          <button class="btn-action delete" data-id="${itemId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
          </button>
        </div>
      `;

      // Attach Delete Handler
      card.querySelector('.delete').addEventListener('click', () => {
        deleteWorkItem(itemId);
      });

      container.appendChild(card);
    });
  });
}

// Convert file to Base64 and save directly to Firestore (Free Plan Friendly)
window.uploadToFirebase = async function(event, category) {
  const files = event.target.files;
  if (!files.length) return;

  showToast(`Saving ${files.length} file(s) to Cloud Database...`);

  for (let file of files) {
    try {
      const reader = new FileReader();
      
      reader.onload = async function(e) {
        const base64Data = e.target.result;

        // Save metadata and file content directly to Firestore
        await addDoc(collection(db, "works"), {
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          category: category,
          fileData: base64Data,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        });

        showToast(`Uploaded ${file.name} successfully!`);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      showToast(`Upload failed: ${err.message}`);
    }
  }

  event.target.value = ''; // Reset File Input
};

// Delete item from Firestore
async function deleteWorkItem(docId) {
  try {
    await deleteDoc(doc(db, "works", docId));
    showToast("File deleted from Cloud.");
  } catch (err) {
    console.error(err);
    showToast("Error deleting file.");
  }
}

// Navigation & Tab Switching
window.switchTab = function(event, category) {
  document.querySelectorAll('.works-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  const targetPanel = document.getElementById(`panel-${category}`);
  if (targetPanel) targetPanel.classList.add('active');
  event.currentTarget.classList.add('active');
};

window.triggerFileInput = function(category) {
  const fileInput = document.getElementById(`file-${category}`);
  if (fileInput) fileInput.click();
};

function setupDragAndDrop() {
  categories.forEach(cat => {
    const dropzone = document.getElementById(`dropzone-${cat}`);
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) {
        window.uploadToFirebase({ target: { files: files } }, cat);
      }
    }, false);
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  if (toast && toastMessage) {
    toastMessage.innerText = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

