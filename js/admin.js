import { validateFamily } from './validate.js';

// Application State
let token = sessionStorage.getItem('admin_token') || '';
let currentFamilyData = null;
let originalFamilyData = null;
let activeMemberId = null;
let pendingCompressedPhoto = null;
let hasUnsavedChanges = false;

// DOM Elements
const loginView = document.getElementById('login-view');
const adminWorkspace = document.getElementById('admin-workspace');
const headerActions = document.getElementById('header-actions');
const loginForm = document.getElementById('login-form');
const loginAlert = document.getElementById('login-alert');
const btnLogout = document.getElementById('btn-logout');
const btnDownloadBackup = document.getElementById('btn-download-backup');
const btnSaveCloud = document.getElementById('btn-save-cloud');
const btnBannerSave = document.getElementById('btn-banner-save');
const btnBannerDiscard = document.getElementById('btn-banner-discard');
const unsavedBanner = document.getElementById('unsaved-banner');

const statBadge = document.getElementById('stat-badge');
const sidebarList = document.getElementById('sidebar-member-list');
const memberSearch = document.getElementById('member-search');
const branchFilter = document.getElementById('branch-filter');
const btnAddMember = document.getElementById('btn-add-member');

const editorTitle = document.getElementById('editor-title');
const editorSubtitle = document.getElementById('editor-subtitle');
const editorGenPill = document.getElementById('editor-gen-pill');
const editorAlert = document.getElementById('editor-alert');
const memberForm = document.getElementById('member-form');
const btnSaveMember = document.getElementById('btn-save-member');
const btnDeleteMember = document.getElementById('btn-delete-member');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnAutoId = document.getElementById('btn-auto-id');

// Form inputs
const inputId = document.getElementById('m-id');
const inputName = document.getElementById('m-name');
const inputNameHi = document.getElementById('m-name-hi');
const selectGender = document.getElementById('m-gender');
const selectParent = document.getElementById('m-parent');
const inputBranch = document.getElementById('m-branch');
const inputOrder = document.getElementById('m-order');
const inputDob = document.getElementById('m-dob');
const inputDod = document.getElementById('m-dod');
const checkDeceased = document.getElementById('m-deceased');
const inputBio = document.getElementById('m-bio');
const inputPhoto = document.getElementById('m-photo');
const photoFileInput = document.getElementById('photo-file-input');
const btnUploadPhoto = document.getElementById('btn-upload-photo');
const photoPreviewImg = document.getElementById('photo-preview-img');
const compressionInfo = document.getElementById('compression-info');
const uploadStatus = document.getElementById('upload-status');
const spousesContainer = document.getElementById('spouses-container');
const btnAddSpouse = document.getElementById('btn-add-spouse');

// Spouses list for currently edited member
let currentSpouses = [];

/* ==========================================================================
   1. Initialization & Authentication
   ========================================================================== */

async function init() {
  if (token) {
    const valid = await verifySession(token);
    if (valid) {
      showWorkspace();
      await loadFamilyData();
      return;
    }
  }
  showLogin();
}

async function verifySession(t) {
  try {
    const res = await fetch('/api/auth', {
      headers: { 'Authorization': `Bearer ${t}` }
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.authenticated;
    }
    return false;
  } catch {
    return false;
  }
}

function showLogin() {
  token = '';
  sessionStorage.removeItem('admin_token');
  loginView.style.display = 'flex';
  adminWorkspace.style.display = 'none';
  headerActions.style.display = 'none';
  unsavedBanner.classList.add('hidden');
}

function showWorkspace() {
  loginView.style.display = 'none';
  adminWorkspace.style.display = 'grid';
  headerActions.style.display = 'flex';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginAlert.className = 'alert-box';
  loginAlert.textContent = '';

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('btn-login-submit');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Verifying...';

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      token = data.token;
      sessionStorage.setItem('admin_token', token);
      showWorkspace();
      await loadFamilyData();
    } else {
      loginAlert.className = 'alert-box error show';
      loginAlert.textContent = data.error || 'Invalid credentials. Please try again.';
    }
  } catch (err) {
    loginAlert.className = 'alert-box error show';
    loginAlert.textContent = 'Could not reach server. Please try again.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login • प्रवेश करें';
  }
});

