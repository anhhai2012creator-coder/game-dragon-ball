// Quản lý trạng thái trận đấu
let battleState = {
    isActive: false,
    playerTeam: [], // Danh sách object nhân vật trong trận
    enemyTeam: [],
    turnQueue: [], // Hàng đợi thứ tự đánh
    timer: null,
    onBattleEnd: null // Callback
};

// Hàm khởi tạo trận đấu
function startBattle(playerTeamIds, enemyTeamData, onComplete) {
    battleState.isActive = true;
    battleState.onBattleEnd = onComplete;
    document.getElementById("battle-log").innerHTML = "";
    document.getElementById("btn-end-battle").classList.add("hidden");

    // Khởi tạo Player Team
    battleState.playerTeam = playerTeamIds.map((charId, index) => {
        if (!charId) return null;
        const base = CHARACTERS_DATA[charId];
        const pData = playerData.owned_characters[charId];
        const stats = calculateStats(charId, pData.level);
        return createBattleCharacter(charId, base.name, stats, "player", index, pData.level);
    }).filter(c => c !== null);

    // Khởi tạo Enemy Team
    battleState.enemyTeam = enemyTeamData.map((enemy, index) => {
        if (!enemy) return null;
        const stats = calculateStats(enemy.id, enemy.level);
        // Boss/Bot có thể có multiplier thêm tuỳ vào logic ải
        if (enemy.multiplier) {
            stats.hp = Math.floor(stats.hp * enemy.multiplier);
            stats.atk = Math.floor(stats.atk * enemy.multiplier);
        }
        return createBattleCharacter(enemy.id, enemy.name, stats, "enemy", index, enemy.level);
    }).filter(c => c !== null);

    logBattle("Trận đấu bắt đầu!");
    renderBattleArena();

    // Determine who goes first (Random)
    const playerGoesFirst = Math.random() < 0.5;
    logBattle(playerGoesFirst ? "Đội bạn được quyền đi trước!" : "Đội địch được quyền đi trước!");

    // Build Turn Queue based on Team Order, then SPD inside the team
    buildTurnQueue(playerGoesFirst);

    // Kích hoạt Bị động Đầu trận (Start of Battle passives)
    triggerStartOfBattlePassives();

    // Bắt đầu vòng lặp chiến đấu: 1 giây 1 hành động
    battleState.timer = setInterval(executeNextTurn, 1000);
}

function createBattleCharacter(id, name, stats, team, position, level) {
    return {
        id,
        name,
        team,
        position, // 0 = Hàng 1, 1 = Hàng 2, 2 = Hàng 3
        level,
        maxHp: stats.hp,
        hp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        spd: stats.spd,
        maxEn: stats.max_en,
        en: 0,
        isDead: false,
        buffs: [] // Array of active buffs/debuffs
    };
}

// Xây dựng hàng đợi theo yêu cầu: Hết tướng đội đi trước rồi mới tới đội sau.
// Trong một đội, tướng đánh theo thứ tự SPD cao -> thấp
function buildTurnQueue(playerFirst) {
    let pTeamSorted = [...battleState.playerTeam].filter(c => !c.isDead).sort((a, b) => b.spd - a.spd);
    let eTeamSorted = [...battleState.enemyTeam].filter(c => !c.isDead).sort((a, b) => b.spd - a.spd);
    
    if (playerFirst) {
        battleState.turnQueue = [...pTeamSorted, ...eTeamSorted];
    } else {
        battleState.turnQueue = [...eTeamSorted, ...pTeamSorted];
    }
}

// Xử lý 1 lượt đánh
function executeNextTurn() {
    if (!battleState.isActive) return;

    // Kiểm tra Win/Lose condition
    const isPlayerDead = battleState.playerTeam.every(c => c.isDead);
    const isEnemyDead = battleState.enemyTeam.every(c => c.isDead);

    if (isPlayerDead || isEnemyDead) {
        endBattle(isEnemyDead); // Win if enemy dead
        return;
    }

    // Nếu hàng đợi trống, build lại cho hiệp mới
    if (battleState.turnQueue.length === 0) {
        logBattle("--- Hiệp mới ---", "turn-info");
        // Random đi trước mỗi hiệp hay giữ nguyên? Yêu cầu ghi "Đầu trận random". Ở đây ta mặc định đội nào SPD tổng cao hơn đi trước ở các hiệp sau, hoặc random lại. Để đơn giản ta random mỗi hiệp hoặc set cứng player trước.
        buildTurnQueue(Math.random() < 0.5);
        
        // Cập nhật lại UI
        renderBattleArena();
        return;
    }

    const currentActor = battleState.turnQueue.shift();

    // Nếu char đã chết thì bỏ qua
    if (currentActor.isDead) {
        executeNextTurn(); // Đệ quy gọi ngay con tiếp theo
        return;
    }

    // Thực hiện hành động
    performAction(currentActor);
    
    // Render lại UI sau khi đánh
    renderBattleArena();
}

