// Dữ liệu gốc của các nhân vật
const CHARACTERS_DATA = {
    "kangu": {
        id: "kangu",
        name: "Kangu",
        role: "DEF",
        base_hp: 150000000,
        base_atk: 13275000,
        base_def: 6400,
        base_spd: 145,
        max_en: 4,
        description: "Nhân vật phòng thủ cao, kỹ năng giảm khả năng hồi phục của địch."
    },
    "meganer": {
        id: "meganer",
        name: "Mega Ner",
        role: "ATK",
        base_hp: 220000000, // Theo yêu cầu, HP Mega Ner cao hơn nhưng là role ATK
        base_atk: 14175000,
        base_def: 1900,
        base_spd: 150,
        max_en: 5,
        description: "Nhân vật tấn công mạnh mẽ, sát thương diện rộng."
    },
    "jaco": {
        id: "jaco",
        name: "Jaco",
        role: "SKL",
        base_hp: 190000000,
        base_atk: 11475000,
        base_def: 3200,
        base_spd: 155,
        max_en: 4.5,
        description: "Hỗ trợ tuyệt vời, có khả năng hồi máu cho đồng đội."
    }
};

// Hàm tính toán chỉ số nhân vật theo level
function calculateStats(charId, level) {
    const base = CHARACTERS_DATA[charId];
    if (!base) return null;
    
    // Tăng ~1% mỗi level (theo cấp số nhân để scale tốt về sau, hoặc cấp số cộng tuỳ chọn. Dùng (1 + 0.01 * (level - 1)))
    const multiplier = 1 + 0.01 * (level - 1);
    
    return {
        hp: Math.floor(base.base_hp * multiplier),
        atk: Math.floor(base.base_atk * multiplier),
        def: Math.floor(base.base_def * multiplier),
        spd: base.base_spd, // Tốc độ thường không tăng theo level hoặc tăng rất ít
        max_en: base.max_en
    };
}

// Hàm tính lượng VPNC cần để nâng cấp
function getUpgradeCost(currentLevel) {
    const baseCost = 50; // VPNC cơ bản
    // Tăng ~4% mỗi level
    return Math.floor(baseCost * Math.pow(1.04, currentLevel - 1));
}