btnLogout.addEventListener('click', () => {
  if (hasUnsavedChanges) {
    if (!confirm('You have unsaved changes. Logging out will discard them. Continue?')) return;
  }
  showLogin();
});

/* ==========================================================================
   2. Data Loading & State Management
   ========================================================================== */

async function loadFamilyData() {
  try {
    let res = await fetch('/api/family', { cache: 'no-cache' });
    if (!res.ok) {
      res = await fetch('./data/family.json', { cache: 'no-cache' });
    }
    const data = await res.json();
    currentFamilyData = structuredClone(data);
    originalFamilyData = structuredClone(data);
    setUnsavedChanges(false);

    populateBranchFilter();
    populateParentDropdown();
    renderSidebarList();
    updateHeaderStats();

    // Select root member by default
    if (currentFamilyData.members.length > 0) {
      selectMember(currentFamilyData.family.rootId || currentFamilyData.members[0].id);
    }
  } catch (err) {
    alert('Failed to load family data: ' + err.message);
  }
}

function setUnsavedChanges(val) {
  hasUnsavedChanges = val;
  if (val) {
    unsavedBanner.classList.remove('hidden');
    btnSaveCloud.classList.add('admin-btn-primary');
  } else {
    unsavedBanner.classList.add('hidden');
  }
}

function updateHeaderStats() {
  if (!currentFamilyData) return;
  const count = currentFamilyData.members.length;
  statBadge.textContent = `${count} Members`;
}

/* ==========================================================================
   3. Sidebar & Search
   ========================================================================== */

function populateBranchFilter() {
  const branches = new Set();
  currentFamilyData.members.forEach(m => {
    if (m.branch) branches.add(m.branch);
  });
  const currentVal = branchFilter.value;
  branchFilter.innerHTML = '<option value="">All Branches (सभी शाखाएं)</option>';
  Array.from(branches).sort().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    branchFilter.appendChild(opt);
  });
  branchFilter.value = currentVal;
}

function renderSidebarList() {
  const query = memberSearch.value.trim().toLowerCase();
  const selectedBranch = branchFilter.value;

  const filtered = currentFamilyData.members.filter(m => {
    if (selectedBranch && m.branch !== selectedBranch) return false;
    if (!query) return true;
    return (
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.nameHindi && m.nameHindi.toLowerCase().includes(query)) ||
      (m.id && m.id.toLowerCase().includes(query))
    );
  });

  sidebarList.innerHTML = '';
  if (filtered.length === 0) {
    sidebarList.innerHTML = '<div style="padding: 16px; color: #888; text-align: center; font-size: 0.85rem;">No members match search.</div>';
    return;
  }

  filtered.forEach(m => {
    const item = document.createElement('div');
    item.className = 'member-list-item' + (m.id === activeMemberId ? ' active' : '');
    item.onclick = () => selectMember(m.id);

    const initial = (m.name || m.nameHindi || '?').charAt(0);
    const photoSrc = m.photo || '';

    item.innerHTML = `
      ${photoSrc ?
        `<img src="${photoSrc}" class="member-item-avatar" alt="${m.name}" onerror="this.outerHTML='<div class=\\'member-item-avatar\\'>${initial}</div>'">` :
        `<div class="member-item-avatar">${initial}</div>`
      }
      <div class="member-item-info">
        <strong>${m.name || m.nameHindi || 'Unnamed'}</strong>
        <small>${m.nameHindi || ''} • ${m.id} ${m.isDeceased ? '🕊️' : ''}</small>
      </div>
    `;
    sidebarList.appendChild(item);
  });
}

memberSearch.addEventListener('input', renderSidebarList);
branchFilter.addEventListener('change', renderSidebarList);

