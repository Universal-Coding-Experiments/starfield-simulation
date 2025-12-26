(()=>{

    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d', { alpha: false });

    // Settings
    const STAR_COUNT = 600; // total stars
    const DEPTH = 1200; // max z distance
    const BASE_SPEED = 6; // base forward speed

    const TWINKLE = 0.02; // twinkle intensity
    const TRAIL_ALPHA = 0.18; // motion blur strength

    // Device pixel scaling
    let DPR = Math.max(1, window.devicePixelRatio || 1);

    // Canvas size and center
    let W = 0, H = 0, CX = 0, CY = 0;

    // Pointer for parallax
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    // Star pool
    let stars = [];

    function resize(){
        DPR = Math.max(1, window.devicePixelRatio || 1);
        W = Math.floor(window.innerWidth);
        H = Math.floor(window.innerHeight);
        CX = W / 2;
        CY = H / 2;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        canvas.width = Math.floor(W * DPR);
        canvas.height = Math.floor(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // regenerate stars to fit new size while preserving depth
        if (stars.length === 0) initStars();
    }
    window.addEventListener('resize', resize, { passive: true });

    function randRange(a, b) { return a + Math.random() * (b - a); }

    function initStars(){
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                // x,y centered around 0 for easier projection
                x: randRange(-W, W),
                y: randRange(-H, H),
                z: Math.random() * DEPTH + 1,
                pz: null,
                size: Math.random() * 1.6 + 0.2,
                hue: Math.random() * 60 + 200, // bluish to white
                tw: Math.random() * Math.PI * 2
            });
        }
    }

    // Pointer events for parallax
    function onPointerMove(e) {
        const rect = canvas.getBoundingClientRect();
        pointer.tx = ((e.clientX - rect.left) - CX) / CX; // -1..1
        pointer.ty = ((e.clientY - rect.top) - CY) / CY;
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches[0]) onPointerMove(e.touches[0]);
    }, { passive: true });

    // Recycle star when it passes the camera
    function resetStar(s, forward = true) {
        s.x = randRange(-W, W);
        s.y = randRange(-H, H);
        s.z = forward ? DEPTH : 1;
        s.pz = null;
        s.size = Math.random() * 1.6 + 0.2;
        s.hue = Math.random() * 60 + 200;
        s.tw = Math.random() * Math.PI * 2;
    }

    // Animation loop
    let last = performance.now();
    function loop(now) {
        const dt = Math.min(40, now - last) / 16.666; // normalize to ~60fps units
        last = now;

        // Smooth pointer easing
        pointer.x += (pointer.tx - pointer.x) * 0.08 * dt;
        pointer.y += (pointer.ty - pointer.y) * 0.08 * dt;

        // Motion blur background
        ctx.fillStyle = `rgba(0,0,0,${TRAIL_ALPHA})`;
        ctx.fillRect(0, 0, W, H);

        // center offset for parallax
        const offsetX = pointer.x * 120;
        const offsetY = pointer.y * 80;

        // draw stars
        for (let i = 0; i < stars.length; i++) {

            const s = stars[i];

            // move star forward
            const speed = BASE_SPEED * (1 + (1 - s.z / DEPTH) * 2); // nearer stars move faster
            s.z -= speed * dt;
            if (s.z <= 1) resetStar(s, true);

            // perspective projection
            const k = 600 / s.z; // focal length
            const sx = CX + (s.x + offsetX * (1 - s.z / DEPTH)) * k;
            const sy = CY + (s.y + offsetY * (1 - s.z / DEPTH)) * k;

            // twinkle
            s.tw += TWINKLE * dt;
            const alpha = 0.6 + Math.sin(s.tw) * 0.4;
            const r = s.size * (1 + (1 - s.z / DEPTH) * 2);

            // draw glow
            ctx.beginPath();
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
            grad.addColorStop(0, `hsla(${s.hue}, 90%, 80%, ${alpha})`);
            grad.addColorStop(0.3, `hsla(${s.hue}, 80%, 60%, ${alpha * 0.6})`);
            grad.addColorStop(1, `rgba(0,0,0,0)`);
            ctx.fillStyle = grad;
            ctx.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6);

            // bright core
            ctx.fillStyle = `rgba(255,255,255,${0.6 * alpha})`;
            ctx.fillRect(sx - r * 0.5, sy - r * 0.5, r, r);

        }

        requestAnimationFrame(loop);
    }

    // Initialize and start
    resize();
    initStars();
    requestAnimationFrame(loop);

})();