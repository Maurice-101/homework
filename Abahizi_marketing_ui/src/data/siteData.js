// Central place for site copy & structured content.
// Keeping content separate from components makes it easy to edit text
// without touching markup, and to later swap this for a CMS/API call.

export const NAV_LINKS = [
  { label: "Solutions", to: "/solutions" },
  { label: "Academic Levels", to: "/solutions#levels" },
  { label: "Resources", to: "/resources" },
  { label: "Pricing", to: "/pricing" },
  { label: "About Platform", to: "/about" },
];

export const CORE_VALUES = [
  {
    icon: "BookOpen",
    title: "Curriculum Alignment",
    description:
      "Tools designed to synchronize seamlessly with national academic standards, providing teachers with structured frameworks.",
  },
  {
    icon: "LineChart",
    title: "Actionable Analytics",
    description:
      "Transform complex student data into clear, actionable insights for administrative review and strategic planning.",
  },
  {
    icon: "ShieldCheck",
    title: "Institutional Security",
    description:
      "Enterprise-grade data protection ensuring student and institutional records remain confidential and compliant.",
  },
];

export const ECOSYSTEM_MODULES = [
  {
    key: "terminal",
    tag: "Core Module",
    title: "Academic Terminal",
    description:
      "The central hub for educators to manage curriculum, track progress, and interface with administrative directives in real-time.",
    variant: "light",
  },
  {
    key: "portal",
    icon: "Users",
    title: "Student Portal",
    description:
      "Secure access to assignments, grades, and resources for empowered learning.",
    variant: "navy",
  },
  {
    key: "console",
    icon: "Landmark",
    title: "Admin Console",
    description:
      "High-level oversight tools for school leadership and district managers.",
    variant: "gold",
  },
];

export const TRUSTED_BY = ["MINEDUC", "REB", "UR", "Mastercard Fdn", "Kigali City"];

export const SYSTEM_STATUS = {
  activeInstitutes: "124+",
  dailySyncs: "1.2M",
  status: "All Systems Operational",
};

export const WORKFLOW_STEPS = [
  {
    number: 1,
    title: "School Onboarding",
    description:
      "Dedicated account managers assist in data migration, setting up administrative hierarchies, and configuring institutional settings.",
  },
  {
    number: 2,
    title: "Teacher Activation",
    description:
      "Teachers receive comprehensive training on managing classes, utilizing the resource library, and tracking student progress efficiently.",
  },
  {
    number: 3,
    title: "Student Engagement",
    description:
      "Students access an intuitive portal to view assignments, take interactive quizzes, and monitor their academic growth.",
  },
];

export const CORE_CAPABILITIES = [
  {
    key: "quizzes",
    icon: "ClipboardList",
    title: "Advanced Quizzes",
    description:
      "Create dynamic assessments with automated grading, randomized question banks, and detailed performance analytics to identify knowledge gaps instantly.",
    bullets: ["Real-time performance tracking", "Customizable grading rubrics"],
    variant: "light",
  },
  {
    key: "homework",
    icon: "ClipboardCheck",
    title: "Homework Workflow",
    description:
      "Streamline assignments with automated reminders, digital submissions, and seamless feedback loops.",
    link: "Explore Workflow",
    variant: "navy",
  },
  {
    key: "resources",
    icon: "FolderOpen",
    title: "Centralized Resource Management",
    description:
      "Organize curriculum materials, syllabi, and supplementary reading in a structured, easily accessible digital vault.",
    file: { name: "Term 1 Syllabus.pdf", size: "2.4 MB" },
    variant: "light",
  },
  {
    key: "analytics",
    icon: "TrendingUp",
    title: "Actionable Analytics",
    description:
      "Visualize institutional performance, class averages, and individual student progress over time.",
    variant: "light",
  },
];

export const SECURITY_FEATURES = [
  {
    icon: "Lock",
    title: "End-to-End Encryption",
    description: "All data is encrypted in transit and at rest using industry-standard protocols.",
  },
  {
    icon: "ShieldCheck",
    title: "Data Privacy Compliance",
    description: "Strict adherence to national and international data protection regulations.",
  },
  {
    icon: "ServerCog",
    title: "Reliable Infrastructure",
    description: "99.9% uptime guarantee with redundant backups to prevent data loss.",
  },
];

export const APPROACH_PILLARS = [
  {
    icon: "GraduationCap",
    title: "Classroom Integration",
    description:
      "Seamless integration of digital tools into daily lessons, fostering an environment where technology enhances rather than distracts from core learning objectives.",
  },
  {
    icon: "Users",
    title: "Teacher Empowerment",
    description:
      "Providing educators with robust analytics and streamlined administrative tools, returning valuable time to pedagogy and student mentorship.",
  },
  {
    icon: "Cpu",
    title: "Technical Precision",
    description:
      "Enterprise-grade architecture ensuring data security, rapid performance, and high-resolution interfaces designed for complex institutional management.",
  },
];

export const IMPACT_STATS = [
  { value: "500+", label: "Institutions", description: "Trusting Abahizi for daily operations.", variant: "light" },
  { value: "1.2M", label: "Students Managed", description: "Across multiple academic levels seamlessly.", variant: "navy" },
  { value: "99.9%", label: "Uptime Reliability", description: "Enterprise-grade server architecture.", variant: "light" },
];

export const LEADERSHIP = [
  {
    name: "John Kayinamura",
    role: "Chief Executive Officer",
    bio: "Former Head Teacher and Educational Expert with 20 years in scalable academic systems.",
  },
  {
    name: "Bode Murairi Murai",
    role: "Chief Technology Officer and Software Engineer",
    bio: "Lead architect of the Abahizi core engine, specializing in secure data infrastructure.",
  },
  {
    name: "Maurice Nshimyumukiza",
    role: "DevOps Engineer and Software Engineer:",
    bio: "Ensuring proper managent of servers, cloud systems, and deployment tools, and analysing pedagogical alignment and strict adherence to national education curriculumn standards.",
  },
];

export const PARTNERS = [
  {
    icon: "Landmark",
    title: "Ministry of Education",
    description:
      "Strategic alignment to ensure platform capabilities meet national reporting and administrative standards.",
  },
  {
    icon: "HeartHandshake",
    title: "Global Education Fund",
    description: "Providing vital foundational funding to accelerate platform deployment across rural districts.",
  },
  {
    icon: "Settings2",
    title: "Tech Innovators Rwanda",
    description: "Technical partnership ensuring robust local infrastructure and seamless integration services.",
  },
];

export const INQUIRY_TOPICS = [
  "Partnership opportunity",
  "Bring Abahizi to my institution",
  "Media & press",
  "Technical support",
  "Other",
];

export const CONTACT_INFO = {
  hub: "Kigali Hub",
  description: "Our primary operational center supporting institutions across the region.",
  address: "RN3 Kayonza-Rwamagana, Rwanda — Saint Augustin Innovations",
  phone: "+250 (0) 782743579",
  email: "support@abahizi.edu.rw",
};

export const FOOTER_LINKS = {
  Platform: [
    { label: "Solutions", to: "/solutions" },
    { label: "Pricing", to: "/pricing" },
  ],
  Company: [
    { label: "About Us", to: "/about" },
    { label: "Careers", to: "/careers" },
    { label: "Press", to: "/press" },
  ],
  Trust: [
    { label: "Security", to: "/about#security" },
    { label: "Privacy Policy", to: "/privacy" },
  ],
  Resources: [
    { label: "Documentation", to: "/resources" },
    { label: "Partners & Funders", to: "/contact#partners" },
    { label: "Contact", to: "/contact" },
  ],
};