/* ==========================================================================
   4. Parent Dropdown Population
   ========================================================================== */

function populateParentDropdown(excludeId = null) {
  selectParent.innerHTML = '';

  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = 'None — Root Ancestor (मूल पूर्वज)';
  selectParent.appendChild(noneOpt);

  const maleMembers = currentFamilyData.members.filter(m => {
    if (m.gender === 'F') return false;
    if (excludeId && m.id === excludeId) return false;
    return true;
  });

  maleMembers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  maleMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name || m.nameHindi} (${m.id}) ${m.branch ? '— ' + m.branch : ''}`;
    selectParent.appendChild(opt);
  });
}

/* ==========================================================================
   5. Member Selection & Form Population
   ========================================================================== */

function selectMember(id) {
  activeMemberId = id;
  const member = currentFamilyData.members.find(m => m.id === id);
  if (!member) return;

  populateParentDropdown(member.id);

  editorTitle.textContent = `Edit: ${member.name || member.id}`;
  editorSubtitle.textContent = member.nameHindi || '';
  editorGenPill.textContent = `ID: ${member.id}`;
  editorAlert.className = 'alert-box';
  editorAlert.textContent = '';

  inputId.value = member.id;
  inputId.readOnly = (member.id === currentFamilyData.family.rootId);
  inputName.value = member.name || '';
  inputNameHi.value = member.nameHindi || '';
  selectGender.value = member.gender || 'M';
  selectParent.value = member.parentId || '';
  inputBranch.value = member.branch || '';
  inputOrder.value = member.order || 1;
  inputDob.value = member.dob || '';
  inputDod.value = member.dod || '';
  checkDeceased.checked = !!member.isDeceased;
  inputBio.value = member.bio || '';
  inputPhoto.value = member.photo || '';

  // Update photo preview
  updatePhotoPreview(member.photo);
  clearPhotoUploadControls();

  // Spouses
  currentSpouses = structuredClone(member.spouses || []);
  updateSpouseSectionVisibility();

  btnDeleteMember.style.display = (member.id === currentFamilyData.family.rootId) ? 'none' : 'inline-flex';

  renderSidebarList();
}

function clearPhotoUploadControls() {
  photoFileInput.value = '';
  pendingCompressedPhoto = null;
  compressionInfo.textContent = '';
  uploadStatus.textContent = '';
  btnUploadPhoto.disabled = true;
}

function updatePhotoPreview(url) {
  if (url) {
    photoPreviewImg.src = url;
    photoPreviewImg.onerror = () => {
      photoPreviewImg.src = 'img/tree-emblem.svg';
    };
  } else {
    photoPreviewImg.src = 'img/tree-emblem.svg';
  }
}

// Auto-check deceased when DOD is filled
inputDod.addEventListener('input', () => {
  if (inputDod.value.trim()) {
    checkDeceased.checked = true;
  }
});

// Update branch when parent changes
selectParent.addEventListener('change', () => {
  const pId = selectParent.value;
  if (!pId) {
    inputBranch.value = 'Root Ancestor';
  } else {
    const parent = currentFamilyData.members.find(m => m.id === pId);
    if (parent && parent.branch) {
      inputBranch.value = parent.branch;
    }
  }
});

// Auto ID generator
btnAutoId.addEventListener('click', () => {
  const pId = selectParent.value;
  let prefix = 'G';
  let genNum = 2;

  if (pId) {
    const parent = currentFamilyData.members.find(m => m.id === pId);
    if (parent && parent.id.startsWith('G')) {
      const parentGen = parseInt(parent.id.slice(1).split('-')[0], 10);
      if (!isNaN(parentGen)) genNum = parentGen + 1;
    }
  }

  // Find highest number in that generation
  const existingInGen = currentFamilyData.members.filter(m => m.id.startsWith(`G${genNum}-`));
  let maxNum = 0;
  existingInGen.forEach(m => {
    const numPart = parseInt(m.id.split('-')[1], 10);
    if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
  });

  const nextNum = String(maxNum + 1).padStart(2, '0');
  inputId.value = `G${genNum}-${nextNum}`;
});

/* ==========================================================================
   6. Add New Member Mode
   ========================================================================== */

btnAddMember.addEventListener('click', () => {
  activeMemberId = null;
  populateParentDropdown();

  editorTitle.textContent = '+ Add New Family Member (+ नया सदस्य जोड़ें)';
  editorSubtitle.textContent = 'Fill in member details below';
  editorGenPill.textContent = 'New Member';
  editorAlert.className = 'alert-box';
  editorAlert.textContent = '';

  // Suggest default father (either active selected or root)
  const defaultParent = currentFamilyData.family.rootId || (currentFamilyData.members[0] ? currentFamilyData.members[0].id : '');
  selectParent.value = defaultParent;

  // Suggest branch
  const parentObj = currentFamilyData.members.find(m => m.id === defaultParent);
  inputBranch.value = parentObj ? (parentObj.branch || '') : '';

  // Trigger auto ID
  btnAutoId.click();

  inputId.readOnly = false;
  inputName.value = '';
  inputNameHi.value = '';
  selectGender.value = 'M';
  inputOrder.value = 1;
  inputDob.value = '';
  inputDod.value = '';
  checkDeceased.checked = false;
  inputBio.value = '';
  inputPhoto.value = '';

  updatePhotoPreview('');
  clearPhotoUploadControls();

  currentSpouses = [];
  updateSpouseSectionVisibility();

  btnDeleteMember.style.display = 'none';
  renderSidebarList();
  inputName.focus();
});

btnCancelEdit.addEventListener('click', () => {
  if (activeMemberId) {
    selectMember(activeMemberId);
  } else if (currentFamilyData.members.length > 0) {
    selectMember(currentFamilyData.members[0].id);
  }
});

/* ==========================================================================
   7. Client-Side Photo Compression & Upload to Vercel Blob
   ========================================================================== */

photoFileInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    compressionInfo.textContent = 'Compressing image...';
    btnUploadPhoto.disabled = true;

    const compressed = await compressImage(file, 600, 600, 0.85);
    pendingCompressedPhoto = compressed;

    // Show preview immediately
    photoPreviewImg.src = compressed.dataUrl;

    const originalKb = Math.round(file.size / 1024);
    const compressedKb = Math.round(compressed.byteSize / 1024);
    compressionInfo.textContent = `Optimized: ${compressedKb} KB (reduced from ${originalKb} KB)`;
    btnUploadPhoto.disabled = false;
  } catch (err) {
    compressionInfo.textContent = 'Error compressing photo: ' + err.message;
  }
});

btnUploadPhoto.addEventListener('click', async () => {
  if (!pendingCompressedPhoto) return;

  btnUploadPhoto.disabled = true;
  uploadStatus.textContent = 'Uploading to Vercel Blob...';
  uploadStatus.style.color = 'var(--gold)';

  const memberId = inputId.value.trim().toLowerCase() || 'member';
  const filename = `${memberId}.jpg`;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filename,
        base64: pendingCompressedPhoto.dataUrl,
        contentType: 'image/jpeg'
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      inputPhoto.value = data.url;
      updatePhotoPreview(data.url);
      uploadStatus.textContent = '✓ Uploaded to Vercel Blob!';
      uploadStatus.style.color = '#166534';
      btnUploadPhoto.disabled = true;
    } else {
      uploadStatus.textContent = '✗ Upload failed: ' + (data.error || 'Server error');
      uploadStatus.style.color = 'var(--danger)';
      btnUploadPhoto.disabled = false;
    }
  } catch (err) {
    uploadStatus.textContent = '✗ Network error uploading image';
    uploadStatus.style.color = 'var(--danger)';
    btnUploadPhoto.disabled = false;
  }
});

inputPhoto.addEventListener('input', () => {
  updatePhotoPreview(inputPhoto.value.trim());
});

// HTML5 Canvas image compressor
function compressImage(file, maxWidth, maxHeight, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const head = 'data:image/jpeg;base64,';
        const byteSize = Math.round((dataUrl.length - head.length) * 3 / 4);
        resolve({ dataUrl, byteSize, width, height });
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
    };
    reader.onerror = () => reject(new Error('Failed reading file.'));
  });
}

// Hide spouses for female members (Phase 1 paternal tree rule)
function updateSpouseSectionVisibility() {
  const isFemale = selectGender.value === 'F';
  const spouseFieldset = spousesContainer.closest('fieldset');
  if (spouseFieldset) {
    if (isFemale) {
      spousesContainer.innerHTML = '<div style="font-size: 0.85rem; color: #888; padding: 8px 0;">In Phase 1 paternal tree, spouses are linked to male lineage members.</div>';
      btnAddSpouse.style.display = 'none';
    } else {
      btnAddSpouse.style.display = 'inline-flex';
      renderSpouses();
    }
  }
}

selectGender.addEventListener('change', updateSpouseSectionVisibility);

/* ==========================================================================
   8. Spouses Management (Full Details & Photo Upload)
   ========================================================================== */

const pendingSpousePhotos = {};

function renderSpouses() {
  if (selectGender.value === 'F') return;

  spousesContainer.innerHTML = '';
  if (currentSpouses.length === 0) {
    spousesContainer.innerHTML = '<div style="font-size: 0.85rem; color: #777; padding: 6px 0;">No spouses recorded. Click "+ Add Spouse" below to add a wife/spouse.</div>';
    return;
  }

  const memberId = inputId.value.trim() || 'member';

  currentSpouses.forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'spouse-item-card';

    const spouseId = s.id || `${memberId}-s${idx + 1}`;
    const photoUrl = s.photo || '';
    const displayName = s.name || s.nameHindi || `Spouse #${idx + 1}`;

    card.innerHTML = `
      <div class="spouse-header-row">
        <strong>💍 ${displayName} <span style="font-size: 0.75rem; color: #777; font-weight: normal;">(${spouseId})</span></strong>
        <button type="button" class="spouse-remove-btn" title="Remove this spouse" onclick="window.removeSpouse(${idx})">
          ✕ Remove
        </button>
      </div>

      <!-- Identity & Names -->
      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 0.8rem;">Spouse English Name *</label>
          <input type="text" value="${s.name || ''}" placeholder="e.g. Swargiya Shrimati Sita Devi" oninput="window.updateSpouse(${idx}, 'name', this.value)">
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 0.8rem;">Hindi Name (हिंदी नाम)</label>
          <input type="text" value="${s.nameHindi || ''}" placeholder="e.g. स्वर्गीय श्रीमती सीता देवी" oninput="window.updateSpouse(${idx}, 'nameHindi', this.value)">
        </div>
      </div>

      <!-- Dates & Life -->
      <div class="form-grid-2">
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 0.8rem;">Date of Birth (DOB)</label>
          <input type="text" value="${s.dob || ''}" placeholder="YYYY or DD/MM/YYYY (e.g. 1958)" oninput="window.updateSpouse(${idx}, 'dob', this.value)">
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 0.8rem;">Date of Death (DOD)</label>
          <input type="text" value="${s.dod || ''}" placeholder="YYYY or DD/MM/YYYY (leave empty if living)" oninput="window.updateSpouse(${idx}, 'dod', this.value)">
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <input type="checkbox" id="spouse-dec-${idx}" ${s.isDeceased ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;" onchange="window.updateSpouse(${idx}, 'isDeceased', this.checked)">
        <label for="spouse-dec-${idx}" style="font-size: 0.82rem; font-weight: 600; cursor: pointer; margin: 0;">
          Deceased (स्वर्गीय)
        </label>
      </div>

      <!-- Photo Upload Box -->
      <div class="spouse-photo-row">
        <img id="spouse-photo-thumb-${idx}" class="spouse-photo-thumb" src="${photoUrl || 'img/tree-emblem.svg'}" alt="Spouse Photo" onerror="this.src='img/tree-emblem.svg'">
        <div class="spouse-photo-controls">
          <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--green); margin-bottom: 4px;">
            Spouse Photo (तस्वीर अपलोड • Vercel Blob):
          </label>
          <input type="file" accept="image/*" id="spouse-file-${idx}" style="font-size: 0.78rem; padding: 4px;" onchange="window.handleSpousePhotoSelect(${idx}, this)">
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
            <button type="button" id="spouse-upload-btn-${idx}" class="admin-btn admin-btn-primary" style="font-size: 0.75rem; padding: 4px 10px;" disabled onclick="window.uploadSpousePhoto(${idx})">
              ☁️ Upload to Vercel Blob
            </button>
            <span id="spouse-status-${idx}" style="font-size: 0.75rem;"></span>
          </div>
          <div style="margin-top: 6px;">
            <input type="text" id="spouse-photo-url-${idx}" value="${photoUrl}" placeholder="Image URL / Path" style="font-size: 0.78rem; padding: 4px 8px; width: 100%;" oninput="window.updateSpousePhotoUrl(${idx}, this.value)">
          </div>
        </div>
      </div>

      <!-- Bio / Notes -->
      <div class="form-group" style="margin-bottom: 0;">
        <label style="font-size: 0.78rem;">Bio / Village Notes (मायका / विशेष परिचय)</label>
        <textarea rows="1" placeholder="Maiden village, gotra, family notes..." oninput="window.updateSpouse(${idx}, 'bio', this.value)">${s.bio || ''}</textarea>
      </div>
    `;

    spousesContainer.appendChild(card);
  });
}

