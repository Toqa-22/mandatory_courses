import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

        const client = createClient(
            "https://pqgkdnxdsybcfamwadrf.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZ2tkbnhkc3liY2ZhbXdhZHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzE0NjUsImV4cCI6MjA5NzEwNzQ2NX0.lugWuqNI5VMy6hCn-y38-hi825pIHcUjOCAWCsMJz4c"
        );

        let coursesCached = [];
        let courseInstitutionsMapCached = [];
        let registrationLogsCached = [];

        const departmentsList = [
            "Emergency Department Doctor", "Emergency Department Nurse", "Internal Medicine Department", "General Surgery Department",
            "Paediatrician", "Obstetrics and Gynecology Department", "Orthopedics Department",
            "Ophthalmology Department", "ENT Department", "Anesthesia Department",
            "Dialysis Unit Nurse", "Radiology Department", "Laboratory Department",
            "Physiotherapy Department", "Clinical Nutrition Department", "Pharmacy Department",
            "Male Medical and Surgical Ward", "Female Medical and Surgical Ward", "Pediatrics Ward",
            "Obstetrics and Gynecology Ward", "Adult Intensive Care Unit (ICU)", "Special Care Baby Unit (SCBU)",
            "OPD", "Nephrologist", "DS Nurse", "OT Nurse", "RT"
        ];

        const DESIGNATION_OPTIONS = ["Nurse", "Physician", "Technician", "Other"];
        const OTHER_CATCHALL_NAME = "Other (Please Specify)";

        // Fields that only appear once a course has been chosen
        const REST_OF_FORM_IDS = [
            'staffName', 'staffNumber', 'phoneNumber', 'sexSelect',
            'designationFieldWrapper', 'specializationInput',
            'institutionFieldWrapper', 'submitRowContainer'
        ];

        function toggleFormVisibility(show) {
            REST_OF_FORM_IDS.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('hidden-element', !show);
            });
        }

        function updateGenderOptionsForCourse(courseId) {
            const select = document.getElementById('sexSelect');
            const currentValue = select.value;
            const course = coursesCached.find(c => c.id === courseId);
            const allowedSex = course ? course.allowed_sex : null;

            let allowed;
            if (allowedSex === 'Male') {
                allowed = [{ v: 'Male', t: 'Male' }];
            } else if (allowedSex === 'Female') {
                allowed = [{ v: 'Female', t: 'Female' }];
            } else {
                allowed = [{ v: 'Male', t: 'Male' }, { v: 'Female', t: 'Female' }];
            }

            let optionsHtml = '<option value="">-- Gender --</option>';
            optionsHtml += allowed.map(o => `<option value="${o.v}">${o.t}</option>`).join('');
            select.innerHTML = optionsHtml;

            select.value = allowed.some(o => o.v === currentValue) ? currentValue : '';
        }

        function updateInstitutionTypeOptionsForCourse(courseId) {
            const select = document.getElementById('institutionTypeSelect');
            const currentValue = select.value;
            const mappingsForCourse = courseInstitutionsMapCached.filter(m => m.course_id === courseId);

            const hasIbra = mappingsForCourse.some(m => m.institutions?.name?.startsWith('Ibra - '));
            const hasOther = mappingsForCourse.some(m => m.institutions?.name && !m.institutions.name.startsWith('Ibra - '));
            // If no allocation has been configured for this course at all, fall back to showing both
            // rather than blocking registration entirely.
            const noMappingConfigured = mappingsForCourse.length === 0;

            let optionsHtml = '<option value="">-- Choose Institution Option --</option>';
            if (hasIbra || noMappingConfigured) optionsHtml += '<option value="Ibra">Ibra hospital</option>';
            if (hasOther || noMappingConfigured) optionsHtml += '<option value="Other">Other hospital and health center</option>';
            select.innerHTML = optionsHtml;

            const stillValid = (currentValue === 'Ibra' && (hasIbra || noMappingConfigured)) ||
                                (currentValue === 'Other' && (hasOther || noMappingConfigured));
            select.value = stillValid ? currentValue : '';
        }

        function updateDesignationOptionsForCourse(courseId) {
            const select = document.getElementById('designationSelect');
            const currentValue = select.value;
            const course = coursesCached.find(c => c.id === courseId);

            let allowed = DESIGNATION_OPTIONS;
            if (course && course.allowed_designations) {
                try {
                    const list = Array.isArray(course.allowed_designations)
                        ? course.allowed_designations
                        : JSON.parse(course.allowed_designations);
                    if (Array.isArray(list) && list.length > 0 && !list.includes('All')) {
                        allowed = DESIGNATION_OPTIONS.filter(d => list.includes(d));
                    }
                } catch (e) {
                    allowed = DESIGNATION_OPTIONS;
                }
            }

            let optionsHtml = '<option value="">-- Designation --</option>';
            optionsHtml += allowed.map(d => `<option value="${d}">${d}</option>`).join('');
            select.innerHTML = optionsHtml;

            if (allowed.includes(currentValue)) {
                select.value = currentValue;
            } else {
                select.value = '';
                const otherInput = document.getElementById('otherDesignationInput');
                otherInput.classList.add('hidden-element');
                otherInput.required = false;
                otherInput.value = '';
            }
        }

        function handleDesignationChange() {
            const select = document.getElementById('designationSelect');
            const otherInput = document.getElementById('otherDesignationInput');
            if (select.value === 'Other') {
                otherInput.classList.remove('hidden-element');
                otherInput.required = true;
            } else {
                otherInput.classList.add('hidden-element');
                otherInput.required = false;
                otherInput.value = '';
            }
            updateSelectableCoursesOptions();
        }

        function renderInstitutionFields() {
            const selectedType = document.getElementById('institutionTypeSelect').value;
            const deptContainer = document.getElementById('departmentContainer');
            const otherContainer = document.getElementById('otherInstitutionContainer');
            const courseId = Number(document.getElementById('courseSelect').value);

            if (selectedType === 'Ibra') {
                deptContainer.classList.remove('hidden-element');
                otherContainer.classList.add('hidden-element');
                document.getElementById('otherInstitutionInput').value = '';
                resetOtherFreeText();
                filterIbraDepartments(courseId);
            } else if (selectedType === 'Other') {
                otherContainer.classList.remove('hidden-element');
                deptContainer.classList.add('hidden-element');
                document.getElementById('departmentSelect').value = '';
                filterOtherInstitutions(courseId);
                handleOtherInstitutionChange();
            } else {
                deptContainer.classList.add('hidden-element');
                otherContainer.classList.add('hidden-element');
                document.getElementById('departmentSelect').value = '';
                document.getElementById('otherInstitutionInput').value = '';
                resetOtherFreeText();
            }
        }

        function resetOtherFreeText() {
            const freeText = document.getElementById('otherInstitutionFreeText');
            freeText.value = '';
            freeText.required = false;
            freeText.classList.add('hidden-element');
        }

        function handleOtherInstitutionChange() {
            const otherDropdown = document.getElementById('otherInstitutionInput');
            const freeText = document.getElementById('otherInstitutionFreeText');
            if (otherDropdown.value === OTHER_CATCHALL_NAME) {
                freeText.classList.remove('hidden-element');
                freeText.required = true;
            } else {
                resetOtherFreeText();
            }
        }

        function filterIbraDepartments(courseId) {
            const deptDropdown = document.getElementById('departmentSelect');
            const currentSelected = deptDropdown.value;
            
            let html = '<option value="">-- Choose Department --</option>';
            departmentsList.forEach(dept => {
                let chairsLeftStr = '';
                let isClosed = false;

                if (courseId) {
                    const matchString = `Ibra - ${dept}`;
                    const allocationConfig = courseInstitutionsMapCached.find(m => m.course_id === courseId && m.institutions?.name === matchString);
                    
                    if (allocationConfig) {
                        const countFilled = registrationLogsCached.filter(r => r.course_id === courseId && r.institution_name_snapshot === matchString).length;
                        const chairsLeft = Math.max(0, allocationConfig.max_slots - countFilled);
                        chairsLeftStr = ` (${chairsLeft} chairs remaining)`;
                        if (chairsLeft <= 0) isClosed = true;
                    } else {
                        isClosed = true; 
                    }
                }

                const selectedAttr = (dept === currentSelected) ? 'selected' : '';

                if (!isClosed) {
                    html += `<option value="${dept}" ${selectedAttr}>${dept}${chairsLeftStr}</option>`;
                } else {
                    html += `<option value="${dept}" disabled style="color:#cbd5e1;" ${selectedAttr}>${dept} (CLOSED / NOT ALLOCATED)</option>`;
                }
            });
            deptDropdown.innerHTML = html;
        }

        function filterOtherInstitutions(courseId) {
            const otherDropdown = document.getElementById('otherInstitutionInput');
            const currentSelected = otherDropdown.value;
            const options = Array.from(otherDropdown.options);

            options.forEach(opt => {
                if (opt.value === "") return;
                let chairsLeftStr = '';
                let isClosed = false;

                if (courseId) {
                    const allocationConfig = courseInstitutionsMapCached.find(m => m.course_id === courseId && m.institutions?.name === opt.value);
                    
                    if (allocationConfig) {
                        const countFilled = opt.value === OTHER_CATCHALL_NAME
                            ? registrationLogsCached.filter(r => r.course_id === courseId && r.institution_name_snapshot && r.institution_name_snapshot.startsWith(OTHER_CATCHALL_NAME)).length
                            : registrationLogsCached.filter(r => r.course_id === courseId && r.institution_name_snapshot === opt.value).length;
                        const chairsLeft = Math.max(0, allocationConfig.max_slots - countFilled);
                        opt.text = `${opt.value} (${chairsLeft} chairs remaining)`;
                        if (chairsLeft <= 0) isClosed = true;
                    } else {
                        isClosed = true;
                    }
                }

                opt.disabled = isClosed;
                opt.style.color = isClosed ? '#cbd5e1' : '';
                if (isClosed) opt.text = `${opt.value} (CLOSED / NOT ALLOCATED)`;
            });
        }

        function handleCourseSelectionChange() {
            const courseId = Number(document.getElementById('courseSelect').value);
            const container = document.getElementById('dynamicUploadsContainer');

            toggleFormVisibility(!!courseId);
            updateDesignationOptionsForCourse(courseId);
            updateGenderOptionsForCourse(courseId);
            updateInstitutionTypeOptionsForCourse(courseId);
            renderInstitutionFields();
            
            if (!courseId) {
                container.innerHTML = '<div style="color: #64748b; padding: 10px;">No available session course selected.</div>';
                return;
            }

            const selectedCourse = coursesCached.find(c => c.id === courseId);

            let labels = [];
            let examples = [];
            try {
                labels = selectedCourse && Array.isArray(selectedCourse.file_labels) ? selectedCourse.file_labels : JSON.parse(selectedCourse.file_labels || "[]");
                examples = selectedCourse && Array.isArray(selectedCourse.file_examples) ? selectedCourse.file_examples : JSON.parse(selectedCourse.file_examples || "[]");
            } catch(e) {
                labels = [];
                examples = [];
            }

            labels = labels.filter(l => l && l.trim() !== "");
            
            if (labels.length === 0) {
                container.innerHTML = '<div class="no-uploads-msg">✅ No document attachments are required for this course session.</div>';
                return;
            }

            container.innerHTML = labels.map((descText, idx) => {
                const exampleUrl = examples[idx] || '';
                
                const exampleImageHtml = exampleUrl ? `
                    <div class="form-blueprint-card">
                        <a href="${exampleUrl}" target="_blank">
                            <img src="${exampleUrl}" alt="Template Reference Guide" onerror="this.parentElement.parentElement.style.display='none'">
                        </a>
                        <div>
                            <b>Example Document Blueprint:</b>
                            Please ensure your copy matches parameters shown here.
                        </div>
                    </div>` : '';

                return `
                    <div class="single-upload-box">
                        <label>Upload Document #${idx + 1}: <span>${descText} *</span></label>
                        ${exampleImageHtml}
                        <input type="file" class="file-input custom-file-target" data-label="${descText}" accept="image/*, .pdf" required>
                    </div>
                `;
            }).join('');
        }

        function updateSelectableCoursesOptions() {
            const userSex = document.getElementById('sexSelect').value;
            let userDesignation = document.getElementById('designationSelect').value;
            
            if (userDesignation === 'Other') {
                userDesignation = document.getElementById('otherDesignationInput').value.trim();
            }
            
            const courseDropdown = document.getElementById('courseSelect');
            const savedSelectedValue = courseDropdown.value;

            let filtered = coursesCached.filter(c => c.seats > 0);

            if (userSex) {
                filtered = filtered.filter(c => !c.allowed_sex || c.allowed_sex === 'Both' || c.allowed_sex === userSex);
            }

            if (userDesignation) {
                filtered = filtered.filter(c => {
                    if (!c.allowed_designations) return true;
                    try {
                        const targetList = Array.isArray(c.allowed_designations) ? c.allowed_designations : JSON.parse(c.allowed_designations);
                        if (targetList.length === 0 || targetList.includes('All')) return true;
                        return targetList.includes(userDesignation);
                    } catch (e) {
                        return true;
                    }
                });
            }

            let optionsHtml = '<option value="">-- Choose Course --</option>';
            optionsHtml += filtered.map(c => `<option value="${c.id}">${c.name} (🗓️ ${c.course_date}) (${c.seats} total seats left)</option>`).join('');
            
            courseDropdown.innerHTML = optionsHtml;
            
            if (filtered.some(c => c.id === Number(savedSelectedValue))) {
                courseDropdown.value = savedSelectedValue;
            } else {
                courseDropdown.value = "";
                handleCourseSelectionChange();
            }
        }

        async function loadRegistrationFormConfig() {
            const { data: courses, error: courseErr } = await client.from('courses').select('*').order('id', { ascending: true });
            if (courseErr) return console.error("Database fetch error:", courseErr);
            coursesCached = courses;

            const { data: maps, error: mapErr } = await client.from('course_institutions').select('*, institutions(name)');
            if (mapErr) return console.error("Allocation mapping database tracking fail:", mapErr);
            courseInstitutionsMapCached = maps || [];

            const { data: registers, error: regErr } = await client.from('registrations').select('course_id, institution_name_snapshot');
            if (regErr) return console.error("Logs fetch error:", regErr);
            registrationLogsCached = registers || [];

            document.getElementById('courseCards').innerHTML = courses.map(course => {
                let labels = [];
                try { labels = Array.isArray(course.file_labels) ? course.file_labels : JSON.parse(course.file_labels || "[]"); } catch(e){}
                labels = labels.filter(l => l && l.trim() !== "");
                const reqCountText = labels.length > 0 ? `${labels.length} file(s)` : "None";
                const genderBadge = course.allowed_sex !== 'Both' ? ` <span style="font-size:10px; background:#f5f3ff; color:#7c3aed; padding:2px 6px; border-radius:4px;">${course.allowed_sex}</span>` : '';
                
                return `
                    <div class="course-card">
                        <div class="course-name" style="font-size:24px; font-weight:bold;">${course.name}${genderBadge}</div>
                        <div class="course-date-display">🗓️ ${course.course_date}</div>
                        <div class="seat-number">${course.seats}</div>
                        <div class="seat-text">Chairs Available</div>
                        <div style="font-size:12px; margin-top:8px; color:#64748b; font-weight:bold;">Requires: ${reqCountText}</div>
                    </div>
                `;
            }).join('');

            updateSelectableCoursesOptions();
        }

        async function handleSubmit() {
            const regBtn = document.getElementById('regBtn');
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            const sexValue    = document.getElementById('sexSelect').value;
            const staffName   = document.getElementById('staffName').value.trim();
            const staffNumber = document.getElementById('staffNumber').value.trim();
            
            let designation = document.getElementById('designationSelect').value;
            if (designation === 'Other') {
                designation = document.getElementById('otherDesignationInput').value.trim();
            }
            
            const specialization = document.getElementById('specializationInput').value.trim();
            const courseId    = Number(document.getElementById('courseSelect').value);
            const instType    = document.getElementById('institutionTypeSelect').value;
            
            const selectedDept = document.getElementById('departmentSelect').value;
            const otherText    = document.getElementById('otherInstitutionInput').value;
            const otherFreeText = document.getElementById('otherInstitutionFreeText').value.trim();
            const fileInputs   = document.querySelectorAll('.custom-file-target');

            if (!phoneNumber || !sexValue || !staffName || !staffNumber || !designation || !specialization || !courseId || !instType) {
                alert("Please complete all text fields and selection items.");
                return;
            }

            let institutionSnapshotString = '';
            let allocationLookupName = '';
            const isOtherCatchAll = (instType === 'Other' && otherText === OTHER_CATCHALL_NAME);

            if (instType === 'Ibra') {
                if (!selectedDept) { alert("Please select your target department."); return; }
                institutionSnapshotString = `Ibra - ${selectedDept}`;
                allocationLookupName = institutionSnapshotString;
            } else {
                if (!otherText) { alert("Please select your institution name."); return; }
                if (isOtherCatchAll) {
                    if (!otherFreeText) { alert("Please type your institution name."); return; }
                    institutionSnapshotString = `${OTHER_CATCHALL_NAME}: ${otherFreeText}`;
                    allocationLookupName = OTHER_CATCHALL_NAME;
                } else {
                    institutionSnapshotString = otherText;
                    allocationLookupName = otherText;
                }
            }

            const currentCourse = coursesCached.find(c => c.id === courseId);
            for (let input of fileInputs) {
                if (!input.files || input.files.length === 0) {
                    alert(`Registration denied! Missing file target object: "${input.getAttribute('data-label')}"`);
                    return;
                }
            }

            regBtn.disabled = true;
            regBtn.innerText = "Processing server storage sequence uploads...";

            try {
                const allocationConfig = courseInstitutionsMapCached.find(m => m.course_id === courseId && m.institutions?.name === allocationLookupName);
                if (!allocationConfig) {
                    throw new Error("This institution/department is not authorized or assigned slots for this specific course framework.");
                }

                let realTimeQuery = client.from('registrations')
                    .select('id')
                    .eq('course_id', courseId);
                realTimeQuery = isOtherCatchAll
                    ? realTimeQuery.like('institution_name_snapshot', `${OTHER_CATCHALL_NAME}%`)
                    : realTimeQuery.eq('institution_name_snapshot', institutionSnapshotString);
                const { data: realTimeCheck } = await realTimeQuery;
                
                if (realTimeCheck && realTimeCheck.length >= allocationConfig.max_slots) {
                    throw new Error(`This department/institution seat room has filled its cap limit of ${allocationConfig.max_slots} seats. Registration locked.`);
                }

                const uploadedUrls = [];
                for (let i = 0; i < fileInputs.length; i++) {
                    const currentFile = fileInputs[i].files[0];
                    const fileExtension = currentFile.name.split('.').pop();
                    const cleanLabel = fileInputs[i].getAttribute('data-label').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const uniqueFileName = `${Date.now()}_${cleanLabel}_${Math.random().toString(36).substring(7)}.${fileExtension}`;

                    const { error: uploadError } = await client.storage
                        .from('registration-files')
                        .upload(uniqueFileName, currentFile);

                    if (uploadError) throw new Error(`Upload Failed: ` + uploadError.message);

                    const { data: publicUrlData } = client.storage
                        .from('registration-files')
                        .getPublicUrl(uniqueFileName);

                    uploadedUrls.push(publicUrlData.publicUrl);
                }

                const { error: insertError } = await client.from('registrations').insert({
                    phone_number: phoneNumber,
                    sex_snapshot: sexValue,
                    staff_name: staffName,
                    staff_number: staffNumber,
                    designation_snapshot: designation,
                    specialization_snapshot: specialization, 
                    institution_id: allocationConfig.institution_id,
                    institution_name_snapshot: institutionSnapshotString,
                    course_id: courseId,
                    file_urls: uploadedUrls
                });

                if (insertError) throw new Error("Database Write Error: " + insertError.message);

                await client.from('courses').update({ seats: Math.max(0, currentCourse.seats - 1) }).eq('id', courseId);

                if (allocationConfig.id) {
                     await client.from('course_institutions')
                        .update({ registered_count: (realTimeCheck ? realTimeCheck.length : 0) + 1 })
                        .eq('id', allocationConfig.id);
                }

                alert('Registration verified and successfully logged!');
                
                document.getElementById('phoneNumber').value = '';
                document.getElementById('sexSelect').value = '';
                document.getElementById('staffName').value   = '';
                document.getElementById('staffNumber').value = '';
                document.getElementById('designationSelect').value = '';
                document.getElementById('otherDesignationInput').value = '';
                document.getElementById('otherDesignationInput').classList.add('hidden-element');
                document.getElementById('specializationInput').value = '';
                document.getElementById('institutionTypeSelect').value = '';
                document.getElementById('departmentSelect').value = '';
                document.getElementById('otherInstitutionInput').value = '';
                resetOtherFreeText();
                document.getElementById('courseSelect').value = '';
                
                await loadRegistrationFormConfig();

            } catch (err) {
                alert(err.message || "An error occurred.");
            } finally {
                regBtn.disabled = false;
                regBtn.innerText = "Register Now";
            }
        }

        document.getElementById('institutionTypeSelect').addEventListener('change', renderInstitutionFields);
        document.getElementById('otherInstitutionInput').addEventListener('change', handleOtherInstitutionChange);
        document.getElementById('courseSelect').addEventListener('change', handleCourseSelectionChange);
        
        document.getElementById('sexSelect').addEventListener('change', updateSelectableCoursesOptions);
        document.getElementById('designationSelect').addEventListener('change', handleDesignationChange);
        document.getElementById('otherDesignationInput').addEventListener('input', updateSelectableCoursesOptions);

        document.getElementById('regBtn').addEventListener('click', handleSubmit);

        loadRegistrationFormConfig();
