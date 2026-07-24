# Screen Flow — horse_racing_react

Sơ đồ luồng màn hình (screen flow) dựa trên route thật trong `App.jsx`, logic
điều hướng sau đăng nhập trong `Login.jsx`, menu sidebar của từng layout
(`SpectatorLayout`, `OwnerLayout`, `JockeyLayout`, `DashboardLayout`) và các
lệnh `navigate()` trong từng trang.

Tách riêng theo từng vai trò để mỗi sơ đồ gọn, dễ paste từng cái một vào draw.io
(**Insert → Advanced → Mermaid**).

Quy ước dùng chung cho mọi sơ đồ bên dưới:
- Hình thoi bo tròn (stadium) = **màn hình hub** (dashboard/danh sách gốc của vai trò).
- Hình chữ nhật bo góc = màn hình thường.
- Nét đứt xám, không nhãn = điều hướng qua **sidebar** (luôn có sẵn), chỉ vẽ **một
  chiều từ hub ra** — chiều ngược lại hiểu ngầm vì sidebar luôn hiện.
- Nét liền có nhãn = điều hướng theo **hành động cụ thể** (click nút, submit...).

---

## 1. Public / Auth

```mermaid
flowchart TB
    HOME(["Home /"])
    LOGIN(["Login"])
    REGISTER["Register"]
    UPGRADE["Role Upgrade"]
    UNAUTH["Unauthorized"]

    HOME --> LOGIN
    HOME --> REGISTER
    REGISTER -->|"submit ok"| LOGIN
    LOGIN -->|"role-based redirect"| DASH["Dashboard theo vai trò (xem sơ đồ riêng)"]
    DASH -.->|"account menu"| UPGRADE
    UPGRADE -->|"approved"| DASH
    DASH -.->|"sai quyền truy cập"| UNAUTH

    classDef public fill:#eeeeee,stroke:#9e9e9e,color:#333333
    class HOME,LOGIN,REGISTER,UPGRADE,UNAUTH,DASH public
```

---

## 2. Spectator

```mermaid
flowchart TB
    SP_DASH(["Dashboard"])
    SP_RACES["Upcoming Races"]
    SP_BET["Place Bet"]
    SP_LIVE["Live Race"]
    SP_RESULT["Race Result"]
    SP_BETS["My Bets"]
    SP_WALLET["Wallet"]
    SP_PROFILE["My Profile"]

    SP_DASH -.-> SP_RACES
    SP_DASH -.-> SP_BETS
    SP_DASH -.-> SP_WALLET
    SP_DASH -.-> SP_PROFILE

    SP_RACES -->|"place bet"| SP_BET
    SP_RACES -->|"watch"| SP_LIVE
    SP_RACES -->|"see results"| SP_RESULT
    SP_BET -->|"back"| SP_RACES
    SP_LIVE -->|"race finished"| SP_RESULT

    SP_RACES -->|"quick bet (runner row)"| SP_BETSLIP["Bet Slip (modal)"]
    SP_RACES -->|"view horse / jockey"| SP_PERSON["Person Info (modal)"]
    SP_BET -->|"view horse / jockey"| SP_PERSON
    SP_WALLET -->|"deposit"| SP_DEPOSIT["Deposit (modal)"]
    SP_WALLET -->|"withdraw"| SP_WITHDRAW["Withdraw (modal)"]

    classDef spectator fill:#dbeafe,stroke:#3b82f6,color:#1e3a8a
    class SP_DASH,SP_RACES,SP_BET,SP_LIVE,SP_RESULT,SP_BETS,SP_WALLET,SP_PROFILE,SP_BETSLIP,SP_PERSON,SP_DEPOSIT,SP_WITHDRAW spectator
```

---

## 3. Owner

```mermaid
flowchart TB
    OW_DASH(["Dashboard"])
    OW_HORSES["My Horses"]
    OW_HORSEFORM["Horse Form"]
    OW_SCHEDULE["My Schedule"]
    OW_RACES["Available Races"]
    OW_REGISTER["Race Registration"]
    OW_LIVE["Live Race"]
    OW_RESULT["Race Result"]
    OW_EARNINGS["Earnings"]
    OW_WALLET["Wallet"]
    OW_PROFILE["My Profile"]

    OW_DASH -.-> OW_HORSES
    OW_DASH -.-> OW_SCHEDULE
    OW_DASH -.-> OW_RACES
    OW_DASH -.-> OW_EARNINGS
    OW_DASH -.-> OW_WALLET
    OW_DASH -.-> OW_PROFILE

    OW_HORSES -->|"add / edit"| OW_HORSEFORM
    OW_HORSEFORM -->|"save / cancel"| OW_HORSES
    OW_HORSES -->|"register horse"| OW_RACES
    OW_RACES -->|"register"| OW_REGISTER
    OW_REGISTER -->|"success"| OW_RACES
    OW_SCHEDULE -->|"watch"| OW_LIVE
    OW_LIVE -->|"race finished"| OW_RESULT

    OW_REGISTER -->|"choose horse"| OW_HORSESELECT["Select Horse (modal)"]
    OW_REGISTER -->|"choose jockey"| OW_JOCKEYSELECT["Select Jockey (modal)"]
    OW_SCHEDULE -->|"view jockey detail"| OW_JOCKEYDETAIL["Jockey Detail (modal)"]
    OW_WALLET -->|"deposit"| OW_DEPOSIT["Deposit (modal)"]
    OW_WALLET -->|"withdraw"| OW_WITHDRAW["Withdraw (modal)"]

    classDef owner fill:#dcfce7,stroke:#22c55e,color:#14532d
    class OW_DASH,OW_HORSES,OW_HORSEFORM,OW_SCHEDULE,OW_RACES,OW_REGISTER,OW_LIVE,OW_RESULT,OW_EARNINGS,OW_WALLET,OW_PROFILE,OW_HORSESELECT,OW_JOCKEYSELECT,OW_JOCKEYDETAIL,OW_DEPOSIT,OW_WITHDRAW owner
```