window.removeSpouse = function(idx) {
  currentSpouses.splice(idx, 1);
  renderSpouses();
  setUnsavedChanges(true);
};

window.updateSpouse = function(idx, field, val) {
  if (currentSpouses[idx]) {
    if (field === 'isDeceased') {
      currentSpouses[idx].isDeceased = Boolean(val);
    } else {
      currentSpouses[idx][field] = (typeof val === 'string') ? val.trim() : val;
      if (field === 'dod' && val && val.trim()) {
        currentSpouses[idx].isDeceased = true;
        const decCheck = document.getElementById(`spouse-dec-${idx}`);
        if (decCheck) decCheck.checked = true;
      }
    }
  }
};

window.updateSpousePhotoUrl = function(idx, val) {
  if (currentSpouses[idx]) {
    currentSpouses[idx].photo = val.trim();
    const thumb = document.getElementById(`spouse-photo-thumb-${idx}`);
    if (thumb) thumb.src = val.trim() || 'img/tree-emblem.svg';
  }
};

window.handleSpousePhotoSelect = async function(idx, input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const statusEl = document.getElementById(`spouse-status-${idx}`);
  const uploadBtn = document.getElementById(`spouse-upload-btn-${idx}`);
  const thumb = document.getElementById(`spouse-photo-thumb-${idx}`);

  try {
    statusEl.textContent = 'Compressing...';
    statusEl.style.color = 'var(--gold)';
    uploadBtn.disabled = true;

    const compressed = await compressImage(file, 600, 600, 0.85);
    pendingSpousePhotos[idx] = compressed;

    thumb.src = compressed.dataUrl;
    const kb = Math.round(compressed.byteSize / 1024);
    statusEl.textContent = `Optimized: ${kb} KB`;
    statusEl.style.color = '#059669';
    uploadBtn.disabled = false;
  } catch (err) {
    statusEl.textContent = 'Compression error';
    statusEl.style.color = 'var(--danger)';
  }
};

