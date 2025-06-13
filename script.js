document.addEventListener('DOMContentLoaded', () => {
    // SPA: Show only the selected section
    const sections = document.querySelectorAll('main section');
    const navLinks = document.querySelectorAll('nav a');

    function showSection(id) {
        sections.forEach(section => {
            section.style.display = (section.id === id) ? 'block' : 'none';
        });

        // Schedule 섹션이면 API에서 데이터 가져오기
        if (id === 'schedule') {
            loadSchedule();
        }

        // Free Trial 섹션이면 이벤트 핸들러 연결
        if (id === 'free-trial') {
            setupFreeTrialForm();
        }
    }

    function setupFreeTrialForm() {
        const experienceSelect = document.querySelector('select[name="experience"]');
        const beltInput = document.getElementById('belt-input');
        const trialForm = document.getElementById('trial-form');
        const classList = document.getElementById('class-list');
        const recommendedBox = document.getElementById('recommended-classes');

        if (experienceSelect) {
            experienceSelect.addEventListener('change', function () {
                beltInput.style.display = this.value === 'yes' ? 'block' : 'none';
            });
        }

        if (trialForm) {
            trialForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const data = {
                    name: trialForm.name.value,
                    age: trialForm.age.value,
                    experience: trialForm.experience.value,
                    belt: trialForm.belt?.value || ''
                };

                const res = await fetch('/api/public-trial-recommend', {  
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();

                classList.innerHTML = '';
                result.classes.forEach(cls => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>${cls.name}</strong> - ${cls.date} ${cls.time}
                        <button onclick="registerClass('${cls.id}', '${data.name}')">Register</button>
                    `;
                    classList.appendChild(li);
                });

                recommendedBox.style.display = 'block';
            });
        }
    }

    window.registerClass = async function (classId, studentName) {
        const res = await fetch('/api/trial/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId, studentName })
        });
        const result = await res.json();
        alert(result.message || 'Registration successful!');
    };

    // 처음에는 Home만 보이게
    showSection('home');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').replace('#', '');
            showSection(targetId);
            // active 클래스 처리
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Schedule API 연동
    function loadSchedule() {
        const scheduleSection = document.getElementById('schedule');
        scheduleSection.innerHTML = '<h2>Schedule</h2><p>Loading schedule...</p>';
        const dojangCode = 'UM2024'; // 실제 코드로 대체
        fetch(`https://mats-backend.onrender.com/api/public-get-schedule?dojang_code=${dojangCode}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    scheduleSection.innerHTML = '<h2>Schedule</h2>' + renderScheduleTable(data);
                } else {
                    scheduleSection.innerHTML = '<h2>Schedule</h2><p>No schedule data available.</p>';
                }
            })
            .catch(err => {
                scheduleSection.innerHTML = '<h2>Schedule</h2><p style="color:red;">Failed to load schedule.</p>';
            });
    }

    function renderScheduleTable(data) {
        let html = `
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Mon</th>
                        <th>Tue</th>
                        <th>Wed</th>
                        <th>Thur</th>
                        <th>Fri</th>
                        <th>Sat</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.forEach(row => {
            html += `
                <tr>
                    <td>${row.time || ''}</td>
                    <td>${row.Mon || ''}</td>
                    <td>${row.Tue || ''}</td>
                    <td>${row.Wed || ''}</td>
                    <td>${row.Thur || ''}</td>
                    <td>${row.Fri || ''}</td>
                    <td>${row.Sat || ''}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        return html;
    }

    const trialForm = document.getElementById('trial-form');
  const beltInput = document.getElementById('belt-input');
  const experienceSelect = trialForm.experience;

  // 경험 여부에 따라 belt 입력칸 표시
  experienceSelect.addEventListener('change', function () {
    beltInput.style.display = this.value === 'yes' ? 'block' : 'none';
  });

  // 폼 제출 시 백엔드로 이메일 요청 전송
  trialForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;
    const data = {
      name: form.name.value,
      age: form.age.value,
      experience: form.experience.value,
      belt: form.belt?.value || ''
    };

    const res = await fetch('https://mats-backend.onrender.com/api/send-trial-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert('Thank you! Your trial request has been sent.');
      form.reset();
      beltInput.style.display = 'none';
    } else {
      alert('Failed to send request. Please try again later.');
    }
  });

});
