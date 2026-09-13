document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // 1. 설정 및 상수 (Configuration)
    // ============================================================
    const API_BASE_URL = "https://mats-backend.onrender.com/api";
    
    const MY_DOJANG_CODE = 'UM2024';


    // ============================================================
    // 2. SPA 네비게이션 처리 (Navigation)
    // ============================================================
    const sections = document.querySelectorAll('main section');
    const navLinks = document.querySelectorAll('nav a');

    function showSection(id) {
        // 모든 섹션 숨기기
        sections.forEach(section => {
            section.style.display = (section.id === id) ? 'block' : 'none';
        });

        // 특정 섹션이 열릴 때 필요한 데이터 불러오기
        if (id === 'schedule') {
            loadSchedule();
        }
        
        // 페이지 상단으로 스크롤 이동
        window.scrollTo(0, 0);
    }

    // 네비게이션 클릭 이벤트 연결
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').replace('#', '');
            
            showSection(targetId);

            // Active 클래스 갱신
            navLinks.forEach(l => l.classList.remove('active')); // 기존 active 제거
            this.classList.add('active'); // 현재 클릭한 메뉴 active 추가
        });
    });

    // 초기 화면 설정 (Home)
    showSection('home');


    // ============================================================
    // 4. 스케줄 (Schedule) 기능
    // ============================================================
    function loadSchedule() {
        const scheduleBody = document.getElementById('scheduleBody');
        const scheduleTable = document.getElementById('scheduleTable');
        const scheduleLoading = document.getElementById('scheduleLoading');

        if (!scheduleBody) return; // 요소가 없으면 중단

        // 로딩 표시
        if(scheduleLoading) scheduleLoading.style.display = 'block';
        if(scheduleTable) scheduleTable.style.display = 'none';

        fetch(`${API_BASE_URL}/public-get-schedule?dojang_code=${MY_DOJANG_CODE}`)
          .then(res => res.json())
          .then(data => {
            scheduleBody.innerHTML = ''; // 기존 내용 초기화

            if (Array.isArray(data) && data.length > 0) {
                // 정렬 (Sort Order -> Time 순)
                const rows = data.slice().sort((a, b) => {
                    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0);
                    if (so !== 0) return so;
                    const getStart = t => (t || '').split('~')[0];
                    return getStart(a.time).localeCompare(getStart(b.time));
                });

                rows.forEach(row => {
                    const tr = document.createElement('tr');
                    const formatCell = (text) => text ? text : '';
                    
                    tr.innerHTML = `
                        <td class="time-col">${formatCell(row.time)}</td>
                        <td>${formatCell(row.Mon)}</td>
                        <td>${formatCell(row.Tue)}</td>
                        <td>${formatCell(row.Wed)}</td>
                        <td>${formatCell(row.Thur)}</td>
                        <td>${formatCell(row.Fri)}</td>
                        <td>${formatCell(row.Sat)}</td>
                    `;
                    scheduleBody.appendChild(tr);
                });
                
                // 테이블 표시
                if(scheduleLoading) scheduleLoading.style.display = 'none';
                if(scheduleTable) scheduleTable.style.display = 'table';
            } else {
                if(scheduleLoading) scheduleLoading.innerHTML = '<p>No schedule data available.</p>';
            }
          })
          .catch((err) => {
            console.error(err);
            if(scheduleLoading) scheduleLoading.innerHTML = '<p style="color:red;">Failed to load schedule.</p>';
          });
    }


    // ============================================================
    // 5. 무료 체험 (Free Trial) 폼 기능 - 2단계(추천 클래스 + 날짜 선택)
    // ============================================================
    const step1Form = document.getElementById('trial-form-step1');
    const beltInput = document.getElementById('belt-input');
    const beltSelect = document.getElementById('trial-belt');
    const experienceSelect = document.getElementById('trial-experience');
    const findClassBtn = document.getElementById('find-class-btn');

    const step2Div = document.getElementById('trial-step2');
    const step2NameSpan = document.getElementById('trial-step2-name');
    const recommendedList = document.getElementById('recommended-classes-list');
    const noClassesMessage = document.getElementById('no-classes-message');
    const backBtn = document.getElementById('trial-back-btn');
    const confirmBtn = document.getElementById('trial-confirm-btn');
    const successMessage = document.getElementById('trial-success-message');

    let beltLevelsLoaded = false;
    let selectedClassChoice = null; // { class_name, day, time, dateLabel, dateISO }

    if (step1Form) {

        // 경험 여부에 따라 벨트 선택칸 표시/숨김 (+ 벨트 목록 최초 1회 로드)
        if (experienceSelect && beltInput) {
            experienceSelect.addEventListener('change', async function () {
                const showBelt = this.value === 'yes';
                beltInput.style.display = showBelt ? 'block' : 'none';

                if (showBelt && !beltLevelsLoaded && beltSelect) {
                    beltLevelsLoaded = true; // 중복 요청 방지 (실패해도 재시도는 페이지 새로고침으로)
                    try {
                        const res = await fetch(`${API_BASE_URL}/public/belt-levels?dojang_code=${MY_DOJANG_CODE}`);
                        if (res.ok) {
                            const belts = await res.json();
                            belts.forEach((b) => {
                                const opt = document.createElement('option');
                                opt.value = b.belt_color;
                                opt.textContent = b.belt_color;
                                beltSelect.appendChild(opt);
                            });
                        }
                    } catch (err) {
                        console.error('Belt levels fetch error:', err);
                        // 실패해도 폼 진행에는 문제 없음 (벨트는 선택 사항)
                    }
                }
            });
        }

        // 요일 -> 다음 예정 날짜 계산 (내일부터 최대 count개)
        function getNextOccurrences(dayAbbrev, count) {
            const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thur: 4, Fri: 5, Sat: 6 };
            const targetDow = dayMap[dayAbbrev];
            const results = [];
            if (targetDow === undefined) return results;

            const today = new Date();
            for (let i = 1; results.length < count && i <= 21; i++) {
                const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
                if (d.getDay() === targetDow) {
                    results.push(d);
                }
            }
            return results;
        }

        function formatDateLabel(d) {
            return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        }

        function renderRecommendedClasses(classes, studentName) {
            recommendedList.innerHTML = '';
            selectedClassChoice = null;
            confirmBtn.disabled = true;

            if (step2NameSpan) step2NameSpan.textContent = studentName || 'your child';

            if (!classes || classes.length === 0) {
                noClassesMessage.style.display = 'block';
                confirmBtn.disabled = false; // 매칭 실패해도 기본 정보만으로 문의는 가능하게
                return;
            }

            noClassesMessage.style.display = 'none';

            let optionIndex = 0;
            classes.forEach((cls) => {
                const upcomingDates = getNextOccurrences(cls.day, 2);
                upcomingDates.forEach((d) => {
                    optionIndex += 1;
                    const id = `class-option-${optionIndex}`;
                    const dateLabel = formatDateLabel(d);

                    const wrapper = document.createElement('label');
                    wrapper.className = 'recommended-class-option';
                    wrapper.setAttribute('for', id);

                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = 'classChoice';
                    radio.id = id;
                    radio.value = String(optionIndex);

                    radio.addEventListener('change', () => {
                        document.querySelectorAll('.recommended-class-option').forEach((el) => el.classList.remove('selected'));
                        wrapper.classList.add('selected');
                        selectedClassChoice = {
                            class_name: cls.class_name,
                            day: cls.day,
                            time: cls.time,
                            dateLabel: dateLabel,
                            dateISO: d.toISOString().slice(0, 10)
                        };
                        confirmBtn.disabled = false;
                    });

                    const textWrap = document.createElement('div');
                    textWrap.className = 'option-text';

                    const classNameEl = document.createElement('div');
                    classNameEl.className = 'option-class-name';
                    classNameEl.textContent = cls.class_name;

                    const dateEl = document.createElement('div');
                    dateEl.className = 'option-date';
                    dateEl.textContent = `${dateLabel} · ${cls.time || ''}`;

                    textWrap.appendChild(classNameEl);
                    textWrap.appendChild(dateEl);

                    wrapper.appendChild(radio);
                    wrapper.appendChild(textWrap);
                    recommendedList.appendChild(wrapper);
                });
            });
        }

        // 1단계 제출: 추천 클래스 조회
        step1Form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const originalBtnText = findClassBtn.innerText;
            findClassBtn.disabled = true;
            findClassBtn.innerText = 'Searching...';

            const age = step1Form.age.value;
            const beltName = (beltSelect && experienceSelect.value === 'yes') ? beltSelect.value : '';

            try {
                const res = await fetch(`${API_BASE_URL}/public/recommend-classes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dojang_code: MY_DOJANG_CODE, age, belt_name: beltName })
                });

                let classes = [];
                if (res.ok) {
                    const result = await res.json();
                    classes = result.classes || [];
                } else {
                    console.error('recommend-classes failed with status', res.status);
                }

                renderRecommendedClasses(classes, step1Form.name.value);
                step1Form.style.display = 'none';
                step2Div.style.display = 'block';
            } catch (error) {
                console.error('Recommend Classes Error:', error);
                // 네트워크 오류가 있어도 신청 자체는 계속 진행할 수 있게 함
                renderRecommendedClasses([], step1Form.name.value);
                step1Form.style.display = 'none';
                step2Div.style.display = 'block';
            } finally {
                findClassBtn.disabled = false;
                findClassBtn.innerText = originalBtnText;
            }
        });

        // 뒤로가기
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                step2Div.style.display = 'none';
                step1Form.style.display = 'flex';
            });
        }

        // 2단계 확정: 최종 신청 전송
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const originalText = confirmBtn.innerText;
                confirmBtn.disabled = true;
                confirmBtn.innerText = 'Sending...';

                const data = {
                    name: step1Form.name.value,
                    age: step1Form.age.value,
                    phone: step1Form.phone.value,
                    experience: step1Form.experience.value,
                    belt: (beltSelect && beltSelect.value) ? beltSelect.value : '',
                    className: selectedClassChoice ? selectedClassChoice.class_name : '',
                    classDay: selectedClassChoice ? selectedClassChoice.day : '',
                    classTime: selectedClassChoice ? selectedClassChoice.time : '',
                    classDate: selectedClassChoice ? `${selectedClassChoice.dateLabel} (${selectedClassChoice.dateISO})` : ''
                };

                try {
                    const res = await fetch(`${API_BASE_URL}/send-trial-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    if (res.ok) {
                        step2Div.style.display = 'none';
                        successMessage.style.display = 'block';
                        step1Form.reset();
                        if (beltInput) beltInput.style.display = 'none';
                    } else {
                        const result = await res.json();
                        alert(`Failed: ${result.message || 'Please try again later.'}`);
                        confirmBtn.disabled = false;
                    }
                } catch (error) {
                    console.error('Trial Confirm Error:', error);
                    alert('An error occurred. Please check your connection and try again.');
                    confirmBtn.disabled = false;
                } finally {
                    confirmBtn.innerText = originalText;
                }
            });
        }
    }

});