window.uploadSpousePhoto = async function(idx) {
  const compressed = pendingSpousePhotos[idx];
  if (!compressed) return;

  const uploadBtn = document.getElementById(`spouse-upload-btn-${idx}`);
  const statusEl = document.getElementById(`spouse-status-${idx}`);
  const thumb = document.getElementById(`spouse-photo-thumb-${idx}`);
  const urlInput = document.getElementById(`spouse-photo-url-${idx}`);

  uploadBtn.disabled = true;
  statusEl.textContent = 'Uploading to Vercel Blob...';
  statusEl.style.color = 'var(--gold)';

  const memberId = inputId.value.trim().toLowerCase() || 'member';
  const filename = `${memberId}-s${idx + 1}.jpg`;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        filename,
        base64: compressed.dataUrl,
        contentType: 'image/jpeg'
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      currentSpouses[idx].photo = data.url;
      thumb.src = data.url;
      if (urlInput) urlInput.value = data.url;
      statusEl.textContent = '✓ Uploaded!';
      statusEl.style.color = '#166534';
      uploadBtn.disabled = true;
      setUnsavedChanges(true);
    } else {
      statusEl.textContent = '✗ Upload failed: ' + (data.error || 'Server error');
      statusEl.style.color = 'var(--danger)';
      uploadBtn.disabled = false;
    }
  } catch (err) {
    statusEl.textContent = '✗ Network error';
    statusEl.style.color = 'var(--danger)';
    uploadBtn.disabled = false;
  }
};

