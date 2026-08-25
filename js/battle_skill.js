// --- Hệ thống Kỹ Năng Nhân Vật ---
// Tách file battle_skills.js hoặc để chung trong battle.js. Ta đưa vào cuối battle.js.
// Helper Buff
function addBuff(char, buffName, duration, effectValue = 0) {
    let existing = char.buffs.find(b => b.name === buffName);
    if (existing) {
        existing.duration = duration;
        existing.value = effectValue;
    } else {
        char.buffs.push({ name: buffName, duration, value: effectValue });
    }
}

function hasBuff(char, buffName) {
    return char.buffs.some(b => b.name === buffName && b.duration > 0);
}

function removeBuff(char, buffName) {
    char.buffs = char.buffs.filter(b => b.name !== buffName);
}

function getBuffValue(char, buffName) {
    let b = char.buffs.find(b => b.name === buffName && b.duration > 0);
    return b ? b.value : 0;
}

// Tick buff duration
function tickBuffs(char) {
    char.buffs.forEach(b => b.duration--);
    char.buffs = char.buffs.filter(b => b.duration > 0);
}

// Hàm heal hỗ trợ
function healTarget(source, target, amount) {
    // Kangu debuff suy giảm hồi phục (giảm 40%)
    if (hasBuff(target, "kangu_heal_reduction")) {
        amount = amount * 0.6;
    }
    
    // Jaco passive 2: đồng đội dưới 50% HP nhận thêm 20% lượng heal TỪ JACO
    if (source.id === "jaco" && source.level >= 80 && (target.hp / target.maxHp) < 0.5) {
        amount = amount * 1.2;
    }
    
    // Jaco passive 3: đồng đội có dấu "HP" x3 (hiện tại tính gộp cho dễ hoặc đếm)
    let hpMarks = getBuffValue(target, "jaco_hp_mark");
    if (source.id === "jaco" && hpMarks >= 3) {
        amount = amount * 1.1; // tăng 10%
    }

    target.hp += Math.floor(amount);
    if (target.hp > target.maxHp) target.hp = target.maxHp;
    logBattle(`<span class='heal'>${target.name} được hồi ${formatNumber(amount)} HP.</span>`);
}

function getDamageMultiplier(actor) {
    let multi = 1.0;
    
    // Kangu Bị động 1: Mỗi 7% HP mất đi, ST tăng 1% (lv 50)
    if (actor.id === "kangu" && actor.level >= 50) {
        let hpLostPercent = 100 - ((actor.hp / actor.maxHp) * 100);
        let bonusStacks = Math.floor(hpLostPercent / 7);
        multi += bonusStacks * 0.01;
    }
    
    // Mega Ner Bị động 3: Dưới 20% HP tăng 10% ST
    if (actor.id === "meganer" && (actor.hp / actor.maxHp) < 0.2) {
        multi += 0.10;
    }

    // Mega Ner Bị động 2: Song Bích. Nếu có đồng đội có Song Bích thì tăng 20% ST
    if (hasBuff(actor, "song_bich")) {
        let allyWithSongBich = battleState[actor.team === 'player' ? 'playerTeam' : 'enemyTeam'].find(c => c !== actor && !c.isDead && hasBuff(c, "song_bich"));
        if (allyWithSongBich) {
            multi += 0.20;
        }
    }
    
    // Buff tăng ST từ kỹ năng (Mega Ner, Jaco...)
    let dmgBuff = getBuffValue(actor, "dmg_up");
    if (dmgBuff > 0) multi += dmgBuff;
    
    return multi;
}

// Xử lý nạp năng lượng an toàn
function addEn(actor, amount) {
    actor.en += amount;
    if (actor.en > actor.maxEn) actor.en = actor.maxEn;
}

