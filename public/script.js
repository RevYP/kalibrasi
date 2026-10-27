let points = [0, 25, 50, 75, 100];

const DEFAULT_CALIBRATORS = [
    { name: 'Multifunction Process Calibrator and Control Centre Module', model: '8060+', sn: '117W25', certNo: '50-35148', calDate: '21 Nov 2025', calDue: '20 Nov 2026' },
    { name: 'Advanced pressure controller/calibrator module (0-20 bar/Vac to 2 bar)', model: '8030B/G20b/CV20', sn: '254302301', certNo: 'R251120-1', calDate: '20 Nov 2025', calDue: '19 Nov 2026' },
    { name: 'Digital Pressure Gauge Module (0 to 1 bar, 0.02% accuracy)', model: 'RMTEG-G1bG0.02', sn: '21BP24030154', certNo: 'R251120-2', calDate: '20 Nov 2025', calDue: '19 Nov 2026' },
    { name: 'Digital Pressure Gauge Module (0 to 7 bar, 0.02% accuracy)', model: 'RMTEG-G7bG0.02', sn: '21BP24030007', certNo: 'R251120-3', calDate: '20 Nov 2025', calDue: '19 Nov 2026' },
    { name: 'Pressure Measurement Module (0 to 180 mbar, 0.05% accuracy)', model: 'RTEG-G180mbG0.05M', sn: 'DPSE0252002019', certNo: 'R251120-4', calDate: '20 Nov 2025', calDue: '19 Nov 2026' },
    { name: 'Multi-Range DC Power Supply Module (0-30V, 0-3A, 90W)', model: 'M-PSW30-30', sn: '2430002', certNo: '50-35154', calDate: '20 Nov 2025', calDue: '19 Nov 2026' },
    { name: 'SiKA - Temperature LiquidbathCalibrator', model: 'TP3M165E.2i', sn: '2450002', certNo: '50-35148', calDate: '21 Nov 2025', calDue: '20 Nov 2026' },
    { name: 'Beamex Multifunction Calibrator', model: 'MC6', sn: '601949', certNo: 'MC6-9912', calDate: '01 Mar 2026', calDue: '28 Feb 2027' }
];

const DEFAULT_PERSONEL_LIST = [];

let masterCalibrators = [];
let masterPersonelList = [];
let calibratorsList = [];

let dynamicInputs = ['', '', '', '', ''];
let dynamicNominals = ['', '', '', '', ''];
let testDataBefore = ['', '', '', '', ''];
let testData = ['', '', '', '', ''];

let switchData = { contactType: 'NO', setReq: '', resetReq: '', setAct: '', resetAct: '', setContactState: 'CLOSE', resetContactState: 'OPEN' };
let currentPassStatus = 'PASS';
let localLogs = [];
let governorLogs = [];
let activeEditingDocId = null;
let activeGovEditingDocId = null;

let govRpmData = [
    { label: '3.0', cw: '', ccw: '' },
    { label: '6.0', cw: '', ccw: '' },
    { label: '9.0', cw: '', ccw: '' },
    { label: '12.0', cw: '', ccw: '' },
    { label: '15.0', cw: '', ccw: '' }
];

let currentModalBarcodeData = { tag: '', certNo: '', area: '', calDate: '', dueDate: '', docId: '', drivePdfUrl: '' };
let html5QrcodeScanner = null;
window.filteredLocalLogs = [];
window.filteredGovernorLogs = [];

window.onload = function () {
    checkLoginSession();
    initDatabaseStorage();
    resetAllFormFields();
    resetGovernorForm();
    renderCalibratorForm();
    applyPatentedInstrument();

    setTimeout(() => {
        fetchFirestoreLogs();
        fetchFirestoreGovernorLogs();
        fetchFirestorePersonel();
        fetchFirestoreCalibrators();
    }, 1000);

    const commonInputs = [
        'certNo', 'instrumentName', 'brandName', 'tagNo', 'storageLocation', 'serialNo',
        'manufacturer', 'location', 'issuedBy', 'certAddress', 'procedureId', 'envTemp', 'envRH',
        'techName', 'techNik', 'approvedByInput', 'approvedByNik', 'avpNameInput', 'avpNikInput',
        'comments', 'dueDateCustom', 'certDate'
    ];
    commonInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateCommonPreviews);
            el.addEventListener('change', updateCommonPreviews);
        }
    });

    const govInputs = [
        'govDate', 'govTagNo', 'govPartNo', 'govSerialNo', 'govType', 'govRange', 'govSpeedSetting',
        'govServo', 'govPlan', 'govQuadrant', 'govPressOilCw', 'govPressOilCcw',
        'govNeedleValve', 'govPneumaticLow', 'govPneumaticHigh', 'govComments',
        'govTechName', 'govTechTitle', 'govCalName', 'govCalTitle', 'govAvpName', 'govAvpTitle'
    ];
    govInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateGovernorPreview);
            el.addEventListener('change', updateGovernorPreview);
        }
    });
};

function getPointLabel(index, mode) {
    if (mode === 'NAIK') {
        const labels = ['0%', '25%', '50%', '75%', '100%'];
        return labels[index] || (points[index] + '%');
    } else {
        const labels = ['0%', '25%', '50%', '75%', '100%', '75%', '50%', '25%', '0%'];
        return labels[index] || (points[index] + '%');
    }
}

window.switchAppMenu = function (menuName) {
    const calView = document.getElementById('calibrationView');
    const govView = document.getElementById('governorView');
    const tabCal = document.getElementById('navTabCalibration');
    const tabGov = document.getElementById('navTabGovernor');

    if (menuName === 'governor') {
        calView.classList.add('hidden');
        govView.classList.remove('hidden');
        tabGov.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-white text-kujang-green shadow-md";
        tabCal.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/10";
        updateGovernorPreview();
    } else {
        govView.classList.add('hidden');
        calView.classList.remove('hidden');
        tabCal.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-white text-kujang-green shadow-md";
        tabGov.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/10";
        updateCommonPreviews();
    }
};

window.executeLoginProcess = function () {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    if (u.toLowerCase() === 'admin' && p === 'admin123') {
        sessionStorage.setItem('kujang_logged_user', u);
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('loginError').classList.add('hidden');
        document.getElementById('currentUserLabel').innerText = u;
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
};

function checkLoginSession() {
    const user = sessionStorage.getItem('kujang_logged_user');
    if (user) {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('currentUserLabel').innerText = user;
    } else {
        document.getElementById('loginModal').classList.remove('hidden');
    }
}

window.handleLogout = function () {
    if (confirm('Keluar dari sistem?')) {
        sessionStorage.removeItem('kujang_logged_user');
        location.reload();
    }
};

function resetAllFormFields() {
    activeEditingDocId = null;
    const els = ['issuedBy', 'certNo', 'certAddress', 'tagNo', 'brandName', 'storageLocation', 'instrumentName', 'manufacturer', 'serialNo', 'location', 'comments', 'procedureId', 'inputMin', 'inputMax', 'outputMin', 'outputMax', 'tolerance', 'certDate', 'dueDateCustom', 'techName', 'techNik', 'approvedByInput', 'approvedByNik', 'avpNameInput', 'avpNikInput'];
    els.forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ''; });
    if (document.getElementById('certAddress')) document.getElementById('certAddress').value = 'PS-PK-WASES-03';
    document.getElementById('envTemp').value = '22.0°C ±4°C';
    document.getElementById('envRH').value = '50% RH ±10% RH';

    if (document.getElementById('testPointModeSelect')) {
        document.getElementById('testPointModeSelect').value = 'NAIK';
    }
    if (document.getElementById('useBeforeAfter')) {
        document.getElementById('useBeforeAfter').checked = false;
    }
    handleTestPointModeChange();

    switchData = { contactType: 'NO', setReq: '', resetReq: '', setAct: '', resetAct: '', setContactState: 'CLOSE', resetContactState: 'OPEN' };
    updateCommonPreviews();
}

function initDatabaseStorage() {
    masterCalibrators = DEFAULT_CALIBRATORS;
    masterPersonelList = DEFAULT_PERSONEL_LIST;
    if (!calibratorsList.length) calibratorsList = [{ name: masterCalibrators[0].name, sn: masterCalibrators[0].sn, certNo: masterCalibrators[0].certNo, calDate: masterCalibrators[0].calDate, calDue: masterCalibrators[0].calDue }];
}

window.handleTestPointModeChange = function () {
    const modeSelect = document.getElementById('testPointModeSelect');
    const mode = modeSelect ? modeSelect.value : 'NAIK';
    if (mode === 'NAIK') {
        points = [0, 25, 50, 75, 100];
    } else {
        points = [0, 25, 50, 75, 100, 75, 50, 25, 0];
    }
    dynamicInputs = new Array(points.length).fill('');
    dynamicNominals = new Array(points.length).fill('');
    testDataBefore = new Array(points.length).fill('');
    testData = new Array(points.length).fill('');
    resetNominalToCalculated();
};

window.openAddAvpModal = function () { document.getElementById('addAvpModal').classList.remove('hidden'); renderPersonelListModal(); };
window.closeAddAvpModal = function () { document.getElementById('addAvpModal').classList.add('hidden'); };

function compressImage(file, maxWidth, callback) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            let width = img.width, height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/png', 0.8));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function fetchFirestorePersonel() {
    if (!window.db || !window.firestoreTools) return;
    try {
        const { collection, getDocs } = window.firestoreTools;
        const querySnapshot = await getDocs(collection(window.db, "master_personel"));
        const cloudList = [];
        querySnapshot.forEach(docSnap => cloudList.push({ id: docSnap.id, ...docSnap.data() }));
        if (cloudList.length > 0) masterPersonelList = cloudList;
        else for (let p of DEFAULT_PERSONEL_LIST) await savePersonelToFirestore(p);
        renderPersonelDropdowns();
    } catch (e) { console.error("Gagal get Personel Firestore:", e); }
}

async function savePersonelToFirestore(personData) {
    if (!window.db || !window.firestoreTools) return;
    const { collection, addDoc, doc, updateDoc } = window.firestoreTools;
    if (personData.id) await updateDoc(doc(window.db, "master_personel", personData.id), personData);
    else { const docRef = await addDoc(collection(window.db, "master_personel"), personData); personData.id = docRef.id; }
}

window.handleSavePersonel = function (e) {
    if (e) e.preventDefault();
    const editId = document.getElementById('editingPersonelId').value;
    const role = document.getElementById('newPersonRole').value;
    const name = document.getElementById('newPersonName').value.trim();
    const nik = document.getElementById('newPersonNik').value.trim();
    const title = document.getElementById('newPersonTitle').value.trim();
    const fileInput = document.getElementById('newPersonImgFile');

    if (!name || !nik || !title) return alert('Data wajib diisi!');

    const processAndSave = async (imgData) => {
        let existingImg = imgData;
        if (!imgData && editId) { const cur = masterPersonelList.find(p => p.id === editId); if (cur) existingImg = cur.img || ''; }
        const personData = { role, name, nik, title, img: existingImg };
        if (editId) {
            personData.id = editId;
            await savePersonelToFirestore(personData);
            const idx = masterPersonelList.findIndex(p => p.id === editId);
            if (idx !== -1) masterPersonelList[idx] = personData;
        } else {
            await savePersonelToFirestore(personData);
            masterPersonelList.push(personData);
        }

        document.getElementById('editingPersonelId').value = "";
        document.getElementById('newPersonName').value = "";
        document.getElementById('newPersonNik').value = "";
        document.getElementById('newPersonTitle').value = "";
        document.getElementById('btnSavePersonel').innerText = "Simpan Personel";

        renderPersonelDropdowns();
        renderPersonelListModal();
    };

    if (fileInput && fileInput.files && fileInput.files[0]) compressImage(fileInput.files[0], 250, processAndSave);
    else processAndSave('');
};

window.renderPersonelListModal = function () {
    const container = document.getElementById('personelListContainer');
    if (!container) return;
    if (masterPersonelList.length === 0) { container.innerHTML = `<p class="text-slate-400 italic text-center py-2">Belum ada personel.</p>`; return; }
    container.innerHTML = masterPersonelList.map((p, idx) => `
        <div class="p-2 bg-slate-100 rounded border flex justify-between items-center text-[11px]">
            <div><p class="font-bold text-slate-900">${p.name} <span class="text-kujang-green">(${p.nik})</span></p><p class="text-slate-600">${p.role} - ${p.title}</p></div>
            <div class="flex gap-1">
                <button type="button" onclick="editPersonel(${idx})" class="text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded border border-emerald-200">Edit</button>
                <button type="button" onclick="deletePersonel('${p.id}', ${idx})" class="text-red-600 font-bold px-2 py-1 bg-red-50 rounded border border-red-200">Hapus</button>
            </div>
        </div>`).join('');
};

window.editPersonel = function (index) {
    const p = masterPersonelList[index];
    document.getElementById('editingPersonelId').value = p.id || '';
    document.getElementById('newPersonRole').value = p.role;
    document.getElementById('newPersonName').value = p.name;
    document.getElementById('newPersonNik').value = p.nik;
    document.getElementById('newPersonTitle').value = p.title;
    document.getElementById('btnSavePersonel').innerText = "Update Personel";
};