btnAddSpouse.addEventListener('click', () => {
  const memberId = inputId.value.trim() || 'member';
  const spouseNum = currentSpouses.length + 1;
  currentSpouses.push({
    id: `${memberId}-s${spouseNum}`,
    name: '',
    nameHindi: '',
    gender: 'F',
    isDeceased: false,
    dob: null,
    dod: null,
    photo: '',
    bio: ''
  });
  renderSpouses();
});

/* ==========================================================================
   9. Applying Changes to In-Memory Tree
   ========================================================================== */

memberForm.addEventListener('submit', (e) => {
  e.preventDefault();
  editorAlert.className = 'alert-box';
  editorAlert.textContent = '';

  const id = inputId.value.trim();
  const name = inputName.value.trim();
  const nameHi = inputNameHi.value.trim();
  const gender = selectGender.value;
  const parentId = selectParent.value || null;
  const branch = inputBranch.value.trim() || 'Main Branch';
  const order = parseInt(inputOrder.value, 10) || 1;
  const dob = inputDob.value.trim() || null;
  const dod = inputDod.value.trim() || null;
  const isDeceased = checkDeceased.checked || !!dod;
  const bio = inputBio.value.trim();
  const photo = inputPhoto.value.trim() || '';

  if (!id) {
    showEditorError('Member ID is required.');
    return;
  }
  if (!name && !nameHi) {
    showEditorError('At least one name (English or Hindi) is required.');
    return;
  }

  // Sanitize spouses (clean dates, ensure id, ignore empty drafts)
  const cleanSpouses = (gender === 'F') ? [] : currentSpouses
    .map((s, idx) => ({
      id: s.id || `${id}-s${idx + 1}`,
      name: s.name ? s.name.trim() : '',
      nameHindi: s.nameHindi ? s.nameHindi.trim() : '',
      gender: 'F',
      dob: (s.dob && String(s.dob).trim()) ? String(s.dob).trim() : null,
      dod: (s.dod && String(s.dod).trim()) ? String(s.dod).trim() : null,
      isDeceased: Boolean(s.isDeceased || (s.dod && String(s.dod).trim())),
      photo: s.photo ? s.photo.trim() : '',
      bio: s.bio ? s.bio.trim() : ''
    }))
    .filter(s => s.name || s.nameHindi);

  // Construct draft member
  const draftMember = {
    id,
    name,
    nameHindi: nameHi,
    gender,
    parentId,
    branch,
    order,
    dob,
    dod,
    isDeceased,
    bio,
    photo,
    spouses: cleanSpouses
  };

  // Clone family data and test validation
  const testData = structuredClone(currentFamilyData);
  const existingIdx = testData.members.findIndex(m => m.id === id);

  if (activeMemberId) {
    // Editing existing member
    if (existingIdx !== -1) {
      testData.members[existingIdx] = draftMember;
    } else {
      testData.members.push(draftMember);
    }
  } else {
    // New member
    if (existingIdx !== -1) {
      showEditorError(`ID "${id}" is already used by another family member. Click "Auto" to pick another.`);
      return;
    }
    testData.members.push(draftMember);
  }

  // Validate entire tree
  const validation = validateFamily(testData);
  if (validation.errors.length > 0) {
    showEditorError('Validation error: ' + validation.errors.map(e => e.message).join('; '));
    return;
  }

  // Apply to current family data
  currentFamilyData = testData;
  setUnsavedChanges(true);
  selectMember(id);
  populateBranchFilter();
  updateHeaderStats();

  editorAlert.className = 'alert-box success show';
  editorAlert.textContent = '✓ Changes applied to tree. Click "Save to Cloud" to persist to Vercel Blob.';
});

