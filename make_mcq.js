const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, BorderStyle, WidthType, LevelFormat, PageNumber,
  Header, Footer, ShadingType
} = require('docx');
const fs = require('fs');

const questions = [
  // EASY (1-15)
  {
    num: 1, diff: "EASY",
    q: "What is the primary goal of municipal water and wastewater systems?",
    choices: [
      "A) Maximize water use efficiency",
      "B) Break the carrier-feces-water-victim sequence to prevent waterborne disease outbreaks",
      "C) Increase water pressure in distribution systems",
      "D) Reduce overall water treatment costs"
    ],
    answer: "Answer: B"
  },
  {
    num: 2, diff: "EASY",
    q: "The Safe Drinking Water Act (SDWA) applies to public water systems that serve at least how many outlets and customers?",
    choices: [
      "A) 10 or more outlets and 20 or more customers",
      "B) 15 or more outlets and more than 25 customers",
      "C) 20 or more outlets and 50 or more customers",
      "D) 5 or more outlets and 10 or more customers"
    ],
    answer: "Answer: B"
  },
  {
    num: 3, diff: "EASY",
    q: "Which of the following is TRUE about Primary Drinking Water Standards?",
    choices: [
      "A) They are unenforceable guidelines based on aesthetics",
      "B) They are enforceable by law and based on health-related criteria",
      "C) They only address the odor and taste of water",
      "D) They are optional recommendations for large water systems"
    ],
    answer: "Answer: B"
  },
  {
    num: 4, diff: "EASY",
    q: "What does MCL stand for in drinking water regulation?",
    choices: [
      "A) Minimum Contaminant Level",
      "B) Maximum Contaminant Limit",
      "C) Maximum Contaminant Level",
      "D) Monitored Chemical Level"
    ],
    answer: "Answer: C"
  },
  {
    num: 5, diff: "EASY",
    q: "Which amendment to the SDWA banned lead in plumbing?",
    choices: [
      "A) 1996 amendment",
      "B) 2002 amendment",
      "C) 1986 amendment",
      "D) 1980 amendment"
    ],
    answer: "Answer: C"
  },
  {
    num: 6, diff: "EASY",
    q: "Why are coliform bacteria used as indicator organisms in water testing?",
    choices: [
      "A) They are harmful pathogens that directly cause disease",
      "B) They are harmless bacteria found in massive quantities in human and animal feces, signaling the likely presence of dangerous pathogens",
      "C) They are the easiest microorganism to treat with chlorine",
      "D) They are found exclusively in industrial wastewater"
    ],
    answer: "Answer: B"
  },
  {
    num: 7, diff: "EASY",
    q: "What is the main federal law governing wastewater disposal in the United States?",
    choices: [
      "A) Safe Drinking Water Act (SDWA)",
      "B) Resource Conservation and Recovery Act (RCRA)",
      "C) Clean Water Act (CWA)",
      "D) Comprehensive Environmental Response, Compensation, and Liability Act (CERCLA)"
    ],
    answer: "Answer: C"
  },
  {
    num: 8, diff: "EASY",
    q: "Which of the following is a source of surface water?",
    choices: [
      "A) Underground aquifers",
      "B) Deep drilled wells",
      "C) Rivers, lakes, streams, and reservoirs",
      "D) Artesian groundwater springs"
    ],
    answer: "Answer: C"
  },
  {
    num: 9, diff: "EASY",
    q: "What is eutrophication?",
    choices: [
      "A) The process of disinfecting drinking water with chlorine",
      "B) A process where a water body becomes overly enriched with nutrients, leading to excessive algae and plant growth",
      "C) The removal of heavy metals from wastewater",
      "D) The treatment of industrial effluent before discharge"
    ],
    answer: "Answer: B"
  },
  {
    num: 10, diff: "EASY",
    q: "Primary wastewater treatment typically removes approximately what percentage of BOD?",
    choices: [
      "A) 10%",
      "B) 90%",
      "C) 35%",
      "D) 60%"
    ],
    answer: "Answer: C"
  },
  {
    num: 11, diff: "EASY",
    q: "What is a Comminuter used for in primary wastewater treatment?",
    choices: [
      "A) Adding coagulation chemicals to the water",
      "B) Disposing of materials collected on screens",
      "C) Filtering fine particles from wastewater",
      "D) Pumping sludge to lagoons"
    ],
    answer: "Answer: B"
  },
  {
    num: 12, diff: "EASY",
    q: "Which of the following is a characteristic of Secondary Drinking Water Standards?",
    choices: [
      "A) They are enforceable by law",
      "B) They are based solely on cancer risk assessments",
      "C) They are unenforceable guidelines based on aesthetics such as taste, odor, and color",
      "D) They set limits for microbiological contaminants"
    ],
    answer: "Answer: C"
  },
  {
    num: 13, diff: "EASY",
    q: "What is Radon best described as?",
    choices: [
      "A) A man-made substance produced from nuclear testing fallout",
      "B) A colorless, odorless gas found in groundwater that can cause lung cancer when inhaled",
      "C) A heavy metal contaminant found mainly in surface water",
      "D) A disinfection byproduct formed during chlorination"
    ],
    answer: "Answer: B"
  },
  {
    num: 14, diff: "EASY",
    q: "Which program is associated with CERCLA and is used to identify and clean up contaminated sites?",
    choices: [
      "A) The NPDES Program",
      "B) The Brownfields Initiative",
      "C) The Superfund Program",
      "D) The TSCA Registry"
    ],
    answer: "Answer: C"
  },
  {
    num: 15, diff: "EASY",
    q: "Ground water is mostly used by which type of community?",
    choices: [
      "A) Large cities",
      "B) Industrial zones",
      "C) Coastal metropolitan areas",
      "D) Small towns and rural communities"
    ],
    answer: "Answer: D"
  },

  // MODERATE (16-35)
  {
    num: 16, diff: "MODERATE",
    q: "What is a Treatment Technique (TT) in drinking water regulation?",
    choices: [
      "A) A required monitoring protocol for all surface water sources",
      "B) A required treatment step used when a pollutant is too difficult or slow to measure directly",
      "C) A chemical additive used to neutralize dissolved contaminants",
      "D) An optional treatment upgrade available only for large water systems"
    ],
    answer: "Answer: B"
  },
  {
    num: 17, diff: "MODERATE",
    q: "The 1996 SDWA amendment required water systems to do which of the following?",
    choices: [
      "A) Filter all surface water and ban lead in plumbing",
      "B) Add security measures to protect water from intentional tampering",
      "C) Send an annual water quality report to customers and required the EPA to weigh health benefits against financial costs of new rules",
      "D) Install double-liner systems in all treatment facilities"
    ],
    answer: "Answer: C"
  },
  {
    num: 18, diff: "MODERATE",
    q: "For large water systems, what is the maximum allowable percentage of monthly water samples that can test positive for coliforms?",
    choices: [
      "A) 1%",
      "B) 10%",
      "C) 5%",
      "D) 2%"
    ],
    answer: "Answer: C"
  },
  {
    num: 19, diff: "MODERATE",
    q: "The EPA's Log-Removal Rules require what removal efficiency for enteric viruses?",
    choices: [
      "A) 99% (2-log)",
      "B) 99.9% (3-log)",
      "C) 99.99% (4-log)",
      "D) 99.999% (5-log)"
    ],
    answer: "Answer: C"
  },
  {
    num: 20, diff: "MODERATE",
    q: "Why are coliform tests considered imperfect indicators of water safety?",
    choices: [
      "A) Because coliforms are too expensive to test for at scale",
      "B) Because some non-bacterial pathogens survive longer than coliforms in nature and are more resistant to chlorine disinfection",
      "C) Because coliform levels fluctuate too rapidly for reliable testing",
      "D) Because coliforms can only be detected in groundwater"
    ],
    answer: "Answer: B"
  },
  {
    num: 21, diff: "MODERATE",
    q: "In a Separated Sewer System, what happens to rainwater street runoff?",
    choices: [
      "A) It is directed to the wastewater treatment plant",
      "B) It is held in underground reservoirs until the treatment plant can handle it",
      "C) It goes untreated directly into local rivers, carrying oil, metals, trash, and dirt",
      "D) It is mixed with sanitary sewage before treatment"
    ],
    answer: "Answer: C"
  },
  {
    num: 22, diff: "MODERATE",
    q: "What problem arises in Combined Sewer Systems during heavy rainfall?",
    choices: [
      "A) Water pressure in the distribution system drops significantly",
      "B) Pipe corrosion increases due to elevated pH levels",
      "C) Untreated sewage overflows directly into local rivers and streams, creating contaminated shorelines",
      "D) Coliform bacteria levels drop below detectable limits"
    ],
    answer: "Answer: C"
  },
  {
    num: 23, diff: "MODERATE",
    q: "During typical surface water treatment, which step involves chemicals being added and mixed quickly to help smaller particles stick together?",
    choices: [
      "A) Primary Sedimentation",
      "B) Rapid Mixing & Coagulation",
      "C) Filtration",
      "D) Secondary Disinfection"
    ],
    answer: "Answer: B"
  },
  {
    num: 24, diff: "MODERATE",
    q: "What is the main purpose of Aeration in groundwater treatment?",
    choices: [
      "A) To remove pathogenic bacteria from the water",
      "B) To introduce disinfectant chemicals into the system",
      "C) To remove excess and objectionable gases",
      "D) To adjust pH through recarbonation"
    ],
    answer: "Answer: C"
  },
  {
    num: 25, diff: "MODERATE",
    q: "Why do colloids remain suspended in water and resist settling?",
    choices: [
      "A) They are too heavy and dense to be moved by fluid currents",
      "B) They naturally carry a net negative charge that causes them to repel each other",
      "C) They are coated with a protective chemical layer that prevents aggregation",
      "D) They are too large to pass through basic filtration membranes"
    ],
    answer: "Answer: B"
  },
  {
    num: 26, diff: "MODERATE",
    q: "What key advantage do Membrane Bioreactors offer over conventional activated sludge systems?",
    choices: [
      "A) They eliminate the need for any aeration equipment",
      "B) They avoid the need for a secondary clarifier",
      "C) They eliminate the need for primary sedimentation",
      "D) They can process solid waste directly without preprocessing"
    ],
    answer: "Answer: B"
  },
  {
    num: 27, diff: "MODERATE",
    q: "In an Activated Sludge system, what is the function of the Secondary Clarifier?",
    choices: [
      "A) To pump air into the water to support microbial growth",
      "B) To allow heavy clumps of bacteria to naturally sink, forming sludge, while clean treated water flows out from the top",
      "C) To add coagulation chemicals before sedimentation",
      "D) To filter remaining fine particles after biological treatment"
    ],
    answer: "Answer: B"
  },
  {
    num: 28, diff: "MODERATE",
    q: "What distinguishes Facultative Ponds from standard Oxidation Ponds?",
    choices: [
      "A) Facultative ponds are more than 5 meters deep",
      "B) Facultative ponds contain a mix of aerobic and anaerobic conditions",
      "C) Facultative ponds only treat high-strength industrial wastewater",
      "D) Facultative ponds rely entirely on mechanical aerators for oxygen"
    ],
    answer: "Answer: B"
  },
  {
    num: 29, diff: "MODERATE",
    q: "What is the MCLG set at for cancer-causing chemicals (carcinogens)?",
    choices: [
      "A) 0.010 mg/L",
      "B) The same value as the corresponding MCL",
      "C) Zero",
      "D) 0.5 mg/L"
    ],
    answer: "Answer: C"
  },
  {
    num: 30, diff: "MODERATE",
    q: "Which of the following CORRECTLY describes Volatile Organic Chemicals (VOCs)?",
    choices: [
      "A) Man-made compounds used mainly in agricultural insecticides and herbicides",
      "B) Synthetic chemicals that readily evaporate into the air at room temperature, such as paint thinners and industrial degreasers",
      "C) Byproducts formed when a disinfectant reacts with naturally occurring chemicals in the water",
      "D) Naturally occurring radioactive substances commonly found in groundwater"
    ],
    answer: "Answer: B"
  },
  {
    num: 31, diff: "MODERATE",
    q: "What is the primary purpose of Nitrification in wastewater treatment?",
    choices: [
      "A) To remove phosphorus from wastewater to prevent eutrophication",
      "B) To aerobically convert toxic ammonia into the safer form of nitrate",
      "C) To turn nitrate into harmless nitrogen gas that escapes the water",
      "D) To add beneficial nitrogen to receiving water bodies"
    ],
    answer: "Answer: B"
  },
  {
    num: 32, diff: "MODERATE",
    q: "In the Waste Management Priority hierarchy, which option is considered the LAST resort?",
    choices: [
      "A) Reduce Waste Generation",
      "B) Recycle and Reuse",
      "C) Treatment (e.g., chemical neutralization)",
      "D) Disposal (e.g., landfill disposal)"
    ],
    answer: "Answer: D"
  },
  {
    num: 33, diff: "MODERATE",
    q: "What does RCRA stand for and when was it originally enacted?",
    choices: [
      "A) Resource Conservation and Recovery Act, 1976",
      "B) Resource Control and Remediation Act, 1980",
      "C) Regulated Chemical Reduction Act, 1984",
      "D) Resource Compliance and Reporting Act, 1986"
    ],
    answer: "Answer: A"
  },
  {
    num: 34, diff: "MODERATE",
    q: "A hazardous waste is classified as 'Ignitable' if it has a flash point of:",
    choices: [
      "A) 80 degrees C or lower",
      "B) 100 degrees C or lower",
      "C) 60 degrees C or lower",
      "D) 40 degrees C or lower"
    ],
    answer: "Answer: C"
  },
  {
    num: 35, diff: "MODERATE",
    q: "Brownfields are best described as:",
    choices: [
      "A) Agricultural fields contaminated by excessive pesticide runoff",
      "B) Active industrial sites with confirmed and documented contamination",
      "C) Abandoned or underused industrial and commercial properties suspected to have contamination",
      "D) Government-designated land parcels reserved for regulated hazardous waste disposal"
    ],
    answer: "Answer: C"
  },

  // HARD (36-50)
  {
    num: 36, diff: "HARD",
    q: "Under the EPA's Log-Removal Rules, what is the required removal efficiency for Cryptosporidium?",
    choices: [
      "A) 99.99% (4-log)",
      "B) 99.9% (3-log)",
      "C) 99% (2-log)",
      "D) 90% (1-log)"
    ],
    answer: "Answer: C"
  },
  {
    num: 37, diff: "HARD",
    q: "In sedimentation under ideal laminar flow conditions, which law is applied to calculate the settling velocity of a spherical particle?",
    choices: [
      "A) Darcy's Law",
      "B) Fick's Law of Diffusion",
      "C) Stokes' Law",
      "D) Henry's Law"
    ],
    answer: "Answer: C"
  },
  {
    num: 38, diff: "HARD",
    q: "Which of the following CORRECTLY describes the difference between Denitrification and Nitrification?",
    choices: [
      "A) Nitrification converts nitrate to nitrogen gas; Denitrification converts ammonia to nitrite",
      "B) Nitrification is an anaerobic process; Denitrification is an aerobic process",
      "C) Nitrification aerobically converts ammonia to nitrate; Denitrification anaerobically converts nitrate to harmless nitrogen gas",
      "D) Both Nitrification and Denitrification require oxygen to proceed"
    ],
    answer: "Answer: C"
  },
  {
    num: 39, diff: "HARD",
    q: "Two bacterial species are involved in nitrification. Which organism specifically converts ammonia to nitrite in the first step?",
    choices: [
      "A) Nitrobacter",
      "B) Nitrosomonas",
      "C) Escherichia coli",
      "D) Clostridium"
    ],
    answer: "Answer: B"
  },
  {
    num: 40, diff: "HARD",
    q: "In coagulation and flocculation, what is the specific role of the Flocculation Basin?",
    choices: [
      "A) It disperses coagulant chemicals evenly throughout the water via rapid mixing",
      "B) It is the tank where large floc particles ultimately settle out under gravity",
      "C) It contains rotating paddles that promote gentle mixing to cause particles to clump together",
      "D) It filters water through layers of sand and gravel after chemical treatment"
    ],
    answer: "Answer: C"
  },
  {
    num: 41, diff: "HARD",
    q: "Volatile Suspended Solids (VSS) are used in biological treatment monitoring. How are they measured and why?",
    choices: [
      "A) Measured by total dissolved solids after UV exposure; used to detect heavy metal presence",
      "B) Measured by the difference in solid mass after drying at 105 degrees C then burning at 500 degrees C; used to estimate microorganism concentration",
      "C) Measured by optical density at 600 nm wavelength; used to determine average particle size",
      "D) Measured by BOD reduction over 5 days; used to estimate nutrient removal efficiency"
    ],
    answer: "Answer: B"
  },
  {
    num: 42, diff: "HARD",
    q: "The Hazardous and Solid Waste Amendments (HSWA) of 1984 introduced which of the following specific requirements?",
    choices: [
      "A) All surface water systems must filter and disinfect their water supply",
      "B) Water systems must send annual quality reports to customers",
      "C) Hazardous waste landfills must use double-liner systems, and untreated hazardous wastes cannot be placed directly into landfills",
      "D) Underground injection must become the primary method for all hazardous waste disposal"
    ],
    answer: "Answer: C"
  },
  {
    num: 43, diff: "HARD",
    q: "What is the key legal distinction between a 'hazardous waste' and a 'hazardous substance' as defined in the material?",
    choices: [
      "A) Hazardous wastes are regulated by the EPA; hazardous substances are exempt from regulation",
      "B) Hazardous wastes are discarded materials that pose health risks; hazardous substances still have value and can be used, sold, or processed",
      "C) Hazardous substances are limited to solid materials; hazardous wastes include liquids and gases",
      "D) There is no legal distinction; both terms are used interchangeably under RCRA"
    ],
    answer: "Answer: B"
  },
  {
    num: 44, diff: "HARD",
    q: "In a Hybrid Suspended/Attached Growth System, where is the trickling filter positioned within the treatment train?",
    choices: [
      "A) After the secondary clarifier to polish the effluent",
      "B) After the activated sludge aeration basin",
      "C) Between the primary clarifier and the activated sludge aeration basin",
      "D) Before primary sedimentation as a pre-treatment step"
    ],
    answer: "Answer: C"
  },
  {
    num: 45, diff: "HARD",
    q: "Which of the following BEST describes Monitored Natural Attenuation (MNA)?",
    choices: [
      "A) A chemical oxidation process using UV light and oxidizing agents to break down dissolved contaminants",
      "B) The reliance on natural attenuation processes to achieve site-specific remediation objectives within a reasonable time frame compared to active remediation methods",
      "C) A controlled incineration process for hazardous wastes under regulated high temperatures",
      "D) A biological conditioning stage where wastewater pH is adjusted to prepare microorganisms for bioremediation"
    ],
    answer: "Answer: B"
  },
  {
    num: 46, diff: "HARD",
    q: "A wastewater treatment plant uses Rotating Biological Contactors (RBC). Which description BEST matches their physical configuration?",
    choices: [
      "A) A series of submerged hollow fiber membranes inside an activated sludge aeration tank",
      "B) A rotating distribution arm that sprays wastewater over a circular bed of coarse packing material",
      "C) A series of closely spaced, circular plastic disks (typically 3.6 m in diameter) attached to a rotating horizontal shaft",
      "D) Tall towers packed with plastic media where biofilm microorganisms degrade organic matter"
    ],
    answer: "Answer: C"
  },
  {
    num: 47, diff: "HARD",
    q: "Which of the following CORRECTLY pairs a hazardous waste characteristic with its accurate definition?",
    choices: [
      "A) Corrosivity -- catches fire easily and continues burning after ignition (flash point of 60 degrees C or lower)",
      "B) Reactivity -- contains harmful substances that cause serious organ damage",
      "C) Ignitability -- are strong acids or bases that can destroy materials and injure tissue (pH < 2 or > 12.5)",
      "D) Toxicity -- contains harmful substances that can cause serious health effects such as organ damage; examples include lead, mercury, and pesticides"
    ],
    answer: "Answer: D"
  },
  {
    num: 48, diff: "HARD",
    q: "Under the SDWA's 1986 amendment, what is the maximum allowable lead content in solder used in plumbing?",
    choices: [
      "A) 0.5% lead",
      "B) 1.0% lead",
      "C) 0.2% lead",
      "D) 2.0% lead"
    ],
    answer: "Answer: C"
  },
  {
    num: 49, diff: "HARD",
    q: "The Toxic Substances Control Act (TSCA) differs from CERCLA primarily in that:",
    choices: [
      "A) TSCA focuses on cleaning up historical contaminated sites; CERCLA regulates new chemicals before they cause harm",
      "B) TSCA regulates individual chemicals throughout their entire life cycle from manufacturing to disposal; CERCLA addresses past pollution and cleans up old contaminated sites while holding responsible parties accountable",
      "C) TSCA is administered under RCRA; CERCLA operates independently under the EPA",
      "D) TSCA applies only to solid hazardous wastes; CERCLA applies to all categories of waste"
    ],
    answer: "Answer: B"
  },
  {
    num: 50, diff: "HARD",
    q: "In the context of sulfide precipitation as a chemical treatment for hazardous wastewater, which of the following BEST summarizes both its key advantage and its main disadvantage?",
    choices: [
      "A) Advantage: very low operating cost; Disadvantage: only effective at high contaminant concentrations",
      "B) Advantage: produces reusable metal byproducts; Disadvantage: requires UV radiation equipment",
      "C) Advantage: highly effective at removing heavy metals even at very low concentrations; Disadvantage: may produce toxic hydrogen sulfide gas with a strong rotten-egg odor, requiring proper ventilation",
      "D) Advantage: eliminates the need for secondary clarification; Disadvantage: produces large volumes of inert sludge"
    ],
    answer: "Answer: C"
  }
];