---

## 4. Jockey

```mermaid
flowchart TB
    JK_DASH(["Dashboard"])
    JK_REQUESTS["Race Requests"]
    JK_SCHEDULE["Schedule"]
    JK_HISTORY["Race History"]
    JK_WALLET["Wallet"]
    JK_PROFILE["My Profile"]
    JK_LIVE["Live Race"]
    JK_RESULT["Race Result"]

    JK_DASH -.-> JK_REQUESTS
    JK_DASH -.-> JK_SCHEDULE
    JK_DASH -.-> JK_HISTORY
    JK_DASH -.-> JK_WALLET
    JK_DASH -.-> JK_PROFILE

    JK_DASH -->|"watch live race"| JK_LIVE
    JK_SCHEDULE -->|"watch"| JK_LIVE
    JK_LIVE -->|"race finished"| JK_RESULT
    JK_HISTORY -->|"view result"| JK_RESULT

    JK_DASH -->|"view owner detail"| JK_OWNERDETAIL["Owner Detail (modal)"]
    JK_REQUESTS -->|"view horse detail"| JK_HORSEDETAIL["Horse Detail (modal)"]
    JK_REQUESTS -->|"view owner detail"| JK_OWNERDETAIL
    JK_WALLET -->|"deposit"| JK_DEPOSIT["Deposit (modal)"]
    JK_WALLET -->|"withdraw"| JK_WITHDRAW["Withdraw (modal)"]

    classDef jockey fill:#ffedd5,stroke:#f97316,color:#7c2d12
    class JK_DASH,JK_REQUESTS,JK_SCHEDULE,JK_HISTORY,JK_WALLET,JK_PROFILE,JK_LIVE,JK_RESULT,JK_OWNERDETAIL,JK_HORSEDETAIL,JK_DEPOSIT,JK_WITHDRAW jockey
```

---

## 5. Referee

```mermaid
flowchart TB
    RF_RACES(["Races"])
    RF_DETAIL["Race Detail + Report"]
    RF_LIVE["Live Race"]
    RF_RESULT["Race Result"]

    RF_RACES -->|"select race"| RF_DETAIL
    RF_DETAIL -->|"back"| RF_RACES
    RF_DETAIL -->|"watch"| RF_LIVE
    RF_DETAIL -->|"see results"| RF_RESULT

    RF_DETAIL -->|"edit report"| RF_EDITREPORT["Edit Report (modal)"]
    RF_EDITREPORT -->|"save / cancel"| RF_DETAIL

    classDef referee fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    class RF_RACES,RF_DETAIL,RF_LIVE,RF_RESULT,RF_EDITREPORT referee
```

---

## 6. Admin

