import { 
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Globe,
  HeartHandshake,
  Coins,
  FileText,
  Award,
  Compass,
  Plane,
  Lock,
  Sparkles,
  Flag,
  Gamepad2,
  Utensils,
  Briefcase,
  Shirt,
  Smartphone,
  Luggage,
  AlertTriangle,
  Heart,
  Smile,
  MapPin,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Zap,
  CloudRain,
  Sun,
  Eye,
  Star
} from "lucide-react";

export type FaqCategory = 
  | "survival" 
  | "types" 
  | "packing" 
  | "social" 
  | "funding" 
  | "visas" 
  | "euronova"
  | "special";

export const FAQ_CATEGORIES = [
  { id: "all", label: "All Knowledge" },
  { id: "special", label: "Special Workshop" },
  { id: "survival", label: "Survival & Culture" },
  { id: "types", label: "Project Types" },
  { id: "packing", label: "Packing & Logistics" },
  { id: "social", label: "Social & Dorms" },
  { id: "funding", label: "Travel & Grants" },
  { id: "visas", label: "Visas & Youthpass" },
  { id: "euronova", label: "Platform Rules & XP" },
] as const;

import { FAQ_LOCALIZATIONS } from "./faqTranslations/index";

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FAQ_DATA_RAW: FaqItem[] = [
  // =========================================================================
  // 1. SURVIVAL TIPS & CULTURAL EXCHANGE (CRITICAL BACKPACKER ADVICE)
  // =========================================================================
  {
    id: "surv-flag-marker",
    category: "survival",
    question: "Why should every participant pack their country's flag and permanent markers?",
    answer: "This is the #1 golden tradition of European youth mobilities. Buy a medium-sized cloth flag of your country (or region) and bring two fine-tip permanent markers (like Sharpies). On the final evening, everyone sits together and writes heartfelt personal messages, jokes, contacts, and farewell notes across your flag. It becomes an irreplaceable, lifelong emotional relic of your international family.",
    icon: Flag,
  },
  {
    id: "surv-card-games",
    category: "survival",
    question: "What ice-breaker games should you bring for the first night?",
    answer: "The first evening can feel awkward before people know each other. Packing small, fast-paced card games like Uno, Dobble, Jungle Speed, Exploding Kittens, or a standard 54-card deck is pure social magic. Pulling out a deck of cards in the common lounge breaks linguistic barriers instantly and turns 30 quiet strangers into laughing friends within 20 minutes.",
    icon: Gamepad2,
  },
  {
    id: "surv-intercultural-snacks",
    category: "survival",
    question: "What traditional food and cheap souvenirs should you bring for Intercultural Night?",
    answer: "For Intercultural Night, bring shelf-stable traditional snacks from your hometown that cannot melt easily: regional sweets, artisanal cookies, vacuum-packed cheeses, cured meats, or famous spices. In addition, bring cheap regional postcards, pins, stickers, or small souvenirs to gift to your roommates and group leaders as a token of friendship.",
    icon: Utensils,
  },
  {
    id: "surv-language-barrier",
    category: "survival",
    question: "How do you navigate language barriers if your English is not fluent?",
    answer: "Erasmus English is universally kind, supportive, and non-judgmental. Nobody expects Shakespearean prose. European youth projects celebrate diversity, and facilitators use non-verbal energizers, drawings, and bodily theatre. If you get stuck on a word, use gestures, Google Translate offline, or ask fellow national teammates. Within two days, your confidence will skyrocket effortlessly.",
    icon: Globe,
  },
  {
    id: "surv-post-erasmus-blues",
    category: "survival",
    question: "What is 'Erasmus Blues' or Post-Erasmus Depression, and how do you cope with the return home?",
    answer: "Erasmus Blues or Post-Erasmus Depression is the bittersweet emotional shock of returning to ordinary daily routine after living in an intense, utopian bubble with 40 inspiring friends from 8 nations. The best remedies: schedule video reunion calls with your group, print photos, write in your Youthpass dossier, share your learnings locally, and channel your momentum into applying for your next Erasmus+ project on EuroNova!",
    icon: Sparkles,
  },
  {
    id: "surv-solo-traveler",
    category: "survival",
    question: "How do you navigate an Erasmus+ project if you are the only person from your country?",
    answer: "Traveling solo as the sole national representative is one of the most rewarding adventures in Europe. While national groups often speak their native tongue during breaks, solo participants naturally bond with everyone across delegations. Bringing a traditional snack, playing card games, and maintaining an open smile will make you one of the most popular and culturally connected participants in the entire project.",
    icon: Users,
  },

  // =========================================================================
  // 2. PROJECT TYPES & EUROPEAN OPPORTUNITIES
  // =========================================================================
  {
    id: "type-discovereu",
    category: "types",
    question: "What is DiscoverEU and how can 18-year-olds travel Europe for free by rail?",
    answer: "DiscoverEU is an official European Union initiative giving 18-year-old European citizens free Interrail / Eurail train passes to explore the continent for up to 30 days. Application rounds open twice a year (spring and autumn) on the European Youth Portal. Winners receive a flexible train pass, European Youth Card discounts, and invitations to regional cultural meetups.",
    icon: Compass,
  },
  {
    id: "type-training-course-vs-ye",
    category: "types",
    question: "What is the difference between a Training Course (TC) and a Youth Exchange (YE)?",
    answer: "Youth Exchanges (YE) focus on peer-to-peer intercultural learning for youth aged 13–30 with group leaders, addressing themes like mental health, sustainability, or digital arts through games and debates. Training Courses (TC) are professional capacity-building seminars for youth workers, NGO coordinators, and volunteers aged 18+ with no upper age limit, focusing on advanced educational tools, project design, and mentorship techniques.",
    icon: Users,
  },
  {
    id: "type-esc-individual-vs-teams",
    category: "types",
    question: "How does ESC Individual Volunteering differ from Volunteering Teams?",
    answer: "Individual Volunteering lasts from 2 to 12 months (or short-term 2 weeks to 2 months) where 1–3 volunteers embed inside a local NGO, school, or community center. Volunteering Teams unite 10 to 40 volunteers from multiple countries for 2 to 8 weeks to tackle concrete collective challenges—such as organizing an eco-festival, clearing wildfire zones, renovating historic sites, or supporting refugee camps.",
    icon: HeartHandshake,
  },
  {
    id: "type-eye-entrepreneurs",
    category: "types",
    question: "What is Erasmus for Young Entrepreneurs (EYE) and what grant does it provide?",
    answer: "Erasmus for Young Entrepreneurs is a cross-border exchange program that matches aspiring or newly established entrepreneurs with experienced host entrepreneurs in another European country for 1 to 6 months. The EU provides a monthly financial grant (typically €600 to €1,100 depending on destination country living costs) to cover living and accommodation costs while learning on the job.",
    icon: Briefcase,
  },
  {
    id: "type-capacity-building",
    category: "types",
    question: "What are Capacity Building projects in the Field of Youth?",
    answer: "Capacity Building projects foster international cooperation between Erasmus+ programme countries and neighboring regions (Western Balkans, Eastern Partnership, Southern Mediterranean, Latin America, Africa, and Asia). They organize transcontinental mobilities, policy dialogues, and field testing of new educational curricula to upgrade youth work quality globally.",
    icon: Globe,
  },
  {
    id: "type-esc-health-cigna-overview",
    category: "types",
    question: "How does ESC health coverage with Cigna / Henner protect long-term volunteers?",
    answer: "Every European Solidarity Corps participant is registered in the official EU solidarity insurance plan provided by Cigna and Henner. This complimentary private medical insurance guarantees 100% reimbursement for doctor consultations, prescription drugs, hospitalization, emergency dental treatment, and repatriation, operating 24/7 in all EU languages alongside the European Health Insurance Card (EHIC).",
    icon: ShieldCheck,
  },
  {
    id: "type-youthpass-non-formal-learning",
    category: "types",
    question: "How does the Youthpass certificate recognize non-formal education across all project types?",
    answer: "Whether you attend a Youth Exchange, Training Course, or ESC Volunteering mission, your participation is certified through Youthpass. Unlike formal academic diplomas, Youthpass documents self-directed learning, team leadership, cross-cultural conflict resolution, and the 8 key European competences through structured daily reflection mentored by trainers.",
    icon: Award,
  },
  {
    id: "type-annual-limit",
    category: "types",
    question: "Is there a limit on how many Erasmus+ projects you can attend in one year?",
    answer: "There is no legal EU limit on the number of Youth Exchanges or Training Courses you can attend per year, provided the mobility dates do not overlap and your sending NGO approves your selection. However, ESC European Solidarity Corps individual volunteering has a strict lifetime limit of 14 cumulative months.",
    icon: Calendar,
  },

  // =========================================================================
  // 3. PACKING & LOGISTICS GUIDE
  // =========================================================================
  {
    id: "pack-ryanair-cabin",
    category: "packing",
    question: "How do you pack everything into a small free under-seat backpack (40x20x25 cm)?",
    answer: "Low-cost European airlines (Ryanair, WizzAir, easyJet) charge heavily for overhead luggage. To travel completely free: pack a flexible 20-30L school backpack. Use compression packing cubes or roll your garments tightly using the 'Ranger Roll' technique. Wear your bulkiest jacket, hoodie, and hiking boots during the flight. Store liquids in transparent 100ml bottles inside a clear ziplock pouch.",
    icon: Briefcase,
  },
  {
    id: "pack-essential-documents",
    category: "packing",
    question: "What essential physical and digital documents must you always carry?",
    answer: "Always pack: 1. Passport or national ID card (valid for at least 6 months); 2. Physical European Health Insurance Card (EHIC / TSE); 3. Printed or offline PDF boarding passes for your flights and connecting trains; 4. Host NGO's Infopack and coordinator emergency phone numbers; 5. Signed parental consent form if you are under 18; 6. A digital scan of all documents stored on cloud storage.",
    icon: FileText,
  },
  {
    id: "pack-plug-adapters",
    category: "packing",
    question: "Do you need electrical plug adapters across European countries?",
    answer: "Most of continental Europe uses standard Type C and Type F plugs (230V, two round pins). However, if your project is in Ireland, Cyprus, or Malta, you will need a UK Type G (three-pin rectangular) adapter. Italy and Switzerland occasionally feature recessed 3-pin Type L or Type J sockets. Packing a compact universal adapter with dual USB ports saves your phone battery every time.",
    icon: Sparkles,
  },
  {
    id: "pack-travel-pharmacy",
    category: "packing",
    question: "What basic first-aid and medical supplies should you keep in your backpack?",
    answer: "Youth venues are often situated in rural retreat centers far from 24/7 pharmacies. Pack a mini-pharmacy: Ibuprofen / Paracetamol (pain and fever), blister bandages / Compeed (essential after long walks), activated charcoal or Imodium (upset stomach), antihistamines (seasonal allergies or insect bites), earplugs, throat lozenges, and any personal prescription medication in original boxes.",
    icon: ShieldCheck,
  },
  {
    id: "pack-earplugs-eyemask",
    category: "packing",
    question: "Why are silicon earplugs and a sleeping eye-mask non-negotiable essentials?",
    answer: "You will share dormitories with 3 to 8 roommates from diverse backgrounds and time zones. Snoring, late-night bathroom trips, and morning sunrise can disrupt your rest. High-density foam or reusable silicone earplugs paired with an ergonomic 3D eye-mask guarantee 8 hours of restorative sleep, keeping your energy high for morning workshops.",
    icon: Clock,
  },
  {
    id: "pack-energizer-clothes",
    category: "packing",
    question: "What clothes should you pack for daily energizers, simulations, and outdoor team-building?",
    answer: "Erasmus+ is active, participatory, and full of movement. Leave formal suits and high heels at home. Pack comfortable casual sportswear, stretchable pants, breathable t-shirts, and flexible sneakers for morning energizers and theatre games. Also include a waterproof rain windbreaker and a warm fleece layer for evening outdoor campfires or stargazing sessions.",
    icon: Sparkles,
  },

  // =========================================================================
  // 4. SOCIAL & LIVING LOGISTICS
  // =========================================================================
  {
    id: "soc-shared-dorms",
    category: "social",
    question: "What are the unspoken golden rules of living in shared project dorms?",
    answer: "1. Never turn on the overhead bright light after midnight—use your phone flashlight; 2. Keep your suitcase zipped to prevent items from spreading across the floor; 3. Take swift showers (5–7 minutes) so everyone has hot water before morning energizers; 4. Air out the room each morning; 5. Keep voice volume down in corridors after quiet hours (typically 23:00).",
    icon: Users,
  },
  {
    id: "soc-dietary-vegan-halal",
    category: "social",
    question: "How do hosting NGOs cater to vegan, vegetarian, halal, and celiac dietary needs?",
    answer: "European Commission funding guidelines explicitly oblige hosting organizations to provide balanced, healthy meals accommodating declared dietary restrictions. You must specify your requirements (vegan, vegetarian, halal, gluten-free, lactose-free, or severe nut allergies) in your initial application dossier. Professional cooks prepare separate designated portions during all mealtimes.",
    icon: Utensils,
  },
  {
    id: "soc-free-day-time",
    category: "social",
    question: "What happens during the Free Day or afternoon leisure time?",
    answer: "Most 7–10 day projects include one dedicated 'Free Day' for cultural excursions. Participants often organize group visits to nearby historical landmarks, rent bicycles, hike in surrounding nature reserves, or sample local cuisine. Always inform your Group Leader of your travel plans and return to the venue before evening headcount.",
    icon: Compass,
  },
  {
    id: "soc-alcohol-rules",
    category: "social",
    question: "What is the policy regarding alcohol and substance use on Erasmus+ mobilities?",
    answer: "European youth mobilities maintain strict codes of conduct. Alcohol consumption is prohibited during working session hours, workshops, and in sleeping dormitories. Many youth hostels enforce a complete zero-alcohol campus policy. Any possession or use of illegal substances leads to immediate expulsion from the project at the participant's own financial expense.",
    icon: ShieldCheck,
  },
  {
    id: "soc-pre-mobility-chat",
    category: "social",
    question: "How do participants coordinate flight arrivals and joint airport transfers?",
    answer: "Approximately 2 to 3 weeks prior to project kickoff, hosting coordinators create an official WhatsApp or Telegram group for all international participants. Here, volunteers share flight numbers and arrival terminals to coordinate shared public buses, trains, or collective taxi shuttles directly from the airport to the project venue.",
    icon: Plane,
  },

  // =========================================================================
  // 5. TRAVEL BANDS, GRANTS & REIMBURSEMENTS
  // =========================================================================
  {
    id: "trav-distance-calculator",
    category: "funding",
    question: "How does the European Commission calculate your travel reimbursement ceiling?",
    answer: "Travel funding is calculated using the European Commission Distance Calculator tool, which measures linear distance in kilometers between your home city and the project venue city. A fixed lump-sum grant band is assigned to cover your round-trip international transportation tickets.",
    icon: Compass,
  },
  {
    id: "trav-distance-bands-detail",
    category: "funding",
    question: "What are the exact official Erasmus+ Distance Bands and funding amounts?",
    answer: "Official distance bands: 10–99 km: €28 | 100–499 km: €211 standard / €285 Green Travel | 500–1,999 km: €309 standard / €417 Green Travel | 2,000–2,999 km: €395 standard / €535 Green Travel | 3,000–3,999 km: €580 standard / €785 Green Travel | 4,000–7,999 km: €1,188 standard. Outermost Regions (RUP) qualify for high-cost travel exceptional allowances.",
    icon: Plane,
  },
  {
    id: "trav-green-bonus-rules",
    category: "funding",
    question: "How does Green Travel work and what extra paid travel days are granted?",
    answer: "If you travel over 50% of your round-trip distance via sustainable transport (train, electric vehicle, coach/bus, or verified carpooling), you unlock: 1. A higher travel reimbursement grant (up to 35% more budget); and 2. Up to 4 additional paid travel days for accommodation and food expenses during transit.",
    icon: Compass,
  },
  {
    id: "trav-boarding-passes-audit",
    category: "funding",
    question: "Why must you strictly save every physical or PDF airline boarding pass?",
    answer: "Under EU financial auditing rules, flight booking invoices only show payment, not physical presence. Original boarding passes (with QR code and seat number) prove you actually boarded the plane. Host NGOs cannot legally disburse your travel reimbursement without return boarding passes and the completed EU Survey.",
    icon: FileText,
  },
  {
    id: "trav-personal-extra-days",
    category: "funding",
    question: "Can you travel up to 2 days before or after official project dates?",
    answer: "Yes! Erasmus+ regulations allow participants up to 2 personal extra travel days before or after project dates (or up to 4 days with Green Travel) for personal sightseeing. The airfare ticket price on those dates cannot exceed standard project-day prices, and extra night lodgings are self-funded.",
    icon: Calendar,
  },
  {
    id: "trav-esc-pocket-money",
    category: "funding",
    question: "How is ESC Pocket Money paid and what is the typical daily rate?",
    answer: "Pocket money is a daily allowance (€4.00 to €7.00 per day, averaging €120 to €210 per month) set by European National Agencies according to destination living costs. Paid monthly via bank transfer, it is 100% tax-free and reserved for private recreation, completely separate from food allowances.",
    icon: Coins,
  },
  {
    id: "trav-esc-cigna-insurance",
    category: "funding",
    question: "How does the private Cigna / Henner international insurance protect ESC volunteers?",
    answer: "Every registered ESC volunteer is enrolled in a free private European medical scheme covering 100% of doctor visits, emergency hospitalization, dental emergencies, prescription drugs, medical evacuation, and liability. It provides 24/7 multilingual tele-consultation across the EU.",
    icon: ShieldCheck,
  },

  // =========================================================================
  // 6. VISAS, YOUTHPASS & RECOGNITION
  // =========================================================================
  {
    id: "visa-schengen-free-invitation",
    category: "visas",
    question: "How do non-EU participants apply for a free Schengen Visa for Erasmus+?",
    answer: "The accredited hosting NGO issues an official bilingual Letter of Invitation and Project Mandate Agreement. Under European visa facilitation directives, consulates and embassies generally waive visa application fees for young people traveling on official EU-funded educational mobilities.",
    icon: FileText,
  },
  {
    id: "visa-youthpass-8-competences",
    category: "visas",
    question: "What are the 8 Key Competences certified on the official Youthpass?",
    answer: "Youthpass maps to the European Framework for Lifelong Learning: 1. Multilingual competence; 2. Personal, social and learning to learn; 3. Citizenship competence; 4. Entrepreneurship; 5. Cultural awareness & expression; 6. Digital competence; 7. Mathematical, science and engineering; 8. Literacy competence.",
    icon: Award,
  },
  {
    id: "visa-university-ects-credits",
    category: "visas",
    question: "Can Youthpass be recognized for university ECTS credits or job applications?",
    answer: "Yes. Many European universities accept Youthpass certificates to award optional ECTS credits for non-formal learning and community service. In career markets, recruiters value Youthpass as certified proof of soft skills, adaptability, and international teamwork.",
    icon: Award,
  },
  {
    id: "visa-oid-accreditation",
    category: "visas",
    question: "What is an OID (Organisation ID) and how can you verify an accredited NGO?",
    answer: "An Organisation ID (OID) is a unique alphanumeric identifier assigned by the European Commission to legal entities authorized to participate in Erasmus+ and ESC. You can verify any organization's authenticity on the official European Commission Erasmus+ portal.",
    icon: ShieldCheck,
  },

  // =========================================================================
  // 7. EURONOVA PLATFORM RULES & PROGRESSION
  // =========================================================================
  {
    id: "euro-level5-forum-shield",
    category: "euronova",
    question: "Why does EuroNova require Level 2 (100 XP) and True Trust Protocol gating to post in Global Forums?",
    answer: "Level 2 gating acts as an automated anti-spam firewall preventing commercial bot spam, phishing, and scam links. Requiring 100 XP alongside a non-restricted True Trust Score (30+) ensures that authentic European volunteers can participate right after setting up their profile, while blocking automated disposable spam accounts.",
    icon: Lock,
  },
  {
    id: "euro-how-to-gain-xp",
    category: "euronova",
    question: "What are the exact actions that grant XP and how does the leveling progression work?",
    answer: "XP is earned dynamically: +50 XP for completing your Volunteer Profile Dossier; +50 XP the first time you show interest in an active mission; +100 XP for submitting a verified review of an NGO you traveled with; and +2 XP daily for orbital exploration engagement. Total XP follows the mathematical curve 50 * L * (L - 1). Reaching Level 10 (4,500 XP) unlocks the Vanguard Milestone and eligibility to apply for the official EuroNova Support Specialist role.",
    icon: Sparkles,
  },
  {
    id: "euro-free-guarantee",
    category: "euronova",
    question: "Is EuroNova 100% free for young European participants?",
    answer: "Yes, completely free. EuroNova is an open youth initiative designed to democratize access to European mobility. We never charge subscription fees, hidden application fees, or booking commissions. Participation in Erasmus+ is your fundamental European right.",
    icon: Coins,
  },
  {
    id: "euro-360-moderation",
    category: "euronova",
    question: "How does the True Trust Protocol (0-100 Reputation System) operate across EuroNova?",
    answer: "The True Trust Protocol is an algorithmic reputation engine calibrated from 0 to 100 with four distinct tiers: Restricted (0-19, muted from forums and gated from submissions), Provisional (20-49, base 30 starting score for new volunteers), Trusted (50-79, community verified with priority project matching and poll voting), and Elite (80-100, veteran volunteers and verified NGOs with flawless tenure). Verified community actions increase Trust, while validated moderation reports deduct -15 points per infraction.",
    icon: ShieldCheck,
  },

  // =========================================================================
  // 8. ADVANCED PAPERWORK & REIMBURSEMENTS (NEW 60 EXPANSION)
  // =========================================================================
  {
    id: "fund-eu-mobility-tool-survey",
    category: "funding",
    question: "How do you properly complete the official EU Mobility Tool survey (Participant Report)?",
    answer: "Within 48 hours after your mobility ends, the European Commission sends an automated email invitation containing a unique link to the EU Mobility Tool survey. You must answer questions evaluating course methodology, logistics, accommodation, and your Youthpass self-assessment. Filling this out is a strict legal requirement: the system automatically issues a verification code that releases your final travel reimbursement from the host NGO.",
    icon: FileText,
  },
  {
    id: "fund-lost-physical-boarding-pass",
    category: "funding",
    question: "What should you do if you lose a physical airline boarding pass?",
    answer: "If you misplace a physical paper boarding stub, act immediately: 1. Search your airline app or email for the digital mobile boarding pass (PDF or Apple Wallet pass); 2. Contact the airline to request an official 'Certificate of Boarding' (or Passenger Manifest confirmation); 3. Provide supporting secondary proof: your booking invoice, passport entry/exit stamps, and Google Maps location timeline. National Agencies accept digital airline certificates in audit reviews.",
    icon: AlertTriangle,
  },
  {
    id: "fund-inforeuro-currency-exchange",
    category: "funding",
    question: "How is currency conversion calculated for travel invoices in non-Euro currencies?",
    answer: "Under European Commission financial rules, foreign currency expenditures (such as Polish Zloty, Czech Koruna, British Pounds, or Turkish Lira) cannot use fluctuating commercial bank rates. Host NGOs are legally bound to use the official 'InforEuro' exchange rate published by the European Commission for the month the grant was contracted or invoice paid. Always check InforEuro to know your exact reimbursed Euro amount.",
    icon: Coins,
  },
  {
    id: "fund-green-travel-proof",
    category: "funding",
    question: "What exact proofs must you provide to validate Green Travel grant funding?",
    answer: "To validate Green Travel funding (train, coach bus, or carpooling for over 50% of the journey), you must submit: all physical or digital train/bus tickets showing your name, date, origin, and destination; payment receipts; and timestamps. For carpooling: fuel toll receipts, vehicle registration, and a signed declaration listing the driver and all traveling participants.",
    icon: Compass,
  },
  {
    id: "fund-bank-transfer-sepa-fees",
    category: "funding",
    question: "How do international bank transfer fees work and why is a SEPA IBAN essential?",
    answer: "Under EU regulation 260/2012, SEPA credit transfers within the European Economic Area cannot carry extra fees compared to domestic transfers. To receive your reimbursement smoothly, provide your full IBAN and BIC/SWIFT. If your bank is outside the Eurozone, consider using multi-currency accounts (such as Revolut, Wise, or N26) to avoid exorbitant intermediary correspondent banking fees.",
    icon: Coins,
  },
  {
    id: "fund-ticket-purchase-deadline",
    category: "funding",
    question: "Can you purchase your travel tickets before receiving official approval from the host NGO?",
    answer: "Never purchase tickets without explicit written approval of your proposed flight itinerary from the hosting coordinator. If you purchase tickets with awkward arrival times requiring expensive private taxis or invalid travel dates, the hosting organization has the legal right to reject reimbursement. Always send flight screenshots first and wait for written confirmation.",
    icon: Clock,
  },
  {
    id: "fund-price-comparison-screenshots",
    category: "funding",
    question: "Why must you capture price comparison screenshots if traveling on non-standard dates?",
    answer: "If you plan to arrive up to 2 days before or stay 2 days after the official mobility dates for personal sightseeing, EU rules require proof that your non-standard ticket was not more expensive than flying on official project dates. Capture a screenshot from a flight aggregator (e.g. Skyscanner or Google Flights) on the day of booking showing prices on official project dates.",
    icon: Plane,
  },
  {
    id: "fund-group-bookings-vs-individual",
    category: "funding",
    question: "Is it better for the national sending NGO to book tickets as a group or individually?",
    answer: "When sending NGOs book tickets collectively as a group, they usually advance the travel funds directly, meaning participants do not have to pay out-of-pocket and wait months for reimbursement. If booking individually, ensure all national teammates book the same flights to share airport shuttles and support each other through flight disruptions.",
    icon: Users,
  },
  {
    id: "fund-local-transit-reimbursement",
    category: "funding",
    question: "Are local metro, city bus, and airport shuttle tickets eligible for reimbursement?",
    answer: "Yes. All public ground transit tickets connecting your home address to your departure airport, and the destination airport to the project venue, are eligible under your total distance band budget. Save physical metro tokens, regional train stubs, and bus tickets. Private taxis and rideshares (Uber, Bolt) are only reimbursable if no public transit exists and pre-approved in writing.",
    icon: MapPin,
  },

  // =========================================================================
  // 9. TRADING, SOUVENIRS & INTERCULTURAL SWAPPING
  // =========================================================================
  {
    id: "surv-trading-shirts-jerseys",
    category: "survival",
    question: "Why should you bring national football shirts, hats, or local clothing to trade?",
    answer: "An iconic, beloved Erasmus+ tradition on the final night is the 'Garment Swap'. Pack a regional football club jersey, a national team t-shirt, a bucket hat, or a local festival hoodie. Participants trade clothing and cultural memorabilia with fellow volunteers from across all participating European and partner countries in a vibrant Pan-European exchange. You will return home wearing an authentic international piece of your friend's hometown culture.",
    icon: Shirt,
  },
  {
    id: "surv-pins-coins-badges",
    category: "survival",
    question: "How do regional pins, coins, and embroidered badges build instant rapport?",
    answer: "Pack a small pouch of regional city pins, unique Euro commemorative coins, national flag badges, or embroidered patches. Gifting them to kitchen staff, trainers, or swapping them with international roommates is a classy, lightweight way to leave memorable tokens across Europe without overloading your backpack.",
    icon: Coins,
  },
  {
    id: "surv-postcard-writing-tradition",
    category: "survival",
    question: "What is the secret postcard writing box tradition during project reflection?",
    answer: "Many projects set up a 'Secret Postal Box' with personalized envelopes for each participant. Throughout the week, you drop handwritten thank-you notes, inside jokes, and drawings into each other's envelopes. Opening your envelope on the bus ride to the airport is an unforgettable, tear-jerking emotional highlight.",
    icon: FileText,
  },
  {
    id: "surv-traditional-crafts-swap",
    category: "survival",
    question: "What handmade or traditional crafts make the most meaningful intercultural gifts?",
    answer: "Small traditional woven bracelets (like Bulgarian Martenitsa or Greek Martis), painted miniature ceramics, regional keychains, or cultural bookmarks make meaningful, compact gifts. They show genuine pride in your cultural roots and serve as wonderful conversation starters during the first few days.",
    icon: HeartHandshake,
  },
  {
    id: "surv-music-playlist-sharing",
    category: "survival",
    question: "Why should you create a collaborative project Spotify playlist early on?",
    answer: "Music bridges cultural divides faster than anything else. Create a collaborative Spotify or Apple Music playlist on day 2 and invite every participant to add 3 favorite tracks from their home country—especially party anthems, folk tunes, and road-trip songs. Listening to that playlist months later instantly teleports you back to the project vibes.",
    icon: Sparkles,
  },
  {
    id: "surv-cultural-dances-teaching",
    category: "survival",
    question: "How do you prepare to teach a traditional dance during Intercultural Night?",
    answer: "You do not need to be a professional dancer! Pick a simple, circular folk dance with repetitive steps (like Greek Sirtaki, Spanish Sevillanas, Romanian Hora, or Celtic ceilidh). People love holding hands and learning the rhythm. Keep it light-hearted, energetic, and laughing when people stumble.",
    icon: Users,
  },
  {
    id: "surv-regional-language-slang",
    category: "survival",
    question: "Why should you keep a 'Slang Notebook' to learn local phrases from every delegation?",
    answer: "Carry a small pocket notepad. Ask people from each country to teach you 3 essential words: 'Thank you', 'Cheers / To health', and their funniest regional slang word. Greeting trainers or kitchen staff in their native dialect earns immense respect and immediate broad smiles.",
    icon: BookOpen,
  },

  // =========================================================================
  // 10. DEEP SURVIVAL & TRANSIT LOGISTICS
  // =========================================================================
  {
    id: "pack-laundry-long-projects",
    category: "packing",
    question: "How do you handle laundry during 10-day mobilities or multi-month ESC projects?",
    answer: "Youth venues often have 1 or 2 shared washing machines for 40 people. Pack dissolvable laundry detergent sheets (dry, spill-proof, TSA-friendly). For quick refreshes, rinse t-shirts, socks, and underwear in the bathroom sink with soap and hang them on a compact travel elastic clothesline with built-in clips.",
    icon: Sparkles,
  },
  {
    id: "surv-sleeping-in-airports",
    category: "survival",
    question: "How do you survive overnight layovers and sleeping in European airports?",
    answer: "Consult SleepingInAirports.net beforehand for quiet rest zones, padded armless benches, and 24-hour food spots. Wear warm layers (airports get freezing cold at 3 AM), loop your backpack strap around your leg so nobody can pull it while you rest, keep passport/money inside a neck wallet under your shirt, and set multiple loud vibration alarms.",
    icon: Clock,
  },
  {
    id: "surv-public-transit-apps-vs-taxis",
    category: "survival",
    question: "How do you navigate public transport safely vs predatory taxis in Eastern Europe and the Balkans?",
    answer: "Never take unmetered street taxis waiting outside train stations or airports—they routinely overcharge tourists 5x. Instead, use localized transit apps: Jakdojade (Poland), PID Lítačka (Czechia), BudapestGO (Hungary), Moovit, or app-based rideshares like Bolt and Uber. They give transparent pricing and accurate bus schedules.",
    icon: Compass,
  },
  {
    id: "surv-missed-connecting-flight",
    category: "survival",
    question: "What must you do if your flight is delayed and you miss your connecting flight?",
    answer: "If booked on a single ticket, proceed immediately to the airline transit customer service desk. Under EU Regulation 261/2004, the operating carrier must rebook you on the next available flight for free, provide meal vouchers, and arrange hotel lodging if delayed overnight. Notify your sending and host NGO coordinators immediately with your updated ETA.",
    icon: Plane,
  },
  {
    id: "surv-tap-water-europe",
    category: "survival",
    question: "Is tap water safe to drink across European project venues and cities?",
    answer: "Tap water is safe and strictly regulated across almost all of Western, Northern, and Central Europe. In certain Mediterranean islands, rural regions, or parts of Southeastern Europe, tap water is mineral-heavy or desalinated; venues will supply large filtered water carboys. Bringing an insulated reusable steel water bottle keeps plastic waste near zero.",
    icon: Utensils,
  },
  {
    id: "surv-sim-roaming-traps",
    category: "survival",
    question: "What are the non-EU roaming traps (Switzerland, Serbia, Bosnia, UK) and how do you avoid them?",
    answer: "Under 'EU Roam Like at Home', your EU SIM operates across the 27 EU nations plus Norway, Iceland, and Liechtenstein with no extra charges. BUT beware non-EU transit hubs: Switzerland, Serbia, Bosnia, North Macedonia, and Montenegro are NOT in the EU roaming zone; using 100MB there can cost €50+. Turn off mobile data before crossing these borders or install an affordable regional eSIM (Airalo, Holafly).",
    icon: Smartphone,
  },
  {
    id: "pack-reusable-water-bottle-tote",
    category: "packing",
    question: "Why should you always carry a reusable steel water bottle and a foldable tote bag?",
    answer: "Project venues provide filtered water dispensers, so an insulated bottle keeps water icy cold or tea hot for outdoor excursions. A foldable cloth tote bag takes zero space in your backpack and is perfect for carrying workshop materials, notebooks, shower toiletries, or groceries from local village markets.",
    icon: Luggage,
  },
  {
    id: "pack-winter-thermal-layers",
    category: "packing",
    question: "How do you pack for winter projects in Scandinavia, the Baltics, or mountain venues?",
    answer: "Layer smartly: 1. Moisture-wicking thermal merino/synthetic base layer (long-sleeve top and leggings); 2. Insulating mid-layer (fleece or wool sweater); 3. Wind- and waterproof outer shell. Pack insulated waterproof snow boots with deep tread, thick thermal socks, a beanie covering your ears, and touchscreen gloves.",
    icon: CloudRain,
  },
  {
    id: "pack-summer-mosquito-sun",
    category: "packing",
    question: "What should you prepare for summer projects in Southern Europe or rural lakeside retreat venues?",
    answer: "Mediterranean summer heatwaves regularly exceed 35°C. Pack high-SPF sunscreen (SPF 50+), UV-protective sunglasses, a breathable sunhat, and strong DEET or Picaridin mosquito repellent (vital for lake, forest, or river settings). Bring a lightweight microfiber towel that dries in 30 minutes.",
    icon: Sun,
  },
  {
    id: "pack-microfiber-towel",
    category: "packing",
    question: "Why is a quick-dry microfiber towel vastly superior to a standard cotton bath towel?",
    answer: "Standard cotton towels consume half your backpack, stay damp for days in shared dorms, and develop musty odors. An XL microfiber towel rolls up smaller than a can of soda, absorbs 4x its weight in water, and dries completely in 30 minutes when hung on a bunk bed post.",
    icon: Briefcase,
  },
  {
    id: "surv-cash-vs-card-rural",
    category: "survival",
    question: "Should you carry cash or cards when staying in secluded rural project venues?",
    answer: "While European cities are virtually cashless, rural village grocers, small local buses, and mountain hut cafes often take cash only. Withdraw €30 to €50 in small banknotes (€5, €10, €20) at the airport ATM upon arrival so you never get stuck without a way to buy emergency water, coffee, or snacks.",
    icon: Coins,
  },
  {
    id: "surv-safety-112-emergency",
    category: "survival",
    question: "What is 112 and how does the universal European emergency system work?",
    answer: "112 is the single universal emergency number functioning 100% free of charge across all 27 EU member states and neighboring nations. You can dial 112 from any mobile phone even without a SIM card or roaming signal, connecting you immediately to police, ambulance, or fire services with multilingual operators.",
    icon: ShieldCheck,
  },

  // =========================================================================
  // 11. SOCIAL DYNAMICS, MENTAL HEALTH & NETWORKING
  // =========================================================================
  {
    id: "soc-post-erasmus-depression-deep",
    category: "social",
    question: "What is 'Post-Erasmus Depression' and what practical steps help you overcome it?",
    answer: "After experiencing hyper-intensive intercultural connection, returning home to daily routines often feels grey, lonely, and misunderstood by hometown friends. Antidotes: 1. Join your local ESN (Erasmus Student Network) or youth NGO branch; 2. Channel your momentum into volunteering locally; 3. Organize monthly Zoom catchups with your project group; 4. Use EuroNova to find your next European mobility!",
    icon: Heart,
  },
  {
    id: "soc-maintaining-international-network",
    category: "social",
    question: "How do you maintain real, lasting friendships with your international network after returning home?",
    answer: "Keep the project WhatsApp or Telegram group active with life milestones, memes, and mutual travel visits. Many Erasmus+ alumni plan reunion trips in one of the participants' hometowns (e.g. visiting a friend in Prague, Naples, or Istanbul) and couch-surf with each other across Europe for years.",
    icon: Users,
  },
  {
    id: "soc-partnering-to-write-own-project",
    category: "social",
    question: "How can you team up with people you met to write and apply for your own Erasmus+ project (KA152)?",
    answer: "During project evenings, you often brainstorm shared social passions. You can form an informal youth group (minimum 4 youth aged 18-30) or partner with your sending NGO to submit an Erasmus+ KA152 Youth Exchange grant proposal during the February or October EU deadlines. The EU funds the entire budget, and you become the project coordinator!",
    icon: Sparkles,
  },
  {
    id: "soc-introvert-burnout-fatigue",
    category: "social",
    question: "How do you handle social exhaustion or introvert burnout during intense 10-day mobilities?",
    answer: "Erasmus+ schedules are jam-packed with morning energizers, workshops, group discussions, and intercultural parties. If you feel drained, communicate openly with your group leader. It is 100% acceptable to take a quiet 30-minute solo walk in nature, read in a peaceful corner, or skip late-night social lounges to recharge. Protecting your mental health is respected.",
    icon: Smile,
  },
  {
    id: "soc-setting-learning-goals",
    category: "social",
    question: "How should you set personal learning goals before your mobility begins?",
    answer: "Spend 15 minutes before the project writing down 3 personal objectives: e.g., 'Speak up in at least two plenary debates', 'Improve my active listening skills', or 'Understand climate policy in other countries'. Revisit these goals during daily reflection groups to track your personal transformation.",
    icon: BookOpen,
  },
  {
    id: "soc-romantic-relationships",
    category: "social",
    question: "How should romantic relationships and crushes on Erasmus+ projects be navigated responsibly?",
    answer: "Intense emotional environments naturally spark holiday romances. Always prioritize enthusiastic mutual consent, emotional maturity, and privacy. Ensure personal relationships never disrupt team dynamics, workshop punctuality, or make roommates uncomfortable in shared sleeping areas.",
    icon: Heart,
  },
  {
    id: "soc-cultural-sensitivity-jokes",
    category: "social",
    question: "How do you practice cultural sensitivity and avoid offensive jokes or stereotypes?",
    answer: "Remember that geopolitical realities, religious backgrounds, and historical traumas vary widely across Europe. Steer clear of sensitive borders, ethnic stereotyping, or historical war jokes. Listen with empathy, ask curious questions instead of making assumptions, and embrace different communication styles.",
    icon: Globe,
  },
  {
    id: "soc-language-tandem-practice",
    category: "social",
    question: "How can you turn meal breaks into informal language exchange tandems?",
    answer: "Sit with different national tables during breakfast and lunch. Ask to learn 5 words in their language, and teach them 5 in yours. Practicing pronunciation, laughing at tongue twisters, and swapping colloquial idioms turns every meal into an informal language lab.",
    icon: MessageSquare,
  },
  {
    id: "soc-group-reflection-daily",
    category: "social",
    question: "What are 'Daily Reflection Groups' and why are they so powerful?",
    answer: "Every afternoon or evening, participants break into small reflection pods (4-6 people with a facilitator). You discuss how you felt during the activities, conflicts that arose, competences learned, and emotional well-being. It prevents misunderstandings and deepens team unity.",
    icon: Compass,
  },
  {
    id: "soc-handling-homesickness",
    category: "social",
    question: "What should you do if you feel homesick, especially on your first long trip abroad?",
    answer: "Homesickness is totally natural during the first 48 hours. Call family or close friends briefly during free time, share your feelings with your group leader, and stay actively engaged with the group rather than staying isolated in your room. The supportive community environment helps it pass quickly.",
    icon: Smile,
  },
  {
    id: "soc-peer-mentorship-buddy",
    category: "social",
    question: "How does the 'Buddy System' support participants with fewer opportunities?",
    answer: "In Erasmus+ inclusion projects, a peer-buddy system pairs first-time travelers or participants with disabilities/economic hurdles with experienced youth leaders. The buddy offers practical guidance during travel, assists with translation, and ensures everyone feels fully included.",
    icon: HeartHandshake,
  },
  {
    id: "soc-conflict-mediation",
    category: "social",
    question: "What happens if a serious dispute arises between roommates or national teams?",
    answer: "Trainers and group leaders are trained in restorative justice and non-violent communication. If a dispute occurs, a neutral mediation session is held where both parties speak without interruption to reach a collaborative, respectful agreement.",
    icon: ShieldCheck,
  },

  // =========================================================================
  // 12. VISAS, PARTNER COUNTRIES & BUREAUCRACY
  // =========================================================================
  {
    id: "visa-partner-country-times",
    category: "visas",
    question: "What are Schengen visa processing times for participants from Partner Countries (Turkey, Caucasus, Balkans)?",
    answer: "For participants from Turkey, Azerbaijan, Georgia, Armenia, or North Africa, obtaining a Schengen visa appointment can take 4 to 8 weeks, with 15-21 days of consular processing. As soon as your selection is confirmed, ask the host NGO for your official Invitation Letter and book the earliest visa appointment on VFS Global / iDATA / TLScontact.",
    icon: Clock,
  },
  {
    id: "visa-multiple-entry-schengen",
    category: "visas",
    question: "Can you request a Multiple-Entry Schengen visa if traveling through non-Schengen transit hubs?",
    answer: "Yes. If your flight itinerary has layovers in non-Schengen countries (like the UK, Serbia, or Turkey) or you travel between Schengen and non-Schengen EU states (like Cyprus or Ireland), you MUST request a 'Multiple Entry' visa on your application and attach your full flight itinerary.",
    icon: FileText,
  },
  {
    id: "visa-border-control-interview",
    category: "visas",
    question: "What should you say to immigration border control officers when entering the Schengen Area?",
    answer: "Keep a printed folder in your hand luggage containing: 1. Host NGO Invitation Letter; 2. Project Infopack; 3. Round-trip flight tickets; 4. Proof of travel insurance. Clearly explain you are attending an official EU-funded Erasmus+ educational youth exchange. Never say you are 'working' or 'immigrating'.",
    icon: ShieldCheck,
  },
  {
    id: "visa-ehic-replacement-certificate",
    category: "visas",
    question: "What should you do if your physical EHIC card expires or gets lost before travel?",
    answer: "Contact your national social security or health ministry and request a 'Provisional Replacement Certificate' (PRC / Certificado Provisional Sustitutorio). It is issued instantly online as a PDF and grants the exact same statutory healthcare rights across Europe as the physical plastic card.",
    icon: FileText,
  },
  {
    id: "visa-proof-financial-means",
    category: "visas",
    question: "Do you need to prove financial solvency at border control if accommodation and food are covered?",
    answer: "Border guards sometimes ask for proof of sufficient funds. Your host NGO's official Invitation Letter explicitly states that 100% of food, lodging, and local transit are prepaid by the European Commission. Carrying this letter along with a personal debit card is sufficient proof.",
    icon: Coins,
  },
  {
    id: "visa-transit-visas-airports",
    category: "visas",
    question: "Do you need an Airport Transit Visa (ATV) for layovers in certain European airports?",
    answer: "Citizens of certain non-EU countries require an Airport Transit Visa (ATV) even if they never leave the international transit area of airports in France, Germany, or the Netherlands. Check the host consulate's ATV list or book direct point-to-point flights to avoid transit headaches.",
    icon: Plane,
  },
  {
    id: "visa-schengen-90-180-rule",
    category: "visas",
    question: "How does the Schengen 90/180-day rule apply if you attend multiple projects in a single year?",
    answer: "Non-EU citizens (and post-Brexit UK citizens) can stay a maximum of 90 days within any rolling 180-day window in the Schengen zone. Always use the official European Commission Schengen Calculator tool to verify your past and planned travel dates so you never overstay.",
    icon: Calendar,
  },
  {
    id: "visa-youthpass-job-interviews",
    category: "visas",
    question: "How do you explain Youthpass learning outcomes during real corporate job interviews?",
    answer: "Translate the 8 Key Competences into employer-friendly achievements: explain how coordinating an intercultural debate demonstrates cross-functional team leadership; how resolving dorm issues shows conflict management; and how traveling solo proves adaptability and crisis resilience.",
    icon: Award,
  },
  {
    id: "visa-insurance-claim-process",
    category: "visas",
    question: "How do you file a medical claim with Cigna / Henner during an ESC project?",
    answer: "Keep all original medical receipts, doctor consultation notes, and pharmacy invoices. Log into the Cigna / Henner mobile app, snap photos of the receipts, enter the diagnostic description, and submit. Approved reimbursements are wired directly into your bank account within 5-10 business days.",
    icon: ShieldCheck,
  },

  // =========================================================================
  // 13. ADVANCED PROJECT TYPES & OPPORTUNITIES
  // =========================================================================
  {
    id: "type-ka154-youth-participation",
    category: "types",
    question: "What are KA154 Youth Participation Activities and how do they influence European policy?",
    answer: "KA154 projects bring young citizens directly into dialogue with decision-makers, mayors, and EU parliamentarians. They organize youth mock parliaments, policy hackathons, and regional consultations, allowing youth to draft real legislative recommendations.",
    icon: Award,
  },
  {
    id: "type-ka2-cooperation-partnerships",
    category: "types",
    question: "What are KA2 Cooperation Partnerships in the youth sector?",
    answer: "KA2 projects are large-scale strategic alliances between universities, NGOs, and tech entities to create innovative educational tools, digital platforms, board games, or research toolkits. They often include short testing mobilities for young testers.",
    icon: Globe,
  },
  {
    id: "type-salto-youth-otlas",
    category: "types",
    question: "What is SALTO-Youth and how do you use the Otlas partner-finding tool?",
    answer: "SALTO-Youth (Support, Advanced Learning and Training Opportunities) is an official network of resource centres providing educational tools and the European Training Calendar. Otlas is their partner-finding platform where NGOs worldwide post project calls and search for reliable partners.",
    icon: Compass,
  },
  {
    id: "type-eurodesk-network",
    category: "types",
    question: "What is the Eurodesk network and how can their national offices assist you?",
    answer: "Eurodesk is the official European information network for young people, with over 1,000 regional coordinators across 36 countries. You can walk into a local Eurodesk office or message them for free, personalized guidance on mobilities, grants, and study abroad options.",
    icon: Globe,
  },
  {
    id: "type-blended-mobility-virtual",
    category: "types",
    question: "What is Blended Mobility and how does it combine online workshops with physical travel?",
    answer: "Blended projects combine interactive online preparatory meetings (virtual simulations, team meet-and-greets on Zoom/Miro) with a high-impact physical mobility. This allows participants to develop project outputs before arriving on-site, maximizing physical immersion.",
    icon: Sparkles,
  },
  {
    id: "type-prep-visits-apv",
    category: "types",
    question: "What is an Advanced Planning Visit (APV) and who gets to attend?",
    answer: "An APV is a 2-3 day preparatory meeting held at the project venue weeks before the main Youth Exchange. Group leaders and selected participants (especially youth with special needs or fewer opportunities) visit to inspect dorm accessibility, finalize workshop schedules, and inspect catering safety.",
    icon: Plane,
  },

  // =========================================================================
  // 14. EURONOVA PLATFORM RULES & PROGRESSION (ADVANCED EXPANSION)
  // =========================================================================
  {
    id: "euro-fast-leveling-xp",
    category: "euronova",
    question: "How can you level up fast on EuroNova and what does Level 10 unlock?",
    answer: "Complete your Volunteer Profile (+75 XP), explore and apply to active missions (+75 XP), write authentic verified reviews of NGOs you traveled with (+150 XP), and return daily for orbital exploration (+3 XP). Advancing to Level 2 (100 XP) unlocks full forum authoring rights, while reaching Level 10 (4,500 XP) unlocks the Vanguard Milestone and an invitation to apply as an official EuroNova Support Specialist.",
    icon: TrendingUp,
  },
  {
    id: "euro-writing-ngo-reviews",
    category: "euronova",
    question: "How do community reviews of NGOs work and why are they verified?",
    answer: "EuroNova lets volunteers rate sending and hosting NGOs on communication speed, accommodation quality, and workshop excellence. To prevent fake reviews, reviewers must submit their project mobility dates or Youthpass reference number for community verification.",
    icon: Award,
  },
  {
    id: "euro-reporting-suspicious-ngos",
    category: "euronova",
    question: "What happens when a user reports a suspicious NGO or misleading project infopack?",
    answer: "When a project is flagged, EuroNova's automated safety shield immediately marks the dossier for administrative review. If an NGO charges illegal participation fees or fails basic safety standards, their profile is frozen and their National Agency is alerted.",
    icon: AlertTriangle,
  },
  {
    id: "euro-campus-ambassador",
    category: "euronova",
    question: "How does the EuroNova 4-Tier Staff Hierarchy and Support recruitment work?",
    answer: "EuroNova operates on a structured 4-tier staff hierarchy: Support Specialists (trusted Level 10+ volunteers who answer support tickets and assist newcomers), Community Moderators (trusted external personnel managing community reports, forum safety, and user warnings), System Administrators (managing verification, project curation, and escalations), and Root Commanders with full infrastructure access.",
    icon: Award,
  },
  {
    id: "euro-mobile-app-notifications",
    category: "euronova",
    question: "How does EuroNova keep you updated on last-minute project vacancies?",
    answer: "Organizations frequently post 'Last Minute Calls' when a participant drops out 48 hours before mobility. EuroNova’s notification engine alerts you in real-time when an urgent project matching your country of residence opens.",
    icon: Zap,
  },

  // =========================================================================
  // 15. THE VETERAN EXPANSION & UNMASKED LORE (ITEMS 101 - 120)
   {
    id: "surv-unmasked-workshop",
    category: "special",
    question: "A special message from Joel: The 'UNMASKED' Workshop",
    answer: `[ES] 🇪🇸 Español
Os quería pasar por aquí, aunque quede un poco egocéntrico jajajaja, una actividad que en su momento creamos varias personas y que yo reversioné. A mi parecer es muy bonita. Nació en un Erasmus de Harry Potter en Toledo hecho por Madmediterraneacrew. La he probado con varios grupos y les flipó muchísimo. Por eso, quería compartirla con todos ustedes para ver qué os parece y tener una segunda opinión. Es una actividad con un valor personal y emocional gigante, diseñada para unir al grupo a un nivel muy profundo, especialmente a esas personas que a lo mejor no se sienten tan integradas. Os animo de corazón a probarla a mitad de vuestro proyecto, por la noche, y dejar que la magia surja.

[EN] 🇬🇧 English
I wanted to share an activity here, even if it sounds a bit egocentric hahaha, that several of us created back in the day and that I later re-versioned. I think it's truly beautiful. It was born during a Harry Potter-themed Erasmus in Toledo organized by Madmediterraneacrew. I’ve tested it with several groups and they absolutely loved it. That's why I wanted to share it with all of you to see what you think and get a second opinion. It’s an activity with huge personal and emotional value, designed to connect the group on a profound level, especially for those who might feel less integrated. I wholeheartedly encourage you to run it midway through your project, at night, and let the magic happen!

[FR] 🇫🇷 Français
Je voulais partager une activité ici, même si ça fait un peu égocentrique hahaha, que nous avons créée à plusieurs et que j'ai ensuite remaniée. Je la trouve vraiment magnifique. Elle est née lors d'un Erasmus sur le thème de Harry Potter à Tolède, organisé par Madmediterraneacrew. Je l'ai testée avec plusieurs groupes et ils ont adoré. C'est pourquoi je voulais la partager avec vous tous pour avoir votre avis. C'est une activité avec une immense valeur personnelle et émotionnelle, conçue pour connecter le groupe à un niveau très profond, surtout pour ceux qui se sentent peut-être moins intégrés. Je vous encourage de tout cœur à l'essayer au milieu de votre proyecto, la nuit, et à laisser la magie opérer !

[DE] 🇩🇪 Deutsch
Ich wollte hier eine Aktivität teilen, auch wenn es vielleicht ein bisschen egozentrisch klingt hahaha, die wir damals zu mehreren kreiert haben und die ich später überarbeitet habe. Ich finde sie wirklich wunderschön. Sie entstand während eines Harry Potter-Erasmus in Toledo, das von Madmediterraneacrew organisiert wurde. Ich habe sie mit mehreren Gruppen getestet und sie waren absolut begeistert. Deshalb wollte ich sie mit euch allen teilen, um zu sehen, was ihr denkt. Es ist eine Aktivität mit riesigem persönlichem und emotionalem Wert, die darauf ausgelegt ist, die Gruppe auf einer sehr tiefen Ebene zu verbinden, besonders diejenigen, die sich vielleicht weniger integriert fühlen. Ich kann euch nur wärmstens empfehlen, sie in der Mitte eures Projekts nachts durchzuführen und die Magie wirken zu lassen!

[IT] 🇮🇹 Italiano
Volevo condividere un'attività qui, anche se suona un po' egocentrico hahaha, che abbiamo creato in diversi e che io ho poi rivisitato. Penso sia davvero bellissima. È nata durante un Erasmus a tema Harry Potter a Toledo organizzato da Madmediterraneacrew. L'ho testata con vari gruppi e l'hanno adorata. Ecco perché volevo condividerla con tutti voi per sapere cosa ne pensate. È un'attività con un enorme valore personale ed emotivo, progettata per connettere il grupo a un livello molto profondo, specialmente per chi potrebbe sentirsi meno integrato. Vi incoraggio di cuore a provarla a metà del vostro proyecto, di notte, e a lasciare che la magia faccia il suo corso!

[RU] 🇷🇺 Русский
Я хотел бы поделиться здесь одной активностью, пусть это и звучит немного эгоцентрично, ха-ха-ха, которую мы когда-то создали в команде, а позже я её переработал. На мой взгляд, она невероятно красивая. Она родилась во время проекта Erasmus на тему Гарри Поттера в Толедо, организованного Madmediterraneacrew. Я протестировал её с несколькими группами, и они были в полном восторге. Поэтому я хотел поделиться ею со всеми вами, чтобы узнать ваше мнение. Это активность огромной личной и эмоциональной ценности, созданная для того, чтобы объединить группу на очень глубоком уровне, особенно тех участников, кто чувствует себя менее интегрированным. От всего сердца рекомендую провести её в середине вашего проекта, вечером, и позволить магии случиться!

[PT] 🇵🇹 Português
Queria partilhar aqui uma atividade, mesmo que soe um pouco egocêntrico hahaha, que na altura criámos em conjunto e que mais tarde readaptei. Na minha opinião, é muito bonita. Nasceu durante um Erasmus com a temática de Harry Potter em Toledo, organizado pela Madmediterraneacrew. Testei-a com vários grupos e eles adoraram imenso. Por isso, quis partilhá-la com todos vocês para saber o que acham e ter uma segunda opinião. É uma atividade com um enorme valor pessoal e emocional, desenhada para unir o grupo a um nível muito profundo, especialmente aqueles que talvez se sintam menos integrados. Encorajo-vos de coração a experimentá-la a meio do vosso projeto, à noite, e deixar a magia acontecer!

[LINK] https://docs.google.com/document/d/1Vz91CvytCXFj0bT2MJhfH5RF93dhMQa9ANzFc6Pm-iY/edit?usp=sharing`,
    icon: Star,
  },
  {
    id: "surv-secret-buddy-amigo-invisible",
    category: "survival",
    question: "What is the 'Secret Buddy' (Amigo Invisible) camp tradition and how do you play?",
    answer: "On day 1 or 2, everyone draws a folded slip of paper with the name of a fellow participant who becomes their 'Secret Buddy' (or Secret Angel). Throughout the week, your mission is to secretly leave kind surprises for them without getting caught: origami figures, handwritten uplifting notes, chocolates on their pillow, or secret drawings slipped into their workshop folder. On the final evening, a grand revelation ceremony takes place where everyone guesses who their guardian angel was and exchanges emotional hugs. It weaves an invisible web of mutual care and anticipation across the venue.",
    icon: Heart,
  },
  {
    id: "surv-game-werewolf-mafia",
    category: "survival",
    question: "Why is 'Werewolf / Mafia' (El Hombre Lobo) the supreme evening game for intercultural camps?",
    answer: "When evening free time starts, 'The Werewolves of Millers Hollow' (or Mafia) is the ultimate game for 15 to 30 people in the common room. Players are secretly assigned roles: innocent villagers, werewolves, a seer, or a witch. A charismatic narrator guides night phases where werewolves 'hunt', followed by daytime trials where everyone debates, accuses, and defends themselves in English. It forces people to speak passionate, uninhibited English, read subtle micro-expressions, and laugh hysterically at theatrical betrayals, breaking cross-cultural barriers in hours.",
    icon: Gamepad2,
  },
  {
    id: "surv-game-the-fox-el-zorro",
    category: "survival",
    question: "How do you play 'The Fox' (El Zorro), the multi-day stealth camp game?",
    answer: "'The Fox' (El Zorro) is an exhilarating camp game played across several days. Organizers secretly appoint a covert squad of 2 to 4 'Foxes'. Their objective is to stealthily steal harmless personal belongings (shoes, notebooks, hats, water bottles, coffee mugs) left unattended by other participants without ever getting caught in the act. The next morning or night, the Foxes display all stolen goods on a central blanket or table. The camp gathers, inspects the loot, and votes on who the suspects are. If the group correctly identifies a Fox, that player is out (without snitching on the other foxes). If they guess wrong, the Foxes strike again!",
    icon: Eye,
  },
  {
    id: "surv-game-wink-assassin",
    category: "survival",
    question: "What are the rules of 'The Wink Assassin' (El Asesino) week-long background game?",
    answer: "At the start of the week, organizers secretly appoint 1 or 2 'Assassins'. The game runs 24/7 in the background during meals, coffee breaks, and group walks. The Assassin eliminates targets by making discrete eye contact and winking at them. The victim must wait 10 seconds before dramatically collapsing or announcing their demise without revealing who winked. If an innocent player suspects the killer, they shout 'I have an accusation!', but require another living player to second it before naming the suspect. If they guess wrong, both accusers 'die' on the spot. The Assassin wins if they eliminate the entire camp undetected.",
    icon: Eye,
  },
  {
    id: "surv-extra-days-after-project",
    category: "survival",
    question: "Why should you schedule your allowed extra travel days AFTER the project rather than before?",
    answer: "Erasmus+ regulations allow up to 2 extra personal travel days before or after official project dates. Veteran European backpackers have a golden rule: always schedule those extra days AFTER the project concludes! If you travel before, you are traveling alone in a foreign city. But after 8 to 10 days of non-formal learning together, you will have formed unbreakable bonds. You and your new international friends can rent a shared Airbnb in the nearest metropolis (e.g. Rome, Berlin, Budapest, Madrid), explore local nightlife together, and celebrate your reunion without rushing back to the airport.",
    icon: Compass,
  },
  {
    id: "surv-hosting-own-workshops",
    category: "survival",
    question: "Can participants propose and facilitate their own workshops or energizers during a project?",
    answer: "Yes! Non-formal education explicitly empowers participants to evolve from passive learners into active educators. Veteran facilitators love when participants step up and ask to lead a morning energizer, a guided meditation, a debate, or an interactive workshop on a topic they care about. Approach the organizers during coffee breaks and pitch your idea. Facilitating your own session builds tremendous pedagogical confidence and provides tangible proof of leadership for your Youthpass and CV.",
    icon: Award,
  },
  {
    id: "surv-journaling-mindfulness",
    category: "survival",
    question: "Why should you carry a dedicated project notebook for journaling and methodology notes?",
    answer: "Erasmus+ projects are emotional whirlwinds of non-formal methods, intense debriefs, and life-changing conversations. Carrying a dedicated physical notebook lets you write down: 1. Names and step-by-step rules of icebreakers and energizers you want to replicate back home; 2. Personal emotional breakthroughs during evening journaling; 3. Inspiring quotes from peers; 4. Contacts, social handles, and future project ideas. Years later, flipping through that notebook remains a treasure trove of inspiration.",
    icon: BookOpen,
  },
  {
    id: "surv-first-timers-open-mind",
    category: "survival",
    question: "What is the most crucial advice for first-time Erasmus+ participants facing language anxiety?",
    answer: "Keep an open mind, step courageously outside your comfort zone, and never stress about 'broken English'! Erasmus+ is not an academic grammar exam; it is a celebration of human diversity. Fluency comes naturally within days through daily immersion, and nobody judges accents or mistakes. Say 'yes' to new foods, participate actively in theatrical energizers, and remember that vulnerability and an open smile are universal languages understood by everyone.",
    icon: Smile,
  },
  {
    id: "surv-speed-dating-icebreaker",
    category: "survival",
    question: "How does the 'Speed Dating / Human Bingo' icebreaker dissolve social barriers on Day 1?",
    answer: "To break the initial awkwardness, facilitators distribute a grid of fun human traits (e.g., 'Has visited more than 10 countries', 'Speaks 4 languages', 'Can juggle', 'Has broken a bone', 'Loves spicy food'). You have 15 minutes to move around the room, interview strangers, and collect signatures for matching boxes. It forces everyone to talk to at least 20 different people immediately, sparking laughter and discovering unexpected common ground in minutes.",
    icon: Users,
  },
  {
    id: "surv-energizers-bank",
    category: "survival",
    question: "What classic European energizers should every youth worker have in their pocket?",
    answer: "A great energizer banishes post-lunch fatigue in 5 minutes. Learn the essentials: 'Bang!' (reaction circle with elimination), 'Ninja' (turn-based strike maneuvers), 'Samurai' (rhythmic vocal shouting), 'Horse Race' (miming galloping, obstacles, and crowd applause), and 'Evolution' (rock-paper-scissors evolving from egg to chicken to dinosaur to superhero). Master these 5 and you can revitalize any tired group anywhere in the world.",
    icon: Sparkles,
  },
  {
    id: "soc-cultural-shock-phases",
    category: "social",
    question: "What are the 4 stages of intercultural adaptation during longer youth mobilities?",
    answer: "During longer ESC mobilities or intensive 14-day courses, you may experience the 4 classic intercultural phases: 1. The Honeymoon Stage (everything is exotic, charming, and exciting); 2. The Frustration Stage (cultural differences, language fatigue, or different hygiene/food standards cause irritation); 3. The Adjustment Stage (you understand local communication codes and develop routines); 4. The Acceptance Stage (you feel at home in both cultures). Recognizing these stages helps you navigate emotional shifts with maturity.",
    icon: Globe,
  },
  {
    id: "soc-shared-airbnb-post-project",
    category: "social",
    question: "How do you coordinate a safe post-project group trip or shared apartment?",
    answer: "If 4 to 8 participants decide to stay extra days in a transit city, nominate one person to book the Airbnb or hostel dorm using a shared Splitwise or Tricount group so expenses (groceries, metro tickets, lodging) are divided automatically with zero financial friction. Always share your stay location with your national group leader and family for safety.",
    icon: Users,
  },
  {
    id: "soc-active-listening-consensus",
    category: "social",
    question: "How do international teams reach consensus without arguments during group assignments?",
    answer: "Non-formal education uses consensus decision-making rather than simple majority voting. Instead of voting 51% vs 49% (which leaves almost half the group resentful), teams use 'Fist to Five' polling or colored card discussions to adjust the proposal until every team member feels comfortable supporting the final outcome. It teaches high-level European diplomacy and collaboration.",
    icon: HeartHandshake,
  },
  {
    id: "soc-safe-space-agreements",
    category: "social",
    question: "What is a 'Group Contract' (Safe Space Agreement) and why is it drafted on Day 1?",
    answer: "On the first morning, the entire group co-creates a 'Safe Space Agreement' on a giant flipchart. Participants suggest rules they care about: punctuality, zero phones during sessions, active listening without interruption, respect for diverse identities, and 'what is shared in the room stays in the room'. Everyone signs the flipchart, establishing collective accountability and mutual psychological safety from day one.",
    icon: ShieldCheck,
  },
  {
    id: "pack-fanny-pack-crossbody",
    category: "packing",
    question: "Why is a crossbody waist pack or sling bag the best backpack companion for excursions?",
    answer: "When doing city scavenger hunts, mountain hikes, or crowded metro transfers, digging through a 30L backpack for your passport, wallet, lip balm, and phone is inconvenient and increases pickpocket risk. A secure crossbody sling worn across your chest keeps your valuables safe against your body, leaving your hands free for high-fives and photos.",
    icon: Luggage,
  },
  {
    id: "pack-sharpies-sticky-notes",
    category: "packing",
    question: "Why should aspiring youth facilitators pack their own mini stationery kit?",
    answer: "Venues sometimes run low on flipchart markers or colored sticky notes. Carrying a small pouch with 3 multi-color Sharpies, a pad of Post-it notes, a glue stick, and reusable adhesive putty (Blu-Tack) turns you into an invaluable asset during group project work and lets you prototype educational games anywhere.",
    icon: Briefcase,
  },
  {
    id: "types-youth-exchanges-vs-study-erasmus",
    category: "types",
    question: "How do short-term Erasmus+ Youth Exchanges compare to university Erasmus semester exchanges?",
    answer: "University Erasmus (studies/traineeships) lasts 3 to 12 months, requires university enrollment, involves formal university exams, and provides a partial cost-of-living stipend. By contrast, Erasmus+ Youth Exchanges last 5 to 21 days, require NO university degree or student status (open to all youth aged 13-30), use non-formal experiential learning with zero exams, and cover 100% of food, lodging, and travel expenses.",
    icon: BookOpen,
  },
  {
    id: "visas-customs-duty-free-food",
    category: "visas",
    question: "What are European customs rules when bringing traditional food for Intercultural Night from non-EU countries?",
    answer: "If traveling into the European Union from non-EU partner countries (e.g. Turkey, Georgia, Armenia, Serbia, Egypt), EU sanitary regulations strictly forbid entering with meat or dairy products (due to agricultural disease prevention). Instead, bring traditional sweets, dried fruits, nuts, chocolates, halva, tea, spices, or vacuum-sealed baked pastries which are 100% permitted and adored by everyone!",
    icon: Utensils,
  },
  {
    id: "euro-sharing-facilitator-tools",
    category: "euronova",
    question: "How does the EuroNova Community Hub allow volunteers to share open-source workshop tools like UNMASKED?",
    answer: "EuroNova is not just an opportunity aggregator—it is an open-source knowledge laboratory for European youth. In our Community Hub and Discord, volunteers and trainers share tested session outlines, icebreaker variants, and transformative workshops (like Joel's UNMASKED). By open-sourcing our best pedagogical tools, we elevate the quality of youth work across the entire continent.",
    icon: Sparkles,
  },
];

/**
 * Returns the localized FAQ dataset for the requested locale.
 * Supported locales: en, es, de, fr, it, pt, ru.
 */
export function getLocalizedFaq(locale: string = "en"): FaqItem[] {
  const norm = (locale || "en").toLowerCase().slice(0, 2);
  const dict = FAQ_LOCALIZATIONS[norm];
  if (!dict) return FAQ_DATA_RAW;

  return FAQ_DATA_RAW.map((item) => {
    const loc = dict[item.id];
    if (!loc) return item;
    return {
      ...item,
      question: loc.question || item.question,
      answer: loc.answer || item.answer,
    };
  });
}

export const FAQ_DATA: FaqItem[] = FAQ_DATA_RAW;

