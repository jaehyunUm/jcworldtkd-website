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
    const sectionIds = new Set(Array.from(sections, (s) => s.id));
    const navLinks = document.querySelectorAll('nav a');
    // 상단 네비 외에도 #free-trial 같은 섹션으로 이동하는 버튼/링크가
    // 페이지 어디에나 있을 수 있으므로, href가 실제 섹션 id를 가리키는
    // 모든 링크(a[href^="#"])에 동일한 SPA 이동 동작을 붙여줍니다.
    const sectionLinks = Array.from(document.querySelectorAll('a[href^="#"]')).filter((link) => {
        const targetId = link.getAttribute('href').slice(1);
        return sectionIds.has(targetId);
    });

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

    // 섹션으로 이동하는 모든 링크(네비게이션 + 페이지 내 CTA 버튼)에 클릭 이벤트 연결
    sectionLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').replace('#', '');
            
            showSection(targetId);

            // Active 클래스 갱신 (상단 네비게이션 메뉴에만 적용)
            navLinks.forEach(l => l.classList.remove('active')); // 기존 active 제거
            const matchingNavLink = document.querySelector(`nav a[href="#${targetId}"]`);
            if (matchingNavLink) matchingNavLink.classList.add('active'); // 현재 이동한 섹션의 메뉴에 active 추가
        });
    });

    // 초기 화면 설정 (Home)
    showSection('home');

    // 모바일 햄버거 메뉴 토글
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    function closeMobileMenu() {
        if (navToggle) navToggle.classList.remove('nav-open');
        if (navMenu) navMenu.classList.remove('nav-open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    }

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('nav-open');
            navToggle.classList.toggle('nav-open', isOpen);
            navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // 메뉴에서 항목을 선택하면 자동으로 닫힘
        navMenu.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeMobileMenu);
        });

        // 메뉴 바깥을 클릭하면 닫힘
        document.addEventListener('click', (e) => {
            if (!navMenu.classList.contains('nav-open')) return;
            if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
            closeMobileMenu();
        });
    }




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

        // 요일 -> 앞으로 다가오는 날짜들 계산 (내일부터 최대 windowDays일 이내)
        function getNextOccurrences(dayAbbrev, windowDays) {
            const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thur: 4, Fri: 5, Sat: 6 };
            const targetDow = dayMap[dayAbbrev];
            const results = [];
            if (targetDow === undefined) return results;

            const today = new Date();
            for (let i = 1; i <= windowDays; i++) {
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

        function toISODate(d) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        // 달력 페이지네이션 상태 (이전/다음 버튼으로 몇 주 뒤까지 이동 가능)
        const CALENDAR_DAYS_SEARCHED = 60;   // 앞으로 최대 몇 일 뒤까지 날짜를 찾을지
        const CALENDAR_DATES_PER_PAGE = 5;   // 한 화면에 보여줄 날짜 컬럼 수
        let calendarSortedDates = [];
        let calendarSlotsByDate = {};
        let calendarPageStart = 0;

        // 현재 페이지에 해당하는 날짜 컬럼들만 다시 그립니다 (이전/다음 버튼 클릭 시 재사용)
        function renderCalendarPage() {
            recommendedList.innerHTML = '';

            if (calendarSortedDates.length === 0) {
                noClassesMessage.style.display = 'block';
                confirmBtn.disabled = false;
                return;
            }

            noClassesMessage.style.display = 'none';

            const wrapper = document.createElement('div');
            wrapper.className = 'calendar-wrapper';

            const prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'calendar-nav-btn calendar-nav-prev';
            prevBtn.innerHTML = '&#8249;';
            prevBtn.setAttribute('aria-label', 'Previous dates');
            prevBtn.disabled = calendarPageStart === 0;
            prevBtn.addEventListener('click', () => {
                calendarPageStart = Math.max(0, calendarPageStart - CALENDAR_DATES_PER_PAGE);
                renderCalendarPage();
            });

            const nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'calendar-nav-btn calendar-nav-next';
            nextBtn.innerHTML = '&#8250;';
            nextBtn.setAttribute('aria-label', 'Next dates');
            nextBtn.disabled = (calendarPageStart + CALENDAR_DATES_PER_PAGE) >= calendarSortedDates.length;
            nextBtn.addEventListener('click', () => {
                calendarPageStart = Math.min(
                    calendarSortedDates.length - 1,
                    calendarPageStart + CALENDAR_DATES_PER_PAGE
                );
                renderCalendarPage();
            });

            const calendarWrap = document.createElement('div');
            calendarWrap.className = 'calendar-days';

            const pageDates = calendarSortedDates.slice(calendarPageStart, calendarPageStart + CALENDAR_DATES_PER_PAGE);

            pageDates.forEach((iso) => {
                const { date, slots } = calendarSlotsByDate[iso];

                const col = document.createElement('div');
                col.className = 'calendar-day';

                const header = document.createElement('div');
                header.className = 'calendar-day-header';
                header.innerHTML = `
                    <div class="calendar-day-weekday">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="calendar-day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                `;
                col.appendChild(header);

                const slotsWrap = document.createElement('div');
                slotsWrap.className = 'calendar-day-slots';

                slots.forEach((slot) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'calendar-slot-btn';
                    if (selectedClassChoice && selectedClassChoice.dateISO === iso &&
                        selectedClassChoice.class_name === slot.class_name &&
                        selectedClassChoice.time === slot.time) {
                        btn.classList.add('selected');
                    }
                    btn.innerHTML = `
                        <span class="slot-time">${slot.time || ''}</span>
                        <span class="slot-class">${slot.class_name}</span>
                    `;
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.calendar-slot-btn').forEach((b) => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedClassChoice = {
                            class_name: slot.class_name,
                            day: slot.day,
                            time: slot.time,
                            dateLabel: formatDateLabel(date),
                            dateISO: iso
                        };
                        confirmBtn.disabled = false;
                    });
                    slotsWrap.appendChild(btn);
                });

                col.appendChild(slotsWrap);
                calendarWrap.appendChild(col);
            });

            wrapper.appendChild(prevBtn);
            wrapper.appendChild(calendarWrap);
            wrapper.appendChild(nextBtn);
            recommendedList.appendChild(wrapper);
        }

        // 달력 형태로 추천 클래스 렌더링: 날짜별로 열(column)을 만들고,
        // 그 날짜에 가능한 시간대를 버튼으로 나열합니다. (이전/다음 버튼으로 몇 주 뒤까지 조회 가능)
        function renderRecommendedClasses(classes, studentName) {
            recommendedList.innerHTML = '';
            selectedClassChoice = null;
            confirmBtn.disabled = true;
            calendarPageStart = 0;

            if (step2NameSpan) step2NameSpan.textContent = studentName || 'your child';

            if (!classes || classes.length === 0) {
                noClassesMessage.style.display = 'block';
                confirmBtn.disabled = false; // 매칭 실패해도 기본 정보만으로 문의는 가능하게
                calendarSortedDates = [];
                calendarSlotsByDate = {};
                return;
            }

            noClassesMessage.style.display = 'none';

            // 날짜(ISO) 별로 그날 가능한 시간대들을 모읍니다.
            calendarSlotsByDate = {}; // { 'YYYY-MM-DD': { date: Date, slots: [{class_name, time, day}] } }

            classes.forEach((cls) => {
                getNextOccurrences(cls.day, CALENDAR_DAYS_SEARCHED).forEach((d) => {
                    const iso = toISODate(d);
                    if (!calendarSlotsByDate[iso]) {
                        calendarSlotsByDate[iso] = { date: d, slots: [] };
                    }
                    calendarSlotsByDate[iso].slots.push({ class_name: cls.class_name, time: cls.time, day: cls.day });
                });
            });

            calendarSortedDates = Object.keys(calendarSlotsByDate).sort();

            if (calendarSortedDates.length === 0) {
                noClassesMessage.style.display = 'block';
                confirmBtn.disabled = false;
                return;
            }

            renderCalendarPage();
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