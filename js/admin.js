import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

        const client = createClient(
            "https://pqgkdnxdsybcfamwadrf.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZ2tkbnhkc3liY2ZhbXdhZHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzE0NjUsImV4cCI6MjA5NzEwNzQ2NX0.lugWuqNI5VMy6hCn-y38-hi825pIHcUjOCAWCsMJz4c"
        );

        let editingCourseId = null;
        let globalInstitutionsList = [];

        const masterInstitutionsAndDepartments = [
            "Al Mudhaibi Health Center", "Wadi Bani Khalid Hospital", "Sinaw Health Hospital",
            "Ibra Health Center", "Sinaw Health Center", "Al Yahmadi Health Center",
            "Al Mudhaibi Health Center (New)", "Samad Al Shaan Hospital", "Bidiyah Hospital",
            "Al Qabil Health Center", "Wadi Dama Wa At Taiyyin Hospital", "Al Dhahir Health Center",
            "Al Jaza Health Center", "Sumayyan Health Center", "Al Jardaa Health Center",
            "Al Aflaj Health Center", "Miss Health Centre",
            "Ibra - Emergency Department Doctor", "Ibra - Emergency Department Nurse", "Ibra - Internal Medicine Department", 
            "Ibra - General Surgery Department", "Ibra - Paediatrician", "Ibra - Obstetrics and Gynecology Department", 
            "Ibra - Orthopedics Department", "Ibra - Ophthalmology Department", "Ibra - ENT Department", 
            "Ibra - Anesthesia Department", "Ibra - Dialysis Unit Nurse", "Ibra - Radiology Department", 
            "Ibra - Laboratory Department", "Ibra - Physiotherapy Department", "Ibra - Clinical Nutrition Department", 
            "Ibra - Pharmacy Department", "Ibra - Male Medical and Surgical Ward", "Ibra - Female Medical and Surgical Ward", 
            "Ibra - Pediatrics Ward", "Ibra - Obstetrics and Gynecology Ward", "Ibra - Adult Intensive Care Unit (ICU)", 
            "Ibra - Special Care Baby Unit (SCBU)", "Ibra - OPD", "Ibra - Nephrologist", "Ibra - DS Nurse", 
            "Ibra - OT Nurse", "Ibra - RT"
        ];

        function pushFileRuleInputRow(labelVal = '', exampleVal = '') {
            const wrapper = document.getElementById('fileArrayWrapper');
            const row = document.createElement('div');
            row.className = 'array-item-row';
            row.style.flexDirection = 'column';
            row.style.alignItems = 'stretch';
            row.style.background = '#ffffff';
            row.style.padding = '10px';
            row.style.borderRadius = '8px';
            row.style.border = '1px solid #e2e8f0';
            row.style.marginBottom = '10px';
            row.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                    <input type="text" class="file-label-item" placeholder="Document Label (e.g. ACLS Card)" value="${labelVal}" required style="flex: 1;">
                    <input type="text" class="file-example-item" placeholder="Reference Guide Image URL" value="${exampleVal}" style="flex: 1;">
                    <button type="button" class="btn-remove">✕</button>
                </div>
                <div class="row-image-preview-box" style="margin-top: 8px; display: ${exampleVal ? 'block' : 'none'};">
                    <img src="${exampleVal || ''}" style="max-width: 100px; max-height: 100px; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1; display: block;"
                    onerror="this.parentElement.style.display='none'">
                </div>
            `;
            const linkInput = row.querySelector('.file-example-item');
            const previewBox = row.querySelector('.row-image-preview-box');
            const previewImg = previewBox.querySelector('img');
            linkInput.addEventListener('input', () => {
                const url = linkInput.value.trim();
                if (url) {
                    previewImg.src = url;
                    previewBox.style.display = 'block';
                } else {
                    previewBox.style.display = 'none';
                    previewImg.src = '';
                }
            });
            row.querySelector('.btn-remove').addEventListener('click', () => {
                row.remove();
                if(document.querySelectorAll('.file-label-item').length === 0) {
                    pushFileRuleInputRow('Required Document', '');
                }
            });
            wrapper.appendChild(row);
        }

        async function seedAndFetchMasterInstitutions() {
            const { data: existing } = await client.from('institutions').select('*');
            if (!existing || existing.length === 0) {
                const insertPayload = masterInstitutionsAndDepartments.map(name => ({ name }));
                await client.from('institutions').insert(insertPayload);
                const { data: updated } = await client.from('institutions').select('*');
                globalInstitutionsList = updated || [];
            } else {
                globalInstitutionsList = existing;
            }
        }

        function renderAllocationMappingFramework(currentMap = []) {
            const ibraContainer = document.getElementById('allocationWrapperIbra');
            const otherContainer = document.getElementById('allocationWrapperOther');
            
            let ibraHtml = [];
            let otherHtml = [];

            globalInstitutionsList.forEach(inst => {
                const match = currentMap.find(m => m.institution_id === inst.id);
                const defaultSlots = match ? match.max_slots : (inst.name.startsWith("Ibra - ") ? 3 : 1);
                const currentCount = match ? match.registered_count : 0;
                const checkedStatus = match || currentMap.length === 0 ? 'checked' : '';
                const categoryType = inst.name.startsWith("Ibra - ") ? "IBRA" : "OTHER";

                const markup = `
                    <div class="allocation-item" data-category="${categoryType}" data-id="${inst.id}">
                        <label class="allocation-item-label-group">
                            <input type="checkbox" class="inst-checkbox-target" data-id="${inst.id}" data-current-count="${currentCount}" ${checkedStatus}>
                            <span>${inst.name}</span>
                        </label>
                        <input type="number" class="inst-slots-target" data-id="${inst.id}" min="0" placeholder="Cap" value="${defaultSlots}">
                    </div>
                `;

                if (categoryType === "IBRA") {
                    ibraHtml.push(markup);
                } else {
                    otherHtml.push(markup);
                }
            });

            ibraContainer.innerHTML = ibraHtml.join('') || '<div style="color:#64748b; font-size:12px; padding:5px;">No records</div>';
            otherContainer.innerHTML = otherHtml.join('') || '<div style="color:#64748b; font-size:12px; padding:5px;">No records</div>';
            
            applyAllocationFilter();
        }

        function applyAllocationFilter() {
            const filterVal = document.getElementById('allocationFilterSelect').value;
            const items = document.querySelectorAll('.allocation-item');
            
            items.forEach(item => {
                const cat = item.getAttribute('data-category');
                if (filterVal === 'ALL' || filterVal === cat) {
                    item.classList.remove('hidden-element');
                } else {
                    item.classList.add('hidden-element');
                }
            });

            const visibleIbra = document.querySelectorAll('#allocationWrapperIbra .allocation-item:not(.hidden-element)');
            if (visibleIbra.length === 0) {
                document.getElementById('ibraSectionBox').classList.add('hidden-element');
            } else {
                document.getElementById('ibraSectionBox').classList.remove('hidden-element');
            }

            const visibleOther = document.querySelectorAll('#allocationWrapperOther .allocation-item:not(.hidden-element)');
            if (visibleOther.length === 0) {
                document.getElementById('otherSectionBox').classList.add('hidden-element');
            } else {
                document.getElementById('otherSectionBox').classList.remove('hidden-element');
            }
        }

        function handleBulkSelectionToggle() {
            const selectAction = document.getElementById('allocationBulkSelectAction').value;
            if (!selectAction) return;

            const allItems = document.querySelectorAll('.allocation-item');
            allItems.forEach(item => {
                const checkbox = item.querySelector('.inst-checkbox-target');
                const isHidden = item.classList.contains('hidden-element');
                const cat = item.getAttribute('data-category');
                
                if (checkbox) {
                    if (selectAction === 'ALL' && !isHidden) {
                        checkbox.checked = true;
                    } else if (selectAction === 'IBRA_ALL') {
                        checkbox.checked = (cat === 'IBRA');
                    } else if (selectAction === 'OTHER_ALL') {
                        checkbox.checked = (cat === 'OTHER');
                    } else if (selectAction === 'NONE' && !isHidden) {
                        checkbox.checked = false;
                    }
                }
            });
            document.getElementById('allocationBulkSelectAction').value = ""; 
        }

        function handleBulkSeatsOverride() {
            const bulkValueString = document.getElementById('bulkSeatsCountInput').value;
            if (bulkValueString === "") {
                alert("Please input a valid chair mapping count capacity first.");
                return;
            }
            const seatCount = parseInt(bulkValueString, 10);
            const targetFilter = document.getElementById('bulkSeatsTargetFilter').value;
            const allItems = document.querySelectorAll('.allocation-item');
            let directCount = 0;

            allItems.forEach(item => {
                const checkbox = item.querySelector('.inst-checkbox-target');
                const slotsInput = item.querySelector('.inst-slots-target');
                const isHidden = item.classList.contains('hidden-element');
                const cat = item.getAttribute('data-category');

                if (checkbox && slotsInput) {
                    let shouldApply = false;
                    
                    if (targetFilter === 'VISIBLE' && !isHidden && checkbox.checked) {
                        shouldApply = true;
                    } else if (targetFilter === 'IBRA' && cat === 'IBRA' && checkbox.checked) {
                        shouldApply = true;
                    } else if (targetFilter === 'OTHER' && cat === 'OTHER' && checkbox.checked) {
                        shouldApply = true;
                    }

                    if (shouldApply) {
                        slotsInput.value = seatCount;
                        directCount++;
                    }
                }
            });
            alert(`Successfully updated localized seats to ${seatCount} for ${directCount} chosen institutions.`);
        }

        /* Preset Template Loader Logic */
        function loadCoursePreset(type) {
            // Setup automated dates helper
            const today = new Date();
            today.setDate(today.getDate() + 30); // Default to a month from now
            const defaultDateString = today.toISOString().split('T')[0];

            if (type === 'BLS') {
                document.getElementById('courseName').value = 'BLS';
                document.getElementById('courseDate').value = defaultDateString;
                document.getElementById('courseSeats').value = '30';
                document.getElementById('courseGender').value = 'Both';
                
                // Target Criteria: Designations Allowed
                document.getElementById('designationModeSelect').value = 'All';
                document.getElementById('customDesignationsBox').classList.add('hidden-element');
                document.querySelectorAll('.desig-checkbox').forEach(cb => cb.checked = false);
                
                // Dynamic Files Mapping
                document.getElementById('documentRequirementSelect').value = 'Yes';
                document.getElementById('documentRulesConfigContainer').classList.remove('hidden-element');
                document.getElementById('fileArrayWrapper').innerHTML = '';
                pushFileRuleInputRow('Purchase bill', 'https://pqgkdnxdsybcfamwadrf.supabase.co/storage/v1/object/public/blueprints/BLS_bill.jpeg');
                pushFileRuleInputRow('Heart code online certificate', 'https://pqgkdnxdsybcfamwadrf.supabase.co/storage/v1/object/public/blueprints/BLS_certification.jpeg');

                // Institutional Allocations Pre-configurations
                const allItems = document.querySelectorAll('.allocation-item');
                allItems.forEach(item => {
                    const checkbox = item.querySelector('.inst-checkbox-target');
                    const slotsInput = item.querySelector('.inst-slots-target');
                    const cat = item.getAttribute('data-category');
                    if(checkbox && slotsInput) {
                        checkbox.checked = true;
                        slotsInput.value = (cat === 'IBRA') ? '5' : '2';
                    }
                });

            } else if (type === 'ACLS') {
                document.getElementById('courseName').value = 'ACLS';
                document.getElementById('courseDate').value = defaultDateString;
                document.getElementById('courseSeats').value = '15';
                document.getElementById('courseGender').value = 'Both';
                
                // Target Criteria: Custom Designations Criteria Setup
                document.getElementById('designationModeSelect').value = 'Custom';
                document.getElementById('customDesignationsBox').classList.remove('hidden-element');
                document.querySelectorAll('.desig-checkbox').forEach(cb => {
                    cb.checked = (cb.value === 'Physician' || cb.value === 'Nurse');
                });

                // Dynamic Files Mapping Setup
                document.getElementById('documentRequirementSelect').value = 'Yes';
                document.getElementById('documentRulesConfigContainer').classList.remove('hidden-element');
                document.getElementById('fileArrayWrapper').innerHTML = '';
                pushFileRuleInputRow('Purchase bill', 'https://pqgkdnxdsybcfamwadrf.supabase.co/storage/v1/object/public/blueprints/ACLS_BILL.jpeg');
                pushFileRuleInputRow('Valid BLS', 'https://pqgkdnxdsybcfamwadrf.supabase.co/storage/v1/object/public/blueprints/BLS_certification.jpeg');
                pushFileRuleInputRow('pretest score', 'https://pqgkdnxdsybcfamwadrf.supabase.co/storage/v1/object/public/blueprints/ACLS_SCORE.jpeg');
                pushFileRuleInputRow('Online course video completed certificate', 'https://pqgkdnxdsybcfamwadrf.supabase.co/storage/v1/object/public/blueprints/ACLS_certification.jpeg');

                // Institutional Allocations Pre-configurations
                const allItems = document.querySelectorAll('.allocation-item');
                allItems.forEach(item => {
                    const checkbox = item.querySelector('.inst-checkbox-target');
                    const slotsInput = item.querySelector('.inst-slots-target');
                    const cat = item.getAttribute('data-category');
                    if(checkbox && slotsInput) {
                        if(cat === 'IBRA') {
                            checkbox.checked = true;
                            slotsInput.value = '3';
                        } else {
                            checkbox.checked = false; // Restrict outside institutions for ACLS by default
                            slotsInput.value = '0';
                        }
                    }
                });
            }
            alert(`${type} Full Template Framework Loaded successfully with complete criteria details.`);
        }

        document.getElementById('designationModeSelect').addEventListener('change', (e) => {
            const box = document.getElementById('customDesignationsBox');
            if (e.target.value === 'Custom') {
                box.classList.remove('hidden-element');
            } else {
                box.classList.add('hidden-element');
                document.querySelectorAll('.desig-checkbox').forEach(cb => cb.checked = false);
            }
        });
        document.getElementById('documentRequirementSelect').addEventListener('change', (e) => {
            const targetContainer = document.getElementById('documentRulesConfigContainer');
            if (e.target.value === 'Yes') {
                targetContainer.classList.remove('hidden-element');
            } else {
                targetContainer.classList.add('hidden-element');
            }
        });

        async function reloadAdminConsoleDashboard() {
            await seedAndFetchMasterInstitutions();
            const { data: courses, error: errC } = await client.from('courses').select('*').order('id', { ascending: true });
            const tbody = document.getElementById('coursesMainTableBody');
            if (errC) {
                tbody.innerHTML = `<tr><td colspan="6" style="color:#dc2626; text-align:center; padding: 20px;">Error indexing courses table data arrays.</td></tr>`;
            } else if (!courses || courses.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding: 20px;">No tracked courses inside live configuration space.</td></tr>`;
            } else {
                tbody.innerHTML = courses.map(c => {
                    let fileLabels = [];
                    let fileExamples = [];
                    try {
                        if (Array.isArray(c.file_labels)) {
                            fileLabels = c.file_labels;
                        } else if (typeof c.file_labels === 'string') {
                            fileLabels = JSON.parse(c.file_labels);
                        }
                    } catch (e) { fileLabels = []; }
 
                    try {
                        if (Array.isArray(c.file_examples)) {
                            fileExamples = c.file_examples;
                        } else if (typeof c.file_examples === 'string') {
                            fileExamples = JSON.parse(c.file_examples);
                        }
                    } catch (e) { fileExamples = []; }

                    if (!Array.isArray(fileLabels)) fileLabels = [];
                    if (!Array.isArray(fileExamples)) fileExamples = [];

                    const badgeHtml = fileLabels.map((l, idx) => {
                        const imgUrl = fileExamples[idx] || '';
                        const imgMarkup = imgUrl ? `
                            <div style="margin-top: 4px;">
                                <a href="${imgUrl}" target="_blank">
                                    <img src="${imgUrl}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1;" onerror="this.style.display='none'">
                                </a>
                            </div>` : '';
                        return `
                            <div style="margin-bottom: 8px; display: inline-block; vertical-align: top; margin-right: 8px; text-align: center;">
                                <span class="badge-info">${l}</span>
                                ${imgMarkup}
                            </div>`;
                    }).join('') || '<span class="badge-info" style="background:#f1f5f9; color:#94a3b8;">None Required</span>';
                    
                    const sexAllowed = c.allowed_sex || 'Both';
                    const availableSeats = c.seats !== undefined && c.seats !== null ? c.seats : 0;
                    const courseNameClean = c.name || 'Unnamed Course';
                    const courseDateClean = c.course_date || 'N/A';

                    let desigArr = [];
                    try {
                        if (Array.isArray(c.allowed_designations)) {
                            desigArr = c.allowed_designations;
                        } else if (typeof c.allowed_designations === 'string' && c.allowed_designations.trim() !== '') {
                            desigArr = JSON.parse(c.allowed_designations);
                        }
                    } catch(e) { desigArr = []; }

                    const desigMarkup = (!desigArr || desigArr.length === 0 || desigArr.includes('All')) 
                        ? `<span class="badge-info" style="background:#f0fdf4; color:#16a34a;">All Roles</span>`
                        : desigArr.map(d => `<span class="badge-info" style="background:#e0f2fe; color:#0369a1;">${d}</span>`).join(' ');
                    return `
                        <tr>
                            <td><b>${courseNameClean}</b></td>
                            <td>${courseDateClean}</td>
                            <td>${availableSeats} seats</td>
                            <td>
                                <div style="margin-bottom: 4px;"><span class="badge-info" style="background:#f5f3ff; color:#7c3aed;">Gender: ${sexAllowed}</span></div>
                                <div>${desigMarkup}</div>
                            </td>
                            <td>${badgeHtml}</td>
                            <td class="action-cell">
                                <button class="btn-tbl-edit" data-id="${c.id}">Edit</button>
                                <button class="btn-tbl-delete" data-id="${c.id}">Remove</button>
                            </td>
                        </tr>
                    `;
                }).join('');

                document.querySelectorAll('.btn-tbl-edit').forEach(b => b.addEventListener('click', () => triggerEditOperationalMode(b.getAttribute('data-id'))));
                document.querySelectorAll('.btn-tbl-delete').forEach(b => b.addEventListener('click', () => deleteTargetCourseTrack(b.getAttribute('data-id'))));
            }
        }

        async function triggerEditOperationalMode(id) {
            editingCourseId = Number(id);
            document.getElementById('formPanelTitle').innerText = "Modify Operational Managed Course Elements";
            document.getElementById('cancelEditBtn').classList.remove('hidden-element');

            const { data: course } = await client.from('courses').select('*').eq('id', editingCourseId).single();
            if (!course) return;
            document.getElementById('courseName').value = course.name || '';
            document.getElementById('courseDate').value = course.course_date || '';
            document.getElementById('courseSeats').value = course.seats !== undefined ? course.seats : '';
            document.getElementById('courseGender').value = course.allowed_sex || 'Both';

            let desigArr = [];
            try {
                if (Array.isArray(course.allowed_designations)) {
                    desigArr = course.allowed_designations;
                } else if (typeof course.allowed_designations === 'string' && course.allowed_designations.trim() !== '') {
                    desigArr = JSON.parse(course.allowed_designations);
                }
            } catch(e) { desigArr = []; }

            const modeSelect = document.getElementById('designationModeSelect');
            const box = document.getElementById('customDesignationsBox');
            document.querySelectorAll('.desig-checkbox').forEach(cb => cb.checked = false);

            if (!desigArr || desigArr.length === 0 || desigArr.includes('All')) {
                modeSelect.value = 'All';
                box.classList.add('hidden-element');
            } else {
                modeSelect.value = 'Custom';
                box.classList.remove('hidden-element');
                document.querySelectorAll('.desig-checkbox').forEach(cb => {
                    if (desigArr.includes(cb.value)) cb.checked = true;
                });
            }

            document.getElementById('fileArrayWrapper').innerHTML = '';
            
            let labels = [];
            let examples = [];
            try {
                labels = Array.isArray(course.file_labels) ? course.file_labels : (typeof course.file_labels === 'string' ? JSON.parse(course.file_labels) : []);
                examples = Array.isArray(course.file_examples) ? course.file_examples : (typeof course.file_examples === 'string' ? JSON.parse(course.file_examples) : []);
            } catch(e) {
                labels = [];
                examples = [];
            }
            
            if(!Array.isArray(labels)) labels = [];
            if(!Array.isArray(examples)) examples = [];

            const docSelect = document.getElementById('documentRequirementSelect');
            const docContainer = document.getElementById('documentRulesConfigContainer');
            if (labels.length === 0) {
                docSelect.value = 'No';
                docContainer.classList.add('hidden-element');
                pushFileRuleInputRow('Required Document', '');
            } else {
                docSelect.value = 'Yes';
                docContainer.classList.remove('hidden-element');
                labels.forEach((lbl, idx) => pushFileRuleInputRow(lbl, examples[idx] || ''));
            }

            const { data: mappingAllocations } = await client.from('course_institutions').select('*').eq('course_id', editingCourseId);
            renderAllocationMappingFramework(mappingAllocations || []);
            
            document.getElementById('courseName').scrollIntoView({ behavior: 'smooth' });
        }

        function exitEditOperationalMode() {
            editingCourseId = null;
            document.getElementById('formPanelTitle').innerText = "Create New Managed Course";
            document.getElementById('cancelEditBtn').classList.add('hidden-element');
            document.getElementById('courseConfigForm').reset();
            document.getElementById('fileArrayWrapper').innerHTML = '';
            document.getElementById('bulkSeatsCountInput').value = '';
            document.getElementById('allocationFilterSelect').value = 'ALL';
            document.getElementById('customDesignationsBox').classList.add('hidden-element');
            document.getElementById('documentRulesConfigContainer').classList.add('hidden-element');
            document.getElementById('documentRequirementSelect').value = 'No';
            document.querySelectorAll('.desig-checkbox').forEach(cb => cb.checked = false);
            pushFileRuleInputRow('Required Document', '');
            renderAllocationMappingFramework([]);
        }

        async function deleteTargetCourseTrack(id) {
            if (confirm("Are you absolutely sure you want to remove this course configuration track from the database?")) {
                const { error } = await client.from('courses').delete().eq('id', Number(id));
                if (!error) {
                    alert("Course successfully removed.");
                    reloadAdminConsoleDashboard();
                    if (editingCourseId === Number(id)) exitEditOperationalMode();
                } else {
                    alert("Removal error: " + error.message);
                }
            }
        }

        async function handleFormSubmission(e) {
            e.preventDefault();
            const name = document.getElementById('courseName').value.trim();
            const course_date = document.getElementById('courseDate').value;
            const seats = parseInt(document.getElementById('courseSeats').value, 10);
            const allowed_sex = document.getElementById('courseGender').value;
            const modeSelect = document.getElementById('designationModeSelect').value;
            let allowed_designations = ['All'];
            
            if (modeSelect === 'Custom') {
                const checkedBoxes = document.querySelectorAll('.desig-checkbox:checked');
                if (checkedBoxes.length === 0) {
                    alert("Please select at least one Designation role parameter when setting customized criteria restrictions.");
                    return;
                }
                allowed_designations = Array.from(checkedBoxes).map(cb => cb.value);
            }

            const docRequirement = document.getElementById('documentRequirementSelect').value;
            let file_labels = [];
            let file_examples = [];
            let required_files = 0;

            if (docRequirement === 'Yes') {
                const labelElements = document.querySelectorAll('.file-label-item');
                const exampleElements = document.querySelectorAll('.file-example-item');
                
                labelElements.forEach((el, index) => {
                    const labelVal = el.value.trim();
                    if(labelVal) {
                        file_labels.push(labelVal);
                        file_examples.push(exampleElements[index] ? exampleElements[index].value.trim() : '');
                    }
                });
                required_files = file_labels.length;
            }

            if (editingCourseId) {
                const { error: updErr } = await client.from('courses').update({
                    name, course_date, seats, required_files, file_labels, file_examples, allowed_sex, allowed_designations
                }).eq('id', editingCourseId);
                if (updErr) {
                    alert("Matrix transaction insertion execution error: " + updErr.message);
                    return;
                }

                await client.from('course_institutions').delete().eq('course_id', editingCourseId);
                await pushAllocationRecords(editingCourseId);
                
                alert("Course configurations updated successfully.");
                exitEditOperationalMode();
            } else {
                const { data: newCourse, error: insErr } = await client.from('courses').insert({
                    name, course_date, seats, required_files, file_labels, file_examples, allowed_sex, allowed_designations
                }).select().single();
                if (insErr) {
                    alert("Creation module error pipeline rejection: " + insErr.message);
                    return;
                }

                await pushAllocationRecords(newCourse.id);
                alert("New managed course added successfully.");
                
                document.getElementById('courseDate').value = '';
            }

            await reloadAdminConsoleDashboard();
        }

        async function pushAllocationRecords(courseId) {
            const allocationRows = [];
            const checkboxes = document.querySelectorAll('.inst-checkbox-target');
            
            checkboxes.forEach(chk => {
                const item = chk.closest('.allocation-item');
                const isHiddenByFilter = item && item.classList.contains('hidden-element');

                // An institution only gets saved if it's both checked AND currently
                // visible under the chosen Restrictions Options filter. This is what
                // makes "Ibra Only" / "Other Only" actually exclude the other side,
                // instead of just hiding it from view while still saving it.
                if (chk.checked && !isHiddenByFilter) {
                    const instId = Number(chk.getAttribute('data-id'));
                    const currentCount = parseInt(chk.getAttribute('data-current-count'), 10) || 0;
                    const slotsInput = document.querySelector(`.inst-slots-target[data-id="${instId}"]`);
                    const max_slots = slotsInput ? parseInt(slotsInput.value, 10) || 1 : 1;
                    
                    allocationRows.push({
                        course_id: courseId,
                        institution_id: instId,
                        max_slots: max_slots,
                        registered_count: currentCount
                    });
                }
            });
            if (allocationRows.length > 0) {
                await client.from('course_institutions').insert(allocationRows);
            }
        }

        window.pushFileRuleInputRow = pushFileRuleInputRow;
        document.getElementById('addFileRuleRowBtn').addEventListener('click', () => pushFileRuleInputRow('', ''));
        document.getElementById('cancelEditBtn').addEventListener('click', exitEditOperationalMode);
        document.getElementById('courseConfigForm').addEventListener('submit', handleFormSubmission);
        
        document.getElementById('allocationFilterSelect').addEventListener('change', applyAllocationFilter);
        document.getElementById('allocationBulkSelectAction').addEventListener('change', handleBulkSelectionToggle);
        document.getElementById('applyBulkSeatsBtn').addEventListener('click', handleBulkSeatsOverride);

        /* Preset Button Event Listeners */
        document.getElementById('loadBlsPresetBtn').addEventListener('click', () => loadCoursePreset('BLS'));
        document.getElementById('loadAclsPresetBtn').addEventListener('click', () => loadCoursePreset('ACLS'));
        
        (async function init() {
            await seedAndFetchMasterInstitutions();
            pushFileRuleInputRow('Required Document', '');
            renderAllocationMappingFramework([]);
            await reloadAdminConsoleDashboard();
        })();
        
        window.clearForm = function() {
            if (!confirm("⚠️ Are you sure you want to clear all fields? This action cannot be undone.")) {
                return;
            }
        
            const form = document.getElementById('courseConfigForm');
            form.reset();
        
            document.getElementById('customDesignationsBox').classList.add('hidden-element');
            document.getElementById('documentRulesConfigContainer').classList.add('hidden-element');
        
            const fileWrapper = document.getElementById('fileArrayWrapper');
            if (fileWrapper) { fileWrapper.innerHTML = ''; }
        
            document.getElementById('designationModeSelect').value = 'All';
            document.getElementById('documentRequirementSelect').value = 'No';
            
            // Re-render empty selection map
            renderAllocationMappingFramework([]);
            alert("Form cleared successfully.");
        };