// Color map
const diffColor = { "EASY": "1F7A1F", "MODERATE": "B8860B", "HARD": "C0392B" };
const diffBg = { "EASY": "E8F5E9", "MODERATE": "FFF8E1", "HARD": "FDEDEC" };

const children = [];

// Title
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 200 },
  children: [new TextRun({ text: "WATER QUALITY CONTROL 1", bold: true, size: 36, font: "Arial", color: "1A3C5E" })]
}));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 120 },
  children: [new TextRun({ text: "Multiple Choice Examination", bold: true, size: 28, font: "Arial", color: "2C5F8A" })]
}));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 300 },
  children: [
    new TextRun({ text: "50 Items  |  ", size: 22, font: "Arial", color: "555555" }),
    new TextRun({ text: "15 Easy", size: 22, font: "Arial", color: "1F7A1F", bold: true }),
    new TextRun({ text: "  |  ", size: 22, font: "Arial", color: "555555" }),
    new TextRun({ text: "20 Moderate", size: 22, font: "Arial", color: "B8860B", bold: true }),
    new TextRun({ text: "  |  ", size: 22, font: "Arial", color: "555555" }),
    new TextRun({ text: "15 Hard", size: 22, font: "Arial", color: "C0392B", bold: true }),
    new TextRun({ text: "  |  Suggested Time: 75 minutes", size: 22, font: "Arial", color: "555555" }),
  ]
}));