function showEditorError(msg) {
  editorAlert.className = 'alert-box error show';
  editorAlert.textContent = msg;
}

/* ==========================================================================
   10. Delete Member
   ========================================================================== */

btnDeleteMember.addEventListener('click', () => {
  if (!activeMemberId) return;
  if (activeMemberId === currentFamilyData.family.rootId) {
    alert('Cannot delete the root ancestor.');
    return;
  }

  // Check if member has children
  const children = currentFamilyData.members.filter(m => m.parentId === activeMemberId);
  if (children.length > 0) {
    alert(`Cannot delete this member because they have ${children.length} descendant children. Reassign or delete their children first.`);
    return;
  }

  const member = currentFamilyData.members.find(m => m.id === activeMemberId);
  const confirmMsg = `Are you sure you want to delete "${member.name || activeMemberId}"?`;
  if (!confirm(confirmMsg)) return;

  currentFamilyData.members = currentFamilyData.members.filter(m => m.id !== activeMemberId);
  setUnsavedChanges(true);
  populateBranchFilter();
  updateHeaderStats();

  if (currentFamilyData.members.length > 0) {
    selectMember(currentFamilyData.family.rootId || currentFamilyData.members[0].id);
  }
});

/* ==========================================================================
   11. Save to Vercel Blob Cloud
   ========================================================================== */

