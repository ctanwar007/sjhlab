const CLIENT_ID = '638251800613-iuqc29d5dri50o88cjc75qatc7uoh5bo.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCfetf4gQS5lIeqPn7um9ZHA5YBwoirOIw';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

let labTests = [];
let isEditing = false;
let actionHeader = null;
let rowToDelete = null;

// Declare DOM elements globally
let openModalBtn, closeModalBtn, editModeBtn, formModal, labTestForm, tableHead, searchBar, tableBody;
let confirmationModal, confirmDeleteBtn, cancelDeleteBtn;
let passwordModal, passwordInput, passwordError, submitPasswordBtn, cancelPasswordBtn, closePasswordBtn;

// Called when gapi is loaded
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

// Initialize Google API client
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

// Called when Google Identity Services are loaded
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // will assign later
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}

// Auth button handler
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('authorize_button').value = 'Refresh';

        // Attempt to load saved data after login
        const fileId = localStorage.getItem('labtests_file_id');
        if (fileId) {
            await loadLabTestsFromDrive(fileId);
        }
    };
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

// Sign out handler
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('authorize_button').value = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';

        // Clear in-memory and UI data on sign out
        labTests = [];
        renderTable(labTests);
        localStorage.removeItem('labtests_file_id');
    }
}

// Upload labTests data to Google Drive
async function uploadLabTestsToDrive() {
    const fileContent = JSON.stringify(labTests);
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
        name: 'labtests.json',
        mimeType: 'application/json'
    };

    const accessToken = gapi.auth.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.responseType = 'json';
    xhr.onload = () => {
        if (xhr.status === 200) {
            alert('Saved! Google Drive file id: ' + xhr.response.id);
            localStorage.setItem('labtests_file_id', xhr.response.id);
        } else {
            alert('Failed to save data to Google Drive.');
        }
    };
    xhr.onerror = () => alert('Failed to save data to Google Drive.');
    xhr.send(form);
}

// Load labTests data from Google Drive
async function loadLabTestsFromDrive(fileId) {
    const accessToken = gapi.auth.getToken().access_token;
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.onload = () => {
        if (xhr.status === 200) {
            labTests = JSON.parse(xhr.responseText);
            renderTable(labTests);
        } else {
            alert('Failed to load saved data from Google Drive.');
        }
    };
    xhr.onerror = () => alert('Failed to load saved data from Google Drive.');
    xhr.send();
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
