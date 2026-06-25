# Bulvara 🏋️‍♂️ — Fitness RPG Telegram Mini App

A dark, neon cyber-fitness RPG built as a Telegram Mini App. Players mint a
genetically-randomized **Athlete**, train it, feed it, dose it with risky
**Cyber-Pharma**, fight in the **Arena**, and passively mine the in-game
**$BULV** token on the TON blockchain.

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS (custom dark "cyber-fitness" theme)
- `@tonconnect/ui-react` for TON wallet connection
- Bilingual i18n (🇷🇺 Russian default / 🇬🇧 English), no external i18n library — a tiny custom `t()` resolver

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. To test inside Telegram, expose the dev server
with a tunnel (e.g. `ngrok http 5173`) and register that HTTPS URL as your
bot's Mini App URL via `@BotFather`.

```bash
npm run build      # production build -> dist/
npm run preview    # preview the production build
```

## TonConnect setup (required before shipping)

1. Edit `public/tonconnect-manifest.json` and replace the placeholder `url`,
   `name`, and `iconUrl` with your real, publicly hosted values — TonConnect
   wallets fetch this file to display your app's identity during connection.
2. Deploy the app behind HTTPS; `App.tsx` builds the manifest URL from
   `window.location.origin`, so no other code changes are needed.

## Project structure

```
src/
  types/index.ts          Shared domain types (Athlete, Stats, items, etc.)
  utils/
    constants.ts          All game balance numbers: rarities, training costs,
                           nutrition/pharma/gear items, arena leagues
    rarity.ts             Weighted rarity roll + athlete stat generation
    selectors.ts          Pure derived-stat math (mining rate, crit chance,
                           effective strength, power score)
    format.ts             Number/duration formatting helpers
  contexts/
    LanguageContext.tsx   ru/en dictionary + t() translator, persisted
    GameContext.tsx       Single source of truth: save/load, passive mining
                           tick, and every game action (train, feed, dose,
                           buy gear, fight)
  hooks/
    useTelegram.ts        Telegram WebApp SDK bridge (ready/expand/haptics)
    useFloatingText.ts    "+12 STR" / "CRIT!" floating popups
  components/
    Header.tsx            Logo, live BULV balance, language toggle
    Navigation.tsx         Bottom tab bar (Home / Training / Arena / Shop / Wallet)
    Home.tsx               Athlete overview, mining ticker, active boosts
    Incubator.tsx           Capsule minting + high-cost reroll
    AthleteCard.tsx / StatBar.tsx / RarityBadge.tsx   Shared display pieces
    Training.tsx            Chest/Back/Legs/Arms tap mechanic (sub-tab: Camp)
    Nutrition.tsx            Protein/Carbs/Water/Rest (sub-tab inside Training)
    Shop.tsx                 Tab switcher between...
    Pharma.tsx               ...Cyber-Pharma risky boosts, and
    Gear.tsx                 ...permanent passive gear
    Arena.tsx                Leagues, battle resolution, history
    Wallet.tsx               TonConnect button + mainnet withdrawal panel
  App.tsx                  Screen router + provider wiring
  main.tsx                 Vite/React entry point
locales/
  ru.json                  Default language
  en.json
```

## Game design notes

| System | Where | Mechanic |
|---|---|---|
| **Incubator** | `Incubator.tsx` | Weighted rarity roll (Novice → Legend), one free mint, paid reroll |
| **Stats** | `types/index.ts`, `selectors.ts` | Strength → tournament power · Mass → mining rate · Stamina → max energy · Genetics → crit chance |
| **Training Camp** | `Training.tsx`, `constants.ts` | 4 muscle groups consume energy, grant stat gains, genetics-driven crit doubles gains + grants bonus BULV |
| **Nutrition** | `Nutrition.tsx` | Spend BULV (or wait, for Rest) to restore energy / extend mining boosts |
| **Cyber-Pharma** | `Pharma.tsx` | High multiplier boosts with a rollable risk of a negative outcome and long cooldowns |
| **Gear Shop** | `Gear.tsx` | One-time purchase, permanent passive % bonuses |
| **Arena** | `Arena.tsx` | 4 leagues gated by a computed Power score; entry fee, RNG-resolved fight, BULV reward |
| **Wallet** | `Wallet.tsx` | Real TonConnect wallet linking; in-game BULV ledger is off-chain until the bridge contract ships |

All numeric balance (prices, cooldowns, drop rates, mining coefficients) lives
in `src/utils/constants.ts` — tune the economy from a single file.

## Production checklist before going live

- [ ] Replace `tonconnect-manifest.json` placeholders with real hosted assets
- [ ] Stand up a backend (or TON smart contract) to mint/distribute real
      $BULV jettons — this build keeps the token balance in `localStorage`
      as a game-economy ledger; no on-chain transfer is performed
- [ ] Swap the emoji avatars/icons for real art
- [ ] Add server-side anti-cheat validation if BULV ever bridges to mainnet
- [ ] Connect Telegram bot backend for push notifications (energy full, arena cooldown ready, etc.)