// Divider paragraph
children.push(new Paragraph({
  spacing: { before: 0, after: 400 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1A3C5E", space: 1 } },
  children: []
}));

let currentSection = "";

for (const q of questions) {
  // Section header
  if (q.diff !== currentSection) {
    currentSection = q.diff;
    const sectionLabels = { "EASY": "EASY — 15 Questions", "MODERATE": "MODERATE — 20 Questions", "HARD": "HARD — 15 Questions" };
    children.push(new Paragraph({
      spacing: { before: 300, after: 200 },
      children: [new TextRun({
        text: `  ${sectionLabels[q.diff]}  `,
        bold: true, size: 24, font: "Arial",
        color: "FFFFFF",
        highlight: q.diff === "EASY" ? "green" : q.diff === "MODERATE" ? "yellow" : "red"
      })]
    }));
  }

  // Question number + text
  children.push(new Paragraph({
    spacing: { before: 220, after: 80 },
    children: [
      new TextRun({ text: `${q.num}. `, bold: true, size: 22, font: "Arial", color: diffColor[q.diff] }),
      new TextRun({ text: q.q, bold: true, size: 22, font: "Arial", color: "1A1A1A" })
    ]
  }));

  // Choices
  for (const c of q.choices) {
    children.push(new Paragraph({
      spacing: { before: 40, after: 40 },
      indent: { left: 360 },
      children: [new TextRun({ text: c, size: 20, font: "Arial", color: "333333" })]
    }));
  }

  // Answer
  children.push(new Paragraph({
    spacing: { before: 80, after: 180 },
    indent: { left: 360 },
    children: [new TextRun({ text: q.answer, bold: true, size: 20, font: "Arial", color: diffColor[q.diff] })]
  }));
}

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1A3C5E", space: 1 } },
          children: [new TextRun({ text: "Water Quality Control 1 — MCQ Exam", size: 18, font: "Arial", color: "555555", italics: true })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "1A3C5E", space: 1 } },
          children: [
            new TextRun({ text: "Page ", size: 18, font: "Arial", color: "555555" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "555555" }),
            new TextRun({ text: " of ", size: 18, font: "Arial", color: "555555" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Arial", color: "555555" }),
          ]
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("U:\\gDrive\\Ventures\\AnyGrade\\WaterQualityControl1_MCQ.docx", buf);
  console.log("Done: WaterQualityControl1_MCQ.docx");
});
