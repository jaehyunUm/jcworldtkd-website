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
        } else if (id === 'ranking') {
            // 랭킹 섹션이 처음 열릴 때 옵션이 비어있으면 로드
            const testSelect = document.getElementById('testSelect');
            if (testSelect && testSelect.options.length <= 1) {
                fetchRankingOptions();
            }
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
    // 3. 랭킹 (Ranking) 기능
    // ============================================================
    const testSelect = document.getElementById('testSelect');
    const rankingBody = document.getElementById('rankingBody');
    const loadingSpinner = document.getElementById('loadingSpinner');

    // 3-1. 테스트 목록 불러오기 (Dropdown 옵션)
    async function fetchRankingOptions() {
        if (!testSelect) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/public/grouped-objective-tests?dojang_code=${MY_DOJANG_CODE}`);
            if (!response.ok) throw new Error('Failed to fetch tests');
            
            const data = await response.json();
            
            // 기존 옵션 초기화 (첫 번째 안내 문구 제외)
            testSelect.innerHTML = '<option value="" disabled selected>Select a Challenge (Test)</option>';

            data.forEach(test => {
                const option = document.createElement('option');
                option.value = test.group_id;
                option.textContent = test.standardized_name;
                testSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Ranking Options Error:", error);
        }
    }

    // 3-2. 랭킹 데이터 불러오기
    async function fetchRankingData(testId) {
        if (!testId || !rankingBody) return;

        rankingBody.innerHTML = ''; // 초기화
        if(loadingSpinner) loadingSpinner.style.display = 'block';

        try {
            const response = await fetch(`${API_BASE_URL}/public/ranking/${testId}?dojang_code=${MY_DOJANG_CODE}`);
            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                // 데이터 정렬 (Time 타입은 오름차순, Count 타입은 내림차순)
                const sortedData = data.sort((a, b) => {
                    if (a.evaluation_type === 'time') {
                        return parseTime(a.count) - parseTime(b.count);
                    } else {
                        return parseInt(b.count) - parseInt(a.count);
                    }
                });
                renderRankingTable(sortedData);
            } else {
                rankingBody.innerHTML = '<tr><td colspan="6" class="empty-message">No ranking data available yet.</td></tr>';
            }
        } catch (error) {
            console.error("Ranking Data Error:", error);
            rankingBody.innerHTML = '<tr><td colspan="6" class="empty-message">Error loading rankings.</td></tr>';
        } finally {
            if(loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    // 3-3. 시간 변환 헬퍼 (0'30" -> 30)
    function parseTime(timeStr) {
        try {
            const match = timeStr.match(/(\d+)'(\d+)"/);
            if (match) {
                return parseInt(match[1]) * 60 + parseInt(match[2]);
            }
            return 999999; 
        } catch (e) { return 999999; }
    }

    // 3-4. 랭킹 테이블 렌더링
    function renderRankingTable(data) {
        rankingBody.innerHTML = '';
        data.forEach((item, index) => {
            const rank = index + 1;
            const row = document.createElement('tr');
            
            // 메달 이모지
            let rankDisplay = rank;
            let rankClass = '';
            if (rank === 1) { rankDisplay = '🥇'; rankClass = 'rank-1'; }
            else if (rank === 2) { rankDisplay = '🥈'; rankClass = 'rank-2'; }
            else if (rank === 3) { rankDisplay = '🥉'; rankClass = 'rank-3'; }

            row.innerHTML = `
                <td class="${rankClass}">${rankDisplay}</td>
                <td style="font-weight:bold;">${item.name}</td>
                <td>${item.age}</td>
                <td>${item.belt_color}</td>
                <td>${item.studio_name}</td>
                <td style="font-weight:bold; color:#d32f2f;">${item.count}</td>
            `;
            rankingBody.appendChild(row);
        });
    }

    // 랭킹 드롭다운 변경 시 데이터 로드 이벤트
    if (testSelect) {
        testSelect.addEventListener('change', (e) => fetchRankingData(e.target.value));
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
    // 5. 무료 체험 (Free Trial) 폼 기능
    // ============================================================
    const trialForm = document.getElementById('trial-form');
    const beltInput = document.getElementById('belt-input');
    const experienceSelect = document.querySelector('select[name="experience"]');

    if (trialForm) {
        // 경험 여부에 따라 벨트 입력칸 표시/숨김
        if (experienceSelect && beltInput) {
            experienceSelect.addEventListener('change', function () {
                beltInput.style.display = this.value === 'yes' ? 'block' : 'none';
            });
        }

        // 폼 제출 이벤트
        trialForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 버튼 비활성화 (중복 클릭 방지)
            const submitBtn = trialForm.querySelector('button');
            const originalBtnText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "Sending...";

            const data = {
                name: trialForm.name.value,
                age: trialForm.age.value,
                phone: trialForm.phone.value,
                experience: trialForm.experience.value,
                belt: (trialForm.belt && trialForm.belt.value) ? trialForm.belt.value : ''
            };

            try {
                const res = await fetch(`${API_BASE_URL}/send-trial-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (res.ok) {
                    alert('Thank you! Your trial request has been sent successfully.');
                    trialForm.reset();
                    if(beltInput) beltInput.style.display = 'none';
                } else {
                    const result = await res.json();
                    alert(`Failed: ${result.message || 'Please try again later.'}`);
                }
            } catch (error) {
                console.error('Trial Form Error:', error);
                alert('An error occurred. Please check your connection and try again.');
            } finally {
                // 버튼 복구
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        });
    }

});