window.deletePersonel = async function (docId, index) {
    if (confirm('Hapus personel ini?')) {
        if (docId && window.db && window.firestoreTools) {
            const { doc, deleteDoc } = window.firestoreTools;
            await deleteDoc(doc(window.db, "master_personel", docId));
        }
        masterPersonelList.splice(index, 1);
        renderPersonelDropdowns();
        renderPersonelListModal();
    }
};

function renderPersonelDropdowns() {
    const techSel = document.getElementById('techSelect'), appSel = document.getElementById('approvedSelect'), avpSel = document.getElementById('avpSelect');
    const govTechSel = document.getElementById('govTechSelect'), govCalSel = document.getElementById('govCalSelect'), govAvpSel = document.getElementById('govAvpSelect');

    let techHtml = `<option value="">-- Pilih Teknisi --</option>`, appHtml = `<option value="">-- Pilih Supervisor --</option>`, avpHtml = `<option value="">-- Pilih AVP --</option>`;
    let govTechHtml = `<option value="">-- Pilih Teknisi --</option>`, govCalHtml = `<option value="">-- Pilih Engineer --</option>`, govAvpHtml = `<option value="">-- Pilih AVP --</option>`;

    masterPersonelList.forEach((p, idx) => {
        const opt = `<option value="${idx}">${p.name} - NIK: ${p.nik} (${p.title || p.role})</option>`;
        if (p.role === 'TEKNISI') { techHtml += opt; govTechHtml += opt; }
        else if (p.role === 'SUPERVISOR') { appHtml += opt; govCalHtml += opt; }
        else if (p.role === 'AVP') { avpHtml += opt; govAvpHtml += opt; }
        else { techHtml += opt; appHtml += opt; avpHtml += opt; govTechHtml += opt; govCalHtml += opt; govAvpHtml += opt; }
    });

    if (techSel) techSel.innerHTML = techHtml; if (appSel) appSel.innerHTML = appHtml; if (avpSel) avpSel.innerHTML = avpHtml;
    if (govTechSel) govTechSel.innerHTML = govTechHtml; if (govCalSel) govCalSel.innerHTML = govCalHtml; if (govAvpSel) govAvpSel.innerHTML = govAvpHtml;
}

window.updateSelectedPerson = function (type) {
    const applyPerson = (selId, nameId, nikId, imgId, isAvp = false) => {
        const idx = document.getElementById(selId).value;
        const p = masterPersonelList[idx];
        if (p) {
            document.getElementById(nameId).value = p.name;
            document.getElementById(nikId).value = p.nik;
            const imgEl = document.getElementById(imgId);
            if (p.img) { imgEl.src = p.img; imgEl.classList.remove('hidden'); } else { imgEl.src = ''; imgEl.classList.add('hidden'); }
            if (isAvp) document.getElementById('viewAvpTitleLabel').innerText = p.title || 'AVP Signed:';
        }
    };
    if (type === 'tech') applyPerson('techSelect', 'techName', 'techNik', 'viewTechSignImg');
    else if (type === 'approved') applyPerson('approvedSelect', 'approvedByInput', 'approvedByNik', 'viewApprovedSignImg');
    else if (type === 'avp') applyPerson('avpSelect', 'avpNameInput', 'avpNikInput', 'viewAvpSignImg', true);
    updateCommonPreviews();
};

window.updateGovernorPerson = function (type) {
    const applyGovPerson = (selId, nameId, titleId, imgId, defTitle) => {
        const idx = document.getElementById(selId).value;
        const p = masterPersonelList[idx];
        if (p) {
            document.getElementById(nameId).value = p.name;
            document.getElementById(titleId).value = p.title || defTitle;
            const imgEl = document.getElementById(imgId);
            if (p.img) { imgEl.src = p.img; imgEl.classList.remove('hidden'); } else { imgEl.src = ''; imgEl.classList.add('hidden'); }
        }
    };
    if (type === 'tech') applyGovPerson('govTechSelect', 'govTechName', 'govTechTitle', 'viewGovTechSignImg', '( Sr.Technician )');
    else if (type === 'cal') applyGovPerson('govCalSelect', 'govCalName', 'govCalTitle', 'viewGovCalSignImg', '( Jr.Engineer )');
    else if (type === 'avp') applyGovPerson('govAvpSelect', 'govAvpName', 'govAvpTitle', 'viewGovAvpSignImg', '( AVP )');
    updateGovernorPreview();
};

window.updateCommonPreviews = function () {
    document.getElementById('viewIssuedBy').innerText = document.getElementById('issuedBy').value.trim() || '-';
    document.getElementById('viewCertNo').innerText = document.getElementById('certNo').value.trim() || '-';
    document.getElementById('viewCertAddress').innerText = document.getElementById('certAddress').value.trim() || '';
    document.getElementById('viewTagNo').innerText = document.getElementById('tagNo').value.trim() || '-';
    document.getElementById('viewBrandName').innerText = document.getElementById('brandName').value.trim() || '-';
    document.getElementById('viewStorageLocation').innerText = document.getElementById('storageLocation').value.trim() || '-';
    document.getElementById('viewProcedure').innerText = document.getElementById('procedureSelect').value || '-';
    document.getElementById('viewInstrumentName').innerText = document.getElementById('instrumentName').value.trim() || '-';
    document.getElementById('viewManufacturer').innerText = document.getElementById('manufacturer').value.trim() || '-';
    document.getElementById('viewSerialNo').innerText = document.getElementById('serialNo').value.trim() || '-';
    document.getElementById('viewLocation').innerText = document.getElementById('location').value.trim() || '-';
    const commentsEl = document.getElementById('comments'); if (commentsEl) document.getElementById('viewComments').innerText = commentsEl.value.trim() || '-';

    const inMinVal = document.getElementById('inputMin').value, inMaxVal = document.getElementById('inputMax').value, outMinVal = document.getElementById('outputMin').value, outMaxVal = document.getElementById('outputMax').value;
    const unitIn = getActiveUnit('In'), unitOut = getActiveUnit('Out'), tol = document.getElementById('tolerance').value, ambientTag = document.getElementById('useAmbientAsZero').checked ? ' [0% = Ambient]' : '';

    document.getElementById('viewInputRange').innerText = (inMinVal !== '' && inMaxVal !== '')
        ? `${inMinVal} to ${inMaxVal} ${unitIn}${ambientTag}`
        : `- ${unitIn}${ambientTag}`;

    document.getElementById('viewOutputRange').innerText = (outMinVal !== '' && outMaxVal !== '')
        ? `${outMinVal} to ${outMaxVal} ${unitOut}`
        : `- ${unitOut}`;

    if (document.getElementById('instrumentType').value === 'PRESS_SWITCH') document.getElementById('viewRejectError').innerText = tol !== '' ? `Max Dev ±${tol} ${unitIn}` : '-';
    else document.getElementById('viewRejectError').innerText = tol !== '' ? `${tol}% (${document.getElementById('errorMethod').value === 'SPAN' ? 'Span' : 'Reading'})` : '-';

    const rawDate = document.getElementById('certDate').value; document.getElementById('viewCertDate').innerText = rawDate ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
    const rawDue = document.getElementById('dueDateCustom').value; document.getElementById('viewDueDate').innerText = rawDue ? new Date(rawDue).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

    document.getElementById('viewEnvTemp').innerText = document.getElementById('envTemp').value || '-';
    document.getElementById('viewEnvRH').innerText = document.getElementById('envRH').value || '-';

    document.getElementById('viewTechName').innerText = document.getElementById('techName').value.trim() || '-'; document.getElementById('viewTechNik').innerText = document.getElementById('techNik').value.trim() || '-';
    document.getElementById('viewSuperName').innerText = document.getElementById('approvedByInput').value.trim() || '-'; document.getElementById('viewSuperNik').innerText = document.getElementById('approvedByNik').value.trim() || '-';
    document.getElementById('viewAvpName').innerText = document.getElementById('avpNameInput').value.trim() || '-'; document.getElementById('viewAvpNik').innerText = document.getElementById('avpNikInput').value.trim() || '-';
};

window.handleGovSpeedSettingChange = function () {
    const speedSetting = document.getElementById('govSpeedSetting') ? document.getElementById('govSpeedSetting').value : 'Pneumatic & Dial';
    const lowEl = document.getElementById('govPneumaticLow');
    const highEl = document.getElementById('govPneumaticHigh');

    if (speedSetting === 'Dial') {
        govRpmData = [
            { label: '0%', cw: '', ccw: '' },
            { label: '100%', cw: '', ccw: '' }
        ];
        if (lowEl) lowEl.value = '';
        if (highEl) highEl.value = '';
    } else {
        govRpmData = [
            { label: '3.0', cw: '', ccw: '' },
            { label: '6.0', cw: '', ccw: '' },
            { label: '9.0', cw: '', ccw: '' },
            { label: '12.0', cw: '', ccw: '' },
            { label: '15.0', cw: '', ccw: '' }
        ];
        if (lowEl && !lowEl.value) lowEl.value = '3.0 PSI';
        if (highEl && !highEl.value) highEl.value = '15.0 PSI';
    }
    renderGovernorRpmTableInputs();
    updateGovernorPreview();
};

window.resetGovernorForm = function () {
    activeGovEditingDocId = null;

    const els = [
        'govDate', 'govTagNo', 'govPartNo', 'govSerialNo', 'govType', 'govRange',
        'govPressOilCw', 'govPressOilCcw', 'govPneumaticLow', 'govPneumaticHigh',
        'govComments', 'govTechName', 'govCalName', 'govAvpName',
        'govServo', 'govPlan', 'govQuadrant', 'govNeedleValve'
    ];

    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    ['govTechSelect', 'govCalSelect', 'govAvpSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    ['viewGovTechSignImg', 'viewGovCalSignImg', 'viewGovAvpSignImg'].forEach(id => {
        const img = document.getElementById(id);
        if (img) { img.src = ''; img.classList.add('hidden'); }
    });

    if (document.getElementById('govSpeedSetting')) document.getElementById('govSpeedSetting').value = 'Pneumatic & Dial';
    if (document.getElementById('govTechTitle')) document.getElementById('govTechTitle').value = '( Sr.Technician )';
    if (document.getElementById('govCalTitle')) document.getElementById('govCalTitle').value = '( Jr.Engineer )';
    if (document.getElementById('govAvpTitle')) document.getElementById('govAvpTitle').value = '( AVP )';

    handleGovSpeedSettingChange();
};

function renderGovernorRpmTableInputs() {
    const tbody = document.getElementById('govRpmTableInputs');
    const col1Header = document.getElementById('govTableCol1Header');
    const speedSetting = document.getElementById('govSpeedSetting') ? document.getElementById('govSpeedSetting').value : 'Pneumatic & Dial';

    if (col1Header) col1Header.innerText = speedSetting === 'Dial' ? 'Dial' : 'PSI';
    if (!tbody) return;

    tbody.innerHTML = govRpmData.map((item, idx) => `
        <tr class="border-b">
            <td class="p-1 border font-bold bg-slate-50">${item.label || item.psi || ''}</td>
            <td class="p-1 border"><input type="text" value="${item.cw || ''}" placeholder="CW RPM" class="w-full p-1 border rounded text-center outline-none" oninput="govRpmData[${idx}].cw=this.value; updateGovernorPreview();"></td>
            <td class="p-1 border"><input type="text" value="${item.ccw || ''}" placeholder="CCW RPM" class="w-full p-1 border rounded text-center outline-none" oninput="govRpmData[${idx}].ccw=this.value; updateGovernorPreview();"></td>
        </tr>`).join('');
}

