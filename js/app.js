$(function () {
    // JSON 파일에서 문제 데이터 로드
    let questions = [];
    let correctAnswers = [];
    let examData = null;

    // 문제 데이터와 정답 데이터를 분리해서 로드
    let dataLoaded = false;
    let answersLoaded = false;
    let reviewDataLoaded = false;
    let reviewQuestions = [];
    let currentReviewQuestion = 0;
    let reviewMode = false;

    function loadExamData() {
        if (dataLoaded && answersLoaded && reviewDataLoaded) {
            // 문제 순서 랜덤화
            shuffleQuestions();

            // 문제 수 업데이트
            $('#questionCounter').text(`문제 1 / ${questions.length}`);

            console.log('문제 데이터 로드 완료:', questions.length + '개 문제');
            console.log('리뷰 데이터 로드 완료:', reviewQuestions.length + '개 문제');

            // 시험이 이미 시작된 상태라면 다시 초기화
            if (examStarted) {
                if (reviewMode) {
                    generateReviewQuestionGrid();
                    displayReviewQuestion(currentReviewQuestion);
                } else {
                    generateQuestionGrid();
                    displayQuestion(currentQuestion);
                    updateProgress();
                }
            }
        }
    }

    // 문제 순서를 랜덤하게 섞는 함수
    function shuffleQuestions() {
        // Fisher-Yates 셔플 알고리즘 사용
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            // 문제와 정답을 함께 섞기
            [questions[i], questions[j]] = [questions[j], questions[i]];
            [correctAnswers[i], correctAnswers[j]] = [correctAnswers[j], correctAnswers[i]];
        }

        console.log('문제 순서가 랜덤화되었습니다.');
    }

    // 문제 데이터 로드
    $.getJSON('data/data.json', function (data) {
        examData = data;
        questions = data.questions;
        dataLoaded = true;
        loadExamData();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.error('문제 데이터 로드 실패:', textStatus, errorThrown);
        alert('문제 데이터를 불러올 수 없습니다. 파일을 확인해주세요.');
    });

    // 정답 데이터 로드
    $.getJSON('data/answer.json', function (data) {
        // answer.json에서 정답 배열 추출 (1부터 시작하는 값을 0부터 시작하는 인덱스로 변환)
        correctAnswers = data.answers.map(item => item.answer - 1);
        answersLoaded = true;
        loadExamData();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.error('정답 데이터 로드 실패:', textStatus, errorThrown);
        alert('정답 데이터를 불러올 수 없습니다. 파일을 확인해주세요.');
    });

    // 리뷰 데이터 로드
    $.getJSON('data/review.json', function (data) {
        reviewQuestions = data.review;
        reviewDataLoaded = true;
        loadExamData();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.error('리뷰 데이터 로드 실패:', textStatus, errorThrown);
        alert('리뷰 데이터를 불러올 수 없습니다. 파일을 확인해주세요.');
    });

    let currentQuestion = 0;
    let userAnswers = new Array(questions.length).fill(-1);
    let isSubmitted = false;
    let examStarted = false;
    let timeLeft = 150 * 60; // 150분을 초 단위로
    let timerInterval;
    let currentExamIndex = 0;
    let wrongAnswersOnly = false; // 오답만 다시 풀기 모드
    let wrongAnswerIndices = []; // 오답 문제 인덱스들

    // 회차 데이터
    const examSessions = [
        {
            title: "2023년 1회",
            description: "2023년 3월 시행",
            questions: 100,
            timeLimit: 150
        },
        {
            title: "2023년 2회",
            description: "2023년 6월 시행",
            questions: 100,
            timeLimit: 150
        },
        {
            title: "2023년 3회",
            description: "2023년 9월 시행",
            questions: 100,
            timeLimit: 150
        },
        {
            title: "2023년 4회",
            description: "2023년 12월 시행",
            questions: 100,
            timeLimit: 150
        },
        {
            title: "2022년 1회",
            description: "2022년 3월 시행",
            questions: 100,
            timeLimit: 150
        },
        {
            title: "2022년 2회",
            description: "2022년 6월 시행",
            questions: 100,
            timeLimit: 150
        },
        {
            title: "2022년 3회",
            description: "2022년 9월 시행",
            questions: 100,
            timeLimit: 150
        },
        {
            title: "2022년 4회",
            description: "2022년 12월 시행",
            questions: 100,
            timeLimit: 150
        }
    ];

    $(document).ready(function () {
        // 필기 시험 선택 버튼 클릭 이벤트
        $('#selectWrittenBtn').click(function () {
            selectWrittenExam();
        });

        // 실기 시험 선택 버튼 클릭 이벤트
        $('#selectPracticalBtn').click(function () {
            selectPracticalExam();
        });

        // 시작 버튼 클릭 이벤트 (기존 호환성)
        $('#startBtn').click(function () {
            startExam();
        });

        // 리뷰 시작 버튼 클릭 이벤트 (기존 호환성)
        $('#startReviewBtn').click(function () {
            startReviewMode();
        });

        $('#nextBtn').click(function () {
            console.log('다음 버튼 클릭:', currentQuestion, questions.length);
            if (currentQuestion < questions.length - 1) {
                currentQuestion++;
                displayQuestion(currentQuestion);
                updateProgress();
            } else {
                alert('마지막 문제입니다.');
            }
        });

        $('#prevBtn').click(function () {
            if (currentQuestion > 0) {
                currentQuestion--;
                displayQuestion(currentQuestion);
                updateProgress();
            }
        });

        $('#submitBtn').click(function () {
            if (confirm('정말 제출하시겠습니까?')) {
                submitExam();
            }
        });

        $('#reviewBtn').click(function () {
            showReviewMode();
        });

        $('#toggleGrid').click(function () {
            $('#questionGrid').toggle();
            $(this).text($('#questionGrid').is(':visible') ? '문제 네비게이션 숨기기' : '문제 네비게이션 보기');
        });

        $('#exitBtn').click(function () {
            if (confirm('정말 나가시겠습니까? 진행 상황이 저장되지 않습니다.')) {
                exitExam();
            }
        });

        $('#changeExamBtn').click(function () {
            showExamSelector();
        });

        $('#backToStartBtn').click(function () {
            hideWrittenExamSelector();
        });

        $('#backToStartBtnOld').click(function () {
            hideExamSelector();
        });

        $('#reviewAnswers').click(function () {
            $('#resultModal').hide();
            showReviewMode();
        });

        $('#restartExam').click(function () {
            location.reload();
        });

        $('#retryWrongAnswers').click(function () {
            startWrongAnswersMode();
        });

        // 리뷰 문제풀이 이벤트 핸들러들
        $('#exitReviewBtn').click(function () {
            if (confirm('정말 나가시겠습니까?')) {
                exitReviewMode();
            }
        });

        $('#shuffleReviewBtn').click(function () {
            shuffleReviewQuestions();
            currentReviewQuestion = 0;
            displayReviewQuestion(currentReviewQuestion);
            resetReviewProgress();
        });

        $('#restartReviewBtn').click(function () {
            restartReviewMode();
        });
    });

    function generateQuestionGrid() {
        const grid = $('#questionGrid');
        grid.empty();

        const totalQuestions = questions.length;
        for (let i = 0; i < totalQuestions; i++) {
            const btn = $(`<button class="question-btn" data-question="${i}">${i + 1}</button>`);
            btn.click(function () {
                currentQuestion = i;
                displayQuestion(currentQuestion);
                updateProgress();
            });
            grid.append(btn);
        }
    }

    function displayQuestion(index) {
        let html = '';
        if (index < questions.length) {
            const q = questions[index];



            html += `
                        <div class="question-card ${userAnswers[index] !== -1 ? 'answered' : ''}">
                            <div class="question-header">
                                <div class="question-number">${q.number}</div>
                                <div class="question-text">${q.question}</div>
                            </div>
                            <div class="options">
                    `;

            q.options.forEach((option, i) => {
                let optionClass = 'option';
                if (userAnswers[index] === i) {
                    optionClass += ' selected';
                }
                if (isSubmitted) {
                    if (i === correctAnswers[index]) {
                        optionClass += ' correct';
                    } else if (userAnswers[index] === i && i !== correctAnswers[index]) {
                        optionClass += ' incorrect';
                    }
                }

                html += `
                            <div class="${optionClass}" data-option="${i}">
                                <span class="option-label">${['①', '②', '③', '④'][i]}</span>
                                <span>${option}</span>
                            </div>
                        `;
            });

            html += `
                            </div>
                        </div>
                    `;
        } else {
            // 문제가 없는 경우
            html = `
                        <div class="question-card">
                            <div class="question-header">
                                <div class="question-number">${index + 1}</div>
                                <div class="question-text">문제 ${index + 1}번 (데이터 없음)</div>
                            </div>
                            <div class="options">
                                <div class="option" data-option="0">
                                    <span class="option-label">①</span>
                                    <span>선택지 1</span>
                                </div>
                                <div class="option" data-option="1">
                                    <span class="option-label">②</span>
                                    <span>선택지 2</span>
                                </div>
                                <div class="option" data-option="2">
                                    <span class="option-label">③</span>
                                    <span>선택지 3</span>
                                </div>
                                <div class="option" data-option="3">
                                    <span class="option-label">④</span>
                                    <span>선택지 4</span>
                                </div>
                            </div>
                        </div>
                    `;
        }

        $('#questionContainer').html(html);

        // 선택지 클릭 이벤트
        $('.option').click(function () {
            if (!isSubmitted) {
                const optionIndex = $(this).data('option');
                userAnswers[currentQuestion] = optionIndex;

                $('.option').removeClass('selected');
                $(this).addClass('selected');

                $('.question-card').addClass('answered');
                updateQuestionGrid();
            }
        });

        updateNavigationButtons();
        updateQuestionCounter();
        updateQuestionGrid();
    }

    function updateProgress() {
        const answered = userAnswers.filter(answer => answer !== -1).length;
        const totalQuestions = questions.length;
        const progress = (answered / totalQuestions) * 100;
        $('#progressBar').css('width', progress + '%');
    }

    function updateNavigationButtons() {
        $('#prevBtn').prop('disabled', currentQuestion === 0);
        $('#nextBtn').prop('disabled', currentQuestion === 99);
    }

    function updateQuestionCounter() {
        const totalQuestions = questions.length;
        $('#questionCounter').text(`문제 ${currentQuestion + 1} / ${totalQuestions}`);
    }

    function updateQuestionGrid() {
        $('.question-btn').removeClass('answered current incorrect');

        if (userAnswers[currentQuestion] !== -1) {
            $(`.question-btn[data-question="${currentQuestion}"]`).addClass('answered');
        }

        $(`.question-btn[data-question="${currentQuestion}"]`).addClass('current');

        // 모든 답변된 문제들 표시
        userAnswers.forEach((answer, index) => {
            if (answer !== -1) {
                $(`.question-btn[data-question="${index}"]`).addClass('answered');

                // 제출 후 오답 표시
                if (isSubmitted && answer !== correctAnswers[index]) {
                    $(`.question-btn[data-question="${index}"]`).addClass('incorrect');
                }
            }
        });
    }

    function submitExam() {
        isSubmitted = true;

        // 타이머 정리
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // 점수 계산
        let correct = 0;
        const totalQuestions = questions.length;

        for (let i = 0; i < Math.min(totalQuestions, userAnswers.length); i++) {
            if (userAnswers[i] === correctAnswers[i]) {
                correct++;
            }
        }

        const percentage = Math.round((correct / totalQuestions) * 100);

        $('#scoreDisplay').text(`${correct}/${totalQuestions}`);

        if (wrongAnswersOnly) {
            $('#scoreText').text(`오답 재도전 결과: ${percentage}% ${percentage >= 60 ? '🎉 좋은 성과!' : '😢 더 연습이 필요해요'}`);
            // 오답만 다시 풀기 모드에서는 원본 데이터로 복원
            if (window.restoreOriginalData) {
                window.restoreOriginalData();
            }
        } else {
            $('#scoreText').text(`정답률: ${percentage}% ${percentage >= 60 ? '🎉 합격!' : '😢 불합격'}`);
        }

        $('#resultModal').show();

        $('#submitBtn').hide();
        $('#reviewBtn').show();

        displayQuestion(currentQuestion);
    }

    function startExam() {
        examStarted = true;
        reviewMode = false;
        $('#startScreen').hide();
        $('#examContent').show();
        $('#writtenExamSelector').hide();

        // 헤더 타이틀 변경
        $('#mainTitle').text('📝 정보처리기사 필기 시험');

        // 회차 정보 표시하고 타이머 표시
        $('#examTitleCenter').show();
        $('#timerCenter').show();

        // 문제 데이터가 로드된 후에 초기화
        if (questions.length > 0) {
            generateQuestionGrid();
            displayQuestion(currentQuestion);
            updateProgress();

            // 문제 네비게이션 기본적으로 숨김
            $('#questionGrid').hide();
            $('#toggleGrid').text('문제 네비게이션 보기');

            // 타이머 시작
            startTimer();
        } else {
            // 문제 데이터가 아직 로드되지 않은 경우
            setTimeout(function () {
                if (questions.length > 0) {
                    generateQuestionGrid();
                    displayQuestion(currentQuestion);
                    updateProgress();

                    $('#questionGrid').hide();
                    $('#toggleGrid').text('문제 네비게이션 보기');

                    startTimer();
                }
            }, 1000);
        }
    }

    function exitExam() {
        // 타이머 정리
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // 오답만 다시 풀기 모드에서 나가는 경우 원본 데이터 복원
        if (wrongAnswersOnly && window.restoreOriginalData) {
            window.restoreOriginalData();
        }

        // 변수 초기화
        currentQuestion = 0;
        userAnswers = new Array(questions.length).fill(-1);
        isSubmitted = false;
        examStarted = false;
        reviewMode = false;
        wrongAnswersOnly = false;
        wrongAnswerIndices = [];
        timeLeft = 150 * 60;

        // UI 초기화
        $('#startScreen').show();
        $('#examContent').hide();
        $('#examSelector').hide();
        $('#writtenExamSelector').hide();
        $('#reviewContent').hide();
        $('#questionGrid').hide();
        $('#toggleGrid').text('문제 네비게이션 보기');
        $('#timer').text('⏰ 150:00');
        $('#timer').css('background', 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)');

        // 헤더 타이틀 복원
        $('#mainTitle').text('📚 정보처리기사 CBT');

        // 회차 정보 숨기고 타이머 숨기기
        $('#examTitleCenter').hide();
        $('#timerCenter').hide();

        // 원본 회차 정보 복원
        if (currentExamIndex < examSessions.length) {
            $('#currentExam').text(examSessions[currentExamIndex].title);
        }
    }

    function showExamSelector() {
        $('.header').hide();
        $('#startScreen').hide();
        $('#examContent').hide();
        $('#examSelector').show();
        generateExamList();
    }

    function hideExamSelector() {
        $('#examSelector').hide();
        $('.header').show();
        $('#startScreen').show();
    }

    function generateExamList() {
        const examList = $('#examList');
        examList.empty();

        examSessions.forEach((exam, index) => {
            const examCard = $(`
                <div class="exam-card" data-exam-index="${index}">
                    <div class="exam-title">${exam.title}</div>
                    <div class="exam-info-small">
                        ${exam.description}<br>
                        📝 ${exam.questions}문제 | ⏰ ${exam.timeLimit}분
                    </div>
                </div>
            `);

            examCard.click(function () {
                selectExam(index);
            });

            examList.append(examCard);
        });
    }

    function selectExam(index) {
        currentExamIndex = index;
        const selectedExam = examSessions[index];

        // 현재 회차 업데이트
        $('#currentExam').text(selectedExam.title);

        // 선택된 카드 스타일 적용
        $('.exam-card').removeClass('selected');
        $(`.exam-card[data-exam-index="${index}"]`).addClass('selected');

        // 잠시 후 메인 화면으로 돌아가기
        setTimeout(() => {
            hideExamSelector();
        }, 500);
    }

    function startTimer() {
        timerInterval = setInterval(function () {
            timeLeft--;
            updateTimer();

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                alert('시간이 종료되었습니다!');
                submitExam();
            }
        }, 1000);
    }

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        $('#timer').text(`⏰ ${timeString}`);

        // 10분 이하일 때 빨간색으로 변경
        if (timeLeft <= 600) {
            $('#timer').css('background', 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)');
        }
    }

    function showReviewMode() {
        $('#resultModal').hide();
        isSubmitted = true;
        displayQuestion(currentQuestion);
    }

    function startWrongAnswersMode() {
        // 오답 문제들 찾기
        wrongAnswerIndices = [];
        userAnswers.forEach((answer, index) => {
            if (answer !== -1 && answer !== correctAnswers[index]) {
                wrongAnswerIndices.push(index);
            }
        });

        if (wrongAnswerIndices.length === 0) {
            alert('틀린 문제가 없습니다!');
            return;
        }

        // 오답만 다시 풀기 모드 시작
        wrongAnswersOnly = true;
        isSubmitted = false;
        currentQuestion = 0;

        // 오답 문제들만 선택하여 새로운 배열 생성
        const originalQuestions = questions;
        const originalCorrectAnswers = correctAnswers;
        const originalUserAnswers = [...userAnswers];

        // 오답 문제들만 필터링
        questions = wrongAnswerIndices.map(index => originalQuestions[index]);
        correctAnswers = wrongAnswerIndices.map(index => originalCorrectAnswers[index]);
        userAnswers = new Array(wrongAnswerIndices.length).fill(-1);

        // 오답 문제들도 랜덤화
        shuffleQuestions();

        // UI 업데이트
        $('#resultModal').hide();
        $('#examContent').show();
        $('#submitBtn').show();
        $('#reviewBtn').hide();

        // 헤더 업데이트
        $('#currentExam').text(`오답만 다시 풀기 (${wrongAnswerIndices.length}문제)`);
        $('#examTitleCenter').show();
        $('#timerCenter').hide();

        // 문제 그리드 생성 및 표시
        generateQuestionGrid();
        displayQuestion(currentQuestion);
        updateProgress();

        // 문제 네비게이션 기본적으로 숨김
        $('#questionGrid').hide();
        $('#toggleGrid').text('문제 네비게이션 보기');

        // 타이머 재시작
        timeLeft = Math.min(150 * 60, wrongAnswerIndices.length * 60); // 문제 수에 비례한 시간
        startTimer();

        // 원본 데이터 복원 함수 저장
        window.restoreOriginalData = function () {
            questions = originalQuestions;
            correctAnswers = originalCorrectAnswers;
            userAnswers = originalUserAnswers;
            wrongAnswersOnly = false;
            wrongAnswerIndices = [];
        };
    }

    // 리뷰 문제풀이 함수들
    function startReviewMode() {
        reviewMode = true;
        examStarted = true;
        $('#startScreen').hide();
        $('#examContent').hide();
        $('#reviewContent').show();
        $('#writtenExamSelector').hide();

        // 헤더 타이틀 변경
        $('#mainTitle').text('💻 정보처리기사 실기 시험');

        // 헤더 업데이트
        $('#currentExam').text('키워드 문제풀이');
        $('#examTitleCenter').show();
        $('#timerCenter').hide();

        if (reviewQuestions.length > 0) {
            displayReviewQuestion(currentReviewQuestion);
            updateReviewQuestionCounter();
        }
    }

    function exitReviewMode() {
        reviewMode = false;
        examStarted = false;
        currentReviewQuestion = 0;

        // UI 초기화
        $('#startScreen').show();
        $('#examContent').hide();
        $('#reviewContent').hide();
        $('#writtenExamSelector').hide();
        $('#restartReviewBtn').hide();

        // 헤더 타이틀 복원
        $('#mainTitle').text('📚 정보처리기사 CBT');
        $('#examTitleCenter').hide();
    }


    function displayReviewQuestion(index) {
        let html = '';
        if (index < reviewQuestions.length) {
            const q = reviewQuestions[index];

            html += `
                <div class="question-card">
                    <div class="question-header">
                        <div class="question-number">${index + 1}</div>
                        <div class="question-text">${q.question}</div>
                    </div>
                    <div class="answer-input-container">
                        <input type="text" class="answer-input" id="answerInput${index}" placeholder="정답을 입력해주세요...">
                        <div class="answer-check-container">
                            <button class="answer-check-btn" onclick="checkAnswer(${index})">정답 확인</button>
                            <button class="next-question-btn" id="nextQuestionBtn${index}" onclick="goToNextQuestion(${index})" style="display: none;">다음 문제</button>
                        </div>
                        <div class="answer-result" id="answerResult${index}"></div>
                        <div class="correct-answers" id="correctAnswers${index}"></div>
                    </div>
                </div>
            `;
        }

        $('#reviewQuestionContainer').html(html);

        // Enter 키로 정답 확인
        $(`#answerInput${index}`).keypress(function (e) {
            if (e.which === 13) {
                checkAnswer(index);
            }
        });

        updateReviewQuestionCounter();
    }

    function checkAnswer(index) {
        const userAnswer = $(`#answerInput${index}`).val().trim();
        const correctAnswers = reviewQuestions[index].answer.split(',').map(ans => ans.trim());

        if (userAnswer === '') {
            alert('정답을 입력해주세요.');
            return;
        }

        // 대소문자 구분 없이 정답 체크
        const isCorrect = correctAnswers.some(correctAnswer =>
            userAnswer.toLowerCase() === correctAnswer.toLowerCase()
        );

        const inputElement = $(`#answerInput${index}`);
        const resultElement = $(`#answerResult${index}`);
        const correctAnswersElement = $(`#correctAnswers${index}`);
        const nextBtn = $(`#nextQuestionBtn${index}`);

        if (isCorrect) {
            inputElement.removeClass('incorrect').addClass('correct');
            resultElement.removeClass('incorrect').addClass('correct').text('✅ 정답입니다!').show();
        } else {
            inputElement.removeClass('correct').addClass('incorrect');
            resultElement.removeClass('correct').addClass('incorrect').text('❌ 틀렸습니다.').show();
        }

        // 정답 표시
        correctAnswersElement.text(`정답: ${reviewQuestions[index].answer}`).show();

        // 다음 버튼 표시
        nextBtn.show();
    }

    function goToNextQuestion(currentIndex) {
        if (currentIndex < reviewQuestions.length - 1) {
            currentReviewQuestion = currentIndex + 1;
            displayReviewQuestion(currentReviewQuestion);
            updateReviewQuestionCounter();
        } else {
            // 마지막 문제 완료 시 다시 풀기 버튼 표시
            showRestartButton();
        }
    }

    function showRestartButton() {
        $('#restartReviewBtn').show();
        // 마지막 문제에서 다음 버튼 비활성화
        $(`#nextQuestionBtn${reviewQuestions.length - 1}`).prop('disabled', true).text('완료');
    }

    function restartReviewMode() {
        // 모든 입력 필드 초기화
        currentReviewQuestion = 0;
        $('#restartReviewBtn').hide();
        displayReviewQuestion(currentReviewQuestion);
        updateReviewQuestionCounter();
    }

    function resetReviewProgress() {
        $('#restartReviewBtn').hide();
    }

    function updateReviewQuestionCounter() {
        const totalQuestions = reviewQuestions.length;
        $('#reviewQuestionCounter').text(`문제 ${currentReviewQuestion + 1} / ${totalQuestions}`);
    }


    function shuffleReviewQuestions() {
        // Fisher-Yates 셔플 알고리즘 사용
        for (let i = reviewQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [reviewQuestions[i], reviewQuestions[j]] = [reviewQuestions[j], reviewQuestions[i]];
        }
        console.log('리뷰 문제 순서가 랜덤화되었습니다.');
    }

    // 전역 함수로 만들어서 HTML에서 호출 가능하게 함
    window.checkAnswer = checkAnswer;
    window.goToNextQuestion = goToNextQuestion;

    // 필기/실기 선택 함수들
    function selectWrittenExam() {
        $('#startScreen').hide();
        $('#writtenExamSelector').show();
        generateWrittenExamList();
    }

    function selectPracticalExam() {
        startReviewMode();
    }

    function showWrittenExamSelector() {
        $('.header').hide();
        $('#startScreen').hide();
        $('#examContent').hide();
        $('#reviewContent').hide();
        $('#writtenExamSelector').show();
        generateWrittenExamList();
    }

    function hideWrittenExamSelector() {
        $('#writtenExamSelector').hide();
        $('.header').show();
        $('#startScreen').show();
    }

    function generateWrittenExamList() {
        const examList = $('#writtenExamList');
        examList.empty();

        examSessions.forEach((exam, index) => {
            const examCard = $(`
                <div class="exam-card" data-exam-index="${index}">
                    <div class="exam-title">${exam.title}</div>
                    <div class="exam-info-small">
                        ${exam.description}<br>
                        📝 ${exam.questions}문제 | ⏰ ${exam.timeLimit}분
                    </div>
                </div>
            `);

            examCard.click(function () {
                selectWrittenExamSession(index);
            });

            examList.append(examCard);
        });
    }

    function selectWrittenExamSession(index) {
        currentExamIndex = index;
        const selectedExam = examSessions[index];

        // 현재 회차 업데이트
        $('#currentExam').text(selectedExam.title);

        // 선택된 카드 스타일 적용
        $('.exam-card').removeClass('selected');
        $(`.exam-card[data-exam-index="${index}"]`).addClass('selected');

        // 잠시 후 필기 시험 시작
        setTimeout(() => {
            hideWrittenExamSelector();
            startExam();
        }, 500);
    }
});
