// Initialize Firebase (Google Cloud Firestore) - replace with your config
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to gather data from editable table into array of objects
function getTableData() {
  const table = document.getElementById("labTestTable");
  const data = [];
  for (let i = 1; i < table.rows.length; i++) { // skip header row
    const row = table.rows[i];
    data.push({
      testName: row.cells[0].innerText.trim(),
      result: row.cells[1].innerText.trim(),
      unit: row.cells[2].innerText.trim()
    });
  }
  return data;
}

// Save data locally using LocalStorage
function saveLocal(data) {
  localStorage.setItem("labTestData", JSON.stringify(data));
  console.log("Data saved locally.");
}

// Save data remotely to Google Firestore
async function saveToCloud(data) {
  try {
    // To keep it simple, save all data at once in a single document per save
    await addDoc(collection(db, "labTestResults"), { tests: data, timestamp: new Date() });
    console.log("Data saved to Google Cloud Firestore.");
  } catch (e) {
    console.error("Error saving to cloud: ", e);
  }
}

// Main function to save data both locally and to cloud
function saveData() {
  const data = getTableData();
  saveLocal(data);
  saveToCloud(data);
}



// Show the form modal
const showFormModal = () => {
    formModal.classList.remove('hidden');
    formModal.querySelector('.transform').classList.remove('scale-95');
    formModal.querySelector('.transform').classList.add('scale-100');
}

// Hide the form modal
const hideFormModal = () => {
    formModal.querySelector('.transform').classList.remove('scale-100');
    formModal.querySelector('.transform').classList.add('scale-95');
    setTimeout(() => {
        formModal.classList.add('hidden');
    }, 300);
}

// Show the password modal
const showPasswordModal = () => {
    passwordModal.classList.remove('hidden');
    passwordModal.querySelector('.transform').classList.remove('scale-95');
    passwordModal.querySelector('.transform').classList.add('scale-100');
}

// Hide the password modal
const hidePasswordModal = () => {
    passwordModal.querySelector('.transform').classList.remove('scale-100');
    passwordModal.querySelector('.transform').classList.add('scale-95');
    setTimeout(() => {
        passwordModal.classList.add('hidden');
        passwordInput.value = '';
        passwordError.classList.add('hidden');
    }, 300);
}

// Render the table from the in-memory array
const renderTable = (data) => {
    tableBody.innerHTML = '';

    // Sort data by test name for consistent display
    data.sort((a, b) => a.test.localeCompare(b.test));
    data.forEach((item, index) => {
        const newRow = document.createElement('tr');
        newRow.dataset.docId = index;
        newRow.innerHTML = `
            <td>${item.test}</td>
            <td>${item.vial}</td>
            <td>${item.building}</td>
            <td>${item.floor}</td>
            <td>${item.roomNo || 'N/A'}</td>
            <td>${item.timings}</td>
            <td>${item.otherBuilding || 'N/A'}</td>
            <td>${item.otherTiming || 'N/A'}</td>
            <td>${item.remark || 'N/A'}</td>
        `;
        if (isEditing) {
            const actionCell = document.createElement('td');
            actionCell.innerHTML = `<button class="delete-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-full text-xs" data-doc-id="${index}">Delete</button>`;
            newRow.appendChild(actionCell);
        }
        tableBody.appendChild(newRow);
    });
};

// Delete handler
const handleDeletion = (e) => {
    const docId = e.target.dataset.docId;
    rowToDelete = docId;
    confirmationModal.classList.remove('hidden');
};

const deleteTestEntry = (index) => {
    labTests.splice(index, 1);
    renderTable(labTests);
    uploadLabTestsToDrive();
};