// Bị động đầu trận
function triggerStartOfBattlePassives() {
    let allChars = [...battleState.playerTeam, ...battleState.enemyTeam];
    allChars.forEach(actor => {
        if (actor.id === "meganer") {
            // Mega Ner Bị động 1 (lv 50): Đầu trận nhận sẵn 2 en
            if (actor.level >= 50) {
                addEn(actor, 2);
                logBattle(`${actor.name} kích hoạt bị động đầu trận: Nhận 2 Năng lượng!`);
            }
            // Mega Ner Bị động 2 (lv 80): Nhận hiệu ứng "Song bích"
            if (actor.level >= 80) {
                addBuff(actor, "song_bich", 999); // Vô hạn tới hết trận
                logBattle(`${actor.name} nhận hiệu ứng [Song bích]!`);
            }
        }
    });
}

// Các hàm đánh thường
function executeCharacterBasicAttack(actor, target, alliesTeam, targetTeam) {
    let baseDmg = 0;
    let finalDmg = 0;
    const dmgMulti = getDamageMultiplier(actor);

    switch(actor.id) {
        case "kangu":
            // 85% ATK, hồi 1.7 en
            baseDmg = actor.atk * 0.85 * dmgMulti;
            finalDmg = calculateDamage(baseDmg, target.def);
            dealDamage(actor, target, finalDmg);
            addEn(actor, 1.7);
            logBattle(`${actor.name} đấm ${target.name}, gây <span class='damage'>${formatNumber(finalDmg)} ST</span>.`);
            
            // Bị động 2: 10% choáng 1 hiệp (mở khoá lv 80)
            if (actor.level >= 80 && Math.random() < 0.1) {
                addBuff(target, "stun", 1);
                logBattle(`${target.name} bị choáng 1 hiệp!`);
            }
            break;

        case "meganer":
            // 95% ATK, Đánh diện rộng, hồi 1.4 en
            logBattle(`${actor.name} tung Nộ diện rộng!`);
            targetTeam.forEach(t => {
                if (!t.isDead) {
                    baseDmg = actor.atk * 0.95 * dmgMulti;
                    finalDmg = calculateDamage(baseDmg, t.def);
                    dealDamage(actor, t, finalDmg);
                    logBattle(`=> Gây <span class='damage'>${formatNumber(finalDmg)} ST</span> lên ${t.name}.`);
                }
            });
            addEn(actor, 1.4);
            
            // Mega Ner (lv150 mở khoá kỹ năng chủ động): +8% ST gây ra 1 hiệp sau khi đánh thường.
            if (actor.level >= 150) {
                addBuff(actor, "dmg_up", 1, 0.08); // 1 hiệp, 8%
            }
            break;

        case "jaco":
            // 88% ATK lên 1 kẻ địch, hồi 1.2 en
            baseDmg = actor.atk * 0.88 * dmgMulti;
            finalDmg = calculateDamage(baseDmg, target.def);
            dealDamage(actor, target, finalDmg);
            addEn(actor, 1.2);
            logBattle(`${actor.name} đánh ${target.name}, gây <span class='damage'>${formatNumber(finalDmg)} ST</span>.`);
            
            // Đánh dấu 1 hiệu ứng "HP" lên đồng đội ít HP nhất (max 3)
            let lowestHpAlly = alliesTeam.filter(a => !a.isDead).sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp))[0];
            if (lowestHpAlly) {
                let marks = getBuffValue(lowestHpAlly, "jaco_hp_mark") || 0;
                if (marks < 3) {
                    addBuff(lowestHpAlly, "jaco_hp_mark", 999, marks + 1); // thời gian vô hạn tới hết trận
                    logBattle(`${lowestHpAlly.name} nhận 1 dấu [HP] từ Jaco (Đang có ${marks+1}/3).`);
                }
            }
            break;
            
        default:
            // Bot thường
            baseDmg = actor.atk * 1.0 * dmgMulti;
            finalDmg = calculateDamage(baseDmg, target.def);
            dealDamage(actor, target, finalDmg);
            addEn(actor, 1);
            logBattle(`${actor.name} tấn công ${target.name}, gây <span class='damage'>${formatNumber(finalDmg)} ST</span>.`);
            break;
    }
    
    tickBuffs(actor);
}

