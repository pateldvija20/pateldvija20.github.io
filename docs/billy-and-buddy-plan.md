# Billy & Buddy case study: rewrite plan

Status: plan only. Nothing on the page has changed yet. `[NEED: …]` is something only you can supply; `[CHECK: …]` is something to confirm.

Sources read: the current page (`src/pieces/billyAndBuddy.tsx`), the Figma Processbook, Game UI and Website UI pages, the playable prototype at `/billy-and-buddy-game/`, and the published sources in section 9.

---

## 1. The brief

| | |
|---|---|
| **What the page proves** | You can turn a vague learning goal ("teach kids money") into a game whose rules make a young child practise the choice, not memorise the word. |
| **One thing to remember** | Money habits form by about age seven, so the game puts a 4 to 7 year old **in a shop with a list, a budget and a clock**. |
| **Scope of the page** | The game. The service it belongs to is supporting work near the end, then credits. |
| **Yours** | The whole game concept and design, and the stakeholder map. |
| **The team's** | The research, the service, the books, branding and illustration. Credited at the end. |
| **Age band** | 4 to 7. |
| **Honest status** | Designed in Figma. Played on paper by **three children aged 3 to 5**. Now a playable web prototype. **The digital game has not been tested with children.** The service is a proposed design, not a running business. |
| **Must survive word for word** | "The game is free, and the lesson inside it is to want less." |

---

## 2. The reading flow

The skill's answer-first order, shaped to your Bind Desk model. Each section answers the question the reader has at that point, so the page reads as one argument.

| # | Section | The reader is asking | The section answers |
|---|---|---|---|
| 1 | Intro | What is this? | A shopping game for kids. Facts, play button. |
| 2 | TL;DR | Why should I care? | Habits form by seven; school teaching starts in high school. The game is practice for the age that matters. |
| 3 | Solution | What does it do? | Four clips: story, sorting, feedback, checkout. |
| 4 | Insights | How do you know it is needed, and did children get it? | Journey map with three real figures, then what three children taught you on paper. |
| 5 | Problem | So what is the actual problem? | One band, landing as the conclusion of the evidence. |
| 6 | Design Decisions | What did you choose against? | Two before and after pairs. |
| 7 | Outcome | What changes? | The same three stages, with the game. No result claimed. |
| 8 | Next Steps | What would prove it? | Four cards. |
| 9 | AI | How was AI used? | Two sentences. |
| 10 | The service | Where does the game live? | Supporting work: macro and micro service explorer, labelled as a proposed service. |
| 11 | Credits | Who else made this? | The team, by role. |
| 12 | Also check out | | Related projects. |

**Decided by the flow:**
- **Two design decisions, not three.** The checkout round is already a Solution clip; a third pair would repeat it.
- **The service explorer goes near the end (10), not in Insights.** You asked for the page to be about the game with supporting documentation after it. Placed in Insights, it would push the paper test, the strongest evidence, further down and break the line from evidence to problem.

---

## 3. Keep, cut, convert

| Current section | Call | Where it goes |
|---|---|---|
| Intro and title | Convert | New title, domain meta, three facts, "Play the prototype" |
| Details strip | Convert | Timeline, Role, Scope. Team names move to Credits. |
| TL;DR | Convert | Lead statement plus three sentences |
| Brief, Challenge | Cut | Folded into the TL;DR and the Problem band |
| Solution (four stills) | Convert | Four looping clips from the playable game |
| The Problem (four stats) | Convert | Replaced by three sourced figures in the journey explorer. "26 states" is wrong, see 9. |
| Initial Findings | Convert | Captions inside the journey explorer |
| The System (four SVGs) | Convert | Service explorer, section 10 |
| Design Process, Turning Point | Convert | Design Decisions; paper test in Insights |
| Goal | Convert | Next Steps "Build and test" |
| The Business Case | Cut section, keep line | Next Steps "What changes" |
| Outcome | Convert | Outcome explorer |
| Reflection | Convert | Next Steps |
| Also check out | Keep | |

---

## 4. Draft copy

Bold marks the highlighted phrases. No dashes, no contractions, no emoji. Names appear only in Credits, where teammates are credited by name.

### 1. Intro

- **Title**: Basket of Choices, a shopping game for kids
- **Meta**: EdTech · Children's financial literacy
- **Facts**: Timeline `[NEED: how long]` · Role "Game designer" · Scope "1 game, 3 scenarios"
- **Button**: Play the prototype

### 2. TL;DR (band)

**Lead:** Basket of Choices is a web game where children aged 4 to 7 sort a shopping list into needs and wants, then pay for it on a budget, with Billy reacting to every choice.