window.updateGovernorPreview = function () {
    const rawDate = document.getElementById('govDate') ? document.getElementById('govDate').value : '';
    const viewGovDate = document.getElementById('viewGovDate');
    if (viewGovDate) {
        viewGovDate.innerText = rawDate ? new Date(rawDate).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
    }

    const setPreviewText = (elemId, val) => {
        const el = document.getElementById(elemId);
        if (el) el.innerText = val || '-';
    };

    setPreviewText('viewGovTagNo', document.getElementById('govTagNo') ? document.getElementById('govTagNo').value.trim() : '');
    setPreviewText('viewGovPartNo', document.getElementById('govPartNo') ? document.getElementById('govPartNo').value.trim() : '');
    setPreviewText('viewGovSerialNo', document.getElementById('govSerialNo') ? document.getElementById('govSerialNo').value.trim() : '');

    setPreviewText('viewGovType', document.getElementById('govType') ? document.getElementById('govType').value.trim() : '');
    setPreviewText('viewGovRange', document.getElementById('govRange') ? document.getElementById('govRange').value.trim() : '');

    const speedSetting = document.getElementById('govSpeedSetting') ? document.getElementById('govSpeedSetting').value : 'Pneumatic & Dial';
    setPreviewText('viewGovSpeedSetting', speedSetting);

    const viewCol1Header = document.getElementById('viewGovTableCol1Header');
    if (viewCol1Header) viewCol1Header.innerText = speedSetting === 'Dial' ? 'Dial' : 'PSI';

    setPreviewText('viewGovServo', document.getElementById('govServo') ? document.getElementById('govServo').value.trim() : '');
    setPreviewText('viewGovPlan', document.getElementById('govPlan') ? document.getElementById('govPlan').value.trim() : '');
    setPreviewText('viewGovQuadrant', document.getElementById('govQuadrant') ? document.getElementById('govQuadrant').value.trim() : '');

    const cwOil = document.getElementById('govPressOilCw') ? document.getElementById('govPressOilCw').value.trim() : '';
    const ccwOil = document.getElementById('govPressOilCcw') ? document.getElementById('govPressOilCcw').value.trim() : '';
    setPreviewText('viewGovPressOilCw', cwOil ? `${cwOil} CW` : '');
    setPreviewText('viewGovPressOilCcw', ccwOil ? `${ccwOil} CCW` : '');

    const needleVal = document.getElementById('govNeedleValve') ? document.getElementById('govNeedleValve').value.trim() : '';
    setPreviewText('viewGovNeedleValve', needleVal ? `${needleVal} (final adjustment to be done in field)` : '');

    setPreviewText('viewGovPneumaticLow', document.getElementById('govPneumaticLow') ? document.getElementById('govPneumaticLow').value.trim() : '');
    setPreviewText('viewGovPneumaticHigh', document.getElementById('govPneumaticHigh') ? document.getElementById('govPneumaticHigh').value.trim() : '');

    const commentsEl = document.getElementById('govComments');
    if (commentsEl) setPreviewText('viewGovComments', commentsEl.value.trim());

    const rpmBody = document.getElementById('viewGovRpmTableBody');
    if (rpmBody) {
        rpmBody.innerHTML = govRpmData.map(item => `
            <tr>
                <td class="p-1.5 border-r border-black font-bold bg-slate-50">${item.label || item.psi || '-'}</td>
                <td class="p-1.5 border-r border-black font-semibold">${item.cw || '-'}</td>
                <td class="p-1.5 font-semibold">${item.ccw || '-'}</td>
            </tr>`).join('');
    }

    setPreviewText('viewGovTechName', document.getElementById('govTechName') ? document.getElementById('govTechName').value.trim() : '');
    setPreviewText('viewGovTechTitle', document.getElementById('govTechTitle') ? document.getElementById('govTechTitle').value.trim() : '( Sr.Technician )');
    setPreviewText('viewGovCalName', document.getElementById('govCalName') ? document.getElementById('govCalName').value.trim() : '');
    setPreviewText('viewGovCalTitle', document.getElementById('govCalTitle') ? document.getElementById('govCalTitle').value.trim() : '( Jr.Engineer )');
    setPreviewText('viewGovAvpName', document.getElementById('govAvpName') ? document.getElementById('govAvpName').value.trim() : '');
    setPreviewText('viewGovAvpTitle', document.getElementById('govAvpTitle') ? document.getElementById('govAvpTitle').value.trim() : '( AVP )');
};

window.saveAndPrintGovernorPDF = async function () {
    const getValue = (id) => document.getElementById(id) ? document.getElementById(id).value.trim() : '';

    const govData = {
        created_at: new Date().toISOString(),
        timestamp: new Date().toLocaleString('id-ID'),
        date: getValue('govDate') || '-',
        tagNo: getValue('govTagNo') || '-',
        partNo: getValue('govPartNo') || '-',
        serialNo: getValue('govSerialNo') || '-',
        govType: getValue('govType') || '-',
        range: getValue('govRange') || '-',
        speedSetting: getValue('govSpeedSetting') || 'Pneumatic & Dial',
        servo: getValue('govServo'),
        plan: getValue('govPlan'),
        quadrant: getValue('govQuadrant'),
        pressOilCw: getValue('govPressOilCw'),
        pressOilCcw: getValue('govPressOilCcw'),
        needleValve: getValue('govNeedleValve'),
        pneumaticLow: getValue('govPneumaticLow'),
        pneumaticHigh: getValue('govPneumaticHigh'),
        comments: getValue('govComments'),
        techName: getValue('govTechName'),
        techTitle: getValue('govTechTitle'),
        calName: getValue('govCalName'),
        calTitle: getValue('govCalTitle'),
        avpName: getValue('govAvpName'),
        avpTitle: getValue('govAvpTitle'),
        rpmData: JSON.parse(JSON.stringify(govRpmData))
    };

    if (window.db && window.firestoreTools) {
        try {
            const { collection, addDoc, doc, updateDoc } = window.firestoreTools;
            if (activeGovEditingDocId) {
                await updateDoc(doc(window.db, "governor_test_records", activeGovEditingDocId), govData);
                govData.docId = activeGovEditingDocId;
                const idx = governorLogs.findIndex(l => l.docId === activeGovEditingDocId);
                if (idx !== -1) governorLogs[idx] = govData;
            } else {
                const docRef = await addDoc(collection(window.db, "governor_test_records"), govData);
                govData.docId = docRef.id;
                activeGovEditingDocId = docRef.id;
                governorLogs.unshift(govData);
            }
        } catch (err) {
            console.error("Gagal menyimpan data Governor:", err);
            alert("Gagal menyimpan ke database. Silakan coba lagi.");
            return;
        }
    }

    renderGovLogTable();
    updateGovernorPreview();

    const originalTitle = document.title;
    document.title = `Test_Record_Governor_${govData.tagNo}`;
    window.print();
    document.title = originalTitle;
};

window.openMasterCalibratorModal = function () { document.getElementById('masterCalibratorModal').classList.remove('hidden'); renderMasterCalibratorList(); };
window.closeMasterCalibratorModal = function () { document.getElementById('masterCalibratorModal').classList.add('hidden'); };

async function fetchFirestoreCalibrators() {
    if (!window.db || !window.firestoreTools) return;
    const { collection, getDocs } = window.firestoreTools;
    const querySnapshot = await getDocs(collection(window.db, "master_calibrators"));
    const cloudCalibrators = [];
    querySnapshot.forEach(docSnap => cloudCalibrators.push({ id: docSnap.id, ...docSnap.data() }));
    if (cloudCalibrators.length > 0) masterCalibrators = cloudCalibrators;
    else for (let cal of DEFAULT_CALIBRATORS) await saveCalibratorToFirestore(cal);
    renderCalibratorForm();
}

async function saveCalibratorToFirestore(calData) {
    if (!window.db || !window.firestoreTools) return;
    const { collection, addDoc, doc, updateDoc } = window.firestoreTools;
    if (calData.id) await updateDoc(doc(window.db, "master_calibrators", calData.id), calData);
    else { const docRef = await addDoc(collection(window.db, "master_calibrators"), calData); calData.id = docRef.id; }
}

window.handleSaveNewMasterCalibrator = async function (e) {
    if (e) e.preventDefault();
    const editId = document.getElementById('editingCalId').value;
    const calData = {
        name: document.getElementById('newCalName').value.trim(),
        model: document.getElementById('newCalModel').value.trim(),
        sn: document.getElementById('newCalSn').value.trim(),
        certNo: document.getElementById('newCalCertNo').value.trim(),
        calDate: document.getElementById('newCalDate').value.trim(),
        calDue: document.getElementById('newCalDue').value.trim()
    };
    if (!calData.name || !calData.sn) return alert('Nama alat dan Serial No. wajib diisi!');

    if (editId) {
        calData.id = editId;
        await saveCalibratorToFirestore(calData);
        const idx = masterCalibrators.findIndex(c => c.id === editId);
        if (idx !== -1) masterCalibrators[idx] = calData;
    } else {
        await saveCalibratorToFirestore(calData);
        masterCalibrators.push(calData);
    }
    cancelCalibratorEdit();
    renderMasterCalibratorList();
    renderCalibratorForm();
};

