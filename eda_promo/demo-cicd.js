/* ============================================================
   AutoSafex — CI/CD Pipeline Interactive Demo
   파이프라인 실행 시뮬레이션: 스테이지 순차 진행, 로그 스트리밍,
   통계 실시간 갱신
   ============================================================ */
(function () {
    'use strict';

    const overlay = document.getElementById('cicdDemoOverlay');
    const btnLaunch = document.getElementById('btnLaunchCicdDemo');
    const btnClose = document.getElementById('btnCloseCicdDemo');
    const btnRun = document.getElementById('cicdRunBtn');
    const btnReset = document.getElementById('cicdResetBtn');
    const nodesEl = document.getElementById('cicdNodes');
    const logEl = document.getElementById('cicdLog');
    const liveBadge = document.getElementById('cicdLiveBadge');
    const buildNumEl = document.getElementById('cicdBuildNum');

    // Stats
    const passRateEl = document.getElementById('cicdPassRate');
    const lineCovEl = document.getElementById('cicdLineCov');
    const branchCovEl = document.getElementById('cicdBranchCov');
    const durationEl = document.getElementById('cicdDuration');
    const passBarEl = document.getElementById('cicdPassBar');
    const lineBarEl = document.getElementById('cicdLineBar');
    const branchBarEl = document.getElementById('cicdBranchBar');
    const durBarEl = document.getElementById('cicdDurBar');

    let running = false;
    let timers = [];

    // ── 스테이지 정의 ──────────────────────────────────────────
    const ALL_STAGES = [
        { id: 'commit', label: 'Commit', color: '#aaa', always: true },
        { id: 'lint', label: 'Lint', color: '#00e88f', always: false },
        { id: 'cdc', label: 'CDC', color: '#00d4ff', always: false },
        { id: 'sim', label: 'Sim', color: '#8b5cf6', always: false },
        { id: 'coverage', label: 'Coverage', color: '#ffc545', always: false },
        { id: 'report', label: 'Report', color: '#ff4d6a', always: false },
    ];

    // ── 오버레이 열기/닫기 ─────────────────────────────────────
    btnLaunch.addEventListener('click', () => {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderNodes();
    });

    btnClose.addEventListener('click', closeDemo);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) closeDemo();
    });

    function closeDemo() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        resetPipeline();
    }

    // ── 활성 스테이지 목록 ─────────────────────────────────────
    function getActiveStages() {
        const stages = [ALL_STAGES[0]]; // commit은 항상 포함
        document.querySelectorAll('.cicd-stage-toggle input').forEach(cb => {
            if (cb.checked) {
                const s = ALL_STAGES.find(s => s.id === cb.dataset.stage);
                if (s) stages.push(s);
            }
        });
        return stages;
    }

    // ── 파이프라인 노드 렌더 ───────────────────────────────────
    function renderNodes() {
        const stages = getActiveStages();
        nodesEl.innerHTML = stages.map((s, i) => {
            const arrow = i < stages.length - 1 ? '<span class="cicd-node-arrow">→</span>' : '';
            return `<div class="cicd-node" data-id="${s.id}" style="--stage-color:${s.color}">
        <div class="cicd-node-dot pending">○</div>
        <div class="cicd-node-label">${s.label}</div>
      </div>${arrow}`;
        }).join('');
    }

    // 토글 변경 시 노드 재렌더
    document.querySelectorAll('.cicd-stage-toggle input').forEach(cb => {
        cb.addEventListener('change', () => { if (!running) renderNodes(); });
    });

    // ── 로그 유틸 ──────────────────────────────────────────────
    function ts() {
        const d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()]
            .map(n => String(n).padStart(2, '0')).join(':');
    }

    function addLog(type, msg) {
        const cls = {
            pass: 'cicd-log-pass', fail: 'cicd-log-fail',
            run: 'cicd-log-run', info: 'cicd-log-info', sys: 'cicd-log-sys'
        }[type] || 'cicd-log-info';
        const tag = { pass: '[PASS]', fail: '[FAIL]', run: '[RUN ]', info: '[INFO]', sys: '[SYS ]' }[type] || '[INFO]';
        const line = document.createElement('div');
        line.className = 'cicd-log-line';
        line.innerHTML = `<span class="cicd-log-ts">${ts()}</span> <span class="${cls}">${tag}</span> ${msg}`;
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // ── 노드 상태 변경 ─────────────────────────────────────────
    function setNode(id, state) {
        const node = nodesEl.querySelector(`[data-id="${id}"] .cicd-node-dot`);
        if (!node) return;
        node.className = 'cicd-node-dot ' + state;
        const symbols = { pending: '○', running: '●', passed: '✓', failed: '✗' };
        node.textContent = symbols[state] || '○';
    }

    // ── 통계 갱신 ──────────────────────────────────────────────
    function animateStat(el, barEl, target, suffix) {
        let current = 0;
        const step = target / 30;
        const iv = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = Math.round(current) + suffix;
            barEl.style.width = Math.round(current) + '%';
            if (current >= target) clearInterval(iv);
        }, 40);
        timers.push(iv);
    }

    // ── 파이프라인 실행 ────────────────────────────────────────
    btnRun.addEventListener('click', () => {
        if (running) return;
        running = true;
        btnRun.disabled = true;
        liveBadge.style.display = '';

        const stages = getActiveStages();
        const project = document.getElementById('cicdProject').value;
        const branch = document.getElementById('cicdBranch').value;
        const buildNum = 1248 + Math.floor(Math.random() * 50);
        buildNumEl.textContent = buildNum.toLocaleString();

        renderNodes();
        logEl.innerHTML = '';

        addLog('sys', `Pipeline #${buildNum} triggered`);
        addLog('info', `Project: <strong>${project}</strong> | Branch: <strong>${branch}</strong>`);
        addLog('info', `Stages: ${stages.map(s => s.label).join(' → ')}`);

        // 로그 메시지 풀
        const logMessages = {
            commit: [
                { d: 300, type: 'info', msg: 'Checkout repository...' },
                { d: 600, type: 'pass', msg: 'Commit hash: <strong>a3f7c21</strong> verified' },
            ],
            lint: [
                { d: 200, type: 'run', msg: `questa_lint — analyzing ${project}.sv` },
                { d: 800, type: 'info', msg: 'Checking coding rules... STARC / RMM compliant' },
                { d: 400, type: 'info', msg: 'Dead code analysis... 0 unreachable blocks' },
                { d: 300, type: 'pass', msg: 'lint_check — <strong>0 violations</strong>, 2 warnings' },
            ],
            cdc: [
                { d: 200, type: 'run', msg: `questa_cdc — ${project} clock domain analysis` },
                { d: 900, type: 'info', msg: 'Found 3 clock domains: sys_clk, axi_clk, spi_clk' },
                { d: 600, type: 'info', msg: 'Checking synchronizer presence...' },
                { d: 500, type: 'info', msg: 'Re-convergence analysis... 0 issues' },
                { d: 300, type: 'pass', msg: 'cdc_analysis — <strong>0 unsafe crossings</strong>' },
            ],
            sim: [
                { d: 200, type: 'run', msg: `questa_sim — compiling ${project}...` },
                { d: 1000, type: 'info', msg: 'Running tc_basic_read_write...' },
                { d: 800, type: 'info', msg: 'Running tc_fifo_overflow...' },
                { d: 700, type: 'info', msg: 'Running tc_reset_recovery...' },
                { d: 600, type: 'info', msg: 'Running tc_stress_random...' },
                { d: 400, type: 'pass', msg: `simulation — <strong>47/47 tests passed</strong>` },
            ],
            coverage: [
                { d: 200, type: 'run', msg: 'Merging coverage databases...' },
                { d: 800, type: 'info', msg: 'Line coverage: <strong>91.3%</strong>' },
                { d: 400, type: 'info', msg: 'Branch coverage: <strong>84.7%</strong>' },
                { d: 300, type: 'pass', msg: 'Coverage targets met (line ≥ 90%, branch ≥ 80%)' },
            ],
            report: [
                { d: 200, type: 'run', msg: 'Generating HTML report...' },
                { d: 1000, type: 'info', msg: 'Archiving results → /results/build_' + buildNum + '/' },
                { d: 500, type: 'pass', msg: 'Report published — <strong>autosafex/reports/' + buildNum + '</strong>' },
            ],
        };

        // 순차 실행
        let delay = 500;
        stages.forEach((stage, idx) => {
            const msgs = logMessages[stage.id] || [];

            // 시작: running
            timers.push(setTimeout(() => {
                setNode(stage.id, 'running');
                addLog('run', `Stage [${stage.label}] started`);
            }, delay));
            delay += 400;

            // 각 메시지
            msgs.forEach(m => {
                timers.push(setTimeout(() => addLog(m.type, m.msg), delay));
                delay += m.d;
            });

            // 완료: passed
            timers.push(setTimeout(() => {
                setNode(stage.id, 'passed');
            }, delay));
            delay += 200;
        });

        // 통계 애니메이션 (파이프라인 완료 후)
        timers.push(setTimeout(() => {
            addLog('sys', `Pipeline #${buildNum} — <strong style="color:#00e88f;">ALL STAGES PASSED</strong>`);
            liveBadge.style.display = 'none';
            running = false;
            btnRun.disabled = false;

            animateStat(passRateEl, passBarEl, 94, '%');
            animateStat(lineCovEl, lineBarEl, 91, '%');
            animateStat(branchCovEl, branchBarEl, 85, '%');

            const durSec = Math.round((delay - 500) / 1000);
            durationEl.textContent = durSec + 's';
            durBarEl.style.width = Math.min(durSec / 30 * 100, 100) + '%';
        }, delay));
    });

    // ── 리셋 ──────────────────────────────────────────────────
    btnReset.addEventListener('click', resetPipeline);

    function resetPipeline() {
        timers.forEach(t => clearTimeout(t));
        timers = [];
        running = false;
        btnRun.disabled = false;
        liveBadge.style.display = 'none';

        renderNodes();
        logEl.innerHTML = '<div class="cicd-log-line"><span class="cicd-log-ts">--:--:--</span> <span class="cicd-log-sys">[SYS]</span> Pipeline ready. Press <strong>Run Pipeline</strong> to start.</div>';

        [passRateEl, lineCovEl, branchCovEl, durationEl].forEach(e => e.textContent = '—');
        [passBarEl, lineBarEl, branchBarEl, durBarEl].forEach(e => e.style.width = '0%');
    }

    // ── 초기 렌더 ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', renderNodes);
})();