**Explanation:** It belongs to Billy & Buddy, a book subscription that teaches young children about money and replays each book's lesson in games on its website. Research on young children finds that **money habits form by about age seven**, yet where American schools require personal finance, it is **a high school course**. The game gives the younger age something to practise, in a situation they recognise.

### 3. Solution (clip and one paragraph each)

1. **Story.** A definition of a need does not help in a shop. The game **opens with a situation told by Billy and Buddy, a day at the zoo, a birthday party or the first week of school**, so every item is judged against a real plan.
2. **Sorting.** **Ten items arrive one at a time and the child drops each into Needs or Wants, against a two minute clock with three lives.** The item lists are still an adult's idea of a need, which is the first thing to test.
3. **Feedback.** **Billy answers every choice the moment it is made, and a wrongly sorted item comes back later in the round.** A mistake costs a life, not the lesson.
4. **Checkout.** **Every need has to be paid for within a fixed budget, and wants fit only if money is left.** What the child saves becomes the score.

Button: Play the prototype.

### 4. Insights

**Journey map** (phase explorer, journey mode). How a child meets money today, in the order a life goes:

| Stage | Context scene | Pain point caption | Evidence (live stat) |
|---|---|---|---|
| 1. Early years | A child at the shop with a parent, reaching for candy | Habits like planning ahead and waiting for something **form before a child turns seven**. | **7**, the age by which money habits are typically formed (Money Advice Service, 2013) |
| 2. School | A timetable that reaches high school before money appears | Where schools require personal finance, it is **a course for high school graduation**. | **35 states** require it, for high school (CEE, 2024) |
| 3. Growing up | The same child, older, with a bill | Without early practice, **most adults still guess**. | **48%**, the share of basic personal finance questions US adults answer correctly (P-Fin Index, 2024) |

**What three children showed on paper.** Three children aged 3 to 5 played the paper version, with a cart, item cards and a time limit. Each finding, then what changed:

- The fixed lists of needs and wants **did not match what the children thought was a need**. Rewriting the lists from children's answers is the first next step.
- The dog **felt disconnected from the play**. Billy now speaks on every action.
- Paper with a timer **said nothing about a screen, feedback or pacing**. That is why the playable prototype exists.

Note under it, small: The children were younger than most of the 4 to 7 band, so the digital test should include six and seven year olds.

### 5. Problem (band)

Young children are taught **what a need is**, if they are taught at all, but rarely **practise choosing one** with **a budget and a clock**.

### 6. Design Decisions (first version beside now, same size)

1. **Falling objects, then deliberate sorting**
   - *First version* (pb-concept): Objects fell faster each level and the player steered them into a basket. It tested reflexes more than the choice.
   - *Now* (sorting clip): Items wait until the child chooses, and one clock covers the whole round. The thinking happens at the child's speed.
2. **A silent dog, then a guide who answers**
   - *First version* (pb-prototype photo): Buddy stood beside the game and did nothing, and the children did not connect with him.
   - *Now* (feedback clip): Billy reacts to every sort and every checkout choice. The companion has a job.

### 7. Outcome (phase explorer, outcome mode)

The same three stages, so the reader compares like with like. Each plays today's scene, then the game doing that stage, drawn from the game's own art:

| Stage | Today | With the game |
|---|---|---|
| Early years | Candy goes in the basket | Candy goes in Wants, Billy explains, a life is lost |
| School | Money waits for high school | A 4 year old plays the zoo round at home |
| Growing up | An overspent bill | The checkout refuses to pay over budget; money left becomes the score |

The band ends: designed and playable, not yet tested with children.

### 8. Next Steps (four cards)

- **Build and test**: Play the prototype with children aged 4 to 7 and watch three things: whether they sort without help, whether they treat needs as required at checkout, and what they do with money left over.
- **Measure**: Wrong sorts per item, money left at checkout, and how often a child replays a scenario.
- **Clarify**: Ask children what they call a need, then rebuild the three item lists from their answers instead of mine.
- **What changes**: The game is free, and the lesson inside it is to want less. The service earns more when families buy more, and testing should show whether parents see that as a conflict.

### 9. AI

I designed the game in Figma, then used Claude Code to turn the frames into a playable prototype. I played every round myself to check its rules against the design. `[CHECK: any AI use in the original project?]`

### 10. The service (supporting work)

One line above the explorer: Billy & Buddy is a proposed service, designed by the team; the maps below show how the game would sit inside it.

Service explorer, macro then micro (section 5). Durations and roles are presented as the service design, written as plans ("is planned to", "each volume takes"), never as results.

### 11. Credits

By name, with what each person did. From the current page:

