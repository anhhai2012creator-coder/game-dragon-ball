document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo giao diện
    updateTopBar();
    
    // Xử lý Navigation giữa các tab
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-target");
            switchTab(targetId);
        });
    });

    updateEventTime();
    initEventsTab();
    initSummonTab();
    initRosterTab(); // Gọi hàm render danh sách
    initCampaignTab(); // Render đấu ải
});

function switchTab(tabId) {
    // Ẩn tất cả tab
    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
    });
    // Hiện tab được chọn
    const targetTab = document.getElementById(tabId);
    if(targetTab) {
        targetTab.classList.add("active");
    }
}

function updateTopBar() {
    document.getElementById("ui-player-level").innerText = playerData.level;
    document.getElementById("ui-player-exp").innerText = playerData.exp;
    document.getElementById("ui-player-max-exp").innerText = getPlayerExpRequired(playerData.level);
    
    document.getElementById("ui-diamonds").innerText = playerData.diamonds;
    document.getElementById("ui-coins").innerText = playerData.coins;
    document.getElementById("ui-vpnc").innerText = playerData.vpnc;
    document.getElementById("ui-vntb").innerText = playerData.vntb;
}

// Render tab Danh sách và Quản lý đội hình
function initRosterTab() {
    renderFormation();
    renderCharacterList();
}

// Format số tiền (rút gọn)
function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

function renderCharacterList() {
    const listEl = document.getElementById("character-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    for (const charId in playerData.owned_characters) {
        const charData = CHARACTERS_DATA[charId];
        const pChar = playerData.owned_characters[charId];
        const stats = calculateStats(charId, pChar.level);
        const upgradeCost = getUpgradeCost(pChar.level);

        const card = document.createElement("div");
        card.className = "char-card";
        
        card.innerHTML = `
            <h4>${charData.name} (Lv.${pChar.level})</h4>
            <div style="font-size: 0.8em; color: #3498db;">Vai trò: ${charData.role}</div>
            <div class="char-stats">
                HP: ${formatNumber(stats.hp)} <br>
                ATK: ${formatNumber(stats.atk)} <br>
                DEF: ${stats.def} <br>
                SPD: ${stats.spd} <br>
                EN: ${stats.max_en}
            </div>
            <button class="btn-upgrade" data-id="${charId}">Nâng cấp (-${upgradeCost} VPNC)</button>
            <button class="btn-form" data-id="${charId}">Đưa vào đội hình</button>
        `;

        listEl.appendChild(card);
    }

    // Gắn sự kiện cho nút nâng cấp
    document.querySelectorAll(".btn-upgrade").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.target.getAttribute("data-id");
            const lvl = playerData.owned_characters[id].level;
            if (lvl >= 250) {
                alert("Nhân vật đã đạt cấp tối đa (250)!");
                return;
            }
            const cost = getUpgradeCost(lvl);
            if (consumeCurrency("vpnc", cost)) {
                playerData.owned_characters[id].level++;
                savePlayerData();
                updateTopBar();
                renderCharacterList(); // Render lại để update chỉ số
            } else {
                alert("Không đủ VPNC!");
            }
        });
    });

    // Gắn sự kiện cho nút đưa vào đội hình
    document.querySelectorAll(".btn-form").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.target.getAttribute("data-id");
            if (playerData.formation.includes(id)) {
                alert("Tướng đã có trong đội hình!");
                return;
            }
            // Tìm slot trống
            let added = false;
            for (let i = 0; i < 3; i++) {
                if (playerData.formation[i] === null || playerData.formation[i] === undefined || playerData.formation[i] === "") {
                    playerData.formation[i] = id;
                    added = true;
                    break;
                }
            }
            if (!added) {
                alert("Đội hình đã đầy! Vui lòng tháo một tướng ra trước.");
            } else {
                savePlayerData();
                renderFormation();
            }
        });
    });
}

function renderFormation() {
    const formEl = document.getElementById("current-formation");
    if (!formEl) return;
    formEl.innerHTML = "";

    const positions = ["Hàng 1 (Tiền tuyến)", "Hàng 2 (Trung tuyến)", "Hàng 3 (Hậu phương)"];

    for (let i = 0; i < 3; i++) {
        const charId = playerData.formation[i];
        const slot = document.createElement("div");
        slot.className = "form-slot";
        
        let content = `<h5>${positions[i]}</h5>`;
        if (charId && CHARACTERS_DATA[charId]) {
            content += `<div class="slot-name">${CHARACTERS_DATA[charId].name}</div>`;
            content += `<div class="slot-actions"><button class="btn-remove-form" data-index="${i}">Bỏ ra</button></div>`;
        } else {
            content += `<div class="slot-name" style="color:#7f8c8d;">Trống</div>`;
        }
        
        slot.innerHTML = content;
        formEl.appendChild(slot);
    }

    document.querySelectorAll(".btn-remove-form").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = e.target.getAttribute("data-index");
            playerData.formation[idx] = null; // Set null để giữ vị trí index
            savePlayerData();
            renderFormation();
        });
    });
}
