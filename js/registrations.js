import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';
        const client = createClient(
            "https://pqgkdnxdsybcfamwadrf.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZ2tkbnhkc3liY2ZhbXdhZHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzE0NjUsImV4cCI6MjA5NzEwNzQ2NX0.lugWuqNI5VMy6hCn-y38-hi825pIHcUjOCAWCsMJz4c"
        );
        let allData = [];

        async function loadData() {
            const { data: courses } = await client.from('courses').select('*');
            const { data: regs, error } = await client.from('registrations').select('*').order('created_at', { ascending: false });

            if (error) return console.error(error);
            allData = regs.map(r => {
                const targetCourse = courses.find(c => c.id === r.course_id);
                return {
                    ...r,
                    course_name: targetCourse ? targetCourse.name : 'Deleted Course',
                    course_date: targetCourse ? targetCourse.course_date : 'N/A',
                    course_labels: targetCourse && Array.isArray(targetCourse.file_labels) ? targetCourse.file_labels : []
                };
            });
            document.getElementById('stats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total Logs</div>
                    <div class="stat-number">${allData.length}</div>
                </div>
            `;
            document.getElementById('tableBody').innerHTML = allData.map((r, i) => {
                const filesList = Array.isArray(r.file_urls) ? r.file_urls : [];
                
                const linksHtml = filesList.map((url, idx) => {
                    const label = r.course_labels[idx] || `Attachment #${idx + 1}`;
                    return `<a href="${url}" target="_blank" class="btn-view-file" title="${label}">📄 View ${label}</a>`;
                }).join('');

                return `
                    <tr>
                        <td><b>${i + 1}</b></td>
                        <td>${r.phone_number || 'N/A'}</td>
                        <td>${r.staff_name}</td>
                        <td>${r.staff_number}</td>
                        <td><span class="gender-badge">${r.sex_snapshot || r.sex || 'N/A'}</span></td>
                        <td><span class="inst-badge">${r.institution_name_snapshot}</span></td>
                        <td><span class="course-badge">${r.course_name}</span></td>
                        <td>${r.course_date}</td>
                        <td><div class="files-container">${linksHtml || 'No files uploaded'}</div></td>
                        <td>
                            <button class="btn-delete" onclick="handleDeleteRegistration(${r.id}, ${r.course_id}, ${r.institution_id}, '${r.staff_name.replace(/'/g, "\\'")}')">
                                ❌ Remove
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        window.handleDeleteRegistration = async function(regId, courseId, instId, staffName) {
            if (!confirm(`Are you sure you want to remove the registration for "${staffName}"?\n\nThis restores course chairs availability (+1) and frees up institutional quota open slots.`)) return;
            try {
                // 1. Restore Course Chairs Counter Allocation (+1 Seat back to room)
                const { data: courseData } = await client.from('courses').select('seats').eq('id', courseId).single();
                if (courseData) {
                    await client.from('courses').update({ seats: courseData.seats + 1 }).eq('id', courseId);
                }
                
                // 2. Decrement Quota Counter from the course_institutions intersection room map row
                if (courseId && instId) {
                    const { data: mapData } = await client.from('course_institutions')
                        .select('id, registered_count')
                        .eq('course_id', courseId)
                        .eq('institution_id', instId)
                        .maybeSingle();
                    if (mapData && mapData.registered_count > 0) {
                        await client.from('course_institutions')
                            .update({ registered_count: mapData.registered_count - 1 })
                            .eq('id', mapData.id);
                    }
                }

                // 3. Delete Entry Log Row and AWAIT the completion before reloading view
                await client.from('registrations').delete().eq('id', regId);
                alert("Record removed successfully.");
                
                // Reload interface sequence cleanly
                await loadData();
            } catch (err) {
                alert("Error during restoration sequence processing: " + err.message);
            }
        };

        function formatDateDDMMYYYY(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr); // fallback if it's not a parseable date
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        }

        window.exportCSV = function () {
            if (allData.length === 0) return alert("No records found.");
            const headers = ['#', 'Phone Number', 'Staff Name', 'Staff Number', 'Gender', 'Institution Origin', 'Course Name', 'Course Date'];
            const rows = allData.map((r, i) => [
                i + 1,
                r.phone_number || '',
                r.staff_name || '',
                r.staff_number || '',
                r.sex_snapshot || r.sex || 'N/A',
                r.institution_name_snapshot || '',
                r.course_name || '',
                formatDateDDMMYYYY(r.course_date)
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

            // Give every column enough room to actually read the text (Arabic names,
            // long institution/course names, etc.) instead of Excel's cramped default.
            worksheet['!cols'] = [
                { wch: 5 },   // #
                { wch: 16 },  // Phone Number
                { wch: 26 },  // Staff Name
                { wch: 14 },  // Staff Number
                { wch: 10 },  // Gender
                { wch: 32 },  // Institution Origin
                { wch: 32 },  // Course Name
                { wch: 14 }   // Course Date
            ];

            // Force Phone Number, Staff Number, and Course Date to stay as plain text,
            // so Excel never reinterprets/reformats them (no leading-zero loss, no
            // date-serial-number conversion).
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            [1, 3, 7].forEach(colIndex => {
                for (let row = range.s.r + 1; row <= range.e.r; row++) {
                    const cellRef = XLSX.utils.encode_cell({ r: row, c: colIndex });
                    if (worksheet[cellRef]) worksheet[cellRef].t = 's';
                }
            });

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
            XLSX.writeFile(workbook, 'registrations_report.xlsx');
        };

        loadData();
