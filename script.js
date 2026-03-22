document.addEventListener('DOMContentLoaded', () => {
    
    console.log('🎯 Игра загружается...');
    
    // === НАСТРОЙКИ ===
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const minimap = document.getElementById('minimap');
    const minimapCtx = minimap.getContext('2d');
    
    // Элементы UI
    const fireBtn = document.getElementById('fireBtn');
    const resetBtn = document.getElementById('resetBtn');
    const restartBtn = document.getElementById('restartBtn');
    const angleSlider = document.getElementById('angleSlider');
    const powerSlider = document.getElementById('powerSlider');
    const ammoType = document.getElementById('ammoType');
    
    // Элементы статистики
    const angleValue = document.getElementById('angleValue');
    const powerValue = document.getElementById('powerValue');
    const windValueText = document.getElementById('windValueText');
    const windDirection = document.getElementById('windDirection');
    const shotsCountEl = document.getElementById('shotsCount');
    const hitsCountEl = document.getElementById('hitsCount');
    const buildingsDestroyedEl = document.getElementById('buildingsDestroyed');
    const rangeDisplay = document.getElementById('rangeDisplay');
    const heightDisplay = document.getElementById('heightDisplay');
    const flightTimeEl = document.getElementById('flightTime');
    const hitMessage = document.getElementById('hitMessage');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const gameOverStats = document.getElementById('gameOverStats');
    
    // Камера
    let camera = { x: 0, y: 0, zoom: 0.8 };
    
    // Физика (упрощённая)
    const GRAVITY = 0.4;
    const AIR_RESISTANCE = 0.99;
    const WIND_EFFECT = 0.02;
    
    // Снаряды
    const AMMO_TYPES = {
        normal: { damage: 30, radius: 12, color: '#ff6b6b', blastRadius: 40 },
        heavy: { damage: 50, radius: 18, color: '#ff4757', blastRadius: 60 },
        explosive: { damage: 80, radius: 20, color: '#ffa502', blastRadius: 120 }
    };
    
    // Состояние игры
    let gameState = {
        angle: 45,
        power: 70,
        wind: 0,
        ammo: 'normal',
        projectile: null,
        isFiring: false,
        shots: 0,
        hits: 0,
        destroyed: 0,
        buildings: [],
        particles: [],
        explosions: [],
        cannonX: 200,
        groundY: 0,
        worldWidth: 2000,
        worldHeight: 1000
    };
    
    // Клавиши
    let keys = {};
    
    // === ИНИЦИАЛИЗАЦИЯ ===
    function init() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        minimap.width = 200;
        minimap.height = 120;
        gameState.groundY = gameState.worldHeight - 100;
        
        // Центрируем камеру на пушке
        camera.x = 0;
        camera.y = 0;
        
        createBuildings();
        randomizeWind();
        gameLoop();
        
        console.log('✅ Игра готова!');
    }
    
    // Создание зданий (ОЧЕНЬ ПРОСТОЕ)
    function createBuildings() {
        gameState.buildings = [];
        gameState.destroyed = 0;
        
        for (let i = 0; i < 8; i++) {
            const width = 120;
            const height = 150 + Math.random() * 150;
            const x = 500 + i * 200;
            const y = gameState.groundY - height;
            
            // Здание = массив блоков
            const blocks = [];
            const blockSize = 40;
            const cols = Math.floor(width / blockSize);
            const rows = Math.floor(height / blockSize);
            
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    blocks.push({
                        x: x + c * blockSize,
                        y: y + r * blockSize,
                        w: blockSize,
                        h: blockSize,
                        alive: true,
                        color: `hsl(${200 + Math.random() * 40}, 60%, 50%)`
                    });
                }
            }
            
            gameState.buildings.push({
                x, y, width, height,
                blocks: blocks,
                totalBlocks: blocks.length,
                aliveBlocks: blocks.length
            });
        }
        
        console.log(`🏢 Создано зданий: ${gameState.buildings.length}`);
    }
    
    // === СНАРЯД ===
    function createProjectile() {
        const ammo = AMMO_TYPES[gameState.ammo];
        const angleRad = gameState.angle * Math.PI / 180;
        const speed = gameState.power * 0.5;
        
        return {
            x: gameState.cannonX,
            y: gameState.groundY - 60,
            vx: Math.cos(angleRad) * speed,
            vy: -Math.sin(angleRad) * speed,
            radius: ammo.radius,
            color: ammo.color,
            damage: ammo.damage,
            blastRadius: ammo.blastRadius,
            active: true,
            trail: [],
            time: 0,
            maxHeight: 0,
            startX: gameState.cannonX
        };
    }
    
    // Обновление снаряда
    function updateProjectile(proj) {
        if (!proj.active) return;
        
        // След
        if (proj.time % 3 === 0) {
            proj.trail.push({ x: proj.x, y: proj.y });
            if (proj.trail.length > 100) proj.trail.shift();
        }
        
        // Физика
        proj.vy += GRAVITY;
        proj.vx += gameState.wind * WIND_EFFECT;
        proj.vx *= AIR_RESISTANCE;
        proj.vy *= AIR_RESISTANCE;
        
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.time++;
        
        // Макс высота
        const h = gameState.groundY - proj.y;
        if (h > proj.maxHeight) proj.maxHeight = h;
        
        // Статистика
        rangeDisplay.textContent = Math.floor(proj.x - proj.startX);
        heightDisplay.textContent = Math.floor(proj.maxHeight);
        flightTimeEl.textContent = (proj.time / 60).toFixed(1);
        
        // Земля
        if (proj.y + proj.radius >= gameState.groundY) {
            explode(proj.x, gameState.groundY, proj);
            return;
        }
        
        // Границы
        if (proj.x > gameState.worldWidth || proj.x < 0) {
            proj.active = false;
            endTurn();
            return;
        }
        
        // Столкновения с блоками
        checkBlockCollisions(proj);
    }
    
    // Проверка столкновений с блоками
    function checkBlockCollisions(proj) {
        if (!proj.active) return;
        
        for (const building of gameState.buildings) {
            for (const block of building.blocks) {
                if (!block.alive) continue;
                
                // Простая проверка круг-прямоугольник
                const closestX = Math.max(block.x, Math.min(proj.x, block.x + block.w));
                const closestY = Math.max(block.y, Math.min(proj.y, block.y + block.h));
                const dx = proj.x - closestX;
                const dy = proj.y - closestY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < proj.radius) {
                    explode(proj.x, proj.y, proj);
                    return;
                }
            }
        }
    }
    
    // Взрыв
    function explode(x, y, proj) {
        console.log(`💥 Взрыв в ${Math.floor(x)}, ${Math.floor(y)}`);
        
        proj.active = false;
        gameState.hits++;
        hitsCountEl.textContent = gameState.hits;
        
        // Создаём взрыв
        gameState.explosions.push({
            x: x,
            y: y,
            radius: 10,
            maxRadius: proj.blastRadius,
            life: 1,
            color: proj.color
        });
        
        // Частицы
        for (let i = 0; i < 30; i++) {
            gameState.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                size: 3 + Math.random() * 5,
                color: proj.color,
                life: 1
            });
        }
        
        // Урон блокам
        let blocksDestroyed = 0;
        for (const building of gameState.buildings) {
            for (const block of building.blocks) {
                if (!block.alive) continue;
                
                const blockCx = block.x + block.w / 2;
                const blockCy = block.y + block.h / 2;
                const dx = x - blockCx;
                const dy = y - blockCy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < proj.blastRadius) {
                    block.alive = false;
                    building.aliveBlocks--;
                    blocksDestroyed++;
                    
                    // Обломки
                    for (let i = 0; i < 2; i++) {
                        gameState.particles.push({
                            x: blockCx,
                            y: blockCy,
                            vx: (Math.random() - 0.5) * 8,
                            vy: (Math.random() - 0.5) * 8,
                            size: 8 + Math.random() * 8,
                            color: block.color,
                            life: 1,
                            isDebris: true
                        });
                    }
                }
            }
            
            // Проверка разрушения здания
            if (building.aliveBlocks === 0 && building.totalBlocks > 0) {
                gameState.destroyed++;
                buildingsDestroyedEl.textContent = gameState.destroyed;
                showHitMessage('🏢 ЗДАНИЕ УНИЧТОЖЕНО!');
            }
        }
        
        console.log(`🧱 Разрушено блоков: ${blocksDestroyed}`);
        
        // Проверка победы
        checkWin();
        
        // Завершаем ход
        endTurn();
    }
    
    // Отрисовка снаряда
    function drawProjectile(proj) {
        if (!proj.active) return;
        
        // След
        for (let i = 0; i < proj.trail.length - 1; i++) {
            const alpha = i / proj.trail.length;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
            ctx.lineWidth = 3 + alpha * 5;
            ctx.moveTo(proj.trail[i].x, proj.trail[i].y);
            ctx.lineTo(proj.trail[i + 1].x, proj.trail[i + 1].y);
            ctx.stroke();
        }
        
        // Снаряд
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.shadowBlur = 20;
        ctx.shadowColor = proj.color;
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = proj.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // === ОТРИСОВКА ===
    function applyCamera() {
        ctx.save();
        ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
        ctx.scale(camera.zoom, camera.zoom);
    }
    
    function drawBackground() {
        // Небо
        const grad = ctx.createLinearGradient(0, 0, 0, gameState.worldHeight);
        grad.addColorStop(0, '#0a0a1a');
        grad.addColorStop(0.5, '#1a1a3a');
        grad.addColorStop(1, '#2a2a5a');
        ctx.fillStyle = grad;
        ctx.fillRect(camera.x, camera.y, canvas.width / camera.zoom, canvas.height / camera.zoom);
        
        // Звёзды
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 100; i++) {
            const x = (Math.sin(i * 123) * gameState.worldWidth + gameState.worldWidth) % gameState.worldWidth;
            const y = (Math.cos(i * 789) * gameState.worldHeight / 2) % (gameState.worldHeight / 2);
            ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
        
        // Земля
        ctx.fillStyle = '#1a3a1a';
        ctx.fillRect(0, gameState.groundY, gameState.worldWidth, gameState.worldHeight - gameState.groundY);
        ctx.fillStyle = '#2a5a2a';
        ctx.fillRect(0, gameState.groundY, gameState.worldWidth, 15);
    }
    
    function drawCannon() {
        const cx = gameState.cannonX;
        const cy = gameState.groundY - 60;
        
        // Колесо
        ctx.strokeStyle = '#6a6a8a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy + 20, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // Основа
        ctx.fillStyle = '#4a4a6a';
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // Ствол
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-gameState.angle * Math.PI / 180);
        ctx.fillStyle = '#5a5a7a';
        ctx.fillRect(0, -12, 80, 24);
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(80, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    function drawBuildings() {
        for (const building of gameState.buildings) {
            for (const block of building.blocks) {
                if (!block.alive) continue;
                
                ctx.fillStyle = block.color;
                ctx.fillRect(block.x, block.y, block.w, block.h);
                
                // Окна
                ctx.fillStyle = 'rgba(255, 255, 150, 0.3)';
                ctx.fillRect(block.x + 8, block.y + 8, block.w - 16, block.h - 16);
                
                // Контур
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(block.x, block.y, block.w, block.h);
            }
        }
    }
    
    function drawTrajectory() {
        if (gameState.isFiring) return;
        
        const angleRad = gameState.angle * Math.PI / 180;
        const speed = gameState.power * 0.5;
        let x = gameState.cannonX;
        let y = gameState.groundY - 60;
        let vx = Math.cos(angleRad) * speed;
        let vy = -Math.sin(angleRad) * speed;
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.moveTo(x, y);
        
        for (let i = 0; i < 150; i++) {
            vy += GRAVITY;
            vx += gameState.wind * WIND_EFFECT;
            x += vx;
            y += vy;
            ctx.lineTo(x, y);
            if (y > gameState.groundY || x > gameState.worldWidth) break;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    function drawWind() {
        const cx = gameState.cannonX + 150;
        const cy = 150;
        const len = Math.abs(gameState.wind) * 2;
        
        ctx.strokeStyle = '#6495ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (gameState.wind !== 0) {
            const dir = gameState.wind > 0 ? 1 : -1;
            ctx.moveTo(cx - len * dir, cy);
            ctx.lineTo(cx + len * dir, cy);
        }
        ctx.stroke();
        
        ctx.fillStyle = '#6495ff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Ветер: ${gameState.wind}`, cx, cy - 10);
    }
    
    function drawParticles() {
        for (let i = gameState.particles.length - 1; i >= 0; i--) {
            const p = gameState.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= 0.02;
            
            if (p.isDebris && p.y > gameState.groundY) {
                p.y = gameState.groundY;
                p.vy *= -0.3;
                p.vx *= 0.8;
            }
            
            if (p.life <= 0) {
                gameState.particles.splice(i, 1);
                continue;
            }
            
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            if (p.isDebris) {
                ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            } else {
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }
    
    function drawExplosions() {
        for (let i = gameState.explosions.length - 1; i >= 0; i--) {
            const e = gameState.explosions[i];
            e.radius += 5;
            e.life -= 0.05;
            
            if (e.life <= 0) {
                gameState.explosions.splice(i, 1);
                continue;
            }
            
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 150, 50, ${e.life})`;
            ctx.fill();
        }
    }
    
    function drawMinimap() {
        minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        minimapCtx.fillRect(0, 0, minimap.width, minimap.height);
        
        const scaleX = minimap.width / gameState.worldWidth;
        const scaleY = minimap.height / gameState.worldHeight;
        
        // Здания
        for (const b of gameState.buildings) {
            minimapCtx.fillStyle = b.aliveBlocks > 0 ? '#4a6a8a' : '#333';
            minimapCtx.fillRect(b.x * scaleX, b.y * scaleY, b.width * scaleX, b.height * scaleY);
        }
        
        // Пушка
        minimapCtx.fillStyle = '#00ff88';
        minimapCtx.beginPath();
        minimapCtx.arc(gameState.cannonX * scaleX, gameState.groundY * scaleY, 5, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Снаряд
        if (gameState.projectile && gameState.projectile.active) {
            minimapCtx.fillStyle = '#ff4757';
            minimapCtx.beginPath();
            minimapCtx.arc(gameState.projectile.x * scaleX, gameState.projectile.y * scaleY, 4, 0, Math.PI * 2);
            minimapCtx.fill();
        }
    }
    
    // === ИГРОВАЯ ЛОГИКА ===
    function fire() {
        if (gameState.isFiring) {
            console.log('⚠️ Уже стреляем!');
            return;
        }
        
        console.log('🔥 ВЫСТРЕЛ!');
        gameState.isFiring = true;
        gameState.shots++;
        shotsCountEl.textContent = gameState.shots;
        fireBtn.disabled = true;
        
        gameState.projectile = createProjectile();
    }
    
    function endTurn() {
        console.log('🔄 Конец хода');
        gameState.projectile = null;
        gameState.isFiring = false;
        fireBtn.disabled = false;
        randomizeWind();
    }
    
    function randomizeWind() {
        gameState.wind = Math.floor((Math.random() - 0.5) * 60);
        windValueText.textContent = gameState.wind;
        windDirection.textContent = gameState.wind > 0 ? '→' : gameState.wind < 0 ? '←' : '↔';
    }
    
    function showHitMessage(text) {
        hitMessage.textContent = text;
        hitMessage.classList.add('active');
        setTimeout(() => hitMessage.classList.remove('active'), 1500);
    }
    
    function checkWin() {
        const allDestroyed = gameState.buildings.every(b => b.aliveBlocks === 0);
        if (allDestroyed) {
            setTimeout(() => {
                gameOverScreen.classList.add('active');
                gameOverStats.innerHTML = `
                    Выстрелов: ${gameState.shots}<br>
                    Попаданий: ${gameState.hits}<br>
                    Разрушено зданий: ${gameState.destroyed}
                `;
            }, 1000);
        }
    }
    
    function resetGame() {
        console.log('🔄 Сброс игры');
        gameState.projectile = null;
        gameState.isFiring = false;
        gameState.shots = 0;
        gameState.hits = 0;
        gameState.destroyed = 0;
        
        fireBtn.disabled = false;
        shotsCountEl.textContent = '0';
        hitsCountEl.textContent = '0';
        buildingsDestroyedEl.textContent = '0';
        rangeDisplay.textContent = '0';
        heightDisplay.textContent = '0';
        flightTimeEl.textContent = '0';
        
        gameOverScreen.classList.remove('active');
        
        createBuildings();
        randomizeWind();
    }
    
    // === КАМЕРА ===
    function updateCamera() {
        if (keys.w || keys.ArrowUp) camera.y -= 10;
        if (keys.s || keys.ArrowDown) camera.y += 10;
        if (keys.a || keys.ArrowLeft) camera.x -= 10;
        if (keys.d || keys.ArrowRight) camera.x += 10;
        
        camera.x = Math.max(0, Math.min(camera.x, gameState.worldWidth - canvas.width / camera.zoom));
        camera.y = Math.max(0, Math.min(camera.y, gameState.worldHeight - canvas.height / camera.zoom));
    }
    
    // === ГЛАВНЫЙ ЦИКЛ ===
    function gameLoop() {
        try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            updateCamera();
            applyCamera();
            
            drawBackground();
            drawBuildings();
            drawCannon();
            drawWind();
            drawTrajectory();
            
            if (gameState.projectile && gameState.projectile.active) {
                updateProjectile(gameState.projectile);
                drawProjectile(gameState.projectile);
            }
            
            ctx.restore();
            ctx.save();
            applyCamera();
            
            drawParticles();
            drawExplosions();
            
            ctx.restore();
            drawMinimap();
            
        } catch (error) {
            console.error('❌ Ошибка в игровом цикле:', error);
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    // === СОБЫТИЯ ===
    angleSlider.addEventListener('input', (e) => {
        gameState.angle = parseInt(e.target.value);
        angleValue.textContent = gameState.angle;
    });
    
    powerSlider.addEventListener('input', (e) => {
        gameState.power = parseInt(e.target.value);
        powerValue.textContent = gameState.power;
    });
    
    ammoType.addEventListener('change', (e) => {
        gameState.ammo = e.target.value;
        console.log(`🔫 Снаряд: ${gameState.ammo}`);
    });
    
    fireBtn.addEventListener('click', fire);
    resetBtn.addEventListener('click', resetGame);
    restartBtn.addEventListener('click', resetGame);
    
    // Клавиатура
    window.addEventListener('keydown', (e) => { keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });
    
    // Зум
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camera.zoom += e.deltaY > 0 ? -0.05 : 0.05;
        camera.zoom = Math.max(0.3, Math.min(2, camera.zoom));
    });
    
    // Перетаскивание камеры
    let isDragging = false;
    let lastX = 0, lastY = 0;
    
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1 || e.button === 2) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            camera.x -= (e.clientX - lastX) / camera.zoom;
            camera.y -= (e.clientY - lastY) / camera.zoom;
            lastX = e.clientX;
            lastY = e.clientY;
        }
    });
    
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    window.addEventListener('resize', init);
    
    // Запуск
    init();
    
    console.log('%c🎯 АРТИЛЛЕРИЯ ГОТОВА!', 'font-size: 24px; color: #6495ff; font-weight: bold;');
    console.log('WASD — камера | Колесо — зум | ОГОНЬ — выстрел');
    
});