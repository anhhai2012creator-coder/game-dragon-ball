// Hàm cập nhật ngày giờ sự kiện
function updateEventTime() {
    const eventDateEl = document.getElementById("event-date");
    if (!eventDateEl) return;
    setInterval(() => {
        const now = new Date();
        const dateString = now.toLocaleDateString("vi-VN");
        const timeString = now.toLocaleTimeString("vi-VN");
        eventDateEl.innerHTML = `<strong>Thời gian hiện tại:</strong> ${dateString} ${timeString}`;
    }, 1000);
}

// Hàm khởi tạo Sự kiện (Giftcode)
function initEventsTab() {
    const btnRedeem = document.getElementById("btn-redeem-code");
    const inputCode = document.getElementById("giftcode-input");
    const msgCode = document.getElementById("giftcode-message");

    if (btnRedeem) {
        btnRedeem.addEventListener("click", () => {
            const code = inputCode.value.trim().toUpperCase();
            if (code === "CODETUAN001") {
                if (!playerData.redeemed_codes.includes(code)) {
                    addCurrency("diamonds", 400);
                    playerData.redeemed_codes.push(code);
                    savePlayerData();
                    updateTopBar();
                    msgCode.style.color = "#2ecc71"; // Xanh
                    msgCode.innerText = "Đổi code thành công! Bạn nhận được 400 kim cương.";
                } else {
                    msgCode.style.color = "#e74c3c"; // Đỏ
                    msgCode.innerText = "Giftcode này đã được sử dụng.";
                }
            } else {
                msgCode.style.color = "#e74c3c";
                msgCode.innerText = "Giftcode không hợp lệ hoặc đã hết hạn.";
            }
            inputCode.value = "";
        });
    }
}

// Hàm khởi tạo Triệu hồi (Gacha)
function initSummonTab() {
    // Chuyển tab trong Summon
    const btnDailyTab = document.getElementById("btn-summon-daily");
    const btnGachaTab = document.getElementById("btn-summon-gacha");
    const contentDaily = document.getElementById("summon-daily-content");
    const contentGacha = document.getElementById("summon-gacha-content");

    if (btnDailyTab && btnGachaTab) {
        btnDailyTab.addEventListener("click", () => {
            btnDailyTab.classList.add("active");
            btnGachaTab.classList.remove("active");
            contentDaily.classList.remove("hidden");
            contentGacha.classList.add("hidden");
        });

        btnGachaTab.addEventListener("click", () => {
            btnGachaTab.classList.add("active");
            btnDailyTab.classList.remove("active");
            contentGacha.classList.remove("hidden");
            contentDaily.classList.add("hidden");
        });
    }

    // Xử lý Đăng nhập hàng ngày
    const btnDailyLogin = document.getElementById("btn-daily-login");
    const msgDaily = document.getElementById("daily-login-msg");
    if (btnDailyLogin) {
        btnDailyLogin.addEventListener("click", () => {
            const today = new Date().toLocaleDateString("vi-VN");
            if (playerData.last_login !== today) {
                // Quà: 50 KC, 200 xu, 50 VPNC
                addCurrency("diamonds", 50);
                addCurrency("coins", 200);
                addCurrency("vpnc", 50);
                playerData.last_login = today;
                savePlayerData();
                updateTopBar();
                msgDaily.style.color = "#2ecc71";
                msgDaily.innerText = "Nhận quà thành công: 50 Kim cương, 200 Xu, 50 VPNC!";
            } else {
                msgDaily.style.color = "#e74c3c";
                msgDaily.innerText = "Bạn đã nhận quà hôm nay rồi, hãy quay lại vào ngày mai!";
            }
        });
    }

    // Xử lý Gacha
    const btnGacha1 = document.getElementById("btn-gacha-1");
    const gachaResult = document.getElementById("gacha-result");

    if (btnGacha1) {
        btnGacha1.addEventListener("click", () => {
            if (consumeCurrency("vntb", 1)) {
                updateTopBar();
                // Random quà (Tỉ lệ nhân vật rất thấp, chủ yếu ra tài nguyên)
                const rand = Math.random();
                let rewardText = "";
                
                if (rand < 0.05) { // 5% ra nhân vật
                    // Trong tương lai nếu có nhiều tướng hơn thì random, hiện tại user đã có 3 tướng.
                    // Tặng 500 VPNC bù nếu trúng "nhân vật" (vì đã có sẵn)
                    addCurrency("vpnc", 500);
                    rewardText = "Chúc mừng! Bạn quay trúng Mảnh Nhân Vật (Quy đổi thành 500 VPNC)";
                    gachaResult.style.color = "#f1c40f";
                } else if (rand < 0.4) { // 35% ra kim cương
                    const amt = Math.floor(Math.random() * 50) + 10;
                    addCurrency("diamonds", amt);
                    rewardText = `Nhận được ${amt} Kim cương 💎`;
                    gachaResult.style.color = "#3498db";
                } else if (rand < 0.7) { // 30% ra Xu
                    const amt = Math.floor(Math.random() * 500) + 100;
                    addCurrency("coins", amt);
                    rewardText = `Nhận được ${amt} Xu 🪙`;
                    gachaResult.style.color = "#ecf0f1";
                } else { // 30% ra VPNC
                    const amt = Math.floor(Math.random() * 100) + 50;
                    addCurrency("vpnc", amt);
                    rewardText = `Nhận được ${amt} VPNC 📜`;
                    gachaResult.style.color = "#e67e22";
                }
                
                updateTopBar();
                gachaResult.innerHTML = `<strong>Kết quả:</strong> ${rewardText}`;
            } else {
                gachaResult.style.color = "#e74c3c";
                gachaResult.innerText = "Không đủ Viên ngọc thần bí (VNTB)!";
            }
        });
    }
}