document.addEventListener('DOMContentLoaded', () => {
    openModalBtn = document.getElementById('open-modal-btn');
    closeModalBtn = document.getElementById('close-modal-btn');
    editModeBtn = document.getElementById('edit-mode-btn');
    formModal = document.getElementById('form-modal');
    labTestForm = document.getElementById('lab-test-form');
    tableHead = document.getElementById('table-head');
    searchBar = document.getElementById('search-bar');
    tableBody = document.getElementById('lab-data-table-body');

    confirmationModal = document.getElementById('confirmation-modal');
    confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    passwordModal = document.getElementById('password-modal');
    passwordInput = document.getElementById('password-input');
    passwordError = document.getElementById('password-error');
    submitPasswordBtn = document.getElementById('submit-password-btn');
    cancelPasswordBtn = document.getElementById('cancel-password-btn');
    closePasswordBtn = document.getElementById('close-password-btn');

    openModalBtn.addEventListener('click', showFormModal);
    closeModalBtn.addEventListener('click', hideFormModal);
    editModeBtn.addEventListener('click', () => {
        if (!isEditing) {
            showPasswordModal();
        } else {
            exitEditMode();
        }
    });

    labTestForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = {
            test: document.getElementById('test-name').value,
            vial: document.getElementById('vial').value,
            building: document.getElementById('building').value,
            floor: document.getElementById('floor').value,
            roomNo: document.getElementById('room-no').value || null,
            timings: document.getElementById('timings').value,
            otherBuilding: document.getElementById('other-building').value || null,
            otherTiming: document.getElementById('other-timing').value || null,
            remark: document.getElementById('remark').value || null
        };
        labTests.push(formData);
        labTestForm.reset();
        hideFormModal();
        renderTable(labTests);
        uploadLabTestsToDrive();
    });

    searchBar.addEventListener('input', (event) => {
        const searchQuery = event.target.value.toLowerCase();
        const filteredData = labTests.filter(item => item.test.toLowerCase().includes(searchQuery));
        renderTable(filteredData);
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (rowToDelete !== null) {
            deleteTestEntry(rowToDelete);
        }
        rowToDelete = null;
        confirmationModal.classList.add('hidden');
    });

    cancelDeleteBtn.addEventListener('click', () => {
        rowToDelete = null;
        confirmationModal.classList.add('hidden');
    });

    tableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            handleDeletion(e);
        }
    });

    submitPasswordBtn.addEventListener('click', () => {
        const password = passwordInput.value;
        if (password === 'Chetan@1') {
            hidePasswordModal();
            enterEditMode();
        } else {
            passwordError.classList.remove('hidden');
        }
    });

    cancelPasswordBtn.addEventListener('click', hidePasswordModal);
    closePasswordBtn.addEventListener('click', hidePasswordModal);

    // Initial render empty or load from Drive after OAuth login
    renderTable(labTests);
});

const enterEditMode = () => {
    isEditing = true;
    editModeBtn.textContent = 'Done Editing';
    editModeBtn.classList.remove('bg-white');
    editModeBtn.classList.add('bg-[#B2CBEF]');
    openModalBtn.classList.add('hidden');
    actionHeader = document.createElement('th');
    actionHeader.textContent = 'Actions';
    actionHeader.classList.add('text-[#34495E]', 'rounded-tr-xl');
    const lastHeader = tableHead.querySelector('th:last-child');
    if (lastHeader) {
        lastHeader.classList.remove('rounded-tr-xl');
    }
    tableHead.querySelector('tr').appendChild(actionHeader);
    renderTable(labTests);
};

const exitEditMode = () => {
    isEditing = false;
    editModeBtn.textContent = 'Edit Mode';
    editModeBtn.classList.remove('bg-[#B2CBEF]');
    editModeBtn.classList.add('bg-white');
    openModalBtn.classList.remove('hidden');
    if (actionHeader) {
        actionHeader.remove();
        const lastHeader = tableHead.querySelector('th:last-child');
        if (lastHeader) {
            lastHeader.classList.add('rounded-tr-xl');
        }
    }
    renderTable(labTests);
};

// Export necessary functions globally if buttons are using inline onclick
window.gapiLoaded = gapiLoaded;
window.gisLoaded = gisLoaded;
window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