function renderMasterCalibratorList() {
    const container = document.getElementById('masterCalibratorListContainer'); if (!container) return;
    if (masterCalibrators.length === 0) {
        container.innerHTML = `<p class="text-slate-400 italic text-center py-4">Belum ada master calibrator tersimpan.</p>`;
        return;
    }

    let html = `
        <table class="w-full text-left text-xs border-collapse">
            <thead>
                <tr class="bg-emerald-50/80 border-b border-emerald-100 text-kujang-darkgreen font-bold">
                    <th class="p-2 border border-slate-200">Keterangan / Nama Alat</th>
                    <th class="p-2 border border-slate-200">Serial No.</th>
                    <th class="p-2 border border-slate-200">Cert No.</th>
                    <th class="p-2 border border-slate-200">Cal Due</th>
                    <th class="p-2 border border-slate-200 text-center w-20">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-800">`;

    masterCalibrators.forEach((c, idx) => {
        html += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-2 border border-slate-200 font-semibold text-slate-900">
                    ${c.name} ${c.model ? `<span class="text-slate-500 font-normal">(${c.model})</span>` : ''}
                </td>
                <td class="p-2 border border-slate-200 font-bold font-mono text-emerald-800">${c.sn || '-'}</td>
                <td class="p-2 border border-slate-200 font-medium">${c.certNo || '-'}</td>
                <td class="p-2 border border-slate-200 font-medium">${c.calDue || '-'}</td>
                <td class="p-2 border border-slate-200 text-center">
                    <div class="flex justify-center gap-1">
                        <button type="button" onclick="editMasterCalibrator(${idx})" title="Edit" class="text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" onclick="deleteMasterCalibrator('${c.id || ''}', ${idx})" title="Hapus" class="text-red-600 font-bold px-2 py-0.5 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.editMasterCalibrator = function (index) {
    const c = masterCalibrators[index];
    if (!c) return;
    document.getElementById('editingCalId').value = c.id || '';
    document.getElementById('newCalName').value = c.name || '';
    document.getElementById('newCalModel').value = c.model || '';
    document.getElementById('newCalSn').value = c.sn || '';
    document.getElementById('newCalCertNo').value = c.certNo || '';
    document.getElementById('newCalDate').value = c.calDate || '';
    document.getElementById('newCalDue').value = c.calDue || '';
    document.getElementById('calFormHeaderTitle').innerText = 'Edit Master Calibrator:';
    document.getElementById('btnSaveMasterCal').innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Update Master';
    document.getElementById('btnCancelCalEdit').classList.remove('hidden');
};

window.deleteMasterCalibrator = async function (docId, index) {
    if (confirm('Hapus master calibrator ini dari database?')) {
        if (docId && window.db && window.firestoreTools) {
            try {
                const { doc, deleteDoc } = window.firestoreTools;
                await deleteDoc(doc(window.db, "master_calibrators", docId));
            } catch (e) { console.error("Gagal hapus master di DB", e); }
        }
        masterCalibrators.splice(index, 1);
        renderMasterCalibratorList();
        renderCalibratorForm();
    }
};

window.cancelCalibratorEdit = function () {
    document.getElementById('editingCalId').value = '';
    document.getElementById('newCalName').value = '';
    document.getElementById('newCalModel').value = '';
    document.getElementById('newCalSn').value = '';
    document.getElementById('newCalCertNo').value = '';
    document.getElementById('newCalDate').value = '';
    document.getElementById('newCalDue').value = '';
    document.getElementById('calFormHeaderTitle').innerText = 'Tambah Master Calibrator Baru:';
    document.getElementById('btnSaveMasterCal').innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-1"></i> Simpan ke DB';
    document.getElementById('btnCancelCalEdit').classList.add('hidden');
};

function renderCalibratorForm() {
    const container = document.getElementById('calibratorsContainer'); if (!container) return; container.innerHTML = '';
    calibratorsList.forEach((item, index) => {
        const div = document.createElement('div'); div.className = 'p-2.5 bg-slate-50 border rounded-lg flex flex-col gap-1.5 shadow-sm';
        div.innerHTML = `<div class="flex justify-between items-center"><span class="font-bold text-[10px]">Alat Standar #${index + 1}</span>${calibratorsList.length > 1 ? `<button type="button" onclick="removeCalibratorRow(${index})" class="text-red-500 font-bold text-xs">&times;</button>` : ''}</div><select class="w-full p-1 border rounded text-[10px] font-bold" onchange="selectPresetCalibrator(${index}, this.value)"><option value="">-- Pilih Master --</option>${masterCalibrators.map((p, pIdx) => `<option value="${pIdx}" ${item.sn === p.sn ? 'selected' : ''}>${p.name} (${p.sn})</option>`).join('')}</select><input type="text" value="${item.name}" placeholder="Deskripsi / Nama Alat" class="w-full p-1 border rounded text-[10px]" oninput="updateCalibratorItem(${index}, 'name', this.value)"><div class="grid grid-cols-2 gap-1"><input type="text" value="${item.sn}" placeholder="Serial No." class="p-1 border rounded text-[9.5px] font-bold" oninput="updateCalibratorItem(${index}, 'sn', this.value)"><input type="text" value="${item.certNo}" placeholder="Cert No." class="p-1 border rounded text-[9.5px] font-bold" oninput="updateCalibratorItem(${index}, 'certNo', this.value)"><input type="text" value="${item.calDate}" placeholder="Cal Date" class="p-1 border rounded text-[9.5px]" oninput="updateCalibratorItem(${index}, 'calDate', this.value)"><input type="text" value="${item.calDue}" placeholder="Cal Due Date" class="p-1 border rounded text-[9.5px]" oninput="updateCalibratorItem(${index}, 'calDue', this.value)"></div>`;
        container.appendChild(div);
    });
    renderCalibratorPreview();
}
window.updateCalibratorItem = function (index, field, value) { calibratorsList[index][field] = value; renderCalibratorPreview(); };
window.selectPresetCalibrator = function (index, val) { if (val === '') return; const preset = masterCalibrators[parseInt(val)]; if (preset) { calibratorsList[index] = { ...preset }; renderCalibratorForm(); } };
window.addCalibratorRow = function () { calibratorsList.push({ name: '', sn: '', certNo: '', calDate: '', calDue: '' }); renderCalibratorForm(); };
window.removeCalibratorRow = function (index) { calibratorsList.splice(index, 1); renderCalibratorForm(); };
function renderCalibratorPreview() {
    const tbody = document.getElementById('viewCalibratorsTable'); if (!tbody) return;
    if (calibratorsList.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="italic text-slate-400 text-center">Belum ada calibrator</td></tr>`; return; }
    tbody.innerHTML = calibratorsList.map(c => `<tr><td class="font-bold">${c.name || '-'}</td><td>${c.sn || '-'}</td><td>${c.certNo || '-'}</td><td>${c.calDate || '-'}</td><td>${c.calDue || '-'}</td></tr>`).join('');
}

window.autoCalculateDueDate = function () {
    const rawDate = document.getElementById('certDate').value;
    if (rawDate) { const d = new Date(rawDate); d.setFullYear(d.getFullYear() + 2); document.getElementById('dueDateCustom').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    calculateData();
};
window.updateProcedureField = function () { document.getElementById('viewProcedure').innerText = document.getElementById('procedureSelect').value; };
window.handleUnitChange = function (type) { const sel = document.getElementById(`unit${type}Select`); const custom = document.getElementById(`unit${type}Custom`); if (sel.value === 'CUSTOM') custom.classList.remove('hidden'); else { custom.classList.add('hidden'); custom.value = ''; } calculateData(); };
function getActiveUnit(type) { const sel = document.getElementById(`unit${type}Select`); return sel.value === 'CUSTOM' ? (document.getElementById(`unit${type}Custom`).value || 'unit') : sel.value; }
window.applyPatentedInstrument = function () {
    const type = document.getElementById('instrumentType').value;
    const ambCon = document.getElementById('ambientContainer'), uIn = document.getElementById('unitInSelect'), uOut = document.getElementById('unitOutSelect'), iName = document.getElementById('instrumentName'), pSel = document.getElementById('procedureSelect'), errBox = document.getElementById('errorMethodBox'), oCon = document.getElementById('outputRangeContainer'), uOutBox = document.getElementById('unitOutBox'), vOut = document.getElementById('viewOutputRangeRow'), tolL = document.getElementById('tolLabel');
    if (type === 'PRESS_SWITCH') {
        ambCon.classList.add('hidden'); document.getElementById('useAmbientAsZero').checked = false; uIn.value = 'bar'; iName.placeholder = 'Pressure Switch'; pSel.value = 'PRESSURE'; errBox.classList.add('hidden'); oCon.classList.add('hidden'); uOutBox.classList.add('hidden'); if (vOut) vOut.classList.add('hidden'); tolL.innerText = 'Max Tolerance';
    } else {
        errBox.classList.remove('hidden'); oCon.classList.remove('hidden'); uOutBox.classList.remove('hidden'); if (vOut) vOut.classList.remove('hidden'); tolL.innerText = 'Reject Error Max (%)';
        if (type === 'TEMP_ELEMENT') { ambCon.classList.remove('hidden'); document.getElementById('useAmbientAsZero').checked = true; uIn.value = 'celcius'; uOut.value = 'celcius'; iName.placeholder = 'Temperature Element'; pSel.value = 'TEMPERATURE'; }
        else if (type === 'TEMP_TRANSMITTER') { ambCon.classList.remove('hidden'); document.getElementById('useAmbientAsZero').checked = true; uIn.value = 'celcius'; uOut.value = 'mA'; iName.placeholder = 'Temperature Transmitter'; pSel.value = 'TEMPERATURE'; }
        else if (type === 'PRESS_TRANSMITTER') { ambCon.classList.add('hidden'); document.getElementById('useAmbientAsZero').checked = false; uIn.value = 'mbar'; uOut.value = 'mA'; iName.placeholder = 'Pressure Transmitter'; pSel.value = 'PRESSURE'; }
        else if (type === 'PRESS_PNEUMATIC') { ambCon.classList.add('hidden'); document.getElementById('useAmbientAsZero').checked = false; uIn.value = 'bar'; uOut.value = 'bar'; iName.placeholder = 'Pressure Pneumatic'; pSel.value = 'PRESSURE'; }
    }
    handleUnitChange('In'); handleUnitChange('Out'); toggleAmbientInput(); resetNominalToCalculated();
};
window.toggleAmbientInput = function () { document.getElementById('ambientValBox').classList.toggle('hidden', !document.getElementById('useAmbientAsZero').checked); };
window.resetNominalToCalculated = function () {
    if (document.getElementById('instrumentType').value === 'PRESS_SWITCH') { switchFormat(); return; }
    const inMin = parseFloat(document.getElementById('inputMin').value) || 0, inMax = parseFloat(document.getElementById('inputMax').value) || 0, outMin = parseFloat(document.getElementById('outputMin').value) || 0, outMax = parseFloat(document.getElementById('outputMax').value) || 0;
    const uIn = getActiveUnit('In'), uOut = getActiveUnit('Out'), amb = parseFloat(document.getElementById('ambientTemp').value) || 0, useAmb = document.getElementById('useAmbientAsZero').checked;
    points.forEach((pt, i) => {
        if (useAmb && pt === 0) {
            dynamicInputs[i] = amb; dynamicNominals[i] = uIn === uOut ? amb : (inMax - inMin !== 0 ? outMin + ((amb - inMin) / (inMax - inMin)) * (outMax - outMin) : outMin);
        } else {
            dynamicInputs[i] = inMin + (pt / 100) * (inMax - inMin); dynamicNominals[i] = outMin + (pt / 100) * (outMax - outMin);
        }
    });
    switchFormat();
};
window.handleSwitchTypeChange = function (val) { switchData.contactType = val; switchData.setContactState = val === 'NO' ? 'CLOSE' : 'OPEN'; switchData.resetContactState = val === 'NO' ? 'OPEN' : 'CLOSE'; switchFormat(); };

function switchFormat() {
    const type = document.getElementById('instrumentType').value;
    const dynCon = document.getElementById('dynamicInputContainer');
    const uIn = getActiveUnit('In'), uOut = getActiveUnit('Out');
    const modeSelect = document.getElementById('testPointModeSelect');
    const mode = modeSelect ? modeSelect.value : 'NAIK';
    const isBeforeAfter = document.getElementById('useBeforeAfter') && document.getElementById('useBeforeAfter').checked;

    if (type === 'PRESS_SWITCH') {
        dynCon.innerHTML = `<div class="space-y-2 text-[10px]"><div class="flex gap-2 p-2 bg-slate-100 rounded border"><label class="font-bold">Switch Contact Type:</label><select class="border rounded p-1 font-bold bg-white" onchange="handleSwitchTypeChange(this.value)"><option value="NO" ${switchData.contactType === 'NO' ? 'selected' : ''}>NO</option><option value="NC" ${switchData.contactType === 'NC' ? 'selected' : ''}>NC</option></select></div><div class="grid grid-cols-2 gap-2"><div class="p-2 bg-slate-50 border rounded"><span class="font-bold block border-b pb-0.5 mb-1">SET POINT (Trip):</span><label class="block">Target Set (${uIn}):</label><input type="number" step="any" value="${switchData.setReq}" class="w-full p-1 border rounded mb-1" oninput="switchData.setReq=this.value; calculateData()"><label class="block">Actual Set (${uIn}):</label><input type="number" step="any" value="${switchData.setAct}" class="w-full p-1 border rounded font-bold mb-1" oninput="switchData.setAct=parseFloat(this.value)||''; calculateData()"><label class="block font-bold">Kondisi Kontak:</label><select class="w-full border rounded p-1 font-bold" onchange="switchData.setContactState=this.value; calculateData()"><option value="CLOSE" ${switchData.setContactState === 'CLOSE' ? 'selected' : ''}>CLOSE</option><option value="OPEN" ${switchData.setContactState === 'OPEN' ? 'selected' : ''}>OPEN</option></select></div><div class="p-2 bg-slate-50 border rounded"><span class="font-bold block border-b pb-0.5 mb-1">RESET POINT (Re-set):</span><label class="block">Target Reset (${uIn}):</label><input type="number" step="any" value="${switchData.resetReq}" class="w-full p-1 border rounded mb-1" oninput="switchData.resetReq=this.value; calculateData()"><label class="block">Actual Reset (${uIn}):</label><input type="number" step="any" value="${switchData.resetAct}" class="w-full p-1 border rounded font-bold mb-1" oninput="switchData.resetAct=parseFloat(this.value)||''; calculateData()"><label class="block font-bold">Kondisi Kontak:</label><select class="w-full border rounded p-1 font-bold" onchange="switchData.resetContactState=this.value; calculateData()"><option value="OPEN" ${switchData.resetContactState === 'OPEN' ? 'selected' : ''}>OPEN</option><option value="CLOSE" ${switchData.resetContactState === 'CLOSE' ? 'selected' : ''}>CLOSE</option></select></div></div></div>`;
    } else {
        if (isBeforeAfter) {
            dynCon.innerHTML = `<table class="w-full text-center border-collapse text-[10px]">
                <thead>
                    <tr class="bg-emerald-50/60 border border-emerald-100 text-kujang-darkgreen">
                        <th class="p-1 border">Point %</th>
                        <th class="p-1 border">Input (${uIn})</th>
                        <th class="p-1 border">Nom Output (${uOut})</th>
                        <th class="p-1 border">Act Before</th>
                        <th class="p-1 border">Act After</th>
                    </tr>
                </thead>
                <tbody>
                    ${points.map((pt, i) => `
                    <tr class="border-b">
                        <td class="p-1 border font-bold">${getPointLabel(i, mode)}</td>
                        <td class="p-1 border"><input type="number" step="any" value="${dynamicInputs[i] !== undefined ? dynamicInputs[i] : ''}" class="w-full p-0.5 border rounded text-center" oninput="dynamicInputs[${i}]=this.value!==''?parseFloat(this.value):''; calculateData()"></td>
                        <td class="p-1 border"><input type="number" step="any" value="${dynamicNominals[i] !== undefined ? dynamicNominals[i] : ''}" class="w-full p-0.5 border rounded text-center font-bold" oninput="dynamicNominals[${i}]=this.value!==''?parseFloat(this.value):''; calculateData()"></td>
                        <td class="p-1 border"><input type="number" step="any" value="${testDataBefore[i] !== undefined ? testDataBefore[i] : ''}" class="w-full p-0.5 border rounded text-center font-bold text-amber-700 bg-amber-50" oninput="testDataBefore[${i}]=this.value!==''?parseFloat(this.value):''; calculateData()"></td>
                        <td class="p-1 border"><input type="number" step="any" value="${testData[i] !== undefined ? testData[i] : ''}" class="w-full p-0.5 border rounded text-center font-bold text-emerald-800 bg-emerald-50" oninput="testData[${i}]=this.value!==''?parseFloat(this.value):''; calculateData()"></td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        } else {
            dynCon.innerHTML = `<table class="w-full text-center border-collapse text-[10px]"><thead><tr class="bg-emerald-50/60 border border-emerald-100 text-kujang-darkgreen"><th class="p-1 border">Point %</th><th class="p-1 border">Input (${uIn})</th><th class="p-1 border">Nom Output (${uOut})</th><th class="p-1 border">Act Output</th></tr></thead><tbody>${points.map((pt, i) => `<tr class="border-b"><td class="p-1 border font-bold">${getPointLabel(i, mode)}</td><td class="p-1 border"><input type="number" step="any" value="${dynamicInputs[i] !== undefined ? dynamicInputs[i] : ''}" class="w-full p-0.5 border rounded text-center" oninput="dynamicInputs[${i}]=this.value!==''?parseFloat(this.value):''; calculateData()"></td><td class="p-1 border"><input type="number" step="any" value="${dynamicNominals[i] !== undefined ? dynamicNominals[i] : ''}" class="w-full p-0.5 border rounded text-center font-bold" oninput="dynamicNominals[${i}]=this.value!==''?parseFloat(this.value):''; calculateData()"></td><td class="p-1 border"><input type="number" step="any" value="${testData[i] !== undefined ? testData[i] : ''}" class="w-full p-0.5 border rounded text-center font-bold text-slate-900" oninput="testData[${i}]=this.value!==''?parseFloat(this.value):''; calculateData()"></td></tr>`).join('')}</tbody></table>`;
        }
    }
    calculateData();
}

window.calculateData = function () {
    const type = document.getElementById('instrumentType').value;
    const con = document.getElementById('dynamicTablePreviewContainer');
    const tol = parseFloat(document.getElementById('tolerance').value);
    const uIn = getActiveUnit('In'), uOut = getActiveUnit('Out');
    const modeSelect = document.getElementById('testPointModeSelect');
    const mode = modeSelect ? modeSelect.value : 'NAIK';
    const isBeforeAfter = document.getElementById('useBeforeAfter') && document.getElementById('useBeforeAfter').checked;
    let overallPass = true;

    if (type === 'PRESS_SWITCH') {
        const sReq = parseFloat(switchData.setReq), sAct = parseFloat(switchData.setAct), rAct = parseFloat(switchData.resetAct);
        const setDev = !isNaN(sReq) && !isNaN(sAct) ? Math.abs(sAct - sReq) : null;
        const dead = !isNaN(sAct) && !isNaN(rAct) ? Math.abs(sAct - rAct) : null;
        let isPass = true; if (setDev !== null && !isNaN(tol)) isPass = setDev <= tol; if (!isPass) overallPass = false;
        con.innerHTML = `<table class="w-full text-[9.5px] border-collapse text-left"><thead><tr class="font-bold border-b border-black"><th class="pb-1">Parameter</th><th class="pb-1">Contact Type</th><th class="pb-1">Target</th><th class="pb-1">Actual</th><th class="pb-1">State</th><th class="pb-1">Pass/Fail</th></tr></thead><tbody><tr class="py-0.5 border-b"><td class="font-bold">SET POINT</td><td>${switchData.contactType}</td><td>${!isNaN(sReq) ? sReq.toFixed(3) + ' ' + uIn : '-'}</td><td class="font-bold">${!isNaN(sAct) ? sAct.toFixed(3) + ' ' + uIn : '-'}</td><td class="font-bold">${switchData.setContactState}</td><td class="font-bold ${isPass ? '' : 'text-red-600'}">${isPass ? 'Pass' : 'Fail'}</td></tr><tr class="py-0.5 border-b"><td class="font-bold">RESET POINT</td><td>${switchData.contactType}</td><td>${switchData.resetReq !== '' ? parseFloat(switchData.resetReq).toFixed(3) + ' ' + uIn : '-'}</td><td class="font-bold">${!isNaN(rAct) ? rAct.toFixed(3) + ' ' + uIn : '-'}</td><td class="font-bold">${switchData.resetContactState}</td><td class="font-bold">Pass</td></tr><tr><td class="font-bold" colspan="2">DEADBAND</td><td class="font-bold" colspan="4">${dead !== null ? dead.toFixed(3) + ' ' + uIn : '-'}</td></tr></tbody></table>`;
    } else {
        const method = document.getElementById('errorMethod').value;
        const methodTxt = method === 'SPAN' ? '% of Span' : '% of Reading';
        const outMin = parseFloat(document.getElementById('outputMin').value) || 0;
        const outMax = parseFloat(document.getElementById('outputMax').value) || 0;
        let spanOut = outMax - outMin;

        if (spanOut === 0) {
            const validNoms = dynamicNominals.map(v => parseFloat(v)).filter(v => !isNaN(v));
            if (validNoms.length > 1) {
                spanOut = Math.max(...validNoms) - Math.min(...validNoms);
            }
        }

        let html = '';
        if (isBeforeAfter) {
            html = `<table class="w-full text-[8.5px] border-collapse text-left"><thead><tr class="font-bold border-b border-black"><th>Point</th><th>Input (${uIn})</th><th>Nom Output (${uOut})</th><th>Act Before</th><th>Err Before</th><th>Act After</th><th>Err After</th><th>Status</th></tr></thead><tbody>`;
            points.forEach((pt, i) => {
                const inVal = parseFloat(dynamicInputs[i]), outNom = parseFloat(dynamicNominals[i]);
                const actBef = parseFloat(testDataBefore[i]), actAft = parseFloat(testData[i]);
                let errBef = 0, errAft = 0, isPass = true;

                if (!isNaN(actBef) && !isNaN(outNom)) errBef = method === 'SPAN' ? (spanOut !== 0 ? ((actBef - outNom) / spanOut) * 100 : 0) : (outNom !== 0 ? ((actBef - outNom) / outNom) * 100 : 0);
                if (!isNaN(actAft) && !isNaN(outNom)) errAft = method === 'SPAN' ? (spanOut !== 0 ? ((actAft - outNom) / spanOut) * 100 : 0) : (outNom !== 0 ? ((actAft - outNom) / outNom) * 100 : 0);

                if (!isNaN(tol)) {
                    if (!isNaN(actAft)) {
                        isPass = Math.abs(errAft) <= tol;
                    } else if (!isNaN(actBef)) {
                        isPass = Math.abs(errBef) <= tol;
                    }
                }
                if (!isPass) overallPass = false;

                html += `<tr class="border-b"><td>${getPointLabel(i, mode)}</td><td>${!isNaN(inVal) ? inVal.toFixed(3) : '-'}</td><td>${!isNaN(outNom) ? outNom.toFixed(4) : '-'}</td><td>${!isNaN(actBef) ? actBef.toFixed(3) : '-'}</td><td>${!isNaN(actBef) ? errBef.toFixed(4) + '%' : '-'}</td><td class="font-bold">${!isNaN(actAft) ? actAft.toFixed(3) : '-'}</td><td class="font-bold">${!isNaN(actAft) ? errAft.toFixed(4) + '%' : '-'}</td><td class="font-bold ${isPass ? '' : 'text-red-600'}">${isPass ? 'Pass' : 'Fail'}</td></tr>`;
            });
        } else {
            html = `<table class="w-full text-[9.5px] border-collapse text-left"><thead><tr class="font-bold border-b border-black"><th>Test Point</th><th>Input (${uIn})</th><th>Nom Output (${uOut})</th><th>Act Output</th><th>Spec.</th><th>Error (${methodTxt})</th><th>Pass/Fail</th></tr></thead><tbody>`;
            points.forEach((pt, i) => {
                const inVal = parseFloat(dynamicInputs[i]), outNom = parseFloat(dynamicNominals[i]), actOut = parseFloat(testData[i]);
                let err = 0, isPass = true, spec = '-';
                if (!isNaN(actOut) && !isNaN(outNom)) err = method === 'SPAN' ? (spanOut !== 0 ? ((actOut - outNom) / spanOut) * 100 : 0) : (outNom !== 0 ? ((actOut - outNom) / outNom) * 100 : 0);
                if (!isNaN(tol)) { spec = `± ${((tol / 100) * spanOut).toFixed(3)} ${uOut}`; if (!isNaN(actOut)) isPass = Math.abs(err) <= tol; }
                if (!isPass) overallPass = false;
                html += `<tr class="border-b"><td>${getPointLabel(i, mode)}</td><td>${!isNaN(inVal) ? inVal.toFixed(3) + ' ' + uIn : '-'}</td><td>${!isNaN(outNom) ? outNom.toFixed(4) + ' ' + uOut : '-'}</td><td class="font-bold">${!isNaN(actOut) ? actOut.toFixed(3) + ' ' + uOut : '-'}</td><td>${spec}</td><td>${!isNaN(actOut) ? err.toFixed(4) + '%' : '-'}</td><td class="font-bold ${isPass ? '' : 'text-red-600'}">${isPass ? 'Pass' : 'Fail'}</td></tr>`;
            });
        }
        con.innerHTML = html + `</tbody></table>`;
    }
    const badge = document.getElementById('statusBadge'), wm = document.getElementById('pdfWatermark');
    if (overallPass) { currentPassStatus = 'PASS'; badge.className = 'bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300'; badge.innerText = 'PASS'; wm.innerText = 'PASSED'; wm.style.color = 'rgba(0, 0, 0, 0.03)'; }
    else { currentPassStatus = 'FAIL'; badge.className = 'bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-300'; badge.innerText = 'FAIL'; wm.innerText = 'FAILED'; wm.style.color = 'rgba(220, 38, 38, 0.04)'; }
    updateCommonPreviews();
};

async function fetchFirestoreLogs() {
    if (!window.db || !window.firestoreTools) return;
    try {
        const { collection, getDocs, query, orderBy } = window.firestoreTools;
        const q = query(collection(window.db, "calibration_logs"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        localLogs = []; querySnapshot.forEach(docSnap => localLogs.push({ docId: docSnap.id, ...docSnap.data() }));
        renderLogTable();
    } catch (e) { console.error("Sinkronisasi gagal:", e); }
}

async function saveLogEntry() {
    const data = {
        created_at: new Date().toISOString(), timestamp: new Date().toLocaleString('id-ID'), certNo: document.getElementById('certNo').value || '-', tagNo: document.getElementById('tagNo').value || '-',
        brand: document.getElementById('brandName').value || '-', storageLocation: document.getElementById('storageLocation').value || '-', desc: document.getElementById('instrumentName').value || '-',
        calDate: document.getElementById('certDate').value || '-', dueDate: document.getElementById('dueDateCustom').value || '-', tech: document.getElementById('techName').value || '-',
        techNik: document.getElementById('techNik').value || '-', approvedBy: document.getElementById('approvedByInput').value || '-', approvedByNik: document.getElementById('approvedByNik').value || '-',
        avpName: document.getElementById('avpNameInput').value || '-', avpNik: document.getElementById('avpNikInput').value || '-', status: currentPassStatus, issuedBy: document.getElementById('issuedBy').value,
        certAddress: document.getElementById('certAddress').value, instrumentType: document.getElementById('instrumentType').value, manufacturer: document.getElementById('manufacturer').value,
        serialNo: document.getElementById('serialNo').value, location: document.getElementById('location').value, comments: document.getElementById('comments').value, procedureSelect: document.getElementById('procedureSelect').value,
        procedureId: document.getElementById('procedureId').value, errorMethod: document.getElementById('errorMethod').value, useAmbientAsZero: document.getElementById('useAmbientAsZero').checked,
        ambientTemp: document.getElementById('ambientTemp').value, tolerance: document.getElementById('tolerance').value, inputMin: document.getElementById('inputMin').value, inputMax: document.getElementById('inputMax').value,
        outputMin: document.getElementById('outputMin').value, outputMax: document.getElementById('outputMax').value, unitInSelect: getActiveUnit('In'), unitOutSelect: getActiveUnit('Out'),
        envTemp: document.getElementById('envTemp').value, envRH: document.getElementById('envRH').value, drivePdfUrl: "",
        testPointMode: document.getElementById('testPointModeSelect') ? document.getElementById('testPointModeSelect').value : 'NAIK',
        useBeforeAfter: document.getElementById('useBeforeAfter') ? document.getElementById('useBeforeAfter').checked : false,
        calibratorsList: JSON.parse(JSON.stringify(calibratorsList)),
        dynamicInputs: [...dynamicInputs], dynamicNominals: [...dynamicNominals], testDataBefore: [...testDataBefore], testData: [...testData], switchData: { ...switchData }
    };
    if (window.db && window.firestoreTools) {
        const { collection, addDoc, doc, updateDoc } = window.firestoreTools;
        if (activeEditingDocId) {
            await updateDoc(doc(window.db, "calibration_logs", activeEditingDocId), data); data.docId = activeEditingDocId;
            const idx = localLogs.findIndex(l => l.docId === activeEditingDocId); if (idx !== -1) localLogs[idx] = data;
        } else {
            const docRef = await addDoc(collection(window.db, "calibration_logs"), data); data.docId = docRef.id; activeEditingDocId = docRef.id; localLogs.unshift(data);
        }
    }
    renderLogTable(); updateCommonPreviews();
}

window.toggleSelectAllLogs = function (source) { document.querySelectorAll('.log-checkbox').forEach(cb => cb.checked = source.checked); };

window.downloadSelectedPDFs = async function () {
    const cbs = document.querySelectorAll('.log-checkbox:checked');
    if (cbs.length === 0) return alert('Centang minimal satu sertifikat.');

    alert(`Sistem akan memproses ${cbs.length} sertifikat. Jendela print akan terbuka otomatis satu per satu.`);

    for (let cb of cbs) {
        const index = cb.getAttribute('data-index');
        const item = window.filteredLocalLogs[index];
        const originalIndex = localLogs.findIndex(l => l.docId === item.docId);
        if (originalIndex !== -1) {
            loadLogToForm(originalIndex);
            await new Promise(r => setTimeout(r, 800));
            const t = document.title;
            const cNo = item.certNo ? item.certNo.replace(/[^a-zA-Z0-9]/g, '_') : 'NoCert';
            document.title = `Sertifikat_${cNo}_${item.tagNo || 'UUT'}`;
            window.print();
            document.title = t;
        }
    }
    document.querySelectorAll('.log-checkbox').forEach(box => box.checked = false);
};

window.renderLogTable = function () {
    const tbody = document.getElementById('logTableBody');
    const searchVal = (document.getElementById('searchLogInput') ? document.getElementById('searchLogInput').value : '').toLowerCase();
    window.filteredLocalLogs = localLogs.filter(item => (item.tagNo && item.tagNo.toLowerCase().includes(searchVal)) || (item.certNo && item.certNo.toLowerCase().includes(searchVal)));

    const hCount = document.getElementById('logCountHeader');
    if (hCount) hCount.innerText = window.filteredLocalLogs.length;

    const btnNew = document.getElementById('btnNewCertFromTemplate');
    if (btnNew) {
        if (searchVal.trim() !== '' && window.filteredLocalLogs.length > 0) {
            btnNew.disabled = false;
            btnNew.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Buat Sertifikat Baru (${window.filteredLocalLogs[0].tagNo})`;
        } else {
            btnNew.disabled = true;
            btnNew.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Buat Sertifikat Baru Dari Tag Ini`;
        }
    }

    if (!tbody) return;
    if (window.filteredLocalLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>`;
        return;
    }

    tbody.innerHTML = window.filteredLocalLogs.map((item, i) => `
        <tr class="hover:bg-emerald-50/40 transition">
            <td class="p-2.5 text-center"><input type="checkbox" class="log-checkbox rounded text-kujang-green cursor-pointer" data-index="${i}"></td>
            <td class="p-2.5 text-slate-500 font-mono text-[11px]">${item.timestamp}</td>
            <td class="p-2.5 font-bold text-kujang-darkgreen">${item.certNo}</td>
            <td class="p-2.5 font-extrabold text-slate-900">${item.tagNo}</td>
            <td class="p-2.5 font-medium">${item.storageLocation || item.location || '-'}</td>
            <td class="p-2.5">${item.calDate}</td>
            <td class="p-2.5 text-center flex justify-center gap-1.5">
                <button onclick="openLogBarcode(${localLogs.indexOf(item)})" title="Label" class="bg-slate-800 hover:bg-slate-900 text-white px-2 py-1 rounded-md font-bold text-[11px] shadow-sm"><i class="fa-solid fa-qrcode"></i></button>
                <button onclick="loadLogToForm(${localLogs.indexOf(item)})" title="Edit" class="bg-emerald-50 hover:bg-emerald-100 text-kujang-green border border-emerald-200 px-2 py-1 rounded-md font-bold text-[11px] shadow-sm"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteLogEntry(${localLogs.indexOf(item)})" title="Hapus" class="text-red-500 hover:text-red-700 px-1 font-bold"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
};

window.createNewCertFromSelectedTag = function () {
    if (window.filteredLocalLogs.length === 0) return alert('Tidak ada template data tag yang ditemukan.');

    const template = window.filteredLocalLogs[0];
    activeEditingDocId = null;

    document.getElementById('tagNo').value = template.tagNo || '';
    document.getElementById('brandName').value = template.brand || '';
    document.getElementById('storageLocation').value = template.storageLocation || '';
    document.getElementById('instrumentName').value = template.desc || '';
    document.getElementById('manufacturer').value = template.manufacturer || '';
    document.getElementById('serialNo').value = template.serialNo || '';
    document.getElementById('location').value = template.location || '';
    document.getElementById('procedureId').value = template.procedureId || template.tagNo || '';
    document.getElementById('issuedBy').value = template.issuedBy || 'DPLI';
    document.getElementById('certAddress').value = template.certAddress || 'PS-PK-WASES-03';
    document.getElementById('comments').value = template.comments || '';

    document.getElementById('inputMin').value = template.inputMin || '0';
    document.getElementById('inputMax').value = template.inputMax || '100';
    document.getElementById('outputMin').value = template.outputMin || '0';
    document.getElementById('outputMax').value = template.outputMax || '100';
    document.getElementById('tolerance').value = template.tolerance || '1.0';

    if (template.instrumentType) document.getElementById('instrumentType').value = template.instrumentType;
    if (template.procedureSelect) document.getElementById('procedureSelect').value = template.procedureSelect;
    if (template.errorMethod) document.getElementById('errorMethod').value = template.errorMethod;

    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('certDate').value = today;
    autoCalculateDueDate();

    const certYear = new Date().getFullYear();
    const certMonthRoman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][new Date().getMonth()];
    const randNum = Math.floor(100 + Math.random() * 900);
    document.getElementById('certNo').value = `${randNum}/LK/WLI/${certMonthRoman}/${certYear}`;

    applyPatentedInstrument();

    const uInSelect = document.getElementById('unitInSelect');
    if (template.unitInSelect) {
        if (Array.from(uInSelect.options).some(opt => opt.value === template.unitInSelect)) {
            uInSelect.value = template.unitInSelect;
            document.getElementById('unitInCustom').classList.add('hidden');
        } else {
            uInSelect.value = 'CUSTOM';
            document.getElementById('unitInCustom').value = template.unitInSelect;
            document.getElementById('unitInCustom').classList.remove('hidden');
        }
    }
    const uOutSelect = document.getElementById('unitOutSelect');
    if (template.unitOutSelect) {
        if (Array.from(uOutSelect.options).some(opt => opt.value === template.unitOutSelect)) {
            uOutSelect.value = template.unitOutSelect;
            document.getElementById('unitOutCustom').classList.add('hidden');
        } else {
            uOutSelect.value = 'CUSTOM';
            document.getElementById('unitOutCustom').value = template.unitOutSelect;
            document.getElementById('unitOutCustom').classList.remove('hidden');
        }
    }
    handleUnitChange('In');
    handleUnitChange('Out');
    calculateData();

    switchAppMenu('calibration');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    alert(`Sertifikat Baru untuk ${template.tagNo} berhasil dibuat dari template! Silakan sesuaikan hasil pengujian dan klik "Simpan & Cetak". Log baru akan ditambahkan.`);
};

window.loadLogToForm = function (idx) {
    const data = localLogs[idx]; if (!data) return; activeEditingDocId = data.docId;

    const calFieldMapping = {
        'issuedBy': 'issuedBy',
        'certNo': 'certNo',
        'certAddress': 'certAddress',
        'tagNo': 'tagNo',
        'brandName': 'brand',
        'storageLocation': 'storageLocation',
        'instrumentName': 'desc',
        'manufacturer': 'manufacturer',
        'serialNo': 'serialNo',
        'location': 'location',
        'comments': 'comments',
        'procedureId': 'procedureId',
        'ambientTemp': 'ambientTemp',
        'tolerance': 'tolerance',
        'inputMin': 'inputMin',
        'inputMax': 'inputMax',
        'outputMin': 'outputMin',
        'outputMax': 'outputMax',
        'envTemp': 'envTemp',
        'envRH': 'envRH',
        'techName': 'tech',
        'techNik': 'techNik',
        'approvedByInput': 'approvedBy',
        'approvedByNik': 'approvedByNik',
        'avpNameInput': 'avpName',
        'avpNikInput': 'avpNik'
    };

    for (const [elId, dataKey] of Object.entries(calFieldMapping)) {
        const el = document.getElementById(elId);
        if (el && data[dataKey] !== undefined) {
            el.value = (data[dataKey] === '-' || data[dataKey] === null) ? '' : data[dataKey];
        }
    }

    document.getElementById('instrumentType').value = data.instrumentType || 'TEMP_ELEMENT'; document.getElementById('procedureSelect').value = data.procedureSelect || 'TEMPERATURE';
    document.getElementById('errorMethod').value = data.errorMethod || 'SPAN'; document.getElementById('useAmbientAsZero').checked = !!data.useAmbientAsZero;
    document.getElementById('certDate').value = data.calDate || ''; document.getElementById('dueDateCustom').value = data.dueDate || '';

    const uInSelect = document.getElementById('unitInSelect');
    if (data.unitInSelect) {
        if (Array.from(uInSelect.options).some(opt => opt.value === data.unitInSelect)) {
            uInSelect.value = data.unitInSelect;
            document.getElementById('unitInCustom').classList.add('hidden');
        } else {
            uInSelect.value = 'CUSTOM';
            document.getElementById('unitInCustom').value = data.unitInSelect;
            document.getElementById('unitInCustom').classList.remove('hidden');
        }
    }

    const uOutSelect = document.getElementById('unitOutSelect');
    if (data.unitOutSelect) {
        if (Array.from(uOutSelect.options).some(opt => opt.value === data.unitOutSelect)) {
            uOutSelect.value = data.unitOutSelect;
            document.getElementById('unitOutCustom').classList.add('hidden');
        } else {
            uOutSelect.value = 'CUSTOM';
            document.getElementById('unitOutCustom').value = data.unitOutSelect;
            document.getElementById('unitOutCustom').classList.remove('hidden');
        }
    }

    if (document.getElementById('testPointModeSelect')) {
        document.getElementById('testPointModeSelect').value = data.testPointMode || 'NAIK';
    }
    if (document.getElementById('useBeforeAfter')) {
        document.getElementById('useBeforeAfter').checked = !!data.useBeforeAfter;
    }
    handleTestPointModeChange();

    calibratorsList = data.calibratorsList || [];
    dynamicInputs = data.dynamicInputs || [...points];
    dynamicNominals = data.dynamicNominals || [...points];
    testDataBefore = data.testDataBefore || new Array(points.length).fill('');
    testData = data.testData || [...points];
    if (data.switchData) switchData = data.switchData;

    const matchPersonel = (type, nameVal) => {
        if (!nameVal) return;
        const pIdx = masterPersonelList.findIndex(p => p.name === nameVal);
        let selId, imgId, titleId;
        if (type === 'tech') { selId = 'techSelect'; imgId = 'viewTechSignImg'; }
        else if (type === 'approved') { selId = 'approvedSelect'; imgId = 'viewApprovedSignImg'; }
        else if (type === 'avp') { selId = 'avpSelect'; imgId = 'viewAvpSignImg'; titleId = 'viewAvpTitleLabel'; }

        const imgEl = document.getElementById(imgId);
        if (pIdx !== -1) {
            document.getElementById(selId).value = pIdx;
            const p = masterPersonelList[pIdx];
            if (p.img) { imgEl.src = p.img; imgEl.classList.remove('hidden'); } else { imgEl.src = ''; imgEl.classList.add('hidden'); }
            if (titleId && p.title) document.getElementById(titleId).innerText = p.title;
        } else {
            document.getElementById(selId).value = "";
            if (imgEl) { imgEl.src = ''; imgEl.classList.add('hidden'); }
        }
    };
    matchPersonel('tech', data.tech); matchPersonel('approved', data.approvedBy); matchPersonel('avp', data.avpName);

    renderCalibratorForm(); switchFormat(); switchAppMenu('calibration'); window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteLogEntry = async function (idx) {
    if (confirm('Hapus log sertifikat?')) { if (localLogs[idx].docId && window.db && window.firestoreTools) await window.firestoreTools.deleteDoc(window.firestoreTools.doc(window.db, "calibration_logs", localLogs[idx].docId)); localLogs.splice(idx, 1); renderLogTable(); }
};
window.clearLogHistory = async function () {
    if (confirm('Hapus seluruh data?')) { if (window.db && window.firestoreTools) { for (let l of localLogs) if (l.docId) await window.firestoreTools.deleteDoc(window.firestoreTools.doc(window.db, "calibration_logs", l.docId)); } localLogs = []; renderLogTable(); }
};

window.saveAndPrintPDF = async function () {
    const btn = document.querySelector("button[onclick='saveAndPrintPDF()']"); const orig = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan Data...'; }
    try { await saveLogEntry(); } catch (err) { console.error(err); } finally { if (btn) { btn.disabled = false; btn.innerHTML = orig; } }
    const t = document.title;
    const cNo = document.getElementById('certNo').value ? document.getElementById('certNo').value.replace(/[^a-zA-Z0-9]/g, '_') : 'NoCert';
    document.title = `Sertifikat_${cNo}_${document.getElementById('tagNo').value || 'UUT'}`;
    window.print();
    document.title = t;
};

async function fetchFirestoreGovernorLogs() {
    if (!window.db || !window.firestoreTools) return;
    try {
        const { collection, getDocs, query, orderBy } = window.firestoreTools;
        const q = query(collection(window.db, "governor_test_records"), orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        governorLogs = []; querySnapshot.forEach(docSnap => governorLogs.push({ docId: docSnap.id, ...docSnap.data() }));
        renderGovLogTable();
    } catch (e) { console.error("Gagal load governor logs:", e); }
}

window.renderGovLogTable = function () {
    const tbody = document.getElementById('govLogTableBody');
    const searchVal = (document.getElementById('searchGovLogInput') ? document.getElementById('searchGovLogInput').value : '').toLowerCase();

    window.filteredGovernorLogs = governorLogs.filter(item => (item.tagNo && item.tagNo.toLowerCase().includes(searchVal)));
    const hCount = document.getElementById('govLogCountHeader');
    if (hCount) hCount.innerText = window.filteredGovernorLogs.length;
    if (!tbody) return;

    if (window.filteredGovernorLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400 italic">Data tidak ditemukan.</td></tr>`;
        return;
    }

    tbody.innerHTML = window.filteredGovernorLogs.map((item, i) => `
        <tr class="hover:bg-emerald-50/40 transition">
            <td class="p-2.5 text-center"><input type="checkbox" class="gov-log-checkbox rounded text-kujang-green cursor-pointer" data-index="${i}"></td>
            <td class="p-2.5 text-slate-500 font-mono text-[11px]">${item.timestamp}</td>
            <td class="p-2.5 font-bold text-kujang-darkgreen">${item.tagNo}</td>
            <td class="p-2.5 font-medium">${item.date}</td>
            <td class="p-2.5">${item.techName || '-'}</td>
            <td class="p-2.5">${item.calName || '-'}</td>
            <td class="p-2.5 text-center flex justify-center gap-1.5">
                <button onclick="loadGovLogToForm(${governorLogs.indexOf(item)})" title="Edit Data Governor" class="bg-emerald-50 hover:bg-emerald-100 text-kujang-green border border-emerald-200 px-2 py-1 rounded-md font-bold text-[11px] shadow-sm"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteGovLogEntry(${governorLogs.indexOf(item)})" title="Hapus" class="text-red-500 hover:text-red-700 px-1 font-bold"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`).join('');
};

window.toggleSelectAllGovLogs = function (source) {
    document.querySelectorAll('.gov-log-checkbox').forEach(cb => cb.checked = source.checked);
};

window.downloadSelectedGovernorPDFs = async function () {
    const cbs = document.querySelectorAll('.gov-log-checkbox:checked');
    if (cbs.length === 0) return alert('Centang minimal satu record Governor.');

    alert(`Sistem akan memproses ${cbs.length} Test Record Governor. Jendela print akan terbuka otomatis satu per satu.`);

    for (let cb of cbs) {
        const index = cb.getAttribute('data-index');
        const item = window.filteredGovernorLogs[index];
        const originalIndex = governorLogs.findIndex(l => l.docId === item.docId);
        if (originalIndex !== -1) {
            loadGovLogToForm(originalIndex);
            await new Promise(r => setTimeout(r, 800));
            const t = document.title;
            document.title = `Test_Record_Governor_${item.tagNo || 'GOV'}`;
            window.print();
            document.title = t;
        }
    }
    document.querySelectorAll('.gov-log-checkbox').forEach(box => box.checked = false);
};

window.loadGovLogToForm = function (idx) {
    const data = governorLogs[idx];
    if (!data) return;

    activeGovEditingDocId = data.docId;

    const fieldMapping = {
        'govDate': 'date',
        'govTagNo': 'tagNo',
        'govPartNo': 'partNo',
        'govSerialNo': 'serialNo',
        'govType': 'govType',
        'govRange': 'range',
        'govPressOilCw': 'pressOilCw',
        'govPressOilCcw': 'pressOilCcw',
        'govPneumaticLow': 'pneumaticLow',
        'govPneumaticHigh': 'pneumaticHigh',
        'govComments': 'comments',
        'govTechName': 'techName',
        'govTechTitle': 'techTitle',
        'govCalName': 'calName',
        'govCalTitle': 'calTitle',
        'govAvpName': 'avpName',
        'govAvpTitle': 'avpTitle',
        'govServo': 'servo',
        'govPlan': 'plan',
        'govQuadrant': 'quadrant',
        'govNeedleValve': 'needleValve'
    };

    for (const [elId, dataKey] of Object.entries(fieldMapping)) {
        const el = document.getElementById(elId);
        if (el) {
            el.value = (data[dataKey] !== undefined && data[dataKey] !== null && data[dataKey] !== '-') ? data[dataKey] : '';
        }
    }

    if (document.getElementById('govSpeedSetting')) {
        document.getElementById('govSpeedSetting').value = data.speedSetting || 'Pneumatic & Dial';
    }

    if (data.rpmData && Array.isArray(data.rpmData) && data.rpmData.length > 0) {
        govRpmData = JSON.parse(JSON.stringify(data.rpmData));
    } else {
        handleGovSpeedSettingChange();
    }

    const matchGovPersonel = (type, nameVal) => {
        if (!nameVal) return;
        const pIdx = masterPersonelList.findIndex(p => p.name === nameVal);
        let selId, imgId;
        if (type === 'tech') { selId = 'govTechSelect'; imgId = 'viewGovTechSignImg'; }
        else if (type === 'cal') { selId = 'govCalSelect'; imgId = 'viewGovCalSignImg'; }
        else if (type === 'avp') { selId = 'govAvpSelect'; imgId = 'viewGovAvpSignImg'; }

        const imgEl = document.getElementById(imgId);
        const selEl = document.getElementById(selId);

        if (pIdx !== -1 && selEl) {
            selEl.value = pIdx;
            const p = masterPersonelList[pIdx];
            if (p && p.img && imgEl) {
                imgEl.src = p.img;
                imgEl.classList.remove('hidden');
            } else if (imgEl) {
                imgEl.src = '';
                imgEl.classList.add('hidden');
            }
        } else if (selEl) {
            selEl.value = "";
            if (imgEl) { imgEl.src = ''; imgEl.classList.add('hidden'); }
        }
    };

    matchGovPersonel('tech', data.techName);
    matchGovPersonel('cal', data.calName);
    matchGovPersonel('avp', data.avpName);

    renderGovernorRpmTableInputs();
    updateGovernorPreview();
    switchAppMenu('governor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteGovLogEntry = async function (idx) {
    if (confirm('Hapus log governor?')) {
        if (governorLogs[idx].docId && window.db && window.firestoreTools) {
            await window.firestoreTools.deleteDoc(window.firestoreTools.doc(window.db, "governor_test_records", governorLogs[idx].docId));
        }
        governorLogs.splice(idx, 1);
        renderGovLogTable();
    }
};

window.clearGovLogHistory = async function () {
    if (confirm('Hapus seluruh data governor?')) {
        if (window.db && window.firestoreTools) {
            for (let l of governorLogs) {
                if (l.docId) await window.firestoreTools.deleteDoc(window.firestoreTools.doc(window.db, "governor_test_records", l.docId));
            }
        }
        governorLogs = [];
        renderGovLogTable();
    }
};

// --- SCANNER & BARCODE ---

window.openScannerModal = function () {
    document.getElementById('scannerModal').classList.remove('hidden');
    if (typeof Html5Qrcode !== 'undefined') {
        html5QrcodeScanner = new Html5Qrcode("cameraReader");
        html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => { closeScannerModal(); processScannedResult(text); }, () => { }).catch(e => alert('Kamera error: ' + e));
    } else alert('Scanner belum siap.');
};

window.closeScannerModal = function () { document.getElementById('scannerModal').classList.add('hidden'); if (html5QrcodeScanner) html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); html5QrcodeScanner = null; }); };

function processScannedResult(text) {
    if (!text) return;
    let search = text.trim();

    try {
        const parsed = JSON.parse(search);
        if (Array.isArray(parsed) && parsed.length > 0) {
            search = parsed[0];
        } else if (typeof parsed === 'object' && parsed !== null && parsed.id) {
            search = parsed.id;
        }
    } catch (e) {
        const match = search.match(/^[\{\[\s]*["']?([^"',\]\}]+)/);
        if (match && match[1]) {
            search = match[1].trim();
        }
    }

    const sIn = document.getElementById('searchLogInput');
    if (sIn) {
        sIn.value = search;
        renderLogTable();
        document.getElementById('logSection').scrollIntoView({ behavior: 'smooth' });
    }
}

window.openBarcodeModal = function (tTag = null, tCertNo = null, tLoc = null, tCal = null, tDue = null, tBrand = null, tDoc = null, tDriveUrl = null) {
    document.getElementById('barcodeModal').classList.remove('hidden');
    const tag = tTag || document.getElementById('tagNo').value || '-',
        certNo = tCertNo || document.getElementById('certNo').value || '-',
        area = tLoc || document.getElementById('storageLocation').value || document.getElementById('location').value || '-',
        cal = tCal || document.getElementById('certDate').value || '-',
        due = tDue || document.getElementById('dueDateCustom').value || '-';

    document.getElementById('labelTagNo').innerText = tag;
    document.getElementById('labelCertNo').innerText = certNo;
    document.getElementById('labelLocation').innerText = area;
    document.getElementById('labelCalDate').innerText = cal;
    document.getElementById('labelDueDate').innerText = due;

    currentModalBarcodeData = { tag, certNo, area, calDate: cal, dueDate: due, docId: tDoc || activeEditingDocId || tag, drivePdfUrl: tDriveUrl || '' };
    setTimeout(renderModalBarcodeGraphic, 150);
};

window.openLogBarcode = function (idx) {
    const i = localLogs[idx];
    if (i) openBarcodeModal(i.tagNo, i.certNo, i.storageLocation || i.location, i.calDate, i.dueDate || i.calDate, i.brand, i.docId, "");
};

window.renderModalBarcodeGraphic = function () {
    const c = document.getElementById('qrCodeSquareContainer');
    if (!c) return;
    c.innerHTML = '';

    const str = JSON.stringify([
        currentModalBarcodeData.tag,
        currentModalBarcodeData.certNo,
        currentModalBarcodeData.area,
        currentModalBarcodeData.calDate,
        currentModalBarcodeData.dueDate
    ]);

    if (typeof QRCode !== 'undefined') {
        new QRCode(c, {
            text: str,
            width: 180,
            height: 180,
            colorDark: "#000",
            colorLight: "#fff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
};

window.closeBarcodeModal = function () { document.getElementById('barcodeModal').classList.add('hidden'); };

window.downloadLabelPNG = function () {
    if (typeof html2canvas !== 'undefined') { html2canvas(document.getElementById('brotherLabelPreview'), { scale: 8, backgroundColor: "#ffffff" }).then(c => { const a = document.createElement('a'); a.download = `Label_${document.getElementById('labelTagNo').innerText}.png`; a.href = c.toDataURL(); a.click(); }); }
};

window.printBrotherLabel = function () { const win = window.open('', '', 'width=400,height=300'); win.document.write(`<html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;}.brother-label-box{width:65mm;padding:6px;border:1px solid #000;display:flex;flex-direction:column;align-items:center;}img,canvas{max-width:100%!important;height:auto!important;}</style></head><body onload="window.print();window.close();">${document.getElementById('brotherLabelPreview').outerHTML}</body></html>`); win.document.close(); };

window.openExportModal = function () { document.getElementById('exportModal').classList.remove('hidden'); toggleExportDocFields(); };
window.closeExportModal = function () { document.getElementById('exportModal').classList.add('hidden'); };
window.toggleExportDocFields = function () { document.getElementById('reportFieldsBox').classList.toggle('hidden', document.getElementById('exportFormatType').value !== 'REPORT'); };
window.toggleExportDateInputs = function () { document.getElementById('exportDateInputsBox').classList.toggle('hidden', document.getElementById('exportAllDates').checked); };

window.processExportDocument = function () {
    let logs = localLogs;
    if (!document.getElementById('exportAllDates').checked) {
        const start = new Date(document.getElementById('exportStartDate').value), end = new Date(document.getElementById('exportEndDate').value); end.setHours(23, 59, 59);
        if (isNaN(start) || isNaN(end)) return alert('Pilih tanggal!'); logs = localLogs.filter(l => { const d = new Date(l.calDate); return d >= start && d <= end; });
        if (!logs.length) return alert('Tidak ada log pada rentang tanggal tersebut.');
    }
    if (document.getElementById('exportFormatType').value === 'REPORT') generateWordReportDocx(logs); else generateExcelDatabaseXlsx(logs);
};

function generateExcelDatabaseXlsx(logs) {
    if (typeof XLSX === 'undefined') return alert('Library XLSX belum siap.');
    const dbData = [[`Daftar Kalibrasi Rutin`, "", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", "", ""], ["No", "Tag Number", "Range kalibrasi", "Manufacture", "Model", "Serial Number", "Nomor Laporan", "Area", "Keterangan"]];
    logs.forEach((item, i) => { dbData.push([i + 1, item.tagNo || '-', (item.inputMin !== '' && item.inputMax !== '') ? `${item.inputMin} – ${item.inputMax} ${item.unitInSelect || ''}` : '-', item.brand || '-', item.manufacturer || '-', item.serialNo || '-', item.certNo || '-', item.storageLocation || item.location || '-', item.status === 'PASS' ? 'LAYAK PAKAI' : 'TIDAK LAYAK PAKAI']); });
    const ws = XLSX.utils.aoa_to_sheet(dbData); ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }]; ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 26 }, { wch: 16 }, { wch: 18 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Cover"); XLSX.writeFile(wb, `Cover_Kalibrasi_${new Date().toISOString().slice(0, 10)}.xlsx`); closeExportModal();
}

function generateWordReportDocx(logs) {
    if (typeof docx === 'undefined') return alert('Library docx belum siap.');
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } = docx;
    const docNo = document.getElementById('expDocNo').value, revNo = document.getElementById('expRevNo').value, mTitle = document.getElementById('makerTitle').value, mName = document.getElementById('makerName').value, mNik = document.getElementById('makerNik').value, aTitle = document.getElementById('approverTitle').value, aName = document.getElementById('approverName').value, aNik = document.getElementById('approverNik').value;
    const rows = [new TableRow({ children: ["NO", "KODE ALAT", "LOKASI PENYIMPANAN", "RENTANG KALIBRASI", "NAMA, ALAT, PABRIK, MODEL, JENIS/SN", "JNK", "PERIODE", "KETERANGAN"].map(t => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 16 })], alignment: AlignmentType.CENTER })] })) })];
    logs.forEach((item, i) => { rows.push(new TableRow({ children: [String(i + 1), item.tagNo || '-', item.storageLocation || item.location || '-', `${item.inputMin || 0} – ${item.inputMax || 0} ${item.unitInSelect || ''}`, `${item.desc || ''}, ${item.brand || ''}, ${item.serialNo || ''}`, "INTERNAL", `2 TAHUN (${item.calDate || '-'})`, item.status === 'PASS' ? 'LAYAK' : 'TIDAK LAYAK'].map(t => new TableCell({ children: [new Paragraph({ text: t, size: 14, alignment: AlignmentType.CENTER })] })) })); });
    const docFile = new Document({
        sections: [{
            children: [
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PT. PUPUK KUJANG", bold: true, size: 18 })] })] }), new TableCell({ children: [new Paragraph({ text: `No: ${docNo} Rev: ${revNo}`, size: 14 })] })] })] }),
                new Paragraph({ text: "" }), new Paragraph({ children: [new TextRun({ text: "DAFTAR INDUK PERALATAN PEMERIKSAAN, PENGUJIAN, DAN PENGUKURAN ALAT OPERASIONAL BAGIAN INSTRUMENT", bold: true, size: 18 })], alignment: AlignmentType.CENTER }), new Paragraph({ text: "" }),
                new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE } }), new Paragraph({ text: "" }),
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }, rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Disetujui oleh,", size: 16, alignment: AlignmentType.CENTER }), new Paragraph({ text: aTitle, bold: true, size: 16, alignment: AlignmentType.CENTER }), new Paragraph({ text: "" }), new Paragraph({ text: aName, bold: true, underline: {}, size: 16, alignment: AlignmentType.CENTER })] }), new TableCell({ children: [new Paragraph({ text: "Dibuat oleh,", size: 16, alignment: AlignmentType.CENTER }), new Paragraph({ text: "Dibuat oleh,", size: 16, alignment: AlignmentType.CENTER }), new Paragraph({ text: mTitle, bold: true, size: 16, alignment: AlignmentType.CENTER }), new Paragraph({ text: "" }), new Paragraph({ text: mName, bold: true, underline: {}, size: 16, alignment: AlignmentType.CENTER })] })] })] })
            ]
        }]
    });
    Packer.toBlob(docFile).then(blob => { saveAs(blob, `Daftar_Induk_Alat_${new Date().toISOString().slice(0, 10)}.docx`); closeExportModal(); });
}