async function saveToCloud() {
  if (!currentFamilyData) return;

  btnSaveCloud.disabled = true;
  btnBannerSave.disabled = true;
  btnSaveCloud.textContent = 'Saving...';
  btnBannerSave.textContent = 'Saving...';

  try {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ familyData: currentFamilyData })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      originalFamilyData = structuredClone(currentFamilyData);
      setUnsavedChanges(false);
      alert('✅ Successfully saved to Vercel Blob! Live tree is now updated.');
    } else {
      alert('❌ Failed to save: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('❌ Network error saving to cloud: ' + err.message);
  } finally {
    btnSaveCloud.disabled = false;
    btnBannerSave.disabled = false;
    btnSaveCloud.textContent = '☁️ Save to Cloud';
    btnBannerSave.textContent = '☁️ Save to Cloud Now';
  }
}

btnSaveCloud.addEventListener('click', saveToCloud);
btnBannerSave.addEventListener('click', saveToCloud);

btnBannerDiscard.addEventListener('click', () => {
  if (confirm('Discard all unsaved changes and reload from cloud?')) {
    currentFamilyData = structuredClone(originalFamilyData);
    setUnsavedChanges(false);
    if (activeMemberId) selectMember(activeMemberId);
    renderSidebarList();
  }
});

/* ==========================================================================
   12. Backup JSON Download
   ========================================================================== */

btnDownloadBackup.addEventListener('click', () => {
  if (!currentFamilyData) return;
  const jsonStr = JSON.stringify(currentFamilyData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `family-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Run bootstrap
init();