function performAction(actor) {
    const targetTeam = actor.team === "player" ? battleState.enemyTeam : battleState.playerTeam;
    const alliesTeam = actor.team === "player" ? battleState.playerTeam : battleState.enemyTeam;
    
    // Tìm mục tiêu mặc định (Hàng 1, nếu chết thì qua Hàng 2, Hàng 3)
    let target = targetTeam.find(c => !c.isDead);
    
    if (!target) return; // Không còn mục tiêu

    // Xử lý Buff/Debuff của Actor trước khi ra đòn (ví dụ: choáng, tăng ST...)
    if (hasBuff(actor, "stun")) {
        logBattle(`${actor.name} bị choáng, không thể hành động!`);
        removeBuff(actor, "stun");
        return;
    }

    let isSkill = (actor.en >= actor.maxEn);
    if (isSkill) {
        actor.en = 0; // Reset EN
        executeCharacterSkill(actor, target, alliesTeam, targetTeam);
    } else {
        executeCharacterBasicAttack(actor, target, alliesTeam, targetTeam);
    }
    
    // Check bị động sau hành động (như Jaco bị động 1)
    // Sẽ được gọi ngầm trong hàm executeCharacterSkill/BasicAttack
}

// Công thức tính sát thương: giảm ST = cứ 100 DEF giảm 0.1% ST
function calculateDamage(damage, def) {
    // def = 100 => giảm 0.1% => (1 - 0.001)
    // def = 1000 => giảm 1%
    // def = 6400 => giảm 6.4%
    let reducePercent = (def / 100) * 0.001; 
    if (reducePercent > 0.9) reducePercent = 0.9; // Cap giảm sát thương tối đa 90%
    
    let finalDmg = damage * (1 - reducePercent);
    return Math.floor(Math.max(1, finalDmg)); // Sát thương tối thiểu là 1
}

function dealDamage(source, target, amount) {
    target.hp -= amount;
    if (target.hp <= 0) {
        target.hp = 0;
        target.isDead = true;
        target.en = 0;
        logBattle(`☠️ ${target.name} đã bị hạ gục!`);
    }
}

function endBattle(isWin) {
    clearInterval(battleState.timer);
    battleState.isActive = false;
    
    if (isWin) {
        logBattle("🏆 CHIẾN THẮNG!");
    } else {
        logBattle("💀 THẤT BẠI!");
    }
    
    const btnEnd = document.getElementById("btn-end-battle");
    btnEnd.classList.remove("hidden");
    
    // Gỡ event cũ nếu có
    btnEnd.replaceWith(btnEnd.cloneNode(true));
    document.getElementById("btn-end-battle").addEventListener("click", () => {
        switchTab("tab-campaign");
        if (battleState.onBattleEnd) {
            battleState.onBattleEnd(isWin);
        }
    });
}

// UI Trận đấu
function logBattle(msg, cssClass = "") {
    const logEl = document.getElementById("battle-log");
    if (!logEl) return;
    const p = document.createElement("p");
    p.innerHTML = msg;
    if (cssClass) p.className = cssClass;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight; // Tự cuộn xuống cuối
}

function renderBattleArena() {
    const pTeamEl = document.getElementById("team-player");
    const eTeamEl = document.getElementById("team-enemy");
    if(!pTeamEl || !eTeamEl) return;

    pTeamEl.innerHTML = "";
    eTeamEl.innerHTML = "";

    battleState.playerTeam.forEach(char => pTeamEl.appendChild(createCharElement(char)));
    battleState.enemyTeam.forEach(char => eTeamEl.appendChild(createCharElement(char)));
}

function createCharElement(char) {
    const div = document.createElement("div");
    div.className = `battle-char ${char.isDead ? 'dead' : ''}`;
    
    const hpPercent = (char.hp / char.maxHp) * 100;
    const enPercent = (char.en / char.maxEn) * 100;

    div.innerHTML = `
        <div class="char-name">${char.name} (Hàng ${char.position + 1})</div>
        <div class="hp-bar-container"><div class="hp-bar" style="width: ${hpPercent}%"></div></div>
        <div style="font-size: 0.7em; text-align: right; margin-top: -5px; color: #fff;">${formatNumber(char.hp)} / ${formatNumber(char.maxHp)}</div>
        <div class="en-bar-container"><div class="en-bar" style="width: ${enPercent}%"></div></div>
    `;
    return div;
}
