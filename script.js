// Initialize labTests array from localStorage or empty array
let labTests = JSON.parse(localStorage.getItem('labTestData')) || [];
let isEditing = false;
let rowToDelete = null;
let actionHeader = null;

// Cache DOM elements
let openModalBtn, closeModalBtn, editModeBtn, formModal, labTestForm, tableHead, searchBar, tableBody;
let confirmationModal, confirmDeleteBtn, cancelDeleteBtn;
let passwordModal, passwordInput, passwordError, submitPasswordBtn, cancelPasswordBtn, closePasswordBtn;

// Save labTests array to localStorage
function saveLocal(data) {
  localStorage.setItem('labTestData', JSON.stringify(data));
  console.log('Data saved locally.');
}

// Render the table rows based on provided data
function renderTable(data) {
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
}

// Show and hide modals (form, confirmation, password)
const showFormModal = () => {
  formModal.classList.remove('hidden');
  formModal.querySelector('.transform').classList.remove('scale-95');
  formModal.querySelector('.transform').classList.add('scale-100');
}

const hideFormModal = () => {
  formModal.querySelector('.transform').classList.remove('scale-100');
  formModal.querySelector('.transform').classList.add('scale-95');
  setTimeout(() => formModal.classList.add('hidden'), 300);
}

const showPasswordModal = () => {
  passwordModal.classList.remove('hidden');
  passwordModal.querySelector('.transform').classList.remove('scale-95');
  passwordModal.querySelector('.transform').classList.add('scale-100');
}

const hidePasswordModal = () => {
  passwordModal.querySelector('.transform').classList.remove('scale-100');
  passwordModal.querySelector('.transform').classList.add('scale-95');
  setTimeout(() => {
    passwordModal.classList.add('hidden');
    passwordInput.value = '';
    passwordError.classList.add('hidden');
  }, 300);
}

const showConfirmationModal = () => confirmationModal.classList.remove('hidden');
const hideConfirmationModal = () => confirmationModal.classList.add('hidden');

// Enter edit mode UI changes
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
  if (lastHeader) lastHeader.classList.remove('rounded-tr-xl');
  tableHead.querySelector('tr').appendChild(actionHeader);
  renderTable(labTests);
};

// Exit edit mode UI reset
const exitEditMode = () => {
  isEditing = false;
  editModeBtn.textContent = 'Edit Mode';
  editModeBtn.classList.remove('bg-[#B2CBEF]');
  editModeBtn.classList.add('bg-white');
  openModalBtn.classList.remove('hidden');
  if (actionHeader) {
    actionHeader.remove();
    const lastHeader = tableHead.querySelector('th:last-child');
    if (lastHeader) lastHeader.classList.add('rounded-tr-xl');
  }
  renderTable(labTests);
}

// Handle deleting a row on confirmation
function deleteTestEntry(index) {
  labTests.splice(index, 1);
  saveLocal(labTests);
  renderTable(labTests);
  hideConfirmationModal();
}

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
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

  // Initial rendering of table from loaded data
  renderTable(labTests);

  // Open modal to add new lab test
  openModalBtn.addEventListener('click', showFormModal);
  closeModalBtn.addEventListener('click', hideFormModal);

  // Edit mode toggle (password protected)
  editModeBtn.addEventListener('click', () => {
    if (!isEditing) {
      showPasswordModal();
    } else {
      exitEditMode();
    }
  });

  // Form submission - add new lab test entry
  labTestForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = {
      test: document.getElementById('test-name').value.trim(),
      vial: document.getElementById('vial').value.trim(),
      building: document.getElementById('building').value.trim(),
      floor: document.getElementById('floor').value.trim(),
      roomNo: document.getElementById('room-no').value.trim() || null,
      timings: document.getElementById('timings').value.trim(),
      otherBuilding: document.getElementById('other-building').value.trim() || null,
      otherTiming: document.getElementById('other-timing').value.trim() || null,
      remark: document.getElementById('remark').value.trim() || null
    };
    labTests.push(formData);
    saveLocal(labTests);
    renderTable(labTests);
    labTestForm.reset();
    hideFormModal();
  });

  // Search filter on table data
  searchBar.addEventListener('input', (event) => {
    const searchQuery = event.target.value.toLowerCase();
    const filteredData = labTests.filter(item => item.test.toLowerCase().includes(searchQuery));
    renderTable(filteredData);
  });

  // Deletion confirmation modal trigger
  tableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      rowToDelete = parseInt(e.target.dataset.docId, 10);
      showConfirmationModal();
    }
  });

  // Confirm deletion button
  confirmDeleteBtn.addEventListener('click', () => {
    if (rowToDelete !== null) {
      deleteTestEntry(rowToDelete);
      rowToDelete = null;
    }
  });

  // Cancel deletion button
  cancelDeleteBtn.addEventListener('click', () => {
    rowToDelete = null;
    hideConfirmationModal();
  });

  // Password modal submit for edit mode
  submitPasswordBtn.addEventListener('click', () => {
    const password = passwordInput.value;
    if (password === 'Chetan@1') {  // Change password as needed
      hidePasswordModal();
      enterEditMode();
    } else {
      passwordError.classList.remove('hidden');
    }
  });

  // Cancel and close password modal handlers
  cancelPasswordBtn.addEventListener('click', hidePasswordModal);
  closePasswordBtn.addEventListener('click', hidePasswordModal);
});