// Các hàm dùng kỹ năng
function executeCharacterSkill(actor, target, alliesTeam, targetTeam) {
    let baseDmg = 0;
    let finalDmg = 0;
    const dmgMulti = getDamageMultiplier(actor);

    logBattle(`<span class='skill'>[KỸ NĂNG] ${actor.name} xuất chiêu!</span>`);

    switch(actor.id) {
        case "kangu":
            // 200% ATK + 5% HP còn lại của địch. Debuff giảm 40% hồi phục
            // Lv 150 mở khoá: thêm 30% ATK cho skill (tức là 230% ATK)
            let atkRatio = actor.level >= 150 ? 2.3 : 2.0;
            
            const castKanguSkill = (t, isExtra) => {
                let dmg = (actor.atk * atkRatio) + (t.hp * 0.05);
                dmg = dmg * dmgMulti;
                if (isExtra) dmg *= 0.75; // Tia thêm gây 75%
                
                let fd = calculateDamage(dmg, t.def);
                dealDamage(actor, t, fd);
                addBuff(t, "kangu_heal_reduction", 2); // giả sử 2 hiệp
                logBattle(`=> Kangu bắn tia năng lượng gây <span class='damage'>${formatNumber(fd)} ST</span> lên ${t.name}! [Giảm 40% hồi máu]`);
            };

            castKanguSkill(target, false);
            
            // Kỹ năng bị động 3 (lv 100): 75% tung ra thêm 1 tia
            if (actor.level >= 100 && Math.random() < 0.75) {
                logBattle(`=> Kangu kích hoạt bị động, bắn thêm 1 tia!`);
                castKanguSkill(target, true);
            }
            break;

        case "meganer":
            // 280% ATK, tăng 15% ST bản thân 1 hiệp
            baseDmg = actor.atk * 2.8 * dmgMulti;
            finalDmg = calculateDamage(baseDmg, target.def);
            dealDamage(actor, target, finalDmg);
            logBattle(`=> Mega Ner dịch chuyển chém ${target.name}, gây <span class='damage'>${formatNumber(finalDmg)} ST</span>!`);
            
            addBuff(actor, "dmg_up", 1, 0.15);
            logBattle(`${actor.name} được tăng 15% Sát thương trong hiệp tới.`);
            break;

        case "jaco":
            // Đánh thường cường hoá 105% ATK. Hồi máu 150% ATK (lv 150 -> 175%)
            baseDmg = actor.atk * 1.05 * dmgMulti;
            finalDmg = calculateDamage(baseDmg, target.def);
            dealDamage(actor, target, finalDmg);
            logBattle(`=> Jaco đánh cường hoá vào ${target.name}, gây <span class='damage'>${formatNumber(finalDmg)} ST</span>.`);
            
            let healRatio = actor.level >= 150 ? 1.75 : 1.5;
            let healAmt = actor.atk * healRatio;
            
            alliesTeam.filter(a => !a.isDead).forEach(a => healTarget(actor, a, healAmt));
            
            // Bị động 1 (lv 50): 1 trong 2 đồng đội nhận 18% ST 1 hiệp
            if (actor.level >= 50) {
                let otherAllies = alliesTeam.filter(a => a !== actor && !a.isDead);
                if (otherAllies.length > 0) {
                    let randomAlly = otherAllies[Math.floor(Math.random() * otherAllies.length)];
                    addBuff(randomAlly, "dmg_up", 1, 0.18);
                    logBattle(`${randomAlly.name} nhận được 18% ST từ Jaco trong 1 hiệp.`);
                }
            }
            break;
            
        default:
            // Bot thường skill 200% ATK
            baseDmg = actor.atk * 2.0 * dmgMulti;
            finalDmg = calculateDamage(baseDmg, target.def);
            dealDamage(actor, target, finalDmg);
            logBattle(`=> ${actor.name} dùng skill lên ${target.name}, gây <span class='damage'>${formatNumber(finalDmg)} ST</span>.`);
            break;
    }
    
    tickBuffs(actor);
}
