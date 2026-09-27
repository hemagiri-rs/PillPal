---
name: "laws-of-ux"
description: "Apply the 30 psychology-based design principles from lawsofux.com (Hick's, Fitts's, Jakob's, Miller's, Tesler's, Postel's, Doherty threshold, Gestalt grouping, peak-end, Zeigarnik, goal-gradient, cognitive load, etc.) to design, critique, or justify user interfaces. Use whenever the user builds or reviews any UI (web page, app screen, form, onboarding, dashboard, checkout, nav, pricing page, landing page, CLI/TUI, component), asks for a UX/usability audit or heuristic review, asks why something feels confusing/cluttered/slow, needs to defend a design decision to stakeholders, or mentions any named UX law or UX psychology, even without saying \"laws of UX\"."
---

# Laws of UX

A working toolkit built from every page of [lawsofux.com](https://lawsofux.com/) by Jon Yablonski (30 laws + 8 articles). The site's idea is simple: people come with a built-in "blueprint" for perceiving, remembering and deciding, and interfaces work better when they fit that blueprint instead of making people adapt to the interface.

The laws are **heuristics, not physics**. They explain *why* something works and give you words to defend a decision. They don't replace testing with real users. When a law and real user data disagree, trust the data.

## How this file is organised

- **Part 1 (this part):** the 30 laws at a glance, how to use them, tensions and ethics.
- **Part 2: Full reference for the 30 laws.** Each law has a definition, the mechanism, how to apply it, pitfalls, examples, origin and related laws. Look up the entry before citing a law.
- **Part 3: Playbook.** Lessons from the site's 8 articles, then **scenario checklists** (forms, navigation, onboarding, loading, pricing, content, CTAs, redesigns, errors, multi-step flows, mobile). Use it for audits and builds.

## The 30 laws at a glance

Grouped by the kind of problem they solve. Each one-liner is a paraphrase. The full entry is in Part 2.

**Deciding and choosing (too many options, slow decisions)**
- **Hick's Law**: decision time grows with the number and complexity of choices. Cut, stage, or recommend.
- **Choice Overload**: too many options overwhelm people and lower satisfaction. Filter, feature, and compare side by side.
- **Occam's Razor**: prefer the simplest solution that works equally well. Remove until nothing more can go.
- **Pareto Principle**: about 80% of outcomes come from about 20% of causes. Put effort where most users get the most value.
- **Tesler's Law**: every task has irreducible complexity. Make the system carry it, not the user.
- **Postel's Law**: accept messy input generously and produce strict, predictable output.

**Memory and mental effort**
- **Cognitive Load**: the mental resources an interface demands. Cut the *extraneous* load and support the *intrinsic* load.
- **Working Memory**: holds only a few chunks for a few seconds. Favour recognition over recall and let the system remember.
- **Miller's Law**: "7±2" items. Use it as a reason to chunk, **not** as a hard cap on menu length.
- **Chunking**: group information into meaningful units so it can be scanned.
- **Serial Position Effect**: first and last items are remembered best. Put key items at the ends.
- **Zeigarnik Effect**: unfinished tasks stick in the mind. Show what's incomplete and hint at more content.

**Perception and visual grouping (Gestalt)**
- **Law of Proximity**: things near each other read as a group.
- **Law of Common Region**: things inside a shared boundary or background read as a group.
- **Law of Similarity**: things that look alike read as related. Make links look different from text.
- **Law of Uniform Connectedness**: things joined by lines, frames or colour read as most related.
- **Law of Prägnanz**: people read ambiguous visuals as the simplest possible form.
- **Selective Attention**: people filter out whatever seems off-goal (banner blindness, change blindness).
- **Von Restorff Effect**: the one item that differs gets noticed and remembered. Use it sparingly and don't rely on colour alone.
- **Aesthetic-Usability Effect**: attractive designs are perceived as easier to use and can hide real usability problems.

**Expectations and learning**
- **Jakob's Law**: users spend most of their time on other products, so follow the conventions they already know.
- **Mental Model**: people's internal picture of how a system works. Match it, and use research to learn it.
- **Paradox of the Active User**: people skip manuals and start clicking. Put help in context.
- **Cognitive Bias**: systematic thinking shortcuts that affect both users *and* designers.

**Time, motivation and emotion**
- **Doherty Threshold**: respond in under about 400 ms, or make the wait *feel* shorter.
- **Fitts's Law**: time to hit a target depends on its distance and size. Make targets big, close and well spaced.
- **Flow**: deep focus comes from challenge matched to skill, clear feedback and no friction.
- **Goal-Gradient Effect**: effort speeds up near the finish line. Show progress, and a head start helps.
- **Parkinson's Law**: tasks expand to fill the time allowed. Make tasks take less time than users expect.
- **Peak-End Rule**: experiences are judged by their most intense moment and their ending. Design those moments.

## How to use this skill

### 1. Designing or building UI

Before and while writing the interface (HTML, React, SwiftUI, Figma notes, anything), check the relevant laws. Build them into the design choices themselves rather than adding a lecture at the end. A good default pass:

1. **Scope the choices** (Hick, Choice Overload, Occam, Pareto). What is the one main action on this screen? Remove, defer (progressive disclosure), or recommend the rest.
2. **Structure the layout** (Chunking, Proximity, Common Region, Similarity, Uniform Connectedness). Group related controls with spacing first, then with containers. Keep the same styling for the same meaning.
3. **Emphasise deliberately** (Von Restorff, Selective Attention, Serial Position). Give one primary CTA a distinct treatment, backed by more than colour. Put key nav items at the start and end. Don't make real content look like an ad.
4. **Respect conventions** (Jakob, Mental Model). Use standard patterns for nav, forms, carts, settings and icons with labels, unless you have a clear reason to be novel (see Part 3).
5. **Make it easy to hit** (Fitts). Use comfortable touch targets (commonly around 44–48 px minimum), spacing between them, and primary actions close to where attention already is.
6. **Take the burden off the user** (Tesler, Postel, Working Memory, Parkinson). Use smart defaults and autofill, accept flexible input formats, carry information across steps, and show the user's earlier choices instead of asking them to remember.
7. **Keep it fast and informative** (Doherty, Flow). Give immediate feedback, use skeletons or optimistic UI, and use progress indicators for anything slow.
8. **Motivate completion** (Goal-Gradient, Zeigarnik). Show progress in multi-step flows and make remaining steps visible.
9. **Design the peaks and the end** (Peak-End). Pay extra attention to the most stressful moment (payment, sending, deleting, errors) and to the final confirmation.
10. **Polish, but still test** (Aesthetic-Usability). Visual quality builds trust, but it can hide problems from testers and from you.

Mention the laws you applied briefly, in one line per decision, and only when it helps the user understand a choice. Don't pad UI code with commentary.

### 2. Auditing or critiquing an existing design

When given a screenshot, URL, code or description, read Part 3 (Playbook) for the matching scenario checklist, then produce findings in this shape:

```markdown
## UX review: <screen/flow name>

**Summary:** 2–3 sentences: overall impression and the single most important fix.

| # | Issue (what the user experiences) | Law(s) | Severity | Recommended fix |
|---|-----------------------------------|--------|----------|-----------------|
| 1 | ...                               | Hick's Law, Choice Overload | High | ... |

**What's working:** short list of things that already follow the laws. Credit good decisions so they don't get "fixed" by mistake.

**Worth testing:** hypotheses the laws suggest but that need real user evidence.
```

Guidance for good findings:
- **Lead with the user's experience, not the law.** Write "Users must pick among 14 equal-weight plan options before seeing a price" rather than "Violates Hick's Law."
- **Be concrete in the fix:** name the element, the change, and ideally the pattern (for example, "collapse to 3 tiers + 'Compare all plans' link").
- **Severity** depends on impact × frequency. High means it blocks or derails a core task. Medium means it adds friction or errors on a common path. Low means polish.
- **Only cite laws that genuinely apply.** Three well-argued findings beat fifteen law-name drops.
- When laws **pull in different directions**, say so and pick a side with reasoning (see "Tensions" below).

### 3. Explaining or justifying a decision

When a user needs to defend a design ("my PM wants 12 items in the nav", "why should the button be bigger?"), give them: the law, a one-sentence mechanism, the origin or evidence in a clause (for example, Fitts 1954, Hick & Hyman 1952), the concrete implication for *their* case, and a caveat or the testable prediction. Stakeholders are more persuaded by "here's what users will experience" than by an appeal to authority.

### 4. Teaching or answering "what is X law?"

Give the definition, the reason it happens, 2–3 practical applications, one real-world example, a common misuse, related laws, and the link `https://lawsofux.com/<slug>/`.

## Tensions and common misuses

These come straight from nuances the site itself raises. Handle them explicitly:

- **Simplicity vs. abstraction.** Hick's and Tesler's pages both warn against simplifying until things become abstract. Hiding everything behind icons or menus moves the load elsewhere instead of removing it. Unlabelled icons often *increase* cognitive load.
- **Miller's "7±2" is not a design rule.** The site explicitly says not to use it to justify arbitrary limits such as "max 7 menu items". Its real lesson is chunking. Working memory is closer to 4–7 chunks and varies by person and context.
- **Familiar vs. novel.** Jakob's Law is the default. Novelty is justified when differentiation, disruption with new technology, or exploration and delight is the actual goal, and even then it must be validated with testing and must not cost basic usability.
- **Hiding choices has costs.** When options are split up and some are hidden, users assume the visible ones are all there is. When the options belong together, show them together.
- **Emphasis is zero-sum.** Von Restorff only works if few things are distinctive. When everything is bold, nothing is, and heavy styling can trigger banner blindness.
- **Pretty ≠ usable.** Aesthetic-Usability means that positive test feedback on a beautiful prototype can be misleading. Watch behaviour, not just opinions.
- **Artificial delays and progress can build trust**, according to the Doherty and Goal-Gradient pages. But they cross into manipulation if they deceive users about something that matters to them.
- **Tesler: complexity is conserved.** Simplifying for users often means *more* engineering work. That's usually the right trade, because a week of engineering beats a minute lost by every user every day.
- **Designers have biases too**, including complexity bias and confirmation bias. Distrust your first clever idea and test it.

## Ethics

The site's own guidance is that these principles can build intuitive products or exploit how minds work to create compulsive ones. Use them in service of users' goals and wellbeing. Don't recommend dark patterns: fake scarcity, manipulative "progress" meant to trap users, confirmshaming, or making cancellation deliberately hard. If a request amounts to using a law against users, say so and offer the user-aligned version. Measure success beyond time-on-site.

## Attribution

Content is paraphrased from Laws of UX © Jon Yablonski, licensed [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). When writing a deliverable that cites the laws, link each law to `https://lawsofux.com/<slug>/` and don't reproduce the site's text or posters verbatim. Further reading: the book *Laws of UX* (2nd ed., O'Reilly), which adds Paradox of Choice, Complexity Bias, Flow, accessibility, personalization, and techniques like contextual inquiry, user interviews and eye-tracking.

---

# Part 2: Full reference for the 30 laws

Paraphrased from every law page on lawsofux.com (© Jon Yablonski, CC BY-NC-ND 4.0). Each entry has the source URL. Alphabetical, matching the site.

Each entry is laid out as **Definition** (what it says), **Why** (the mechanism), **Apply** (design moves), **Watch out**, **Examples**, **Origin**, and **Related**.

## Contents
1. Aesthetic-Usability Effect
2. Choice Overload
3. Chunking
4. Cognitive Bias
5. Cognitive Load
6. Doherty Threshold
7. Fitts's Law
8. Flow
9. Goal-Gradient Effect
10. Hick's Law
11. Jakob's Law
12. Law of Common Region
13. Law of Proximity
14. Law of Prägnanz
15. Law of Similarity
16. Law of Uniform Connectedness
17. Mental Model
18. Miller's Law
19. Occam's Razor
20. Paradox of the Active User
21. Pareto Principle
22. Parkinson's Law
23. Peak-End Rule
24. Postel's Law
25. Selective Attention
26. Serial Position Effect
27. Tesler's Law
28. Von Restorff Effect
29. Working Memory
30. Zeigarnik Effect

---

## 1. Aesthetic-Usability Effect
https://lawsofux.com/aesthetic-usability-effect/

**Definition:** People tend to judge attractive designs as easier to use.
**Why:** A pleasing design triggers a positive emotional response, and that feeling spills over into judgments about how well the thing works.
**Apply:**
- Invest in visual quality: it buys trust and patience, and makes users more forgiving of small flaws.
- Use that goodwill as a buffer, not a substitute for fixing real problems.
**Watch out:** Beauty can **mask usability problems in testing**. Participants may rate a polished prototype highly while struggling with it. Observe task success and errors, not just satisfaction ratings.
**Origin:** Masaaki Kurosu and Kaori Kashimura (Hitachi Design Center, 1995) tested 26 ATM interface variants with 252 participants. Perceived ease of use tracked aesthetic appeal more closely than actual ease of use did.
**Related:** Law of Prägnanz, Peak-End Rule, Cognitive Bias.

## 2. Choice Overload
https://lawsofux.com/choice-overload/

**Definition:** A large number of options can overwhelm people. Also called the paradox of choice.
**Why:** Comparing many options costs effort and creates fear of choosing wrong, which hurts both the decision and how people feel about the whole experience.
**Apply:**
- When comparison is necessary (pricing tiers, plans), enable **side-by-side comparison** on the same attributes.
- Prioritise what's shown at any moment (featured or recommended item).
- Give tools to **narrow choices up front**: search, filters, sensible categories.
**Watch out:** It's closely related to Hick's Law, but it is about satisfaction and decision quality as well as speed.
**Origin:** Alvin Toffler coined "overchoice" in *Future Shock* (1970).
**Related:** Hick's Law, Cognitive Load, Occam's Razor.

## 3. Chunking
https://lawsofux.com/chunking/

**Definition:** Breaking information into pieces and regrouping them into meaningful units.
**Why:** Memory and attention handle a few meaningful units far better than many loose items, so chunks make content scannable.
**Apply:**
- Split content into visually distinct groups with a clear hierarchy (headings, cards, modules, spacing).
- Format strings in chunks: phone numbers, card numbers, codes, dates.
- Avoid walls of text. Use headings, suitable line length and short sections.
- Use modules and separators to show how pieces of content relate.
**Examples:** A formatted phone number versus a raw digit string. Google results shown as clearly separated chunks.
**Origin:** George A. Miller, "The Magical Number Seven, Plus or Minus Two" (1956).
**Related:** Miller's Law, Working Memory, Cognitive Load, Law of Proximity.

## 4. Cognitive Bias
https://lawsofux.com/cognitive-bias/

**Definition:** Systematic errors in thinking that distort judgment and decisions.
**Why:** To save mental energy we use rules of thumb (heuristics) based on past experience. They're fast, but they skew judgment without our noticing.
**Apply:**
- Knowing the common biases helps you spot them in **users and in yourself and your team** (for example, confirmation bias in research synthesis, or complexity bias in solutioning).
- Treat bias awareness as a safeguard against bad reasoning, unintentional discrimination and costly mistakes. It doesn't remove bias.
**Examples:** Confirmation bias: looking for, interpreting and remembering information that fits what you already believe. The Peak-End Rule and Serial Position Effect are also cognitive (memory) biases.
**Origin:** Amos Tversky and Daniel Kahneman (1972) showed that human judgment departs systematically from rational-choice theory because of heuristics.
**Related:** Peak-End Rule, Serial Position Effect, Mental Model.

## 5. Cognitive Load
https://lawsofux.com/cognitive-load/

**Definition:** The mental resources needed to understand and use an interface.
**Why:** When incoming information exceeds working memory capacity, tasks get harder, details are missed and people feel overwhelmed.
**Two kinds:**
- **Intrinsic load** is the effort inherent to the goal: holding relevant information, taking in new information, tracking the goal. Support it.
- **Extraneous load** is effort spent on things that don't help, such as distracting or unnecessary elements. Eliminate it.
**Apply** (see Part 3, A1 for the full article): remove unnecessary elements, use common patterns, offload tasks (defaults, reuse of earlier input), minimise choices, show choices as a group, make text readable, and label icons.
**Origin:** John Sweller's cognitive load theory (late 1980s; 1988 paper), building on Miller's information-processing work.
**Related:** Working Memory, Miller's Law, Chunking, Hick's Law.

## 6. Doherty Threshold
https://lawsofux.com/doherty-threshold/

**Definition:** Productivity rises sharply when the system responds fast enough (under about 400 ms) that neither the person nor the computer is waiting on the other.
**Why:** Past this threshold attention drifts and the interaction stops feeling continuous. Under it, use becomes engaging, even "addictive" in the original paper's words.
**Apply:**
- Acknowledge every action within about 400 ms, even if the full result takes longer.
- Improve **perceived performance**: optimistic UI, skeleton screens, progressive loading.
- Use animation to keep people engaged while work happens in the background.
- Progress bars make waits tolerable **even when they're not precise**.
- A deliberate small delay can raise perceived value and trust (for example, a "searching for best fares" step). Use it honestly.
**Origin:** Walter J. Doherty and Ahrvind J. Thadani, IBM Systems Journal (1982), who argued for 400 ms rather than the previous 2-second standard.
**Related:** Flow, Peak-End Rule, Goal-Gradient Effect.

## 7. Fitts's Law
https://lawsofux.com/fittss-law/

**Definition:** The time to reach a target depends on how far away it is and how big it is.
**Why:** Moving farther and aiming at smaller targets both take longer. Rushing at small targets raises error rates (the speed–accuracy trade-off).
**Apply:**
- Make touch and click targets **large enough** to hit accurately.
- Leave **ample space between targets** to avoid mis-taps.
- Put targets **where they're easy to reach**, close to where attention and the pointer or thumb already are. Keep task-related buttons near the task.
- Whole-row or whole-card click areas, labels that toggle their checkbox, and screen edges and corners (effectively infinite depth) all exploit the law.
**Watch out:** Don't place destructive actions so they're easy to hit by accident.
**Origin:** Paul Fitts, a study of the human motor system (1954).
**Related:** Doherty Threshold, Law of Proximity, Flow.

## 8. Flow
https://lawsofux.com/flow/

**Definition:** Being fully immersed in an activity, with energised focus, full involvement and enjoyment.
**Why:** Flow happens when a task's difficulty matches the person's skill. Too hard leads to frustration and too easy leads to boredom. It comes with intense focus and a sense of control.
**Apply:**
- Match the challenge to the user's skill (adaptive difficulty, progressive disclosure of advanced features).
- Give **clear feedback** on what was done and what was accomplished.
- Remove unnecessary friction and keep the system responsive (Doherty).
- Keep content and features discoverable so users don't get stuck and disengage.
**Origin:** Mihály Csíkszentmihályi (1975).
**Related:** Doherty Threshold, Cognitive Load, Goal-Gradient Effect.

## 9. Goal-Gradient Effect
https://lawsofux.com/goal-gradient-effect/

**Definition:** Motivation to reach a goal increases the closer someone gets to it.
**Why:** Visible proximity to the finish makes people speed up.
**Apply:**
- Show **clear progress** in multi-step tasks (steppers, "Step 2 of 4", progress bars, profile completeness).
- **Artificial head starts** increase completion. For example, a loyalty card that starts with 2 of 12 stamps filled, or a checklist with "Account created ✓" already ticked.
**Origin:** Clark Hull (1932), whose rats ran faster as they neared the food. Later research extended it to human reward programmes.
**Related:** Zeigarnik Effect, Peak-End Rule, Parkinson's Law.

## 10. Hick's Law
https://lawsofux.com/hicks-law/

**Definition:** Decision time grows with the number and complexity of choices. Formally RT = a + b·log₂(n).
**Why:** Every option must be perceived, interpreted and weighed, which is work users didn't come to do.
**Apply:**
- Minimise choices where response time matters (primary nav, time-critical controls).
- Break complex tasks into smaller steps.
- **Highlight a recommended option** to shortcut the decision.
- Use **progressive onboarding** so new users see a small feature set first.
**Watch out:** Don't simplify to the point of abstraction, where things are hidden or cryptic.
**Examples:** Google's homepage is nothing but the search box, and filters appear only on the results page. Smart-TV remotes with a few buttons move complexity into on-screen menus. Slack's onboarding hid everything but the message box and let Slackbot teach messaging first.
**Origin:** William Edmund Hick and Ray Hyman (1952).
**Related:** Choice Overload, Cognitive Load, Tesler's Law, Occam's Razor.

## 11. Jakob's Law
https://lawsofux.com/jakobs-law/

**Definition:** Users spend most of their time on *other* sites and apps, so they expect yours to work like the ones they already know.
**Why:** People carry expectations (mental models) from familiar products to anything that looks similar. Meeting those expectations lets them focus on their task instead of learning your interface.
**Apply:**
- Use established patterns and conventions: logo top-left links home, cart icon, standard form controls, familiar checkout.
- When redesigning, **reduce discord by letting users keep the familiar version for a limited time**, with opt-in previews, feedback and a revert option.
**Examples:** Toggles, radio buttons and buttons borrow from physical controls. YouTube's 2017 redesign let desktop users preview, give feedback and switch back. By contrast, Snapchat's 2018 forced redesign caused a backlash (from the related article).
**Origin:** Jakob Nielsen (Nielsen Norman Group), 2000.
**Related:** Mental Model, Cognitive Load, Paradox of the Active User.

## 12. Law of Common Region
https://lawsofux.com/law-of-common-region/

**Definition:** Elements that share a clearly bounded area are seen as a group.
**Why:** It's a Gestalt grouping principle. The mind naturally organises what it sees into patterns.
**Apply:**
- Use a **border** or a **background** behind a set of elements to show they belong together (cards, panels, fieldsets, table row striping).
- Use it to make the structure of sections obvious at a glance.
**Watch out:** Boxes inside boxes inside boxes create noise. Often proximity alone is enough.
**Origin:** Gestalt psychology (grouping principles: proximity, similarity, continuity, closure, connectedness).
**Related:** Law of Proximity, Law of Uniform Connectedness, Chunking.

## 13. Law of Proximity
https://lawsofux.com/law-of-proximity/

**Definition:** Objects near each other are seen as a group.
**Why:** It's Gestalt grouping. Closeness implies relationship, so nearby elements are read as sharing function or traits.
**Apply:**
- Use **spacing as the first grouping tool**: tighter space within a group and more space between groups (labels close to their fields, captions close to their images).
- Proximity helps people understand and organise information faster.
**Watch out:** Equal spacing everywhere destroys grouping. An ambiguous label equidistant between two fields causes errors.
**Example:** The spacing between Google search results makes each result read as one cluster and keeps the page scannable.
**Related:** Law of Common Region, Chunking, Law of Similarity.

## 14. Law of Prägnanz
https://lawsofux.com/law-of-pr%C3%A4gnanz/

**Definition:** People interpret ambiguous or complex images in the simplest form possible, because that takes the least effort. Also called the law of simplicity or good figure.
**Why:** Finding simplicity and order keeps us from being overwhelmed. Simple figures are processed and remembered better than complex ones.
**Apply:**
- Prefer simple, clear shapes for icons, logos and layouts.
- Expect users to reduce complex visuals to one unified shape, and design so that simplest reading is the correct one.
**Origin:** Max Wertheimer (1910) watched flashing railway-crossing lights appear as one moving light, which led to Gestalt principles of perception.
**Related:** Occam's Razor, Aesthetic-Usability Effect, Law of Similarity.

## 15. Law of Similarity
https://lawsofux.com/law-of-similarity/

**Definition:** Elements that look similar are seen as a group or whole, even when separated.
**Why:** Similar colour, shape, size, orientation or movement signals shared meaning or function.
**Apply:**
- Style the same function the same way everywhere (all primary buttons alike, all links alike).
- **Make links and navigation visually distinct from plain text.**
- Don't style non-interactive things like interactive ones, or vice versa.
**Origin:** Gestalt grouping principles.
**Related:** Law of Proximity, Von Restorff Effect (the opposite side: difference stands out), Jakob's Law.

## 16. Law of Uniform Connectedness
https://lawsofux.com/law-of-uniform-connectedness/

**Definition:** Visually connected elements are seen as more related than unconnected ones.
**Why:** It's Gestalt grouping, and connection is a stronger grouping cue than proximity or similarity.
**Apply:**
- Connect related functions with colour, lines, frames or shapes.
- Use explicit connectors (lines, arrows) for sequences and relationships (steppers, timelines, flow diagrams).
- Use it to show context or to emphasise the relationship between similar items.
**Example:** Google wraps videos and featured snippets in borders, which connects their contents and gives them priority over ordinary results.
**Related:** Law of Common Region, Law of Proximity, Goal-Gradient Effect (connected steppers).

## 17. Mental Model
https://lawsofux.com/mental-model/

**Definition:** A compressed internal model of what we think we know about a system and how it works.
**Why:** People apply models built from past experience to new, similar systems. When the design matches the model, knowledge transfers and nothing needs relearning.
**Apply:**
- Align the design with users' models. For example, e-commerce product cards, carts and checkout follow shared conventions.
- The designer's model is not the user's. Close the gap with **research**: user interviews, personas, journey maps, empathy maps.
- A sudden change to a familiar product causes *mental model discordance*, so manage transitions (see Jakob's Law).
**Origin:** Kenneth Craik, *The Nature of Explanation* (1943).
**Related:** Jakob's Law, Paradox of the Active User, Cognitive Bias.

## 18. Miller's Law
https://lawsofux.com/millers-law/

**Definition:** The average person holds about 7 (±2) items in working memory.
**Why:** Short-term memory has limited capacity. Miller's real interest was **chunking**, which lets us hold more by grouping.
**Apply:**
- **Don't use "the magical number seven" to justify arbitrary limits** (for example, "menus must have ≤7 items"). Menus are *recognised*, not memorised.
- Organise content into smaller chunks so it's easier to process, understand and remember.
- Capacity varies with a person's prior knowledge and situation.
**Origin:** George Miller (1956), on limits of immediate memory and absolute judgment, framed in terms of information theory and channel capacity.
**Related:** Chunking, Working Memory, Cognitive Load.

## 19. Occam's Razor
https://lawsofux.com/occams-razor/

**Definition:** Among competing hypotheses that predict equally well, choose the one with the fewest assumptions. In design: don't add elements beyond necessity.
**Why:** Every added element has to be processed, and every assumption is another way to fail.
**Apply:**
- The best way to reduce complexity is to **not add it in the first place**. Start with the simplest solution and add only when needed.
- Examine each element and remove as many as possible without hurting function.
- Consider the design finished only **when nothing more can be removed**.
- Edit ruthlessly and use design critiques to force a justification for each element.
**Origin:** William of Ockham (c. 1287–1347), *lex parsimoniae*.
**Related:** Tesler's Law (you can't remove *essential* complexity), Pareto Principle, Hick's Law.

## 20. Paradox of the Active User
https://lawsofux.com/paradox-of-the-active-user/

**Definition:** Users don't read manuals. They start using the software right away.
**Why:** People are driven by their immediate task and won't invest time up front, even though learning the system would save time later. That's the paradox.
**Apply:**
- Put guidance **in context, throughout the product**: tooltips, inline hints, empty-state guidance, contextual help.
- Prefer **progressive onboarding** and "get started" checklists or templates to front-loaded product tours.
- Make errors cheap and recoverable, because users will explore by trying.
- Don't design for an idealised, rational user.
**Origin:** Mary Beth Rosson and John Carroll (1987), from IBM user studies, in *Interfacing Thought*.
**Related:** Jakob's Law, Tesler's Law, Mental Model.

## 21. Pareto Principle
https://lawsofux.com/pareto-principle/

**Definition:** For many events, roughly 80% of the effects come from 20% of the causes.
**Why:** Inputs and outputs are rarely evenly distributed. A few factors dominate.
**Apply:**
- Find the few features, flows or bugs that matter to most users (use analytics and research) and focus effort there.
- Make the vital few prominent. Demote or tuck away the rest.
**Origin:** Vilfredo Pareto observed that 80% of Italy's land was owned by 20% of the population.
**Related:** Occam's Razor, Hick's Law, Serial Position Effect.

## 22. Parkinson's Law
https://lawsofux.com/parkinsons-law/

**Definition:** A task expands to fill whatever time is available.
**Why:** Without constraints, effort and time inflate.
**Apply:**
- Keep task duration at or below what users expect. Beating their expectation improves the experience.
- Prevent task inflation with **autofill**, saved details, smart defaults and one-tap payment, especially in checkout, booking and sign-up.
- Use reasonable, visible time boxes where appropriate (for example, "takes 2 minutes").
**Origin:** Cyril Northcote Parkinson, an essay in *The Economist* (1955), drawn from his experience in the British Civil Service.
**Related:** Doherty Threshold, Goal-Gradient Effect, Tesler's Law.

## 23. Peak-End Rule
https://lawsofux.com/peak-end-rule/

**Definition:** People judge an experience mostly by how they felt at its most intense point and at its end, not by the average of every moment.
**Why:** Memory stores snapshots, not a timeline. The peak and the end dominate the memory, and so decide whether people return or recommend.
**Apply:**
- Identify the **most intense moments** (positive or negative) and the **final moments** of each journey, and design them with care.
- Find the moments when the product is most helpful or enjoyable and add delight there.
- **Negative moments are remembered more vividly** than positive ones, so defuse stress points (waiting, payment, errors, 404s).
- Use **journey mapping** with an emotion line to find the peaks (see Part 3).
**Examples:** Mailchimp's send moment (the mascot's hand hovering nervously over the button, then a high-five on confirmation) turns a stressful step into a memorable one. Uber's ride-wait screen uses entertainment against idleness aversion, shows the ETA and how it's calculated (operational transparency), and shows step-by-step progress (goal-gradient). It reduced post-request cancellations.
**Origin:** Kahneman, Fredrickson, Schreiber and Redelmeier (1993), "When More Pain Is Preferred to Less". Participants preferred to repeat a *longer* cold-water trial that ended slightly warmer. Later colonoscopy studies (1996, 2003) confirmed it.
**Related:** Cognitive Bias, Serial Position Effect (the recency effect), Goal-Gradient Effect.

## 24. Postel's Law
https://lawsofux.com/postels-law/

**Definition:** Be liberal in what you accept and conservative in what you send. Also called the Robustness Principle.
**Why:** Users give messy, varied input across varied devices and abilities. Robust systems tolerate that and still respond reliably.
**Apply:**
- Accept flexible input formats and normalise them yourself (phone numbers with or without spaces, dates in several formats, case-insensitive codes, pasted values with whitespace).
- Define clear boundaries and give clear feedback when input can't be used.
- Anticipate varied input methods, access needs, devices and capabilities. Keep output predictable and accessible.
- The more you anticipate, the more resilient the design.
**Origin:** Jon Postel, TCP specification (the robustness principle for network software).
**Related:** Tesler's Law, Paradox of the Active User, Working Memory.

## 25. Selective Attention
https://lawsofux.com/selective-attention/

**Definition:** We attend only to a subset of what's around us, usually whatever relates to our current goal.
**Why:** Filtering keeps focus. Irrelevant-seeming input gets suppressed.
**Apply:**
- Guide attention to what matters for the task, and avoid distraction and overload.
- **Banner blindness:** users ignore anything that looks like an ad, sits next to ads, or is in typical ad locations. Don't style real content like ads or put it in the same visual block as ads.
- **Change blindness:** significant changes go unnoticed without strong cues. Avoid competing simultaneous changes, and signal important changes clearly (animation, highlight, focus shift, announcement for screen readers).
**Origin:** Broadbent's filter theory (1958), Cherry's cocktail-party effect (1953), Treisman's attenuation model (1960), Deutsch & Deutsch's late-selection theory (1963), and Kahneman's capacity model (1973).
**Related:** Von Restorff Effect, Cognitive Load, Working Memory.

## 26. Serial Position Effect
https://lawsofux.com/serial-position-effect/

**Definition:** People best remember the first and last items in a series.
**Why:** The primacy effect (early items reach long-term memory) and the recency effect (late items are still in working memory).
**Apply:**
- Put the least important items in the middle of lists.
- Put key actions at the far left and far right of navigation and tab bars.
- Put key points first and last in content and onboarding.
**Origin:** Hermann Ebbinghaus.
**Related:** Peak-End Rule, Cognitive Bias, Working Memory.

## 27. Tesler's Law
https://lawsofux.com/teslers-law/

**Definition:** Every system has a certain amount of complexity that can't be reduced. Also called the Law of Conservation of Complexity.
**Why:** Beyond a point, complexity can only be moved: into the user's interface and workload, or into the design and engineering.
**Apply:**
- Lift as much of the burden from users as possible by handling inherent complexity during design and development.
- Don't design for an idealised, rational user.
- Put guidance in context (tooltips) for active users.
- Use **progressive disclosure** (dropdowns, accordions, mega-menus) to manage the complexity that remains visible.
- Don't simplify interfaces to the point of abstraction.
**Examples:** Email clients prefill the sender and autocomplete recipients. Gmail Smart Compose. "Shipping same as billing". Apple Pay. Amazon Go's checkout-free stores. Intent-based natural-language AI interfaces that hide the complexity of commands.
**Origin:** Larry Tesler (Xerox PARC in the mid-1980s, later Apple). His argument: if a million users each lose a minute a day to complexity an engineer could remove in a week, you're penalising users to make the engineer's life easier. Bruce Tognazzini added a counterpoint: when an app is simplified, people take on more complex tasks.
**Related:** Occam's Razor, Hick's Law, Postel's Law, Paradox of the Active User.

## 28. Von Restorff Effect
https://lawsofux.com/von-restorff-effect/

**Definition:** Among similar items, the one that differs is the one most likely to be remembered. Also called the Isolation Effect.
**Why:** Distinctiveness captures attention and encoding.
**Apply:**
- Make important information and key actions visually distinctive (the primary CTA, a recommended plan, a critical alert).
- Use **restraint**. Too many emphasised elements compete, and loud ones may be mistaken for ads.
- **Don't rely on colour alone**. Add shape, size, weight, icons or labels for people with colour-vision deficiencies or low vision.
- Be careful with motion as a contrast cue, and respect reduced-motion preferences.
**Origin:** Hedwig von Restorff (1933).
**Related:** Selective Attention, Law of Similarity, Serial Position Effect.

## 29. Working Memory
https://lawsofux.com/working-memory/

**Definition:** The cognitive system that briefly holds and manipulates the information needed for a task.
**Why:** It holds roughly **4–7 chunks**, each fading after about **20–30 seconds**. We're good at *recognising* things we've seen and bad at *recalling* new information.
**Apply:**
- Show only necessary, relevant information.
- **Recognition over recall:** show what's already been seen (visited-link styling, breadcrumbs, recently viewed items).
- **Put the memory burden on the system:** carry information across screens (comparison tables, order summaries, keeping the search query visible on results pages).
**Origin:** The term was coined by Miller, Galanter and Pribram (1960s). Atkinson and Shiffrin's "short-term store" (1968). The modern concept emphasises manipulating information, not just storing it.
**Related:** Cognitive Load, Miller's Law, Chunking, Selective Attention.

## 30. Zeigarnik Effect
https://lawsofux.com/zeigarnik-effect/

**Definition:** People remember unfinished or interrupted tasks better than finished ones.
**Why:** An incomplete task creates mental tension that keeps it active in memory.
**Apply:**
- Give clear signs that more content exists (partially visible next card, "Show more", cut-off rows) to invite discovery.
- Show incomplete progress ("Profile 60% complete") and clear progress indicators to motivate completion.
- Artificial progress toward a goal increases the motivation to finish.
**Watch out:** Don't weaponise open loops with endless streaks or nagging that works against users' own goals.
**Origin:** Bluma Zeigarnik (1920s), Berlin School of experimental psychology.
**Related:** Goal-Gradient Effect, Peak-End Rule, Working Memory.

---

# Part 3: Playbook

Part A distils the 8 articles on lawsofux.com/articles (paraphrased, © Jon Yablonski, CC BY-NC-ND 4.0).
Part B turns the laws into checklists for common UI scenarios. Use these when auditing or building.

## Contents
- A1. Design principles for reducing cognitive load (2015)
- A2. Designing with Occam's Razor (2017)
- A3. The psychology of design, and ethics (2018)
- A4. UX psychology teardown: Google Search (2020), a model for audits
- A5. Peak-End Rule and journey mapping (2020)
- A6. Tesler's Law, complexity bias and progressive disclosure (2024, book excerpt)
- A7. Onboarding for active users (2024)
- A8. Familiar vs. novel (2024)
- B. Scenario checklists: forms · navigation · onboarding · loading/performance · pricing & choice · lists/content pages · CTAs & emphasis · redesigns · errors & empty states · multi-step flows · mobile/touch

---

## A1. Design principles for reducing cognitive load
https://lawsofux.com/articles/2015/design-principles-for-reducing-cognitive-load/

Every visit to a site starts a learning process: users have to learn the interface while remembering why they came. Load has **three root causes: too many choices, too much thinking required, and lack of clarity.** Remedies:
1. **Avoid unnecessary elements.** Anything that doesn't help the goal works against it (excess colours, imagery, flourishes). But don't pursue simplicity at the cost of clarity.
2. **Use common design patterns** so there's less to learn.
3. **Eliminate unnecessary tasks.** Reading, remembering and deciding all add load. Offload them with editable defaults and reuse of earlier input, or with anticipatory design.
4. **Minimise choices,** especially in navigation, forms and dropdowns.
5. **Display choices as a group.** When options are split and some are hidden, users assume the visible ones are the full set and never find the rest.
6. **Aim for readability, not just legibility.** Typography should suit the content and stay out of the way.
7. **Use icons with caution.** Only a few are universal (print, close, play/pause, share). Most need text labels.

## A2. Designing with Occam's Razor
https://lawsofux.com/articles/2017/designing-with-occams-razor/

"Entities must not be multiplied beyond necessity." Designers tend to add details they assume will delight, such as animations or off-screen menus, which instead distract.
- **Keep it simple:** ask what the minimum amount of UI is that lets content be found and understood. Start simple and add complexity only when needed. "Good design is as little design as possible."
- **Edit ruthlessly:** evaluate each element and pattern, and simplify or remove anything that doesn't carry meaning or value. Design critiques force you to state the reason behind each decision.
- Perfection is reached when there's nothing left to take away.

## A3. The psychology of design, and ethics
https://lawsofux.com/articles/2018/the-psychology-of-design/

Three core principles and their lessons:
- **Hick's Law + cognitive load:** remotes went from feature-bloated, to "grandparent-friendly" versions with taped-over buttons, to smart-TV remotes that move complexity into on-screen menus. Slack onboarding reveals features progressively. *Break long processes into screens with fewer options.*
- **Miller's Law + chunking:** "7" is widely misused as a hard cap. The value is in chunking (phone numbers, formatted content, modular layouts).
- **Jakob's Law + mental models:** form controls imitate physical ones. Snapchat's 2018 forced redesign caused mental-model discordance, public backlash and users moving to Instagram. Google (YouTube, Gmail, Calendar) let users opt in and revert.

**Ethics:** the same knowledge can build intuitive products or addictive ones. Responsibilities:
1. Acknowledge how minds can be exploited.
2. Question what should be built, not only what can be.
3. Look beyond usage metrics. Talk to users about how the product affects their lives, and consider measures like "meaningful interactions" instead of time-on-site. Digital-wellbeing features (usage dashboards, notification controls) are the positive model.

## A4. UX psychology teardown: Google Search
https://lawsofux.com/articles/2020/ux-psychology-google-search/

A worked example of **analysing an experience step by step and naming the principle behind each design choice.** Use the same method for audits:
- **Landing page (Hick's Law):** a centred, auto-focused search box, with extra options removed. Autocomplete saves keystrokes and decisions.
- **Results page (Hick's Law):** filtering options appear only *after* a query, so friction is deferred rather than removed.
- **Working memory:** the original query stays visible, so users don't have to remember it while scanning results.
- **Doherty Threshold:** results are fast and the time taken is even shown, so attention doesn't drift.
- **Chunking + Law of Proximity:** each result is a distinct chunk with a consistent internal hierarchy and spacing between results, which makes the page scannable.
- **Uniform Connectedness:** borders around videos and featured snippets group them and give them priority.

## A5. Peak-End Rule and journey mapping
https://lawsofux.com/articles/2020/peak-end-rule/

- The evidence: the cold-water study (1993), and colonoscopy studies (1996, 2003) where extending the procedure with a gentler ending led patients to rate it less unpleasant and made them more likely to return.
- The Peak-End Rule is a **memory bias**, related to the recency effect.
- **Mailchimp** turns the stressful moment of sending into a memorable one with character and humour, and rewards completion.
- **Uber** handles the negative peak of waiting with three ideas: **idleness aversion** (keep people engaged), **operational transparency** (show the ETA and how it's calculated), and **goal-gradient** (show step-by-step progress). This cut cancellations.
- **Journey mapping** to find peaks:
  - **Lens:** persona, scenario and expectation. For example, "Jane orders a ride and expects it within 10 minutes."
  - **Experience:** phases, then actions, then mindset (thoughts, pain points, questions), then an **emotion line** across the timeline. The emotion line is where peaks show up.
  - **Insights:** opportunities, metrics, and who owns them internally.
- **Negative peaks are inevitable** (outages, bugs, 404s). Prepare fallbacks, and treat errors as chances to show care and personality.

## A6. Tesler's Law, complexity bias and progressive disclosure
https://lawsofux.com/articles/2024/teslers-law/

- The central question is who carries the complexity: the user, or the designers and developers? Past a point, complexity can only be moved.
- **Complexity bias:** people favour complicated solutions because complexity looks like expertise. In a 1989 rule-discovery experiment, participants guessed elaborate rules when the real rule was simply "three ascending numbers". *If you find yourself favouring the complex solution, you probably don't understand the problem well enough yet.* Spend more time with the problem.
- **Examples of absorbing complexity:** email clients prefill the sender and autocomplete recipients, Gmail Smart Compose and Smart Reply, "shipping = billing", Apple Pay, Amazon Go.
- **Intent-based interaction (AI):** natural language lets users describe the outcome instead of issuing commands through a GUI. It lowers the barrier to power-user capability (for example, Mixpanel Spark for asking data questions in plain language).
- **Progressive disclosure:** show the important things by default and keep the rest one step away (dropdowns, accordions, toggles, and Stripe's hover mega-menu).
- Designers have a responsibility to deal with inherent complexity. Otherwise they ship it to users.

## A7. Onboarding for active users
https://lawsofux.com/articles/2024/onboarding-for-active-users/

- **Product tours** (sequential overlays before use) conflict with how active users behave: they skip the tours and resent being blocked.
- Better patterns:
  - **Contextual tooltips:** lightweight, well-timed help that aids discovery.
  - **Progressive onboarding:** reveal features gradually as users build familiarity (Slackbot teaching messaging first).
  - **"Get started" templates or checklists:** Notion's starter page lets people learn by doing, at their own pace, and they can come back to it later.
- It mirrors how people learn: each step builds on the last.

## A8. Familiar vs. novel
https://lawsofux.com/articles/2024/familiar-vs-novel/

- **Familiarity is the default.** Matching existing mental models makes the interface recede into the background, which raises completion, sign-ups and conversions (for example, e-commerce conventions).
- **When novelty is justified:**
  1. **Differentiation** from competitors is the goal. Arc browser's sidebar layout and deep personalisation are an example.
  2. **Disruption** through new technology changes how people engage. Perplexity's AI answers versus lists of links are an example.
  3. **Exploration or surprise** is the desired outcome. Immersive scroll storytelling like the "Sculpting Harmony" site on the Walt Disney Concert Hall is an example.
- In all cases, base it on **user research and testing**. Novelty must never cost basic usability. If it does, reconsider.

---

## B. Scenario checklists

Use these when auditing (turn each failed check into a finding) or as a pre-flight check when building. Each check shows the relevant laws in brackets.

### Forms and data entry
- [ ] Only necessary fields. Optional fields are clearly marked or removed. [Occam, Cognitive Load]
- [ ] Long forms are chunked into labelled sections or steps, with progress shown. [Chunking, Goal-Gradient]
- [ ] Labels sit close to their own field, not equidistant between fields. [Proximity]
- [ ] Autofill, autocomplete, sensible defaults, and "same as billing". [Tesler, Parkinson]
- [ ] Flexible input formats accepted and normalised (spaces, dashes, case, pasted whitespace). Clear inline validation. [Postel]
- [ ] Earlier answers are summarised, not re-asked, and users don't have to remember them. [Working Memory]
- [ ] Standard controls used for their standard meaning. [Jakob, Mental Model]
- [ ] Error messages appear next to the field, say how to fix it, and don't rely on colour alone. [Proximity, Von Restorff (accessibility)]
- [ ] Submit button is large and near the last field. [Fitts]

### Navigation and information architecture
- [ ] Few top-level items, based on what most users need, with the rest reachable one step away. [Hick, Pareto, Progressive disclosure]
- [ ] Most important items at the start and end of the bar. [Serial Position]
- [ ] Conventional placement: logo links home, search and account at the top right, bottom tab bar on mobile. [Jakob]
- [ ] Current location shown (active state, breadcrumbs) and visited links are distinct. [Working Memory]
- [ ] Links look clearly different from plain text. [Similarity]
- [ ] Icons have text labels unless they're truly universal. [Cognitive Load]
- [ ] No arbitrary "max 7" rule. Grouping and chunking come first. [Miller]

### Onboarding and first-run
- [ ] No mandatory multi-slide tour before first use. Users can act right away. [Paradox of the Active User]
- [ ] Features revealed progressively. Help is contextual (tooltips, empty states, checklists). [Hick, Tesler]
- [ ] Setup checklist with visible progress, ideally with a head start already ticked. [Goal-Gradient, Zeigarnik]
- [ ] First success is quick and celebrated. [Peak-End, Flow]

### Loading, performance and waiting
- [ ] Every action gets feedback in under about 400 ms (pressed state, optimistic update, spinner). [Doherty]
- [ ] Skeleton screens or progressive loading instead of blank screens. [Doherty, perceived performance]
- [ ] Waits over a few seconds show progress, ETA or steps, and keep people engaged. [Goal-Gradient, Peak-End (Uber's pattern)]
- [ ] Any deliberate delay (a "we're checking…" step) is honest. [Doherty, ethics]

### Pricing, plans and product choice
- [ ] A small number of tiers, with one recommended option highlighted. [Hick, Choice Overload, Von Restorff]
- [ ] Side-by-side comparison on the same attributes. [Choice Overload, Working Memory]
- [ ] Filters, search and sorting for large catalogues. [Choice Overload]
- [ ] Key plan or benefit placed first or last in feature lists. [Serial Position]

### Content pages, lists and dashboards
- [ ] Clear hierarchy of headings, short sections and scannable chunks. No walls of text. [Chunking, Cognitive Load]
- [ ] Related items grouped by spacing first, then containers, without heavily nested boxes. [Proximity, Common Region]
- [ ] Consistent styling for the same kind of item. [Similarity, Prägnanz]
- [ ] Real content doesn't look like ads or sit next to them. [Selective Attention (banner blindness)]
- [ ] Signs that more content exists (partially visible next item, "Show more"). [Zeigarnik]
- [ ] Dashboards lead with the few metrics that matter most. [Pareto, Hick]

### CTAs and emphasis
- [ ] One primary action per view, visually distinct in more than colour alone. [Von Restorff]
- [ ] Few emphasised elements, so nothing competes and nothing looks like an ad. [Von Restorff, Selective Attention]
- [ ] Targets large, well spaced and within easy reach. Destructive actions are not in the easiest spot. [Fitts]
- [ ] Clear signs of what's clickable, with a consistent button style. [Similarity, Jakob]

### Redesigns and migrations
- [ ] The change is justified against the familiar pattern (differentiation, new technology, exploration), and tested. [Jakob, Familiar vs Novel]
- [ ] Opt-in preview, a feedback channel and a temporary way to switch back. [Jakob, Mental Model (the YouTube pattern)]
- [ ] Frequently used features stay easy to find. [Mental Model (the Snapchat lesson)]
- [ ] Changed elements are clearly signalled so they aren't missed. [Selective Attention (change blindness)]

### Errors, empty states and edge moments
- [ ] Errors are human, specific and recoverable. 404s and outage pages are friendly and helpful. [Peak-End]
- [ ] Empty states teach the next action. [Paradox of the Active User]
- [ ] Confirmation and success screens end the journey on a high. [Peak-End]
- [ ] Undo is preferred over "Are you sure?" where possible, so exploring is safe. [Paradox of the Active User, Flow]

### Multi-step flows (checkout, booking, wizards)
- [ ] Stepper shows the current step, total steps and connected progress. [Goal-Gradient, Uniform Connectedness]
- [ ] Order and choice summary stays visible. [Working Memory]
- [ ] Saved payment and one-tap options, with no duplicated entry. [Tesler, Parkinson]
- [ ] The most stressful step (payment) is calm and reassuring, and the ending is satisfying. [Peak-End]

### Mobile and touch
- [ ] Touch targets are comfortably large (around 44–48 px) with spacing between them. [Fitts]
- [ ] Primary actions within thumb reach, usually in the lower part of the screen. [Fitts]
- [ ] Platform conventions respected (iOS and Android navigation and gestures). [Jakob]
- [ ] Motion respects reduced-motion settings. [Von Restorff (accessibility)]