// Full-page background canvas — constellation (default) or DNA mode (?bg=dna)
function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Config ---
    const mode = new URLSearchParams(location.search).get('bg') || 'constellation';
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationId;
    let stars = [];
    let connections = [];
    let dnaParticles = [];
    let lastFrame = 0;
    let contentHeight = 0;
    let nebulaTime = 0;

    const wrapper = document.getElementById('page-wrapper');

    // --- Nebula particle system (matches production) ---
    const nebulaColors = [
        { r: 180, g: 60, b: 40, a: 0.35 },
        { r: 220, g: 100, b: 50, a: 0.28 },
        { r: 140, g: 40, b: 60, a: 0.23 },
        { r: 80, g: 140, b: 160, a: 0.19 },
        { r: 200, g: 150, b: 80, a: 0.23 },
    ];
    const nebulaParticles = [];
    const maxNebulaParticles = isMobile ? 30 : 60;

    const createNebulaParticle = () => {
        const w = window.innerWidth;
        const vh = window.innerHeight;
        const angle = Math.random() * Math.PI * 0.5 + Math.PI;
        const speed = Math.random() * 0.4 + 0.15;
        const color = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        return {
            x: w + Math.random() * 200,
            y: -Math.random() * 200,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: Math.random() * 400 + 200,
            color: color,
            size: Math.random() * 150 + 50,
        };
    };

    // Initialize nebula particles spread across hero area
    for (let i = 0; i < maxNebulaParticles; i++) {
        const p = createNebulaParticle();
        const w = window.innerWidth;
        const vh = window.innerHeight;
        p.x = w * 0.5 + Math.random() * w * 0.6;
        p.y = Math.random() * vh * 0.6;
        p.life = Math.random() * p.maxLife;
        nebulaParticles.push(p);
    }

    // --- Canvas sizing (DPR-aware) ---
    const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        // Canvas is outside the wrapper, so wrapper.offsetHeight is pure content
        contentHeight = wrapper.offsetHeight;
        const h = contentHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        if (mode === 'constellation') initStars();
        else initDNA();
    };

    // --- Constellation: star/connection generation ---
    const initStars = () => {
        const w = window.innerWidth;
        const h = contentHeight;
        let starCount = Math.floor((w * h) / 3500);
        if (isMobile) starCount = Math.floor(starCount / 2);
        stars = [];
        connections = [];

        for (let i = 0; i < starCount; i++) {
            const y = Math.random() * h;
            const densityFactor = 1 - (y / h) * 0.3;
            if (Math.random() > densityFactor && y > h * 0.3) continue;

            const z = Math.random();
            const isNode = Math.random() < 0.08;
            stars.push({
                x: Math.random() * w,
                y: y,
                z: z,
                size: isNode ? 1.5 + Math.random() * 2 : 0.3 + Math.random() * 1.5 * (1 - z * 0.5),
                brightness: isNode ? 0.7 + Math.random() * 0.3 : 0.15 + Math.random() * 0.5,
                twinkleSpeed: 0.5 + Math.random() * 2,
                twinkleOffset: Math.random() * Math.PI * 2,
                isNode: isNode,
            });
        }

        // Build constellation connections between nearby nodes
        const nodes = stars.filter(s => s.isNode);
        const maxDist = Math.min(w, h) * 0.18;

        for (let i = 0; i < nodes.length; i++) {
            const distances = [];
            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) distances.push({ idx: j, dist: dist });
            }
            distances.sort((a, b) => a.dist - b.dist);
            const connectCount = Math.min(distances.length, 1 + Math.floor(Math.random() * 2));
            for (let k = 0; k < connectCount; k++) {
                const fromIdx = stars.indexOf(nodes[i]);
                const toIdx = stars.indexOf(nodes[distances[k].idx]);
                const exists = connections.some(c =>
                    (c.from === fromIdx && c.to === toIdx) || (c.from === toIdx && c.to === fromIdx)
                );
                if (!exists) {
                    connections.push({
                        from: fromIdx,
                        to: toIdx,
                        opacity: 0.08 + Math.random() * 0.12,
                    });
                }
            }
        }
    };

    // --- DNA: particle generation ---
    const initDNA = () => {
        const h = contentHeight;
        dnaParticles = [];
        let count = Math.floor(h / 8);
        if (isMobile) count = Math.floor(count / 2);
        for (let i = 0; i < count; i++) {
            dnaParticles.push({
                angle: (i / count) * Math.PI * 2 * 20 + Math.random() * 0.3,
                y: (i / count) * h,
                speed: 0.3 + Math.random() * 0.4,
                strand: Math.random() > 0.5 ? 0 : 1,
                size: 0.8 + Math.random() * 1.2,
                brightness: 0.3 + Math.random() * 0.5,
            });
        }
    };

    // --- DNA: helix x position ---
    const getHelixX = (y, time, strand, w) => {
        const scrollH = contentHeight;
        const centerX = w * 0.5;
        const breathe = Math.sin(time * 0.0004) * 0.05 + 1;
        const baseAmplitude = w * 0.08;
        const yFactor = y / scrollH;
        const amplitude = baseAmplitude * (0.8 + yFactor * 0.4) * breathe;
        const frequency = (2 * Math.PI) / 350;
        const phase = strand === 0 ? 0 : Math.PI;
        const timeShift = time * 0.00015;
        return centerX + Math.sin(y * frequency + phase + timeShift) * amplitude;
    };

    // --- Shared: nebula hero drawing (production-faithful particle system) ---
    const drawNebula = (time) => {
        const w = window.innerWidth;
        const vh = window.innerHeight;

        const pulse = Math.sin(nebulaTime * 0.00065) * 0.03 + 0.97;
        const slowPulse = Math.sin(nebulaTime * 0.00035) * 0.02 + 0.98;

        // Main nebula glow from top-right
        const mainGradient = ctx.createRadialGradient(
            w + 100, -100, 0,
            w * 0.5, vh * 0.3, w * 0.8
        );
        mainGradient.addColorStop(0, 'rgba(180,60,40,' + (0.58 * pulse) + ')');
        mainGradient.addColorStop(0.2, 'rgba(200,80,50,' + (0.36 * pulse) + ')');
        mainGradient.addColorStop(0.4, 'rgba(140,50,60,' + (0.26 * slowPulse) + ')');
        mainGradient.addColorStop(0.6, 'rgba(80,100,120,' + (0.13 * slowPulse) + ')');
        mainGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mainGradient;
        ctx.fillRect(0, 0, w, vh);

        // Secondary wisp with drift
        const wisp1 = ctx.createRadialGradient(
            w * 0.8 + Math.sin(nebulaTime * 0.001) * 30,
            vh * 0.15 + Math.cos(nebulaTime * 0.0008) * 20,
            0,
            w * 0.6, vh * 0.3, w * 0.5
        );
        wisp1.addColorStop(0, 'rgba(220,120,60,' + (0.29 * pulse) + ')');
        wisp1.addColorStop(0.3, 'rgba(180,80,50,' + (0.2 * slowPulse) + ')');
        wisp1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = wisp1;
        ctx.fillRect(0, 0, w, vh);

        // Teal filament accent
        const tealWisp = ctx.createRadialGradient(
            w * 0.7 + Math.cos(nebulaTime * 0.0009) * 40,
            vh * 0.25 + Math.sin(nebulaTime * 0.0012) * 25,
            0,
            w * 0.5, vh * 0.35, w * 0.3
        );
        tealWisp.addColorStop(0, 'rgba(60,140,160,' + (0.2 * slowPulse) + ')');
        tealWisp.addColorStop(0.5, 'rgba(40,100,120,' + (0.12 * pulse) + ')');
        tealWisp.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tealWisp;
        ctx.fillRect(0, 0, w, vh);

        // Nebula particles — drifting clouds of color
        for (let i = 0; i < nebulaParticles.length; i++) {
            const p = nebulaParticles[i];
            p.x += p.vx + Math.sin(nebulaTime * 0.0025 + i) * 0.1;
            p.y += p.vy + Math.cos(nebulaTime * 0.002 + i) * 0.08;
            p.life++;

            if (p.life > p.maxLife || p.x < -p.size || p.y > vh + p.size) {
                nebulaParticles[i] = createNebulaParticle();
                continue;
            }

            const lifeRatio = p.life / p.maxLife;
            const fadeIn = Math.min(lifeRatio * 5, 1);
            const fadeOut = 1 - Math.pow(lifeRatio, 2);
            const alpha = fadeIn * fadeOut * p.color.a * pulse;

            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + alpha + ')');
            gradient.addColorStop(0.5, 'rgba(' + p.color.r + ',' + p.color.g + ',' + p.color.b + ',' + (alpha * 0.3) + ')');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Subtle warmth variation
        const warmthCycle = Math.sin(nebulaTime * 0.0002) * 0.02;
        const warmthGradient = ctx.createRadialGradient(
            w * 0.85, vh * 0.1, 0,
            w * 0.6, vh * 0.3, w * 0.4
        );
        warmthGradient.addColorStop(0, 'rgba(255,200,150,' + (0.03 + warmthCycle) + ')');
        warmthGradient.addColorStop(0.4, 'rgba(220,100,60,' + (0.015 + warmthCycle * 0.5) + ')');
        warmthGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = warmthGradient;
        ctx.fillRect(0, 0, w, vh);

        nebulaTime += 16;

        return { pulse1: pulse, pulse2: slowPulse };
    };

    // --- Constellation: nebula echoes + stars + connections ---
    const drawConstellation = (time) => {
        const w = window.innerWidth;
        const h = contentHeight;
        const dpr = window.devicePixelRatio || 1;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Background fill
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Nebula hero
        const { pulse1, pulse2 } = drawNebula(time);

        // Nebula echoes below the fold
        const grad4 = ctx.createRadialGradient(w * 0.2, h * 0.35, 0, w * 0.2, h * 0.35, w * 0.4);
        grad4.addColorStop(0, 'rgba(180,60,40,' + (0.03 * pulse1) + ')');
        grad4.addColorStop(0.5, 'rgba(140,40,60,' + (0.01 * pulse2) + ')');
        grad4.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad4;
        ctx.fillRect(0, h * 0.2, w, h * 0.3);

        const grad5 = ctx.createRadialGradient(w * 0.85, h * 0.65, 0, w * 0.85, h * 0.65, w * 0.35);
        grad5.addColorStop(0, 'rgba(60,140,160,' + (0.025 * pulse2) + ')');
        grad5.addColorStop(0.5, 'rgba(60,140,160,0.007)');
        grad5.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad5;
        ctx.fillRect(0, h * 0.5, w, h * 0.3);

        // Constellation connection lines
        for (let i = 0; i < connections.length; i++) {
            const conn = connections[i];
            const from = stars[conn.from];
            const to = stars[conn.to];
            const pulse = (Math.sin(time * 0.001 + conn.from * 0.5) * 0.015 + conn.opacity) * 0.6;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = 'rgba(45,212,191,' + pulse + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Stars
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const twinkle = Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
            const alpha = star.brightness * twinkle * 0.6;

            // Node glow
            if (star.isNode) {
                const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
                glow.addColorStop(0, 'rgba(45,212,191,' + (alpha * 0.2) + ')');
                glow.addColorStop(0.5, 'rgba(45,212,191,' + (alpha * 0.05) + ')');
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(star.x - star.size * 4, star.y - star.size * 4, star.size * 8, star.size * 8);
            }

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            if (star.isNode) {
                ctx.fillStyle = 'rgba(200,220,230,' + alpha + ')';
            } else {
                const warm = star.twinkleOffset > 4.5;
                ctx.fillStyle = warm
                    ? 'rgba(240,200,170,' + (alpha * 0.7) + ')'
                    : 'rgba(200,210,230,' + (alpha * 0.8) + ')';
            }
            ctx.fill();
        }
    };

    // --- DNA: helix + rungs + particles ---
    const drawDNA = (time) => {
        const w = window.innerWidth;
        const h = contentHeight;
        const dpr = window.devicePixelRatio || 1;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Background fill
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Nebula hero
        drawNebula(time);

        // Helix parameters
        const helixStartY = 280;
        const helixFadeIn = 200;
        const rungSpacing = 45;
        const frequency = (2 * Math.PI) / 350;
        const timeShift = time * 0.00015;
        const steps = Math.floor(h / 2);

        // Base-pair rungs (behind strands)
        for (let y = helixStartY; y < h - 100; y += rungSpacing) {
            const fadeIn = Math.min(1, Math.max(0, (y - helixStartY) / helixFadeIn));
            const x0 = getHelixX(y, time, 0, w);
            const x1 = getHelixX(y, time, 1, w);
            const phase0 = Math.cos(y * frequency + timeShift);
            const depthFactor = Math.abs(phase0);
            const rungAlpha = fadeIn * 0.06 * (0.3 + depthFactor * 0.7);
            const isWarmRung = Math.floor(y / rungSpacing) % 3 === 0;

            ctx.beginPath();
            ctx.moveTo(x0, y);
            ctx.lineTo(x1, y);
            ctx.strokeStyle = isWarmRung
                ? 'rgba(220,100,50,' + rungAlpha + ')'
                : 'rgba(45,212,191,' + rungAlpha + ')';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Small dots at rung endpoints
            for (const x of [x0, x1]) {
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = isWarmRung
                    ? 'rgba(220,100,50,' + (rungAlpha * 3) + ')'
                    : 'rgba(45,212,191,' + (rungAlpha * 3) + ')';
                ctx.fill();
            }
        }

        // Strands (sharp line + glow)
        for (const strand of [0, 1]) {
            // Sharp line
            ctx.beginPath();
            let started = false;
            for (let i = 0; i < steps; i++) {
                const y = (i / steps) * h;
                if (y < helixStartY) continue;
                const fadeIn = Math.min(1, Math.max(0, (y - helixStartY) / helixFadeIn));
                if (fadeIn <= 0) continue;
                const x = getHelixX(y, time, strand, w);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            const strandGrad = ctx.createLinearGradient(0, helixStartY, 0, h);
            if (strand === 0) {
                strandGrad.addColorStop(0, 'rgba(220,100,50,0)');
                strandGrad.addColorStop(0.05, 'rgba(220,100,50,0.3)');
                strandGrad.addColorStop(0.3, 'rgba(180,60,40,0.2)');
                strandGrad.addColorStop(0.6, 'rgba(200,150,80,0.15)');
                strandGrad.addColorStop(1, 'rgba(220,100,50,0.08)');
            } else {
                strandGrad.addColorStop(0, 'rgba(45,212,191,0)');
                strandGrad.addColorStop(0.05, 'rgba(45,212,191,0.3)');
                strandGrad.addColorStop(0.3, 'rgba(60,140,160,0.2)');
                strandGrad.addColorStop(0.6, 'rgba(45,212,191,0.15)');
                strandGrad.addColorStop(1, 'rgba(60,140,160,0.08)');
            }
            ctx.strokeStyle = strandGrad;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glow line
            ctx.beginPath();
            started = false;
            for (let i = 0; i < steps; i++) {
                const y = (i / steps) * h;
                if (y < helixStartY) continue;
                const fadeIn = Math.min(1, Math.max(0, (y - helixStartY) / helixFadeIn));
                if (fadeIn <= 0) continue;
                const x = getHelixX(y, time, strand, w);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            const glowGrad = ctx.createLinearGradient(0, helixStartY, 0, h);
            if (strand === 0) {
                glowGrad.addColorStop(0, 'rgba(220,100,50,0)');
                glowGrad.addColorStop(0.05, 'rgba(220,100,50,0.08)');
                glowGrad.addColorStop(0.5, 'rgba(180,60,40,0.04)');
                glowGrad.addColorStop(1, 'rgba(220,100,50,0.015)');
            } else {
                glowGrad.addColorStop(0, 'rgba(45,212,191,0)');
                glowGrad.addColorStop(0.05, 'rgba(45,212,191,0.08)');
                glowGrad.addColorStop(0.5, 'rgba(60,140,160,0.04)');
                glowGrad.addColorStop(1, 'rgba(45,212,191,0.015)');
            }
            ctx.strokeStyle = glowGrad;
            ctx.lineWidth = 8;
            ctx.stroke();
        }

        // Floating particles along strands
        for (const p of dnaParticles) {
            const py = p.y + Math.sin(time * 0.0003 + p.angle) * 5;
            if (py < helixStartY) continue;
            const fadeIn = Math.min(1, Math.max(0, (py - helixStartY) / helixFadeIn));
            const px = getHelixX(py, time, p.strand, w);
            const offset = Math.sin(time * 0.001 * p.speed + p.angle) * 15;
            const finalX = px + offset;
            const alpha = p.brightness * fadeIn * (0.5 + Math.sin(time * 0.002 * p.speed + p.angle) * 0.3);

            ctx.beginPath();
            ctx.arc(finalX, py, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.strand === 0
                ? 'rgba(220,150,100,' + (alpha * 0.4) + ')'
                : 'rgba(100,200,200,' + (alpha * 0.4) + ')';
            ctx.fill();
        }
    };

    // --- Draw dispatcher ---
    const drawFrame = mode === 'constellation' ? drawConstellation : drawDNA;

    // --- Animation loop ---
    const animate = (time) => {
        if (isMobile && time - lastFrame < 33) {
            animationId = requestAnimationFrame(animate);
            return;
        }
        lastFrame = time;
        drawFrame(time);
        animationId = requestAnimationFrame(animate);
    };

    // --- Init ---
    resize();

    if (prefersReducedMotion) {
        drawFrame(1000);
    } else {
        animationId = requestAnimationFrame(animate);

        // Visibility API — pause when tab hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cancelAnimationFrame(animationId);
            } else {
                animationId = requestAnimationFrame(animate);
            }
        });
    }

    // --- Resize handling ---
    let resizeTimeout;
    const debouncedResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resize();
            if (prefersReducedMotion) drawFrame(1000);
        }, 150);
    };

    window.addEventListener('resize', debouncedResize);

    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(wrapper);
}

initCanvas();
