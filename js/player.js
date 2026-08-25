const PLAYER_SAVE_KEY = 'auto_battler_save_data';

// Dữ liệu người chơi mặc định
const DEFAULT_PLAYER_DATA = {
    level: 1,
    exp: 0,
    diamonds: 300,
    coins: 1000,
    vpnc: 1000,
    vntb: 2,
    owned_characters: {
        "kangu": { level: 1 },
        "meganer": { level: 1 },
        "jaco": { level: 1 }
    },
    formation: ["kangu", "meganer", "jaco"], // Vị trí 1, 2, 3
    campaign_progress: {
        chapter: 1,
        stage: 1
    },
    redeemed_codes: [],
    last_login: null
};

let playerData = {};

function loadPlayerData() {
    const savedData = localStorage.getItem(PLAYER_SAVE_KEY);
    if (savedData) {
        try {
            playerData = JSON.parse(savedData);
            // Cập nhật thêm các trường mới nếu default có mà save cũ không có
            playerData = { ...DEFAULT_PLAYER_DATA, ...playerData };
        } catch (e) {
            console.error("Lỗi khi đọc save data, tải dữ liệu mặc định.", e);
            playerData = JSON.parse(JSON.stringify(DEFAULT_PLAYER_DATA));
        }
    } else {
        playerData = JSON.parse(JSON.stringify(DEFAULT_PLAYER_DATA));
    }
}

function savePlayerData() {
    localStorage.setItem(PLAYER_SAVE_KEY, JSON.stringify(playerData));
}

// Hàm hỗ trợ
function addCurrency(type, amount) {
    if(playerData[type] !== undefined) {
        playerData[type] += amount;
        savePlayerData();
    }
}

function consumeCurrency(type, amount) {
    if(playerData[type] !== undefined && playerData[type] >= amount) {
        playerData[type] -= amount;
        savePlayerData();
        return true;
    }
    return false;
}

function gainExp(amount) {
    playerData.exp += amount;
    let nextLevelExp = getPlayerExpRequired(playerData.level);
    
    while(playerData.exp >= nextLevelExp && playerData.level < 150) {
        playerData.exp -= nextLevelExp;
        playerData.level++;
        nextLevelExp = getPlayerExpRequired(playerData.level);
    }
    savePlayerData();
}

function getPlayerExpRequired(level) {
    return Math.floor(100 * Math.pow(1.1, level - 1));
}

// Khởi tạo
loadPlayerData();
