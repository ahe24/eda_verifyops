/* ============================================================
   AutoSafex — TestBench Interactive Demo
   폼 입력 변경 시 Verilog 코드 + SVG 파형을 실시간 갱신
   ============================================================ */
(function () {
    'use strict';

    const overlay = document.getElementById('demoOverlay');
    const btnLaunch = document.getElementById('btnLaunchDemo');
    const btnClose = document.getElementById('btnCloseDemo');
    const codeEl = document.getElementById('demoCode');
    const waveContainer = document.getElementById('demoWaveContainer');

    // ── 입력 요소 ──────────────────────────────────────────────
    const elFreq = document.getElementById('demoFreq');
    const elDuty = document.getElementById('demoDuty');
    const elDutyVal = document.getElementById('demoDutyVal');
    const elRstDelay = document.getElementById('demoRstDelay');
    const elDataWidth = document.getElementById('demoDataWidth');
    const elValid = document.getElementById('demoValid');

    // ── 오버레이 열기/닫기 ─────────────────────────────────────
    btnLaunch.addEventListener('click', () => {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        generate();
    });

    btnClose.addEventListener('click', closeDemo);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDemo();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeDemo();
        }
    });

    function closeDemo() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ── 모든 입력에 실시간 리스너 등록 ──────────────────────────
    [elFreq, elDuty, elRstDelay, elDataWidth, elValid].forEach(el => {
        el.addEventListener('input', generate);
        el.addEventListener('change', generate);
    });
    document.querySelectorAll('input[name="rstLevel"]').forEach(r => {
        r.addEventListener('change', generate);
    });

    // ── 코드 생성 ──────────────────────────────────────────────
    function generate() {
        const freqMHz = parseInt(elFreq.value) || 100;
        const duty = parseInt(elDuty.value) || 50;
        const rstLevel = document.querySelector('input[name="rstLevel"]:checked').value;
        const rstDelay = parseInt(elRstDelay.value) || 100;
        const dataWidth = parseInt(elDataWidth.value) || 8;
        const hasValid = elValid.checked;

        // 업데이트: duty 표시
        elDutyVal.textContent = duty + '%';

        // 계산
        const periodNs = Math.round(1000 / freqMHz);
        const highNs = Math.round(periodNs * duty / 100);
        const lowNs = periodNs - highNs;
        const rstName = rstLevel === 'low' ? 'rst_n' : 'rst';
        const rstInit = rstLevel === 'low' ? "1'b0" : "1'b1";
        const rstRel = rstLevel === 'low' ? "1'b1" : "1'b0";
        const widthDecl = dataWidth > 1 ? `[${dataWidth - 1}:0] ` : '       ';
        const maxVal = Math.pow(2, dataWidth) - 1;

        let code = '';
        code += c('// ──────────────────────────────────────────') + '\n';
        code += c(`// Auto-generated testbench — AutoSafex`) + '\n';
        code += c(`// Clock: ${freqMHz} MHz (period ${periodNs} ns, duty ${duty}%)`) + '\n';
        code += c(`// Reset: ${rstLevel === 'low' ? 'Active-Low' : 'Active-High'}, release after ${rstDelay} ns`) + '\n';
        code += c(`// Data width: ${dataWidth} bit${dataWidth > 1 ? 's' : ''}`) + '\n';
        code += c('// ──────────────────────────────────────────') + '\n';
        code += kw('module') + ' ' + tp('tb_top') + ';\n\n';

        code += c('  // ── Signal declarations ──') + '\n';
        code += `  ${kw('reg')}          ${sig('clk')}   = ${num('0')};\n`;
        code += `  ${kw('reg')}          ${sig(rstName)} = ${num(rstInit)};\n`;
        code += `  ${kw('reg')}  ${widthDecl}${sig('data')}  = ${num("'" + dataWidth + "'d0")};\n`;
        if (hasValid) {
            code += `  ${kw('reg')}          ${sig('valid')} = ${num("1'b0")};\n`;
        }
        code += '\n';

        code += c('  // ── Clock generation ──') + '\n';
        code += `  ${kw('always')} ${kw('begin')}\n`;
        code += `    ${sig('clk')} = ${num("1'b1")}; #${num(String(highNs))};\n`;
        code += `    ${sig('clk')} = ${num("1'b0")}; #${num(String(lowNs))};\n`;
        code += `  ${kw('end')}\n\n`;

        code += c('  // ── Reset sequence ──') + '\n';
        code += `  ${kw('initial')} ${kw('begin')}\n`;
        code += `    ${sig(rstName)} = ${num(rstInit)};\n`;
        code += `    #${num(String(rstDelay))} ${sig(rstName)} = ${num(rstRel)};\n`;
        code += `  ${kw('end')}\n\n`;

        code += c('  // ── Stimulus ──') + '\n';
        code += `  ${kw('initial')} ${kw('begin')}\n`;
        code += `    #${num(String(rstDelay + 20))};\n`;

        for (let i = 0; i < 4; i++) {
            const val = Math.floor(Math.random() * maxVal);
            const hexDigits = Math.ceil(dataWidth / 4);
            const hexStr = val.toString(16).padStart(hexDigits, '0');
            code += `    @(${kw('posedge')} ${sig('clk')});\n`;
            code += `    ${sig('data')} = ${num(dataWidth + "'h" + hexStr)};\n`;
            if (hasValid) {
                code += `    ${sig('valid')} = ${num("1'b1")};\n`;
            }
        }

        code += `    @(${kw('posedge')} ${sig('clk')});\n`;
        if (hasValid) {
            code += `    ${sig('valid')} = ${num("1'b0")};\n`;
        }
        code += `    #${num(String(periodNs * 5))} $${kw('finish')};\n`;
        code += `  ${kw('end')}\n\n`;

        code += kw('endmodule');

        codeEl.innerHTML = code;

        // ── 파형 갱신 ──
        renderWaveforms(freqMHz, duty, rstLevel, rstDelay, dataWidth, hasValid);
    }

    // ── 구문 하이라이트 헬퍼 ───────────────────────────────────
    function kw(t) { return `<span class="hl-kw">${t}</span>`; }
    function tp(t) { return `<span class="hl-tp">${t}</span>`; }
    function sig(t) { return `<span class="hl-sig">${t}</span>`; }
    function num(t) { return `<span class="hl-num">${t}</span>`; }
    function c(t) { return `<span class="hl-cmt">${t}</span>`; }

    // ── SVG 파형 렌더링 ────────────────────────────────────────
    function renderWaveforms(freqMHz, duty, rstLevel, rstDelay, dataWidth, hasValid) {
        const W = 440;
        const rowH = 26;
        const scaleNs = W / 800;  // 800ns 전체 표시
        const periodNs = Math.round(1000 / freqMHz);
        const highNs = Math.round(periodNs * duty / 100);
        const lowNs = periodNs - highNs;

        const signals = [];

        // 1. CLK
        let clkPts = [];
        let x = 0;
        while (x < W) {
            const hW = Math.max(1, highNs * scaleNs);
            const lW = Math.max(1, lowNs * scaleNs);
            clkPts.push(`${x},20 ${x},4 ${x + hW},4 ${x + hW},20`);
            x += hW + lW;
        }
        signals.push({ name: 'clk', color: '#00e88f', points: clkPts.join(' ') });

        // 2. RST
        const rstX = Math.max(2, rstDelay * scaleNs);
        const rstLow = rstLevel === 'low';
        const rstPts = rstLow
            ? `0,20 ${rstX},20 ${rstX},4 ${W},4`
            : `0,4 ${rstX},4 ${rstX},20 ${W},20`;
        signals.push({ name: rstLow ? 'rst_n' : 'rst', color: '#ff4d6a', points: rstPts });

        // 3. DATA (bus — hatched blocks after reset)
        const dataBlocks = [];
        let dx = rstX + 20 * scaleNs;
        for (let i = 0; i < 5 && dx < W; i++) {
            const bw = Math.max(20, periodNs * scaleNs);
            const hexDigits = Math.ceil(dataWidth / 4);
            const val = Math.floor(Math.random() * (Math.pow(2, dataWidth) - 1));
            const label = dataWidth + "'h" + val.toString(16).toUpperCase().padStart(hexDigits, '0');
            dataBlocks.push({ x: dx, w: bw, label });
            dx += bw;
        }
        signals.push({ name: 'data', color: '#00d4ff', bus: true, blocks: dataBlocks, busEnd: W, rstX: rstX });

        // 4. VALID (optional)
        if (hasValid) {
            const vStart = rstX + 20 * scaleNs;
            const vEnd = Math.min(dx, W);
            signals.push({ name: 'valid', color: '#8b5cf6', points: `0,20 ${vStart},20 ${vStart},4 ${vEnd},4 ${vEnd},20 ${W},20` });
        }

        const totalH = signals.length * (rowH + 8) + 10;
        let html = `<svg width="100%" viewBox="0 0 ${W + 50} ${totalH}" class="demo-wave-svg">`;

        signals.forEach((s, i) => {
            const y = i * (rowH + 8) + 6;
            // Label
            html += `<text x="0" y="${y + 16}" fill="${s.color}" font-size="10" font-family="monospace" font-weight="600">${s.name}</text>`;

            if (s.bus) {
                // Bus: draw hatched rectangles
                const bY = y + 2;
                // Idle (before reset release)
                html += `<line x1="42" y1="${bY + rowH / 2}" x2="${s.rstX}" y2="${bY + rowH / 2}" stroke="${s.color}" stroke-width="1" opacity="0.3"/>`;
                s.blocks.forEach(b => {
                    html += `<rect x="${b.x + 42}" y="${bY}" width="${b.w}" height="${rowH - 4}" rx="3" fill="none" stroke="${s.color}" stroke-width="1.2"/>`;
                    html += `<text x="${b.x + 42 + b.w / 2}" y="${bY + rowH / 2 + 1}" fill="${s.color}" font-size="8" font-family="monospace" text-anchor="middle" dominant-baseline="middle">${b.label}</text>`;
                });
                // Idle after
                const lastX = s.blocks.length > 0 ? s.blocks[s.blocks.length - 1].x + s.blocks[s.blocks.length - 1].w : s.rstX;
                html += `<line x1="${lastX + 42}" y1="${bY + rowH / 2}" x2="${s.busEnd + 42}" y2="${bY + rowH / 2}" stroke="${s.color}" stroke-width="1" opacity="0.3"/>`;
            } else {
                // Normal polyline
                const shiftedPts = s.points.split(' ').map(p => {
                    const [px, py] = p.split(',');
                    return `${parseFloat(px) + 42},${parseFloat(py) + y}`;
                }).join(' ');
                html += `<polyline points="${shiftedPts}" fill="none" stroke="${s.color}" stroke-width="1.5"/>`;
            }
        });

        html += '</svg>';
        waveContainer.innerHTML = html;
    }

    // ── 초기 생성 (오버레이가 열리지 않아도 준비) ────────────────
    document.addEventListener('DOMContentLoaded', generate);
})();