window.loadSampleData = function () {
    document.getElementById('issuedBy').value = 'DPLI'; document.getElementById('certNo').value = '092/LK/WLI/XII/2025'; document.getElementById('certAddress').value = 'PS-PK-WASES-03'; document.getElementById('tagNo').value = 'TI-174'; document.getElementById('brandName').value = 'Rosemount'; document.getElementById('storageLocation').value = 'Utility 1B'; document.getElementById('instrumentName').value = 'Temperature Element'; document.getElementById('manufacturer').value = 'D-87484'; document.getElementById('serialNo').value = 'X7002097526'; document.getElementById('location').value = 'Workshop'; document.getElementById('procedureId').value = 'TI-174';
    document.getElementById('inputMin').value = '0'; document.getElementById('inputMax').value = '400'; document.getElementById('outputMin').value = '0'; document.getElementById('outputMax').value = '400'; document.getElementById('tolerance').value = '2.1';
    document.getElementById('certDate').value = '2026-09-24'; autoCalculateDueDate();
    document.getElementById('techName').value = 'Egi Andrian Nugraha'; document.getElementById('techNik').value = '3042194'; document.getElementById('approvedByInput').value = 'Endin Komarudin'; document.getElementById('approvedByNik').value = '3032156'; document.getElementById('avpNameInput').value = 'Erik Taufik N'; document.getElementById('avpNikInput').value = '3021980';

    if (document.getElementById('testPointModeSelect')) {
        document.getElementById('testPointModeSelect').value = 'NAIK';
    }
    handleTestPointModeChange();

    if (document.getElementById('useBeforeAfter')) document.getElementById('useBeforeAfter').checked = true;

    dynamicInputs = [22.292, 100, 200, 300, 400];
    dynamicNominals = [22.292, 100, 200, 300, 400];
    testDataBefore = [22.400, 100.800, 204.000, 303.000, 402.500];
    testData = [22.550, 100.710, 203.010, 302.380, 401.780];

    applyPatentedInstrument();
};