```mermaid
flowchart TB
    AD_DASH(["Dashboard"])
    AD_ACCOUNTS["Accounts"]
    AD_UPGRADEDETAIL["Upgrade Request Detail (modal)"]
    AD_RACES["Races"]
    AD_RACEFORM["Race Create/Edit (modal)"]
    AD_SETRESULT["Set Result (modal)"]
    AD_COLLECTPOOL["Collect Pool (modal)"]
    AD_RACECOURSES["Racecourses"]
    AD_RACECOURSEFORM["Racecourse Create/Edit (modal)"]
    AD_REGISTRATIONS["Registrations"]
    AD_REGDETAIL["Registration Detail"]
    AD_REFEREES["Referee Assignment"]
    AD_REFEREE_REPORTS["Referee Reports"]
    AD_BETS["Bets"]
    AD_BETDETAIL["Bet Detail"]
    AD_TAKEOUT["Takeout Ledger"]
    AD_WITHDRAWALS["Withdrawals"]
    AD_PAYMENTS["Payments"]
    AD_CONFIG["Configuration"]
    AD_CONFIGFORM["Config Create/Edit (modal)"]

    AD_DASH -.-> AD_ACCOUNTS
    AD_DASH -.-> AD_RACES
    AD_DASH -.-> AD_RACECOURSES
    AD_DASH -.-> AD_REGISTRATIONS
    AD_DASH -.-> AD_REFEREES
    AD_DASH -.-> AD_REFEREE_REPORTS
    AD_DASH -.-> AD_BETS
    AD_DASH -.-> AD_TAKEOUT
    AD_DASH -.-> AD_WITHDRAWALS
    AD_DASH -.-> AD_PAYMENTS
    AD_DASH -.-> AD_CONFIG

    AD_BETS -->|"select race"| AD_BETDETAIL
    AD_RACES -->|"prize preview"| AD_BETDETAIL
    AD_ACCOUNTS -->|"view details"| AD_UPGRADEDETAIL
    AD_UPGRADEDETAIL -->|"close"| AD_ACCOUNTS
    AD_REGISTRATIONS -->|"select race"| AD_REGDETAIL
    AD_REGDETAIL -->|"back"| AD_REGISTRATIONS

    AD_RACES -->|"add / edit"| AD_RACEFORM
    AD_RACEFORM -->|"save / cancel"| AD_RACES
    AD_RACES -->|"set result"| AD_SETRESULT
    AD_SETRESULT -->|"confirm / cancel"| AD_RACES
    AD_RACES -->|"collect pool"| AD_COLLECTPOOL
    AD_COLLECTPOOL -->|"confirm / cancel"| AD_RACES

    AD_RACECOURSES -->|"add / edit"| AD_RACECOURSEFORM
    AD_RACECOURSEFORM -->|"save / cancel"| AD_RACECOURSES

    AD_CONFIG -->|"add / edit"| AD_CONFIGFORM
    AD_CONFIGFORM -->|"save / cancel"| AD_CONFIG

    classDef admin fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    class AD_DASH,AD_ACCOUNTS,AD_UPGRADEDETAIL,AD_RACES,AD_RACEFORM,AD_SETRESULT,AD_COLLECTPOOL,AD_RACECOURSES,AD_RACECOURSEFORM,AD_REGISTRATIONS,AD_REGDETAIL,AD_REFEREES,AD_REFEREE_REPORTS,AD_BETS,AD_BETDETAIL,AD_TAKEOUT,AD_WITHDRAWALS,AD_PAYMENTS,AD_CONFIG,AD_CONFIGFORM admin
```

---

## Danh sách route theo vai trò

| Vai trò | Path | Trang |
|---|---|---|
| Public | `/` | HomePage |
| Public | `/login` | Login |
| Public | `/register` | Register |
| Any (auth) | `/upgrade` | RoleUpgrade |
| Any (auth) | `/payment/cancel` | Payment Cancel |
| Spectator | `/spectator/dashboard` | Dashboard |
| Spectator | `/spectator/races` | Upcoming Races |
| Spectator | `/spectator/races/:raceId/bet` | Place Bet |
| Spectator | `/spectator/races/:raceId/live` | Live Race |
| Spectator | `/spectator/races/:raceId/results` | Race Result |
| Spectator | `/spectator/bets` | My Bets |
| Spectator | `/spectator/wallet` | Wallet |
| Spectator | `/spectator/profile` | My Profile |
| Owner | `/owner/dashboard` | Dashboard |
| Owner | `/owner/horses`, `/owner/horses/new`, `/owner/horses/:id/edit` | My Horses / Horse Form |
| Owner | `/owner/schedule` | My Schedule |
| Owner | `/owner/races`, `/owner/races/:raceId/register` | Available Races / Registration |
| Owner | `/owner/races/:raceId/live`, `/results` | Live Race / Result |
| Owner | `/owner/earnings` | Earnings |
| Owner | `/owner/wallet` | Wallet |
| Owner | `/owner/profile` | My Profile |
| Jockey | `/jockey/dashboard` | Dashboard |
| Jockey | `/jockey/requests` | Race Requests |
| Jockey | `/jockey/schedule` | Schedule |
| Jockey | `/jockey/history` | Race History |
| Jockey | `/jockey/wallet` | Wallet |
| Jockey | `/jockey/profile` | My Profile |
| Jockey | `/jockey/races/:raceId/live`, `/results` | Live Race / Result |
| Referee | `/referee/races` | Races |
| Referee | `/referee/races/:raceId` | Race Detail (nộp report) |
| Referee | `/referee/races/:raceId/live`, `/results` | Live Race / Result |
| Admin | `/admin/dashboard` ... `/admin/config` | 13 trang quản trị |

**Ghi chú:** file `src/pages/referee/ReportSubmission.jsx` tồn tại nhưng **không có route** nào trong `App.jsx` trỏ tới — việc nộp report thực tế nằm trong `RaceDetail.jsx`. Đây có thể là file mồ côi (dead code), không đưa vào sơ đồ.