- Story and narrative: Kaitlyn Carney, with me
- Visual language and illustration: Sharanya `[NEED: surname]`
- `[NEED: the other two designers' names and what each did]` (the team was five designers)
- Research, service design and books: the team `[CHECK: split by person if you want]`

---

## 5. Animations

All moving pieces follow the Bind Desk build guide: live drawn scenes on an 800 by 450 stage, captions typed under the scene with the sweep highlight, 2× default speed, portrait scenes on phones, a still frame under reduced motion.

| Piece | What it is | Built from |
|---|---|---|
| **Hero** | Silent looping video of the game in a browser window, on a soft teal panel (#CEF0EF, the game's wash) | Recorded from `/billy-and-buddy-game/` |
| **Solution clips** (4) | Story, sorting, feedback, checkout | Recorded from the game with its deep links |
| **Journey explorer** (3 stages) | Shop with candy, school timetable, older child with a bill; each ends on its live stat | Drawn live with the game's SVG items, Billy and Buddy |
| **Outcome explorer** (3 stages) | Same stages, then the game doing each | Drawn live from the same art |
| **Service explorer** (5 stages) | Macro loop, then four zoom ins | Redraws the four service maps |

### Service explorer: macro and micro

Stage 1 is the whole service; stages 2 to 5 each open by zooming in from their spot on the loop, so the reader always knows where they are.

| Stage | Scale | What animates | The point it makes | Built from |
|---|---|---|---|---|
| 1. One turn of the service | Macro | A book travels the loop: made, shipped each quarter, read together, played back on the website, then the next book | The game is **the part a child does alone**, between books | Service visualization |
| 2. Who makes a book | Micro | Five makers light up as one book passes through them, then reach widens to logistics, libraries and schools | Every book is **checked for being true before it prints** | Stakeholder map (yours) |
| 3. How a family joins | Micro | A token moves through hears about it, chooses a plan, waits for volume one, with frontstage and backstage lanes lighting below | Joining takes **one plan and one box** | Service blueprint, stages 01 to 03 |
| 4. The website | Micro | A child's path goes homepage, Play, game, coins; a second path tries the shop and **stops at the parent gate** | A child **cannot buy alone** | System diagram |
| 5. Playing it back | Micro | The book's needs and wants spread fades into the zoo game | The game **repeats the book's lesson without an adult** | Blueprint stage 05, visualization |

**Engine.** Shared component: the Bind Desk explorer engine (pins, pills, band, typing, speed) becomes one component that takes stage data. Bind Desk passes its existing scenes and looks the same.

---

## 6. Prototype changes before recording

- **Checkout timer**: 60 seconds now; your rules say 2 minutes. Change to 2:00.
- **Age**: the How to play card and copy suit 4 to 7. Check that the words are readable for a 4 year old, who may not read yet. `[CHECK: should Billy's lines be read aloud? Optional, not in the Figma design.]`

---

## 7. Still open

1. **Credits**: by name (decided). Need the two missing teammates, and Sharanya's surname.
2. **Timeline** for the facts row.
3. **The Cambridge finding on luxuries and necessities.** News coverage of the 2013 report says children under eight had not yet grasped the difference between luxuries and necessities. If the original report says this, it is a real constraint on a 4 to 7 game and worth one sentence in Next Steps. I could not reach the report to confirm it, so it stays out until checked.

---

## 8. Build order

1. Fix the checkout timer, record the hero and four clips.
2. Shared explorer engine, then journey, outcome and service scenes.
3. Rewrite `billyAndBuddy.tsx` and the title and meta in `projects.ts`.
4. Check desktop and 375px, measure scene spacing, typecheck, grep for names and dashes.

---

## 9. Sources

| Figure | Source | Note |
|---|---|---|
| Money habits form by about age seven | Whitebread, D. and Bingham, S. (2013). *Habit Formation and Learning in Young Children.* Money Advice Service, University of Cambridge. | A review of earlier research. Write "typically formed", not "set". |
| 35 states require a personal finance course for high school graduation | Council for Economic Education, *2024 Survey of the States*. | Replaces the processbook's "26 states", which does not match the 2024 survey. |
| US adults answer 48% of basic personal finance questions correctly | TIAA Institute and GFLEC, *2024 Personal Finance (P-Fin) Index*. | Newer than "four in seven" (57%, S&P Global FinLit Survey, 2014 data). |

Links:
- https://www.councilforeconed.org/survey-of-the-states-2024/
- https://www.councilforeconed.org/2024-cee-survey-of-the-states-show-progress-for-financial-education/
- https://www.tiaa.org/public/institute/publication/2024/financial-literacy-and-retirement-fluency
- https://www.yourmoney.com/investing/adult-money-habits-are-set-by-the-age-of-seven (coverage of the 2013 report)