// --- IMPORT & PARSE PDF EASYCAL (PERBAIKAN KETAT SN, CAL DATE, & RANGE) ---
window.importEasyCalPDF = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();

        // 1. Rekonstruksi Teks Berdasarkan Baris Asli (Y-Coordinate Grouping)
        const items = textContent.items.filter(it => it.str && it.str.trim() !== '');

        items.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 3) return yDiff;
            return a.transform[4] - b.transform[4];
        });

        const lines = [];
        let currentLine = [];
        let currentY = null;

        items.forEach(item => {
            const y = item.transform[5];
            if (currentY === null || Math.abs(currentY - y) > 3) {
                if (currentLine.length > 0) {
                    lines.push(currentLine.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim());
                }
                currentLine = [item];
                currentY = y;
            } else {
                currentLine.push(item);
            }
        });
        if (currentLine.length > 0) {
            lines.push(currentLine.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim());
        }

        const fullText = lines.join('\n');

        // Helper fungsi ekstraksi teks aman
        const getVal = (pattern) => {
            const match = fullText.match(pattern);
            return match && match[1] ? match[1].trim() : '';
        };

        // 2. Parse U.U.T & Header Information
        const idVal = getVal(/ID:\s*([^\n\r]+?)(?=\s+(?:Description|Model|Serial|Location|Comments|Procedure|Input|Output|Reject|Relative|$))/i);
        const descVal = getVal(/Description:\s*([^\n\r]+?)(?=\s+(?:Model|Serial|Location|Comments|Procedure|Input|Output|Reject|Relative|$))/i);
        const modelVal = getVal(/Model:\s*([^\n\r]+?)(?=\s+(?:Serial|Location|Comments|Procedure|Due|Input|Output|Reject|Relative|$))/i);

        // Pemotong SN super ketat (langsung stop begitu ketemu kata Reject, Relative, Location, dll)
        let snRaw = getVal(/Serial\s*(?:Number|No\.?|SN)?\s*:?\s*([^\n\r]+?)(?=\s+(?:Reject|Relative|Temp|RH|Location|Comments|Procedure|Model|Due|Cal|$))/i);
        if (snRaw) {
            snRaw = snRaw.split(/\s+(?:Reject|Relative|Temp|RH|Location|Comments|Procedure|Model|Due|Cal)/i)[0].trim();
        }

        const locVal = getVal(/Location:\s*([^\n\r]+?)(?=\s+(?:Comments|Calibrator|CALIBRATION|Procedure|Input|Output|$))/i);
        const commentsVal = getVal(/Comments:\s*([^\n\r]+?)(?=\s+(?:Calibrator|CALIBRATION|Procedure|Input|Output|$))/i);

        if (idVal) {
            document.getElementById('tagNo').value = idVal;
            document.getElementById('procedureId').value = idVal;
        }
        if (descVal && descVal !== '-') document.getElementById('instrumentName').value = descVal;
        if (modelVal && modelVal !== '-') {
            document.getElementById('manufacturer').value = modelVal;
            const brandMatch = modelVal.match(/^([a-zA-Z0-9]+)/);
            if (brandMatch) document.getElementById('brandName').value = brandMatch[1];
        }
        if (snRaw && snRaw !== '-') document.getElementById('serialNo').value = snRaw;
        if (locVal && locVal !== '-') document.getElementById('location').value = locVal;
        if (commentsVal && commentsVal !== '-') document.getElementById('comments').value = commentsVal;

        // 3. Parse Ranges & Units
        const inRangeMatch = fullText.match(/Input Range:\s*([\d\.\-]+)\s*to\s*([\d\.\-]+)\s*([a-zA-Z°0-9\/%]+)/i);
        let parsedUnitIn = '';
        if (inRangeMatch) {
            document.getElementById('inputMin').value = inRangeMatch[1];
            document.getElementById('inputMax').value = inRangeMatch[2];
            parsedUnitIn = inRangeMatch[3].trim();
        }

        const outRangeMatch = fullText.match(/Output Range:\s*([\d\.\-]+)\s*to\s*([\d\.\-]+)\s*([a-zA-Z°0-9\/%]+)/i);
        let parsedUnitOut = '';
        if (outRangeMatch) {
            document.getElementById('outputMin').value = outRangeMatch[1];
            document.getElementById('outputMax').value = outRangeMatch[2];
            parsedUnitOut = outRangeMatch[3].trim();
        }

        // 4. Auto-Detect Klasifikasi / Jenis Instrumen
        const instTypeSelect = document.getElementById('instrumentType');
        if (parsedUnitOut.toLowerCase() === 'ma') {
            if (parsedUnitIn.toLowerCase().includes('cel') || parsedUnitIn.toLowerCase().includes('°c')) {
                instTypeSelect.value = 'TEMP_TRANSMITTER';
            } else {
                instTypeSelect.value = 'PRESS_TRANSMITTER';
            }
        } else if (parsedUnitIn.toLowerCase().includes('cel') || parsedUnitIn.toLowerCase().includes('°c')) {
            instTypeSelect.value = 'TEMP_ELEMENT';
        } else {
            instTypeSelect.value = 'PRESS_PNEUMATIC';
        }

        applyPatentedInstrument();

        if (parsedUnitIn) {
            const uInSelect = document.getElementById('unitInSelect');
            if (Array.from(uInSelect.options).some(opt => opt.value === parsedUnitIn)) {
                uInSelect.value = parsedUnitIn;
                document.getElementById('unitInCustom').classList.add('hidden');
            } else {
                uInSelect.value = 'CUSTOM';
                document.getElementById('unitInCustom').value = parsedUnitIn;
                document.getElementById('unitInCustom').classList.remove('hidden');
            }
        }

        if (parsedUnitOut) {
            const uOutSelect = document.getElementById('unitOutSelect');
            if (Array.from(uOutSelect.options).some(opt => opt.value === parsedUnitOut)) {
                uOutSelect.value = parsedUnitOut;
                document.getElementById('unitOutCustom').classList.add('hidden');
            } else {
                uOutSelect.value = 'CUSTOM';
                document.getElementById('unitOutCustom').value = parsedUnitOut;
                document.getElementById('unitOutCustom').classList.remove('hidden');
            }
        }

        // 5. Parse Tolerance & Method
        const tolMatch = fullText.match(/Reject Error\s*>?:\s*([\d\.]+)%\s*of\s*(\w+)/i);
        if (tolMatch) {
            document.getElementById('tolerance').value = tolMatch[1];
            document.getElementById('errorMethod').value = tolMatch[2].toUpperCase() === 'SPAN' ? 'SPAN' : 'READING';
        }

        // 6. Parse Tanggal (Akomodasi spasi sebelum/sesudah titik dua)
        const parseEasyCalDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.trim().split(/\s+/);
            if (parts.length >= 3) {
                const day = parts[0].padStart(2, '0');
                const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
                const monthKey = parts[1].toLowerCase().slice(0, 3);
                const month = monthMap[monthKey] || '01';
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            return '';
        };

        const calDateMatch = fullText.match(/(?:Cal(?:ibration)?|Cert(?:ificate)?)\s*Date\s*:\s*([0-9]{1,2}\s+[a-zA-Z]+\s+[0-9]{4})/i);
        if (calDateMatch) {
            const formattedCalDate = parseEasyCalDate(calDateMatch[1]);
            if (formattedCalDate) document.getElementById('certDate').value = formattedCalDate;
        }

        const dueDateMatch = fullText.match(/Due\s*Date\s*:\s*([0-9]{1,2}\s+[a-zA-Z]+\s+[0-9]{4})/i);
        if (dueDateMatch) {
            const formattedDueDate = parseEasyCalDate(dueDateMatch[1]);
            if (formattedDueDate) document.getElementById('dueDateCustom').value = formattedDueDate;
        } else {
            autoCalculateDueDate();
        }

        // 7. Parse Tabel Hasil Pengujian (Point % -> Input -> Nom Output -> Act Output)
        const pointPercentages = ['0%', '25%', '50%', '75%', '100%'];

        pointPercentages.forEach((pt, i) => {
            const rowLine = lines.find(line => {
                const trimmed = line.trim();
                return trimmed.startsWith(pt + ' ') || trimmed.startsWith(pt + '\t') || new RegExp(`^${pt}\\b`).test(trimmed);
            });

            if (rowLine) {
                const inMatch = rowLine.match(/([\d\.]+)\s*(?:mbar|bar|psi|celcius|°c|kg\/cm2)/i);
                if (inMatch) dynamicInputs[i] = parseFloat(inMatch[1]);

                const maMatches = [...rowLine.matchAll(/([\d\.]+)\s*mA/gi)];
                if (maMatches.length >= 2) {
                    dynamicNominals[i] = parseFloat(maMatches[0][1]);
                    testData[i] = parseFloat(maMatches[1][1]);
                } else if (maMatches.length === 1) {
                    testData[i] = parseFloat(maMatches[0][1]);
                }
            }
        });

        switchFormat();
        calculateData();
        updateCommonPreviews();

        alert(`Berhasil mengimpor EasyCal!\nSN: ${snRaw || '-'}\nInput Range: ${document.getElementById('inputMin').value} to ${document.getElementById('inputMax').value}\nCal Date: ${document.getElementById('certDate').value}`);
    } catch (error) {
        console.error("Gagal membaca file PDF:", error);
        alert("Gagal membaca file PDF. Pastikan file adalah sertifikat asli dari EasyCal Time Electronics.");
    } finally {
        event.target.value = '';
    }
};