/**
 * Seed CMO No. 97 s.2017 (BSME) topic chunks into Supabase with OpenAI embeddings.
 * Run: cd C:\dev\AnyGrade\apps\web && npx tsx ..\scripts\seed-cmo-topics.ts
 */

import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"
import * as dotenv from "dotenv"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, "../apps/web/.env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_KEY   = process.env.OPENAI_API_KEY!

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_KEY) {
  console.error("Missing env — check .env.local for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const openai   = new OpenAI({ apiKey: OPENAI_KEY })

const CURRICULUM = "CMO-97-2017"

// ---------------------------------------------------------------------------
// All 47 subjects from ANNEX III, CMO No. 97 s.2017 (BSME)
// topics are flat strings; use " > " to express hierarchy
// ---------------------------------------------------------------------------

interface Subject { code: string; title: string; topics: string[] }

const SUBJECTS: Subject[] = [

  // ── A. MATHEMATICS ────────────────────────────────────────────────────────

  { code: "CAL1", title: "Calculus 1", topics: [
    "Functions",
    "Continuity and Limits",
    "The Derivative",
    "The Slope",
    "Rate of Change",
    "The Chain Rule and the General Power Rule",
    "Implicit Differentiation",
    "Higher-Order Derivatives",
    "Polynomial Curves",
    "Applications of the Derivative",
    "The Differential",
    "Derivatives of Trigonometric Functions",
    "Derivative of Inverse Trigonometric Functions",
    "Derivative of Logarithmic and Exponential Functions",
    "Derivative of the Hyperbolic Functions",
    "Solutions of Equations",
    "Transcendental Curve Tracing",
    "Parametric Equations",
    "Partial Differentiation",
  ]},

  { code: "CAL2", title: "Calculus 2", topics: [
    "Integration Concepts and Formulas > Anti-differentiation",
    "Integration Concepts and Formulas > Indefinite Integrals",
    "Integration Concepts and Formulas > Simple Power Formula",
    "Integration Concepts and Formulas > Simple Trigonometric Functions",
    "Integration Concepts and Formulas > Logarithmic Function",
    "Integration Concepts and Formulas > Exponential Function",
    "Integration Concepts and Formulas > Inverse Trigonometric Functions",
    "Integration Concepts and Formulas > Hyperbolic Functions",
    "Integration Concepts and Formulas > General Power Formula and Substitution Rule",
    "Integration Concepts and Formulas > Constant of Integration",
    "Integration Concepts and Formulas > Definite Integral",
    "Integration Techniques > Integration by Parts",
    "Integration Techniques > Trigonometric Integrals",
    "Integration Techniques > Trigonometric Substitution",
    "Integration Techniques > Rational Functions",
    "Integration Techniques > Rationalizing Substitution",
    "Improper Integrals",
    "Application of Definite Integral > Plane Area",
    "Application of Definite Integral > Areas between Curves",
    "Other Applications > Volumes",
    "Other Applications > Work",
    "Other Applications > Hydrostatic Pressure",
    "Multiple Integrals > Double Integrals",
    "Multiple Integrals > Triple Integrals",
    "Multiple Integrals > Inversion of Order and Change of Coordinates",
    "Surface Tracing > Planes",
    "Surface Tracing > Spheres",
    "Surface Tracing > Cylinders",
    "Surface Tracing > Quadric Surfaces",
    "Surface Tracing > Intersection of Surfaces",
    "Multiple Integrals as Volume > Double Integrals",
    "Multiple Integrals as Volume > Triple Integrals",
  ]},

  { code: "DIFFQ", title: "Differential Equations", topics: [
    "Introduction and Classification of Differential Equations",
    "Solution of a Differential Equation",
    "First Order DE > Variable Separable",
    "First Order DE > Exact Equation",
    "First Order DE > Linear Equation",
    "First Order DE > Homogeneous Coefficients",
    "First Order DE > Bernoulli's Equation",
    "First Order DE > Mixed Problems",
    "First Order DE > Computer Solutions",
    "Applications of First Order DE > Decomposition and Growth",
    "Applications of First Order DE > Newton's Law of Cooling",
    "Applications of First Order DE > Mixing (non-reacting fluids)",
    "Applications of First Order DE > Electric Circuits",
    "Linear DE of Order n > Standard Form and Differential Operators",
    "Linear DE of Order n > Principle of Superposition",
    "Linear DE of Order n > Linear Independence",
    "Homogeneous Linear DE with Constant Coefficients",
    "Initial and Boundary Value Problems",
    "Non-homogeneous DE > Method of Undetermined Coefficients",
    "Non-homogeneous DE > Variation of Parameters",
    "Higher Order DE using Computer",
    "Laplace Transforms > Definition and Elementary Functions",
    "Laplace Transforms > First Shifting Theorem",
    "Laplace Transforms > Derivatives of Transforms",
    "Laplace Transforms > Inverse Transforms",
    "Laplace Transforms > Transforms of Derivatives",
    "Laplace Transforms > Initial Value Problems",
  ]},

  { code: "ENGDA", title: "Engineering Data Analysis", topics: [
    "Methods of Data Collection",
    "Planning and Conducting Surveys",
    "Introduction to Design of Experiments",
    "Probability > Sample Space and Events",
    "Probability > Counting Rules",
    "Probability > Rules of Probability",
    "Discrete Probability Distributions > Random Variables",
    "Discrete Probability Distributions > Cumulative Distribution Functions",
    "Discrete Probability Distributions > Expected Values",
    "Discrete Probability Distributions > Binomial Distribution",
    "Discrete Probability Distributions > Poisson Distribution",
    "Continuous Probability Distribution > Normal Distribution",
    "Continuous Probability Distribution > Exponential Distribution",
    "Continuous Probability Distribution > Normal Approximation",
    "Joint Probability Distribution > Joint and Marginal Distributions",
    "Joint Probability Distribution > Linear Functions of Random Variables",
    "Sampling Distributions and Point Estimation",
    "Central Limit Theorem",
    "Unbiased Estimator and Standard Error",
    "Confidence Intervals > Single Sample",
    "Confidence Intervals > Multiple Samples",
    "Prediction and Tolerance Intervals",
    "Hypothesis Testing > One-sided and Two-sided Hypothesis",
    "Hypothesis Testing > P-value",
    "Hypothesis Testing > Test on Mean (Variance Known)",
    "Hypothesis Testing > Test on Mean (Variance Unknown)",
    "Hypothesis Testing > Test on Variance",
    "Hypothesis Testing > Test on Population Proportion",
    "Inference on Two Samples > Difference in Means",
    "Inference on Two Samples > Variance of Two Distributions",
    "Inference on Two Samples > Two Population Proportions",
    "Simple Linear Regression > Least-Squares Approach",
    "Simple Linear Regression > Correlation",
    "Simple Linear Regression > Hypothesis Tests",
    "Simple Linear Regression > Prediction of New Observations",
    "Simple Linear Regression > Adequacy and Coefficient of Determination",
  ]},

  // ── B. NATURAL / PHYSICAL SCIENCES ────────────────────────────────────────

  { code: "CHEM4E", title: "Chemistry for Engineers", topics: [
    "Energy > Electrochemical Energy",
    "Energy > Nuclear Chemistry and Energy",
    "Energy > Fuels",
    "Chemistry of Engineering Materials > Basic Concepts of Crystal Structure",
    "Chemistry of Engineering Materials > Metals",
    "Chemistry of Engineering Materials > Polymers",
    "Chemistry of Engineering Materials > Engineered Nanomaterials",
    "Chemistry of the Environment > Chemistry of the Atmosphere",
    "Chemistry of the Environment > Chemistry of Water",
    "Chemistry of the Environment > Soil Chemistry",
    "Chemical Safety",
    "Special Topics specific to field of expertise",
  ]},

  { code: "CHEM4EL", title: "Chemistry for Engineers (Laboratory)", topics: [
    "Calorimetry",
    "Heat of Combustion",
    "Metals and Corrosion",
    "Mechanical Properties of Materials",
    "Water: Properties and Purification",
    "Determination of Dissolved Oxygen Content of Water",
    "Cigarette Smoking and Air Pollution",
    "Nuclear Reactions, Binding Energy and Rate of Decay",
    "Crystal Lattices and Unit Cells",
    "Community Immersion: Care for the Environment",
  ]},

  { code: "PHYS4E", title: "Physics for Engineers", topics: [
    "Work, Energy and Power",
    "Impulse and Momentum",
    "Kinematics",
    "Dynamics",
    "Rotation",
    "Dynamics of Rotation",
    "Elasticity",
    "Oscillations",
    "Fluids",
    "Heat Transfer",
    "Waves",
    "Electrostatics",
    "Electricity",
    "Magnetism",
    "Optics",
  ]},

  // ── C. BASIC ENGINEERING SCIENCES ─────────────────────────────────────────

  { code: "ENGDR", title: "Engineering Drawing", topics: [
    "Engineering Lettering",
    "Instrumental Figures",
    "Geometric Construction",
    "Orthographic Projection",
    "Dimensioning",
    "Orthographic Views with Dimensions and Section View",
    "Sectional View",
    "Pictorial Drawing",
    "Engineering Working Drawings",
    "Assembly and Exploded Detailed Drawings",
  ]},

  { code: "CAD", title: "Computer-Aided Drafting", topics: [
    "Introduction to CAD Software",
    "CAD Drawing",
    "Snapping and Construction Elements",
    "Dimensioning",
    "Plotting and Inputting Images",
    "3D and Navigating in 3D",
    "Rendering",
  ]},

  { code: "COMPFUND", title: "Computer Fundamentals and Programming", topics: [
    "Course outline not specified in CMO No. 97 s.2017 ANNEX III",
  ]},

  { code: "STATICS", title: "Statics of Rigid Bodies", topics: [
    "Introduction to Mechanics and Vector Operations",
    "Force Vectors and Equilibrium of Particles",
    "Vector Cross and Dot Product",
    "Moment of a Force",
    "Couples and Moment of a Couple",
    "Equivalent Force Systems in 2D and 3D",
    "Dry Static Friction, Wedge and Belt Friction",
    "Centroid, Center of Mass, and Center of Gravity",
    "Distributed Loads, Hydrostatic Forces, and Cables",
    "Moment of Inertia and Mass Moment of Inertia",
    "Beams, Shear and Bending Moment Diagrams",
  ]},

  { code: "DYNRB", title: "Dynamics of Rigid Bodies", topics: [
    "Introduction to Dynamics",
    "Position, Velocity, and Acceleration",
    "Determination of the Motion of Particles",
    "Uniform Rectilinear Motion",
    "Uniformly Accelerated Rectilinear Motion",
    "Position Vector, Velocity, and Acceleration",
    "Derivatives of Vector Functions",
    "Rectangular Components of Velocity and Acceleration",
    "Motion Relative to a Frame in Translation",
    "Tangential and Normal Components",
    "Radial and Transverse Components",
    "Motion of Several Particles (Dependent Motion)",
    "Kinetics of Particles > Newton's Second Law of Motion",
    "Kinetics of Particles > Linear Momentum and Rate of Change",
    "Kinetics of Particles > Dynamic Equilibrium",
    "Kinetics of Particles > Angular Momentum",
    "Kinetics of Particles > Radial and Transverse Components",
    "Kinetics of Particles > Work of Force",
    "Kinetics of Particles > Kinetic Energy and Work-Energy Principle",
    "Kinetics of Particles > Applications of Work-Energy",
    "Systems of Particles > Newton's Second Law for Systems",
    "Systems of Particles > Linear and Angular Momentum",
    "Systems of Particles > Motion of Mass Center",
    "Systems of Particles > Angular Momentum About Mass Center",
    "Kinematics of Rigid Bodies > Translation",
    "Kinematics of Rigid Bodies > Rotation About a Fixed Axis",
    "Kinematics of Rigid Bodies > Equations Defining Rotation",
    "Kinematics of Rigid Bodies > General Plane Motion",
    "Kinematics of Rigid Bodies > Absolute and Relative Velocity in Plane Motion",
    "Kinematics of Rigid Bodies > Instantaneous Center of Rotation",
    "Kinematics of Rigid Bodies > Absolute and Relative Acceleration",
    "Kinematics of Rigid Bodies > Rate of Change in Rotating Frame",
    "Kinematics of Rigid Bodies > Coriolis Acceleration",
    "Kinematics of Rigid Bodies > Motion About a Fixed Point",
    "Kinematics of Rigid Bodies > General Motion",
    "Kinematics of Rigid Bodies > Three-Dimensional Coriolis Acceleration",
    "Kinematics of Rigid Bodies > Frame of Reference in General Motion",
    "Plane Motion of Rigid Bodies > Angular Momentum in Plane Motion",
    "Plane Motion of Rigid Bodies > D'Alembert's Principle",
    "Plane Motion of Rigid Bodies > Work and Energy",
    "Plane Motion of Rigid Bodies > Work of Forces",
    "Plane Motion of Rigid Bodies > Kinetic Energy in Plane Motion",
    "Plane Motion of Rigid Bodies > Impulse and Momentum",
  ]},

  { code: "MDB", title: "Mechanics of Deformable Bodies", topics: [
    "Load Classification",
    "Concept of Stress, Normal and Shear Stress",
    "Stresses under Centric Loading",
    "Stress Concentration",
    "Plane Stress",
    "Principal Stresses for Plane Stress",
    "Mohr's Circle for Plane Stress",
    "Deformations, Normal and Shear Strains",
    "Material Properties",
    "Working Stresses",
    "Deformation in Axially Loaded Members",
    "Temperature Effects on Axially Loaded Members",
    "Statically Indeterminate Members",
    "Thin-Walled Pressure Vessel",
    "Torsional Stresses and Elastic Torsion Formula",
    "Torsional Deformation and Power Transmission",
    "Flexural Stresses by the Elastic Curve",
    "Moment Equation Using Singularity Function",
    "Beam Deflection by Double Integration Method",
    "Area Moment Theorems",
    "Moment Diagram by Parts",
    "Beam Deflection by Area Moment Method",
    "Statically Indeterminate Beams",
    "Buckling of Long Straight Columns",
    "Combined Loadings",
    "Analysis of Riveted Connections by Uniform Shear Method",
    "Welded Connections",
  ]},

  { code: "ENGECON", title: "Engineering Economics", topics: [
    "Introduction > Definitions and Principles",
    "Introduction > Engineering Economics and the Design Process",
    "Introduction > Cost Concepts for Decision Making",
    "Introduction > Present Economic Studies",
    "Money-Time Relationships > Interest and Time Value of Money",
    "Money-Time Relationships > Concept of Equivalence",
    "Money-Time Relationships > Cash Flows",
    "Economic Study Methods > Minimum Attractive Rate of Return",
    "Economic Study Methods > Present Worth",
    "Economic Study Methods > Future Worth",
    "Economic Study Methods > Annual Worth",
    "Economic Study Methods > Internal Rate of Return",
    "Economic Study Methods > External Rate of Return",
    "Economic Study Methods > Discounted Payback Period",
    "Economic Study Methods > Benefit/Cost Ratio",
    "Decisions Under Certainty > Mutually Exclusive Alternatives",
    "Decisions Under Certainty > Independent Projects",
    "Decisions Under Certainty > Effects of Inflation",
    "Decisions Under Certainty > Depreciation and After-Tax Analysis",
    "Decisions Under Certainty > Replacement Studies",
    "Decisions Recognizing Risk > Expected Monetary Value",
    "Decisions Recognizing Risk > Discounted Decision Tree Analysis",
    "Decisions Admitting Uncertainty > Sensitivity Analysis",
    "Decisions Admitting Uncertainty > Decision Analysis Models",
  ]},

  { code: "ENGMGT", title: "Engineering Management", topics: [
    "Introduction to Engineering Management",
    "Decision Making",
    "Functions of Management > Planning and Coordinating",
    "Functions of Management > Organizing",
    "Functions of Management > Staffing",
    "Functions of Management > Communicating",
    "Functions of Management > Motivating",
    "Functions of Management > Leading",
    "Functions of Management > Controlling",
    "Managing Product and Service Operations",
    "Managing the Marketing Function",
    "Managing the Finance Function",
  ]},

  { code: "TECHPRE", title: "Technopreneurship 101", topics: [
    "Introduction > Entrepreneurial Mindset",
    "Introduction > Innovation and Ideas",
    "Introduction > Products and Services",
    "Introduction > Team Formation",
    "Customers",
    "Value Proposition",
    "Market Identification and Analysis",
    "Creating Competitive Advantage",
    "Business Models",
    "Introduction to Intellectual Property",
    "Execution and Business Plan",
    "Financial Analysis and Accounting Basics",
    "Raising Capital",
    "Ethics, Social Responsibility, and Globalization",
  ]},

  // ── D. ALLIED COURSES ──────────────────────────────────────────────────────

  { code: "BEE", title: "Basic Electrical Engineering", topics: [
    "Definitions, Symbols, Circuit Elements, Variables and Parameters",
    "Resistance > Definition and Resistivity",
    "Resistance > Resistance as a Function of Temperature",
    "Resistance > Conductance",
    "Ohm's Law, Electrical Power, and Electrical Energy",
    "Heating Effect of Electric Current",
    "Connection of Resistors > Series",
    "Connection of Resistors > Parallel",
    "Connection of Resistors > Series-Parallel",
    "Connection of Resistors > Application to Meters",
    "Network Reduction > Delta-Wye and Wye-Delta Transformation",
    "Maximum Power Transfer in DC Circuits",
    "Cells and Batteries > Electrochemical Cells",
    "Cells and Batteries > Series and Parallel Grouping",
    "Cells and Batteries > Battery as Source of Energy",
    "Network Analysis > Kirchhoff's Laws",
    "Network Analysis > Maxwell's Method",
    "Network Analysis > Superposition Theorem",
    "Network Analysis > Thevenin's Theorem",
    "Network Analysis > Norton's Theorem",
    "Inductors",
    "Capacitors",
    "AC Circuits > Definition and Nomenclature of Periodic Waves",
    "AC Circuits > Equations of Sinusoidal Current and Voltage",
    "AC Circuits > Phase Angle and Phase Angle Difference",
    "AC Circuits > Impedance Function",
    "Voltage and Current Relation > Pure Resistive Circuit",
    "Voltage and Current Relation > Pure Inductive Circuit",
    "Voltage and Current Relation > Pure Capacitive Circuit",
    "Voltage and Current Relation > Series RL Circuit",
    "Voltage and Current Relation > Series RC Circuit",
    "Voltage and Current Relation > Series RLC Circuit",
    "Effective Value of AC",
    "Phasor Algebra > Impedance Complex Circuit",
    "Conductance, Susceptance and Admittance",
    "Power Factor Correction",
  ]},

  { code: "BELEC", title: "Basic Electronics", topics: [
    "Introduction to Electronics > History and Applications",
    "Introduction to Electronics > Common Components",
    "Introduction to Electronics > Conductor, Insulator, Semiconductor",
    "Semiconductor PN Junction Diode > Construction and Characteristics",
    "Semiconductor PN Junction Diode > Diode Equivalent Model",
    "Semiconductor PN Junction Diode > Diode Circuit Analysis",
    "Semiconductor PN Junction Diode > Light Emitting Diode",
    "DC Regulated Power Supply > Block Diagram, Transformer, Rectifier",
    "DC Regulated Power Supply > Capacitor Filter",
    "DC Regulated Power Supply > Voltage Regulator",
    "Bipolar Junction Transistor > Construction and Schematic Symbol",
    "Bipolar Junction Transistor > Regions of Operation and Characteristic Curve",
    "Bipolar Junction Transistor > Amplification Factors",
    "Bipolar Junction Transistor > Switching Transistor Circuit",
    "Bipolar Junction Transistor > Amplifier Configurations and Analysis",
    "FET > JFET and MOSFET DC Analysis",
    "FET > AC Small Signal Analysis",
    "Operational Amplifiers > Block Diagram",
    "Operational Amplifiers > Characteristics and Equivalent Circuit",
    "Operational Amplifiers > Closed Loop Operation",
  ]},

  { code: "DCACM", title: "DC and AC Machinery", topics: [
    "DC Generators",
    "Shunt and Compound Motors",
    "Single Phase Transformer",
    "Three-Phase Alternator",
    "Induction Motors",
    "Synchronous Motors",
  ]},

  // ── E. FUNDAMENTAL ME COURSES ─────────────────────────────────────────────

  { code: "MEOR", title: "Mechanical Engineering Orientation", topics: [
    "Mechanical Engineering Program",
    "Teamwork and Communication Skills",
    "Engineering Profession",
    "Engineering as a Career",
    "Developing Good Study Habits",
    "Engineering Design and Creativity",
  ]},

  { code: "ADVME", title: "Advanced Mathematics for ME", topics: [
    "Introduction, Discrete Algebra, Accuracy, Errors",
    "Taylor Series",
    "Review of Matrices > Operations, Vectors, Determinants, Rank",
    "Solutions to Linear Systems of Equations",
    "Roots of Equations",
    "Interpolation, Least Squares, Curve Fitting, Optimization",
    "Numerical Differentiation",
    "Numerical Integration Methods (Runge-Kutta)",
    "Solution to Non-Linear Equations",
    "Numerical Solution to Ordinary Differential Equations and Systems of ODE",
    "Numerical Solution to Partial Differential Equations",
    "Computer Programming Exercises",
  ]},

  { code: "RESME", title: "Methods of Research for ME", topics: [
    "Nature and Characteristics of Research",
    "Types of Research > Basic, Applied, and Pure Research",
    "Research Problems and Objectives > Purpose and Developing Objectives",
    "Review of Related Literature > Conceptual and Research Literature",
    "Review of Related Literature > Referencing",
    "Research Design > Experimental Design",
    "Statistical Methods > Z-test",
    "Statistical Methods > ANOVA",
    "Statistical Methods > Regression",
    "Statistical Methods > Hypothesis Testing",
    "Writing Research Proposal > Problem and Background",
    "Writing Research Proposal > Review of Related Literature",
    "Writing Research Proposal > Research Methods and Procedure",
    "Ethical Issues on Research",
  ]},

  { code: "FLMEC", title: "Fluid Mechanics", topics: [
    "Introduction to Fluid Mechanics",
    "Properties of Fluids > Compressible and Incompressible Fluids",
    "Properties of Fluids > Bulk Modulus of Elasticity",
    "Properties of Fluids > Gas Equation of State",
    "Properties of Fluids > Surface Tension",
    "Fluid Statics > Pressure Variation in Static Fluid",
    "Fluid Statics > Absolute and Gage Pressures",
    "Fluid Statics > Pressure Measuring Devices",
    "Fluid Statics > Force on Plane and Curved Areas",
    "Fluid Statics > Center of Pressure",
    "Fluid Statics > Buoyancy and Stability",
    "Fluid Statics > Fluid Masses Subjected to Acceleration",
    "Conservation of Energy > Bernoulli's Equation",
    "Conservation of Energy > Energy Equation for Steady Flow",
    "Conservation of Energy > Power Considerations",
    "Conservation of Energy > Hydraulic Grade Line and Energy Line",
    "Conservation of Energy > Forced and Free Vortex",
    "Basic Hydrodynamics > Equation of Continuity",
    "Basic Hydrodynamics > Rotational and Irrotational Flow",
    "Basic Hydrodynamics > Stream Function and Velocity Potential",
    "Similitude and Dimensional Analysis > Geometric, Kinematic, Dynamic Similarity",
    "Similitude and Dimensional Analysis > Buckingham Pi Theorem",
    "Momentum and Forces > Impulse-Momentum Principle",
    "Momentum and Forces > Force on Vanes and Blades",
    "Momentum and Forces > Torque in Rotating Machines",
    "Steady Incompressible Flow > Reynolds Number",
    "Steady Incompressible Flow > Laminar and Turbulent Flow",
    "Steady Incompressible Flow > Pipe Friction and Losses",
    "Steady Incompressible Flow > Branching Pipes, Series and Parallel",
    "Fluid Measurements > Venturi Tube, Orifice Meter, Weirs",
    "Multi-Phase Flow",
  ]},

  { code: "MACHEL", title: "Machine Elements", topics: [
    "Introduction to Kinematics of Machinery",
    "Vector Operations (Analytical and Graphical)",
    "Motion and Machinery > Displacement, Velocity, Acceleration, Linkages",
    "Instant Center > Location of Instant Center",
    "Velocity Analysis Method",
    "Acceleration Analysis",
    "Cam and Follower",
    "Rolling Bodies in Pure Contact",
    "Gears",
    "Gear Train",
    "Belts and Pulleys",
    "Chains",
    "Flexible Connections",
    "Stepped Pulleys",
  ]},

  { code: "MATSCI", title: "Materials Science and Engineering for ME", topics: [
    "Nature of Materials > Types of Engineering Materials",
    "Nature of Materials > Chemical Bonding",
    "Properties of Materials > Physical Properties",
    "Properties of Materials > Mechanical Properties",
    "Properties of Materials > Chemical Properties",
    "Properties of Materials > Thermal Properties",
    "Properties of Materials > Electrical Properties",
    "Properties of Materials > Magnetic Properties",
    "Properties of Materials > Optical Properties",
    "Material Testing > Tension Test",
    "Material Testing > Compression Test",
    "Material Testing > Coefficient of Thermal Expansion",
    "Material Testing > Beam Deflection",
    "Material Testing > Shear and Torsion Test",
    "Fracture Toughness and Fatigue > Impact Testing",
    "Fracture Toughness and Fatigue > Destructive Testing",
    "Fracture Toughness and Fatigue > Fatigue Testing",
    "Corrosion Prevention and Control > Electrochemical Nature of Corrosion",
    "Corrosion Prevention and Control > Galvanic and Concentration Cell Corrosion",
    "Non-Destructive Testing > Magnetic Particle",
    "Non-Destructive Testing > Ultrasonic Testing",
    "Non-Destructive Testing > Penetrant Testing",
    "Non-Destructive Testing > Radiographic Testing",
    "Ferrous and Non-Ferrous Metals",
    "Ceramics",
    "Polymers",
    "Composite Materials",
    "Nano and Bio Materials",
    "Selection, Re-use and Recycling of Materials",
  ]},

  { code: "THERM1", title: "Thermodynamics 1", topics: [
    "Introduction to Thermodynamics",
    "Basic Principles, Concepts and Definitions",
    "First Law of Thermodynamics",
    "Ideal Gases and Ideal Gas Laws",
    "Processes of Ideal Gases",
    "Properties of Pure Substance",
    "Processes of Pure Substance",
    "Second Law of Thermodynamics",
    "Introduction to Gas and Vapor Cycles",
    "Real Gases",
  ]},

  { code: "THERM2", title: "Thermodynamics 2", topics: [
    "Review of Thermodynamic Cycles",
    "Simple Rankine Cycle Analysis",
    "Improving Rankine Cycle Efficiency",
    "Actual Rankine Cycle",
    "Ideal and Actual Reheat Cycle",
    "Ideal and Actual Regenerative Cycle",
    "Ideal and Actual Reheat-Regenerative Cycle",
    "Binary Cycles",
    "Topping or Superposing Cycles",
    "Incomplete Expansion Engine",
    "Gas Power Cycles > Brayton Cycle",
    "Gas Power Cycles > Otto Cycle",
    "Gas Power Cycles > Diesel Cycle",
    "Gas Compression Analysis",
    "Real Gases",
    "Properties of Gas and Vapor Mixtures",
  ]},

  { code: "COMBE", title: "Combustion Engineering", topics: [
    "Introduction to Combustion",
    "Principles of Thermodynamics applied to Combustion",
    "Mixture of Gases",
    "Theoretical Cycles",
    "Handling of Gaseous Fuels",
    "Handling of Volatile Liquid Fuels",
    "Handling of Fuel Oils",
    "Engine Testing and Performance",
    "Engine Design",
    "External Combustion",
    "Combustion of Fuels",
  ]},

  { code: "HEATX", title: "Heat Transfer", topics: [
    "Overview of Heat Transfer > Modes, Definitions and Applications",
    "Overview of Heat Transfer > Thermal Conductivities of Materials",
    "Conduction > Conduction Rate Equation",
    "Conduction > Steady-State Plane Wall and Composite Wall",
    "Conduction > Radial Systems",
    "Conduction > Film Coefficient of Convection",
    "Free Convection > Vertical Plates and Inclined Plates",
    "Free Convection > Horizontal Plates",
    "Free Convection > Cylinders, Tubes, and Spheres",
    "Forced Convection > Pipe and Tubes",
    "Forced Convection > Cylinders, Spheres, and Tube Banks",
    "Radiation > Processes and Properties",
    "Radiation Exchange > View Factor",
    "Radiation Exchange > Blackbody Radiation Exchange",
    "Radiation Exchange > Diffuse Gray Surfaces",
    "Multi-Mode Heat Transfer > Combination of Modes",
    "Heat Exchangers > Types and Overall Heat Transfer Coefficient",
    "Heat Exchangers > LMTD and AMTD",
    "Heat Exchangers > Parallel Flow and Counter Flow",
    "Heat Exchangers > Multi-Pass and Cross Flow",
  ]},

  { code: "MELAB1", title: "ME Laboratory 1", topics: [
    "Density, Specific Gravity and Viscosity of Liquid Fuels",
    "Flash and Fire Points of Liquid Fuels and Grease",
    "Drop and Hardness Tests of Greases",
    "Carbon Residue Test",
    "Test of Solid Fuel",
    "Calorific Test of Gaseous Fuel",
    "Flue Gas Analysis",
    "Water and Sediments Test",
    "Cloud and Pour Points Test",
    "Distillation and Vapor Pressure Tests of Gasoline Fuel",
    "Calibration and Use of Pressure and Temperature Measuring Instruments",
    "Measurement of Length, Areas, Speed and Time",
    "Calibration of Platform Scale",
    "Calibration of Volume Tank, Water Meter, Orifice, Venturi Meter and Weir",
    "Measurement of Humidity",
    "Determination of Static, Velocity and Total Pressure using Pitot Tube",
    "Dynamometer and Power Measurement",
  ]},

  { code: "MELAB2", title: "ME Laboratory 2", topics: [
    "Physical Study of the Steam Generating Unit",
    "Test of Centrifugal Fan and Rotary Blower",
    "Test of an Air Compressor",
    "Measurement of Steam Quality",
    "Heat Loss Calculation through Bare and Lagged Pipes",
    "Test of Parallel and Counter Flow Heat Exchangers",
    "Test of a Surface Condenser",
    "Test of a Tubular Condenser",
    "Visualization of Fluid Flow using Reynolds Number Apparatus",
    "Performance Test of an Internal Combustion Engine",
    "Test of Series and Parallel Pump Flow",
    "Performance Test of a Positive Displacement Pump",
    "Performance Test of a Non-Positive Displacement Pump",
    "Performance Test of a Hydraulic Turbine",
  ]},

  { code: "MANIP", title: "Manufacturing and Industrial Processes with Plant Visits", topics: [
    "Handling of Solids > Feeders and Storage Silos",
    "Handling of Solids > Conveyors and Conveying Systems",
    "Handling of Solids > Size Reduction of Solids",
    "Handling of Solids > Separation and Classification of Solids",
    "Dryers and Drying Processes",
    "Manufacturing Processes > Cement",
    "Manufacturing Processes > Steel",
    "Manufacturing Processes > Glass",
    "Manufacturing Processes > Plastic and Rubber",
    "Manufacturing Processes > Food and Beverage",
    "Manufacturing Processes > Electronics and Semiconductors",
    "Manufacturing Processes > Metals",
    "Packaging Processes and Equipment",
    "Plant Visits to Manufacturing and Industrial Plants",
    "Plumbing",
  ]},

  { code: "BOSH", title: "Basic Occupational Safety and Health", topics: [
    "Introductory Concepts > Safety and Health as an Engineer's Responsibility",
    "Occupational Safety",
    "Industrial Hygiene",
    "Control Measures for OSH Hazards",
    "Occupational Health",
    "Personal Protective Equipment",
    "OSH Programming",
    "Training of Personnel on OSH",
    "OSH Legislation",
    "Plant Visit Simulation",
    "Fire Protection",
  ]},

  { code: "WKSHP", title: "Workshop Theory and Practice", topics: [
    "Introduction to Machine Shop Operations, Layouts, Tools and Measuring Instruments",
    "Machine Shop Safety, Rules and Regulations",
    "Metal Working Processes",
    "Caliper",
    "Ball Peen Hammer",
    "Drilling and Grinding Machines",
    "Lathe Machines",
    "Shaper and Milling Machines",
    "Welding Machines",
    "Forge and Foundry Equipment",
  ]},

  { code: "MACSHOP", title: "Machine Shop Theory", topics: [
    "Principles of Machine Shop Practices",
    "Classification, Applications and Operations of Machines",
    "New Technologies and Trends in Machine Shop Operations",
    "Practical Exercises and Projects using Different Types of Machines",
    "Introduction to Numerical Controlled Machines and Automation",
  ]},

  { code: "CTRLENG", title: "Control Engineering", topics: [
    "Introduction to Control Systems > Open-Loop and Closed-Loop Control",
    "Laplace Transforms",
    "Transfer Functions",
    "Block Diagrams and Signal Flow Graphs",
    "Physical Systems Modeling",
    "System Stability",
    "Root Locus Analysis",
    "Time Domain Analysis of Control Systems",
    "Frequency Domain Analysis of Control Systems",
    "Control System Design > Classical Techniques and PID Controllers",
    "Introduction to Digital Control > Z-Transform",
    "Computer Programming Exercises",
    "Laboratory Exercises",
  ]},

  { code: "FLMACH", title: "Fluid Machineries", topics: [
    "Definitions and Terminologies",
    "Dimensional Analysis Applied to Fluid Machineries",
    "Specific Speed of Fluid Machineries",
    "Basic Pump Construction (Impellers, Diffusers)",
    "Net Positive Suction Head and Cavitation",
    "Pump Operation, Pipe Sizing and Selection",
    "Axial and Centrifugal Pumps, Fans and Blowers",
    "Basic Turbine Construction (Blades, Diffuser)",
    "Impulse and Reaction Turbines",
    "Sizing and Selection of Turbines",
    "Applications of Fluid Machineries",
  ]},

  { code: "REFRIG", title: "Refrigeration Systems", topics: [
    "Introduction to Refrigeration System",
    "Refrigerants",
    "Standard and Actual Vapor Compression Cycle",
    "Functions and Performance of Compressors",
    "Functions and Performance of Evaporators",
    "Functions and Performance of Condensers",
    "Functions and Performance of Expansion Devices",
    "Multi-Stage Refrigeration System",
    "Absorption Refrigeration Cycle",
    "Air Cycle Refrigeration System",
    "Steam Jet Refrigeration Cycle",
    "Special Topics in Refrigeration Systems",
  ]},

  { code: "ACVENT", title: "Air Conditioning and Ventilation Systems", topics: [
    "Air-Conditioning System and Psychrometric Processes",
    "Air-Conditioning Processes",
    "Cooling Towers and Air Dryers",
    "Cooling Load Calculations",
    "Air Distribution System, Duct Sizing and Equipment Specification",
    "Refrigerant Piping and Chilled Water Piping System",
    "Air Conditioning Equipment Design and Selection",
    "Ventilation",
    "Comfort Condition and Indoor Air Quality",
    "PSVARE Standard for Energy Efficient Buildings",
    "Conventional and Alternative Air-Conditioning Systems",
  ]},

  { code: "VIBENG", title: "Vibration Engineering", topics: [
    "Basic Concepts > Equivalent Springs, Masses and Damping",
    "Free Vibration > Harmonic Motion",
    "Free Vibration > Viscous Damping",
    "Free Vibration > Design Considerations",
    "Free Vibration > Stability",
    "Harmonically Excited Vibration > Equation of Motion",
    "Harmonically Excited Vibration > Response of Undamped System",
    "Harmonically Excited Vibration > Response of Damped System",
    "Vibration under General Forcing Conditions > Periodic Force Response",
    "Vibration under General Forcing Conditions > Non-Periodic Force Response",
    "Vibration Measurement",
    "Vibration Analysis and Control",
  ]},

  { code: "COMPME", title: "Computer Applications for ME", topics: [
    "Course outline not specified in CMO No. 97 s.2017 ANNEX III",
  ]},

  // ── F. PROFESSIONAL ME COURSES ─────────────────────────────────────────────

  { code: "MDES1", title: "Machine Design 1", topics: [
    "Analysis of Simple Stresses > Tensile",
    "Analysis of Simple Stresses > Compressive",
    "Analysis of Simple Stresses > Shear and Torsion",
    "Analysis of Simple Stresses > Bending and Flexural",
    "Tolerance and Allowances",
    "Variable Stress Analysis > With Stress Concentration",
    "Variable Stress Analysis > Without Stress Concentration",
    "Variable Stress Analysis > Definite Life Design",
    "Variable Stress Analysis > Indefinite Life Design",
    "Shaft Design > Pure Bending",
    "Shaft Design > Pure Torsion",
    "Shaft Design > Combined Loads",
    "Shaft Design > Using PSME and ASME Codes",
    "Keys and Coupling Design > Flat and Square Keys",
    "Keys and Coupling Design > Flexible Coupling",
    "Design of Screw Fastening > Types of Bolts and Screws",
    "Design of Screw Fastening > Initial Tension and Tightening Torque",
    "Design of Screw Fastening > Bolts and Screws in Shear",
    "Design of Mechanical Springs > Coil and Leaf Springs",
    "Design of Power Screws > Square, Acme and Buttress Thread",
    "Gears",
  ]},

  { code: "MDES2", title: "Machine Design 2", topics: [
    "Flywheels",
    "Brakes and Clutches",
    "Bearings",
    "Flexible Power Transmissions > Belts",
    "Flexible Power Transmissions > Wire Ropes",
    "Flexible Power Transmissions > Chains",
    "Analysis and Synthesis of Machineries",
  ]},

  { code: "MELAB3", title: "ME Laboratory 3", topics: [
    "Performance, Heat Balance and Efficiency Test of a Simple Steam Power Plant",
    "Performance, Heat Balance and Efficiency Test of a Diesel Electric Power Plant",
    "Performance Test of a Mini-Hydroelectric Power Plant",
    "Performance and Efficiency Test of a Refrigeration Plant",
    "Performance and Efficiency Test of an Air Conditioning Plant",
  ]},

  { code: "INDPE", title: "Industrial Plant Engineering", topics: [
    "Basic Design Concepts of Industrial Plant Systems and Equipment",
    "General Piping Systems and Layouts of Industrial Plants",
    "Principles of Materials Handling",
    "Industrial Steam Processes",
    "Industrial Waste Water Treatment",
    "Air Pollution Control Systems for Industrial Application",
    "Fire Protection System",
  ]},

  { code: "PPRE", title: "Power Plant Design with Renewable Energy", topics: [
    "Steam Power Plants",
    "Variable Load Problems",
    "Diesel Electric Power Plants",
    "Gas Turbine Power Plants",
    "Hydro-Electric Power Plants",
    "Geothermal Power Plants",
    "Combined Cycle Power Plants",
    "Renewable Energies > Solar Energy",
    "Renewable Energies > Wind Energy",
    "Renewable Energies > Tidal Energy",
    "Renewable Energies > Biomass Energy",
    "Renewable Energies > OTEC",
    "Power Plant Economics > Cost Components and Pie Chart Analysis",
    "Power Plant Economics > Plant Cost Comparison",
    "Co-generation and Energy Management System",
  ]},

  { code: "MELAW", title: "ME Law, Ethics, Contract, Codes and Standards", topics: [
    "The Mechanical Engineering Profession",
    "The Mechanical Engineer in Society",
    "Mechanical Engineering Law",
    "The Mechanical Engineer's Code of Ethics",
    "Ethical Issues and Case Studies in Engineering",
    "Local and International Codes and Standards",
    "Contracts and Specifications",
    "National Building Code of the Philippines",
  ]},

  { code: "MEPS1", title: "ME Project Study 1", topics: [
    "Statement of the Problem",
    "Objectives and Significance of the Study",
    "Scope and Limitations",
    "Review of Related Literature",
    "Underlying Theories and Concepts",
    "Research Methodology",
    "Oral Defense of Project Proposal",
  ]},

  { code: "MEPS2", title: "ME Project Study 2", topics: [
    "Data Analysis and Presentation of Results",
    "Conclusions and Recommendations",
    "Final Written Project Study Report",
    "Oral Defense of Completed Project",
  ]},

  // ── II. NON-TECHNICAL COURSES ─────────────────────────────────────────────

  // ── A. General Education Courses ──────────────────────────────────────────

  { code: "PURCOM", title: "Purposive Communication", topics: [
    "Communication Processes, Principles, and Ethics",
    "Communication for Various Purposes > Informative Communication",
    "Communication for Various Purposes > Persuasive Communication",
    "Communication for Various Purposes > Creative Communication",
    "Communication Across Contexts > Intercultural Communication",
    "Communication Across Contexts > Workplace Communication",
    "Multimodal Texts and Digital Communication",
    "Research-Based Communication > Writing a Research Report",
    "Research-Based Communication > Oral Presentation of Research",
  ]},

  { code: "MATHMOD", title: "Mathematics in the Modern World", topics: [
    "The Nature of Mathematics > Patterns and Numbers in Nature",
    "The Nature of Mathematics > The Fibonacci Sequence and the Golden Ratio",
    "Mathematical Language and Symbols",
    "Problem Solving and Reasoning > Inductive and Deductive Reasoning",
    "Problem Solving and Reasoning > Polya's Problem Solving Strategy",
    "Statistics > Data Collection and Organization",
    "Statistics > Measures of Central Tendency and Dispersion",
    "Statistics > Normal Distribution",
    "Statistics > Linear Regression and Correlation",
    "Linear Programming",
    "The Mathematics of Finance > Simple and Compound Interest",
    "The Mathematics of Finance > Annuities and Loans",
    "Apportionment and Voting",
    "Logic > Propositions and Logical Connectives",
    "Logic > Truth Tables and Valid Arguments",
  ]},

  { code: "UNSELF", title: "Understanding the Self", topics: [
    "The Self from Various Perspectives > Philosophical Perspectives",
    "The Self from Various Perspectives > Sociological Perspectives",
    "The Self from Various Perspectives > Anthropological Perspectives",
    "The Self from Various Perspectives > Psychological Perspectives",
    "The Physical Self",
    "The Sexual Self",
    "The Material Self",
    "The Digital Self",
    "The Political Self",
    "The Spiritual Self",
    "Personal Identity and Development",
  ]},

  { code: "ARTAPP", title: "Art Appreciation", topics: [
    "Nature, Functions, and Subjects of Art",
    "Elements and Principles of Art",
    "Art Forms > Visual Arts",
    "Art Forms > Performing Arts",
    "Art Forms > Literary Arts",
    "Artistic Styles and Periods",
    "Philippine Arts and Culture",
    "Contemporary and Popular Arts",
    "Art Criticism and Aesthetic Theory",
  ]},

  { code: "ETHICS", title: "Ethics", topics: [
    "Fundamentals of Ethics > Nature and Scope of Ethics",
    "Fundamentals of Ethics > Moral Standards vs. Other Standards",
    "Classical Ethical Theories > Virtue Ethics",
    "Classical Ethical Theories > Deontological Ethics",
    "Classical Ethical Theories > Utilitarianism/Consequentialism",
    "Contemporary Ethical Theories > Care Ethics",
    "Contemporary Ethical Theories > Social Contract Theory",
    "Freedom and Responsibility",
    "Applied Ethics > Environmental Ethics",
    "Applied Ethics > Business Ethics",
    "Applied Ethics > Bioethics",
    "Applied Ethics > Technology Ethics",
    "The Common Good and Social Justice",
  ]},

  { code: "PHISHIST", title: "Readings in Philippine History", topics: [
    "Introduction to Philippine Historiography",
    "Primary Sources and Critical Thinking",
    "Pre-Colonial Philippines",
    "Spanish Colonial Period",
    "The Philippine Revolution",
    "American Colonial Period",
    "The Commonwealth and World War II",
    "Post-War Republic and the Marcos Era",
    "People Power and the Contemporary Philippines",
    "Thematic Issues in Philippine History",
  ]},

  { code: "CONTWORLD", title: "The Contemporary World", topics: [
    "Globalization > Definitions and Dimensions",
    "Globalization > Economic Globalization",
    "Globalization > Political Globalization",
    "Globalization > Cultural Globalization",
    "Global Governance > International Organizations",
    "Global Governance > International Law and Human Rights",
    "Global Issues > Climate Change and the Environment",
    "Global Issues > Migration and Diaspora",
    "Global Issues > Terrorism and Global Security",
    "Global Issues > Poverty and Inequality",
    "The Philippines in the Contemporary World",
  ]},

  { code: "STS", title: "Science, Technology and Society", topics: [
    "Nature of Science and Technology",
    "History of Science and Technology",
    "Science, Technology and Society Interactions",
    "Technology and Social Change",
    "Ethical Issues in Science and Technology",
    "Science, Technology and the Environment",
    "Science and Technology Policy",
    "Emerging Technologies and the Future",
    "Science and Technology in the Philippines",
  ]},

  // ── B. Mandated General Education Course ──────────────────────────────────

  { code: "RIZAL", title: "Life and Works of Rizal", topics: [
    "Rizal's Life > Early Life and Education",
    "Rizal's Life > Travels and Studies Abroad",
    "Rizal's Life > Return to the Philippines and Exile",
    "Rizal's Life > Trial and Execution",
    "Rizal's Works > Noli Me Tangere",
    "Rizal's Works > El Filibusterismo",
    "Rizal's Works > Essays and Letters",
    "Rizal's Nationalism and Relevance Today",
    "Republic Act 1425 (Rizal Law)",
  ]},

  // ── C. Physical Education ──────────────────────────────────────────────────

  { code: "PE1", title: "Physical Education 1", topics: [
    "Physical Fitness and Wellness Concepts",
    "Exercise Fundamentals and Safety",
    "Physical Activity Program and Goal Setting",
  ]},

  { code: "PE2", title: "Physical Education 2", topics: [
    "Team Sports and Cooperative Activities",
    "Rules, Strategies, and Fair Play",
    "Physical Fitness Assessment",
  ]},

  { code: "PE3", title: "Physical Education 3", topics: [
    "Individual and Dual Sports",
    "Sports Skills Development",
    "Lifestyle and Active Recreation",
  ]},

  { code: "PE4", title: "Physical Education 4", topics: [
    "Dance and Rhythmic Activities",
    "Alternative Physical Activities",
    "Lifelong Fitness and Wellness Planning",
  ]},

  // ── D. National Service Training Program ──────────────────────────────────

  { code: "NSTP1", title: "National Service Training Program 1", topics: [
    "NSTP Overview > History, Legal Basis, and Components (ROTC, CWTS, LTS)",
    "Values Formation and Citizenship",
    "Community Needs Assessment",
    "Social Mobilization and Organizing",
    "Introduction to Community Service Projects",
  ]},

  { code: "NSTP2", title: "National Service Training Program 2", topics: [
    "Implementation of Community Service Projects",
    "Project Monitoring and Evaluation",
    "Disaster Risk Reduction and Management",
    "Environmental Awareness and Conservation",
    "Community Immersion and Documentation",
  ]},
]

// ---------------------------------------------------------------------------
// Build flat chunk rows from subjects
// ---------------------------------------------------------------------------

interface ChunkRow {
  subject_code: string
  subject_title: string
  curriculum_code: string
  topic_path: string
  topic_title: string
  level: number
  full_context: string
}

function buildChunks(): ChunkRow[] {
  const rows: ChunkRow[] = []
  for (const subj of SUBJECTS) {
    for (const rawTopic of subj.topics) {
      const parts = rawTopic.split(" > ")
      rows.push({
        subject_code: subj.code,
        subject_title: subj.title,
        curriculum_code: CURRICULUM,
        topic_path: rawTopic,
        topic_title: parts[parts.length - 1],
        level: parts.length,
        full_context: `${subj.title} — ${rawTopic}`,
      })
    }
  }
  return rows
}

// ---------------------------------------------------------------------------
// Embed texts with text-embedding-3-small
// ---------------------------------------------------------------------------

async function embedBatch(texts: string[]): Promise<number[][]> {
  const resp = await openai.embeddings.create({ model: "text-embedding-3-small", input: texts })
  return resp.data.map((d) => d.embedding)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const chunks = buildChunks()
  console.log(`\n📚  ${SUBJECTS.length} subjects → ${chunks.length} topic chunks\n`)

  // Delete existing rows for this curriculum
  console.log("🗑   Clearing existing CMO-97-2017 rows…")
  const { error: delErr } = await supabase
    .from("cmo_topic_chunks")
    .delete()
    .eq("curriculum_code", CURRICULUM)
  if (delErr) { console.error("Delete error:", delErr.message); process.exit(1) }

  // Embed + insert in batches of 20
  const BATCH = 20
  let inserted = 0

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    const embeddings = await embedBatch(batch.map((c) => c.full_context))

    const rows = batch.map((c, j) => ({
      ...c,
      embedding: JSON.stringify(embeddings[j]),
    }))

    const { error } = await supabase.from("cmo_topic_chunks").insert(rows)
    if (error) { console.error(`Insert error at batch ${i}:`, error.message); process.exit(1) }

    inserted += batch.length
    process.stdout.write(`\r✅  ${inserted}/${chunks.length} chunks inserted`)

    if (i + BATCH < chunks.length) await new Promise((r) => setTimeout(r, 400))
  }

  console.log("\n\n🎉  Seed complete!")

  console.log("🔧  Attempting to build ivfflat vector index…")
  await supabase
    .rpc("exec_sql", {
      sql: `CREATE INDEX IF NOT EXISTS cmo_topic_chunks_emb_idx
            ON public.cmo_topic_chunks
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 20);`,
    })
    .then(({ error: e }) => {
      if (e) console.warn("⚠   Index hint:", e.message)
      else console.log("✅  Index ready")
    })

  console.log(`\nTotal: ${SUBJECTS.length} subjects, ${inserted} chunks`)
}

main().catch((e) => { console.error(e); process.exit(1) })
