// Shared i18n for the whole platform (student / facilitator / admin / login pages).
// Scope: static UI chrome — nav, headers, buttons, form labels, placeholders.
// Not translated: dynamic/DB content (course descriptions, book titles, chat
// messages, uploaded resource names) — same as any real i18n setup, that's data,
// not UI copy, and there's no translation service wired in to machine-translate it.
//
// NOTE on translation quality: French strings were done with real fluency. The
// Kinyarwanda strings are a good-faith best effort using standard EdTech/software
// terminology, not verified by a native speaker — worth a native-speaker review
// pass before this ships to real users.

const I18N_DICT = {
  en: {
    "nav.dashboard": "Dashboard", "nav.courses": "Courses", "nav.subjects": "My Subjects",
    "nav.assignments": "Assignments", "nav.progress": "Progress", "nav.resources": "Resources",
    "nav.messages": "Messages", "nav.notifications": "Notifications", "nav.canvas": "Canvas",
    "nav.settings": "Settings", "nav.logout": "Logout", "nav.students": "Students",
    "nav.approvals": "Approvals", "nav.users": "Users", "nav.reports": "Reports",

    "title.dashboard": "Dashboard", "title.courses": "Courses", "title.assignments": "Assignments & Tests",
    "title.progress": "Progress", "title.resources": "Resources & Library", "title.messages": "Messages",
    "assignments.subtitle": "Manage, track, and submit your work across all subjects.", "assignments.upcoming": "Upcoming",
    "common.subject": "Subject", "common.title": "Title", "common.dueDate": "Due Date", "common.status": "Status",
    "title.notifications": "Notifications", "title.canvas": "Virtual Notebook", "title.settings": "Settings",

    "common.loading": "Loading…", "common.search": "Search", "common.searchEllipsis": "Search…",
    "common.save": "Save", "common.saveChanges": "Save Changes", "common.cancel": "Cancel",
    "common.back": "Back", "common.view": "View", "common.download": "Download", "common.upload": "Upload",
    "common.submit": "Submit", "common.post": "Post", "common.enroll": "+ Enroll", "common.enrolled": "✓ Enrolled",
    "common.allSubjects": "All Subjects", "common.allGrades": "All Grades",
    "common.email": "Email Address", "common.password": "Password", "common.confirmPassword": "Confirm Password",
    "common.firstName": "First Name", "common.lastName": "Last Name", "common.school": "School",
    "common.grade": "Grade", "common.bio": "Bio", "common.public": "Public", "common.private": "Private",
    "common.searchByTitle": "Search by title…", "common.searchCourses": "Search courses…",

    "auth.loginTab": "Login", "auth.registerTab": "Register",
    "auth.welcomeBack": "Welcome Back", "auth.signInToContinue": "Sign in to continue learning",
    "auth.createAccount": "Create Account", "auth.joinPlatform": "Join the Abahizi platform",
    "auth.yourPassword": "Your password", "auth.min8chars": "Min 8 characters",
    "auth.reenterPassword": "Re-enter your password", "auth.role": "Role",
    "auth.student": "Student", "auth.facilitator": "Facilitator (Teacher)", "auth.administrator": "Administrator",
    "auth.optional": "(optional)", "auth.forgotPassword": "Forgot password?",
    "auth.loginBtn": "Login", "auth.signingIn": "Signing in…",
    "auth.createAccountBtn": "Create Account", "auth.creatingAccount": "Creating account…",
    "auth.yourSchoolName": "Your school name", "auth.gradeExample": "e.g. S4",
    "auth.invalidCredentials": "Invalid email or password.", "auth.passwordMin8": "Password must be at least 8 characters.",
    "auth.passwordsNoMatch": "Passwords do not match.", "auth.registrationFailed": "Registration failed. Try again.",

    "courses.enrolled": "Enrolled Courses", "courses.browse": "Browse Catalog", "courses.public": "Public Courses",
    "courses.invitations": "Invitations", "courses.title": "My Courses",
    "courses.subtitle": "Manage your enrolled classes and discover new subjects.",
    "courses.joinPrivate": "Join a Private Course", "courses.joinPrivateSub": "Have an invite code? Enter it here to gain access.",
    "common.join": "Join",
    "courses.privateInviteOnly": "Private — invitation only", "courses.progress": "Progress",
    "courses.enrolledClickToView": "✓ Enrolled — Click to view", "courses.enrolling": "Enrolling…",
    "courses.enrolledToast": "Successfully enrolled!", "courses.enrollFailedToast": "Could not enroll.",

    "resources.browseBySubject": "Browse by Subject", "resources.textbooks": "Textbooks",
    "resources.pastPapers": "Past Papers", "resources.uploaded": "Uploaded",
    "resources.title": "Resources & Library",
    "resources.subtitle": "Discover, save, and access academic materials.", "resources.browse": "Browse",
    "common.filters": "Filters", "common.reset": "Reset",

    "settings.profile": "Profile", "settings.changePassword": "Change Password",
    "settings.language": "Language", "settings.displayLanguage": "Display Language",
    "settings.title": "Settings & Profile",

    "dashboard.welcome": "Welcome back! 👋", "dashboard.welcomeSub": "Here's your academic overview for today.",
    "dashboard.activeCourses": "Active Courses", "dashboard.upcomingAssignments": "Upcoming Assignments",
    "dashboard.submitted": "Submitted", "dashboard.notifications": "Notifications",

    "cd.home": "Home", "cd.syllabus": "Syllabus", "cd.modules": "Modules", "cd.assignments": "Assignments",
    "cd.grades": "Grades", "cd.people": "People", "cd.discussions": "Discussions",
    "cd.announcements": "Announcements", "cd.courseChat": "Course Chat", "cd.backToCourses": "← Courses",
    "cd.peopleGroups": "People & Groups", "cd.members": "Members", "cd.groups": "Groups",
    "cd.newDiscussion": "+ New Discussion", "cd.discussionTitlePlaceholder": "Discussion title…",
    "cd.whatsOnYourMindPlaceholder": "What's on your mind?…", "cd.selectWeekOrBook": "← Select a week or book",
    "cd.writeMessagePlaceholder": "Write a message… (Enter to post, Shift+Enter for new line)",
    "cd.courseResources": "📖 Course Resources", "cd.yourSubmission": "📤 Your Submission",
    "cd.textTab": "Text Entry", "cd.linkDriveTab": "Website URL", "cd.uploadPdfTab": "File Upload",
    "cd.yourAnswer": "Your Answer", "cd.writeAnswerPlaceholder": "Write your answer here…",
    "cd.websiteLink": "Website / Google Drive Link", "cd.uploadFileLabel": "Upload File", "cd.submitAssignment": "Submit Assignment",
    "cd.backToAssignments": "← Back to Assignments", "cd.noDescription": "No description available for this course.",
    "cd.taughtBy": "Taught by", "cd.yourProgress": "Your Progress", "cd.passed": "✓ Passed",
    "cd.retake": "↩ Retake", "cd.inProgress": "In Progress", "cd.percentComplete": "complete",
    "cd.modulesCount": "modules", "cd.assignmentsCount": "assignments",

    "facilitator.mySubjects": "My Subjects", "facilitator.myStudents": "My Students",
    "facilitator.activeAssignments": "Active Assignments", "facilitator.pendingGrading": "Pending Grading",
    "facilitator.recentSubmissions": "Recent Submissions", "facilitator.upcomingDueDates": "Upcoming Due Dates",
    "facilitator.quickActions": "Quick Actions", "facilitator.createSubject": "+ Create Subject",
    "facilitator.loadingSubjects": "Loading subjects…", "facilitator.createAssignment": "+ Create Assignment",
    "facilitator.all": "All", "facilitator.needsGrading": "Needs Grading",
    "facilitator.searchStudents": "Search students…", "facilitator.loadingStudents": "Loading students…",
    "facilitator.studentProgress": "Student Progress", "facilitator.loadingProgressData": "Loading progress data…",
    "facilitator.uploadResource": "📤 Upload Resource", "facilitator.uploadPdf": "Upload PDF",
    "facilitator.markAllRead": "Mark All Read", "facilitator.noNotifications": "No notifications.",
    "facilitator.profileInfo": "Profile Information", "facilitator.newSubject": "+ New Subject",
    "facilitator.newAssignment": "+ New Assignment", "facilitator.messageStudents": "✉ Message Students",
    "facilitator.browseResources": "📖 Browse Resources",

    "admin.userManagement": "User Management", "admin.courseManagement": "Course Management",
    "admin.assignmentOversight": "Assignment Oversight", "admin.platformSettings": "Platform Settings",
    "admin.controlPanel": "Admin Control Panel", "admin.manageSubtitle": "Manage users, courses, and monitor platform activity.",
    "admin.totalUsers": "Total Users", "admin.students": "Students", "admin.facilitators": "Facilitators",
    "admin.submissions": "Submissions", "admin.pendingApprovals": "Pending Approvals", "admin.recentUsers": "Recent Users",
    "admin.manageUsers": "👤 Manage Users", "admin.reviewCourses": "📚 Review Courses",
    "admin.sendAnnouncement": "✉ Send Announcement", "admin.viewResources": "📖 View Resources",
    "admin.allRoles": "All Roles", "admin.admins": "Admins", "admin.searchUsers": "Search users…",
    "admin.name": "Name", "admin.role": "Role", "admin.status": "Status", "admin.actions": "Actions",
    "admin.allStatus": "All Status", "admin.pendingApproval": "Pending Approval", "admin.approved": "Approved",
    "admin.title": "Title", "admin.subject": "Subject", "admin.enrolled": "Enrolled", "admin.facilitator": "Facilitator",
    "admin.compose": "+ Compose", "admin.inbox": "Inbox", "admin.sent": "Sent",
    "admin.noMessages": "No messages.", "admin.noSentMessages": "No sent messages.",
    "admin.adminProfile": "Admin Profile", "admin.platformInfo": "Platform Info",
    "admin.platformInfoText": "Abahizi Platform – National Digital Education System for Secondary Education in Rwanda",
    "admin.version": "Version 1.0.0", "admin.editUser": "Edit User", "admin.to": "To (User ID)",
    "admin.composeMessage": "Compose Message", "admin.message": "Message", "admin.send": "Send",
  },

  fr: {
    "nav.dashboard": "Tableau de bord", "nav.courses": "Cours", "nav.subjects": "Mes matières",
    "nav.assignments": "Devoirs", "nav.progress": "Progression", "nav.resources": "Ressources",
    "nav.messages": "Messages", "nav.notifications": "Notifications", "nav.canvas": "Canvas",
    "nav.settings": "Paramètres", "nav.logout": "Déconnexion", "nav.students": "Étudiants",
    "nav.approvals": "Approbations", "nav.users": "Utilisateurs", "nav.reports": "Rapports",

    "title.dashboard": "Tableau de bord", "title.courses": "Cours", "title.assignments": "Devoirs et tests",
    "title.progress": "Progression", "title.resources": "Ressources & Bibliothèque", "title.messages": "Messages",
    "assignments.subtitle": "Gérez, suivez et soumettez vos travaux dans toutes les matières.", "assignments.upcoming": "À venir",
    "common.subject": "Matière", "common.title": "Titre", "common.dueDate": "Date limite", "common.status": "Statut",
    "title.notifications": "Notifications", "title.canvas": "Cahier virtuel", "title.settings": "Paramètres",

    "common.loading": "Chargement…", "common.search": "Rechercher", "common.searchEllipsis": "Rechercher…",
    "common.save": "Enregistrer", "common.saveChanges": "Enregistrer les modifications", "common.cancel": "Annuler",
    "common.back": "Retour", "common.view": "Voir", "common.download": "Télécharger", "common.upload": "Envoyer",
    "common.submit": "Soumettre", "common.post": "Publier", "common.enroll": "+ S'inscrire", "common.enrolled": "✓ Inscrit(e)",
    "common.allSubjects": "Toutes les matières", "common.allGrades": "Tous les niveaux",
    "common.email": "Adresse e-mail", "common.password": "Mot de passe", "common.confirmPassword": "Confirmer le mot de passe",
    "common.firstName": "Prénom", "common.lastName": "Nom", "common.school": "École",
    "common.grade": "Niveau", "common.bio": "Bio", "common.public": "Public", "common.private": "Privé",
    "common.searchByTitle": "Rechercher par titre…", "common.searchCourses": "Rechercher des cours…",

    "auth.loginTab": "Connexion", "auth.registerTab": "S'inscrire",
    "auth.welcomeBack": "Content de vous revoir", "auth.signInToContinue": "Connectez-vous pour continuer",
    "auth.createAccount": "Créer un compte", "auth.joinPlatform": "Rejoignez la plateforme Abahizi",
    "auth.yourPassword": "Votre mot de passe", "auth.min8chars": "8 caractères minimum",
    "auth.reenterPassword": "Ressaisissez votre mot de passe", "auth.role": "Rôle",
    "auth.student": "Étudiant(e)", "auth.facilitator": "Facilitateur (Enseignant)", "auth.administrator": "Administrateur",
    "auth.optional": "(facultatif)", "auth.forgotPassword": "Mot de passe oublié ?",
    "auth.loginBtn": "Connexion", "auth.signingIn": "Connexion…",
    "auth.createAccountBtn": "Créer un compte", "auth.creatingAccount": "Création du compte…",
    "auth.yourSchoolName": "Nom de votre école", "auth.gradeExample": "ex. S4",
    "auth.invalidCredentials": "E-mail ou mot de passe invalide.", "auth.passwordMin8": "Le mot de passe doit contenir au moins 8 caractères.",
    "auth.passwordsNoMatch": "Les mots de passe ne correspondent pas.", "auth.registrationFailed": "Échec de l'inscription. Réessayez.",

    "courses.enrolled": "Cours inscrits", "courses.browse": "Parcourir le catalogue", "courses.public": "Cours publics",
    "courses.invitations": "Invitations", "courses.title": "Mes cours",
    "courses.subtitle": "Gérez vos cours inscrits et découvrez de nouvelles matières.",
    "courses.joinPrivate": "Rejoindre un cours privé", "courses.joinPrivateSub": "Vous avez un code d'invitation ? Entrez-le ici pour accéder.",
    "common.join": "Rejoindre",
    "courses.privateInviteOnly": "Privé — sur invitation uniquement", "courses.progress": "Progression",
    "courses.enrolledClickToView": "✓ Inscrit(e) — Cliquez pour voir", "courses.enrolling": "Inscription…",
    "courses.enrolledToast": "Inscription réussie !", "courses.enrollFailedToast": "Impossible de s'inscrire.",

    "resources.browseBySubject": "Parcourir par matière", "resources.textbooks": "Manuels",
    "resources.pastPapers": "Anciens examens", "resources.uploaded": "Envoyés",
    "resources.title": "Ressources & Bibliothèque",
    "resources.subtitle": "Découvrez, enregistrez et accédez aux ressources pédagogiques.", "resources.browse": "Parcourir",
    "common.filters": "Filtres", "common.reset": "Réinitialiser",

    "settings.profile": "Profil", "settings.changePassword": "Changer le mot de passe",
    "settings.language": "Langue", "settings.displayLanguage": "Langue d'affichage",
    "settings.title": "Paramètres & Profil",

    "dashboard.welcome": "Content de vous revoir ! 👋", "dashboard.welcomeSub": "Voici votre aperçu académique du jour.",
    "dashboard.activeCourses": "Cours actifs", "dashboard.upcomingAssignments": "Devoirs à venir",
    "dashboard.submitted": "Soumis", "dashboard.notifications": "Notifications",

    "cd.home": "Accueil", "cd.syllabus": "Programme", "cd.modules": "Modules", "cd.assignments": "Devoirs",
    "cd.grades": "Notes", "cd.people": "Participants", "cd.discussions": "Discussions",
    "cd.announcements": "Annonces", "cd.courseChat": "Chat du cours", "cd.backToCourses": "← Cours",
    "cd.peopleGroups": "Participants & Groupes", "cd.members": "Membres", "cd.groups": "Groupes",
    "cd.newDiscussion": "+ Nouvelle discussion", "cd.discussionTitlePlaceholder": "Titre de la discussion…",
    "cd.whatsOnYourMindPlaceholder": "Qu'avez-vous en tête ?…", "cd.selectWeekOrBook": "← Sélectionnez une semaine ou un livre",
    "cd.writeMessagePlaceholder": "Écrivez un message… (Entrée pour publier, Maj+Entrée pour une nouvelle ligne)",
    "cd.courseResources": "📖 Ressources du cours", "cd.yourSubmission": "📤 Votre soumission",
    "cd.textTab": "Texte", "cd.linkDriveTab": "URL du site", "cd.uploadPdfTab": "Envoyer un fichier",
    "cd.yourAnswer": "Votre réponse", "cd.writeAnswerPlaceholder": "Écrivez votre réponse ici…",
    "cd.websiteLink": "Lien du site / Google Drive", "cd.uploadFileLabel": "Envoyer un fichier", "cd.submitAssignment": "Soumettre le devoir",
    "cd.backToAssignments": "← Retour aux devoirs", "cd.noDescription": "Aucune description disponible pour ce cours.",
    "cd.taughtBy": "Enseigné par", "cd.yourProgress": "Votre progression", "cd.passed": "✓ Réussi",
    "cd.retake": "↩ À reprendre", "cd.inProgress": "En cours", "cd.percentComplete": "complété",
    "cd.modulesCount": "modules", "cd.assignmentsCount": "devoirs",

    "facilitator.mySubjects": "Mes matières", "facilitator.myStudents": "Mes étudiants",
    "facilitator.activeAssignments": "Devoirs actifs", "facilitator.pendingGrading": "En attente de correction",
    "facilitator.recentSubmissions": "Soumissions récentes", "facilitator.upcomingDueDates": "Échéances à venir",
    "facilitator.quickActions": "Actions rapides", "facilitator.createSubject": "+ Créer une matière",
    "facilitator.loadingSubjects": "Chargement des matières…", "facilitator.createAssignment": "+ Créer un devoir",
    "facilitator.all": "Tous", "facilitator.needsGrading": "À corriger",
    "facilitator.searchStudents": "Rechercher des étudiants…", "facilitator.loadingStudents": "Chargement des étudiants…",
    "facilitator.studentProgress": "Progression des étudiants", "facilitator.loadingProgressData": "Chargement des données…",
    "facilitator.uploadResource": "📤 Envoyer une ressource", "facilitator.uploadPdf": "Envoyer le PDF",
    "facilitator.markAllRead": "Tout marquer comme lu", "facilitator.noNotifications": "Aucune notification.",
    "facilitator.profileInfo": "Informations du profil", "facilitator.newSubject": "+ Nouvelle matière",
    "facilitator.newAssignment": "+ Nouveau devoir", "facilitator.messageStudents": "✉ Contacter les étudiants",
    "facilitator.browseResources": "📖 Parcourir les ressources",

    "admin.userManagement": "Gestion des utilisateurs", "admin.courseManagement": "Gestion des cours",
    "admin.assignmentOversight": "Supervision des devoirs", "admin.platformSettings": "Paramètres de la plateforme",
    "admin.controlPanel": "Panneau de contrôle administrateur", "admin.manageSubtitle": "Gérez les utilisateurs, les cours et suivez l'activité de la plateforme.",
    "admin.totalUsers": "Utilisateurs au total", "admin.students": "Étudiants", "admin.facilitators": "Facilitateurs",
    "admin.submissions": "Soumissions", "admin.pendingApprovals": "Approbations en attente", "admin.recentUsers": "Utilisateurs récents",
    "admin.manageUsers": "👤 Gérer les utilisateurs", "admin.reviewCourses": "📚 Examiner les cours",
    "admin.sendAnnouncement": "✉ Envoyer une annonce", "admin.viewResources": "📖 Voir les ressources",
    "admin.allRoles": "Tous les rôles", "admin.admins": "Administrateurs", "admin.searchUsers": "Rechercher des utilisateurs…",
    "admin.name": "Nom", "admin.role": "Rôle", "admin.status": "Statut", "admin.actions": "Actions",
    "admin.allStatus": "Tous les statuts", "admin.pendingApproval": "En attente d'approbation", "admin.approved": "Approuvé",
    "admin.title": "Titre", "admin.subject": "Matière", "admin.enrolled": "Inscrits", "admin.facilitator": "Facilitateur",
    "admin.compose": "+ Rédiger", "admin.inbox": "Boîte de réception", "admin.sent": "Envoyés",
    "admin.noMessages": "Aucun message.", "admin.noSentMessages": "Aucun message envoyé.",
    "admin.adminProfile": "Profil administrateur", "admin.platformInfo": "Informations sur la plateforme",
    "admin.platformInfoText": "Plateforme Abahizi – Système éducatif numérique national pour l'enseignement secondaire au Rwanda",
    "admin.version": "Version 1.0.0", "admin.editUser": "Modifier l'utilisateur", "admin.to": "À (ID utilisateur)",
    "admin.composeMessage": "Rédiger un message", "admin.message": "Message", "admin.send": "Envoyer",
  },

  rw: {
    "nav.dashboard": "Imbonerahamwe", "nav.courses": "Amasomo", "nav.subjects": "Amasomo Yanjye",
    "nav.assignments": "Imyitozo", "nav.progress": "Iterambere", "nav.resources": "Ibikoresho",
    "nav.messages": "Ubutumwa", "nav.notifications": "Amatangazo", "nav.canvas": "Canvas",
    "nav.settings": "Igenamiterere", "nav.logout": "Gusohoka", "nav.students": "Abanyeshuri",
    "nav.approvals": "Kwemeza", "nav.users": "Abakoresha", "nav.reports": "Raporo",

    "title.dashboard": "Imbonerahamwe", "title.courses": "Amasomo", "title.assignments": "Imyitozo n'Ibizamini",
    "title.progress": "Iterambere", "title.resources": "Ibikoresho & Isomero", "title.messages": "Ubutumwa",
    "assignments.subtitle": "Gucunga, gukurikirana no kohereza imirimo yawe muri buri isomo.", "assignments.upcoming": "Biri Kuza",
    "common.subject": "Isomo", "common.title": "Umutwe", "common.dueDate": "Itariki ntarengwa", "common.status": "Uko Bihagaze",
    "title.notifications": "Amatangazo", "title.canvas": "Ikayi Rusanya", "title.settings": "Igenamiterere",

    "common.loading": "Birimo gupakira…", "common.search": "Shakisha", "common.searchEllipsis": "Shakisha…",
    "common.save": "Bika", "common.saveChanges": "Bika Impinduka", "common.cancel": "Hagarika",
    "common.back": "Subira Inyuma", "common.view": "Reba", "common.download": "Kuramo", "common.upload": "Kohereza",
    "common.submit": "Ohereza", "common.post": "Sohora", "common.enroll": "+ Iyandikishe", "common.enrolled": "✓ Wiyandikishije",
    "common.allSubjects": "Amasomo Yose", "common.allGrades": "Ibyiciro Byose",
    "common.email": "Aderesi Imeyili", "common.password": "Ijambobanga", "common.confirmPassword": "Emeza Ijambobanga",
    "common.firstName": "Izina", "common.lastName": "Irindi Zina", "common.school": "Ishuri",
    "common.grade": "Icyiciro", "common.bio": "Amakuru Bwite", "common.public": "Rusange", "common.private": "Byihariye",
    "common.searchByTitle": "Shakisha ukoresheje umutwe…", "common.searchCourses": "Shakisha amasomo…",

    "auth.loginTab": "Kwinjira", "auth.registerTab": "Kwiyandikisha",
    "auth.welcomeBack": "Ikaze Bugarutse", "auth.signInToContinue": "Injira wige ubundi",
    "auth.createAccount": "Fungura Konti", "auth.joinPlatform": "Injira muri Abahizi",
    "auth.yourPassword": "Ijambobanga ryawe", "auth.min8chars": "Byibura inyuguti 8",
    "auth.reenterPassword": "Ongera wandike ijambobanga", "auth.role": "Uruhare",
    "auth.student": "Umunyeshuri", "auth.facilitator": "Umwarimu", "auth.administrator": "Umuyobozi",
    "auth.optional": "(bitegetswe)", "auth.forgotPassword": "Wibagiwe ijambobanga?",
    "auth.loginBtn": "Kwinjira", "auth.signingIn": "Kwinjira…",
    "auth.createAccountBtn": "Fungura Konti", "auth.creatingAccount": "Kurema konti…",
    "auth.yourSchoolName": "Izina ry'ishuri ryawe", "auth.gradeExample": "urugero: S4",
    "auth.invalidCredentials": "Imeyili cyangwa ijambobanga sibyo.", "auth.passwordMin8": "Ijambobanga rigomba kuba rifite byibura inyuguti 8.",
    "auth.passwordsNoMatch": "Amagambobanga ntabwo ahuye.", "auth.registrationFailed": "Kwiyandikisha byanze. Ongera ugerageze.",

    "courses.enrolled": "Amasomo Wiyandikishijeho", "courses.browse": "Reba Amasomo Yose", "courses.public": "Amasomo Rusange",
    "courses.invitations": "Ubutumire", "courses.title": "Amasomo Yanjye",
    "courses.subtitle": "Gucunga amasomo wiyandikishijeho no kuvumbura izindi nyigisho.",
    "courses.joinPrivate": "Injira mu Isomo Ryihariye", "courses.joinPrivateSub": "Ufite kode y'ubutumire? Yinjize hano kugira ngo winjire.",
    "common.join": "Injira",
    "courses.privateInviteOnly": "Byihariye — Gutumirwa gusa", "courses.progress": "Iterambere",
    "courses.enrolledClickToView": "✓ Wiyandikishije — Kanda urebe", "courses.enrolling": "Kwiyandikisha…",
    "courses.enrolledToast": "Wiyandikishije neza!", "courses.enrollFailedToast": "Ntibyashobotse kwiyandikisha.",

    "resources.browseBySubject": "Shakisha ukurikije Isomo", "resources.textbooks": "Ibitabo",
    "resources.pastPapers": "Ibizamini Byahise", "resources.uploaded": "Byoherejwe",
    "resources.title": "Ibikoresho & Isomero",
    "resources.subtitle": "Shakisha, bika, kandi ubone ibikoresho by'amasomo.", "resources.browse": "Shakisha",
    "common.filters": "Muyunguruzi", "common.reset": "Subiza",

    "settings.profile": "Umwirondoro", "settings.changePassword": "Hindura Ijambobanga",
    "settings.language": "Ururimi", "settings.displayLanguage": "Ururimi rwo Kwerekana",
    "settings.title": "Igenamiterere & Umwirondoro",

    "dashboard.welcome": "Ikaze Bugarutse! 👋", "dashboard.welcomeSub": "Dore incamake y'ibyigisho byawe uyu munsi.",
    "dashboard.activeCourses": "Amasomo Ukurikirana", "dashboard.upcomingAssignments": "Imyitozo Iri Imbere",
    "dashboard.submitted": "Byoherejwe", "dashboard.notifications": "Amatangazo",

    "cd.home": "Ahabanza", "cd.syllabus": "Gahunda y'Isomo", "cd.modules": "Ibice", "cd.assignments": "Imyitozo",
    "cd.grades": "Amanota", "cd.people": "Abantu", "cd.discussions": "Ibiganiro",
    "cd.announcements": "Amatangazo", "cd.courseChat": "Ikiganiro cy'Isomo", "cd.backToCourses": "← Amasomo",
    "cd.peopleGroups": "Abantu & Amatsinda", "cd.members": "Abanyamuryango", "cd.groups": "Amatsinda",
    "cd.newDiscussion": "+ Ikiganiro Gishya", "cd.discussionTitlePlaceholder": "Umutwe w'ikiganiro…",
    "cd.whatsOnYourMindPlaceholder": "Utekereza iki?…", "cd.selectWeekOrBook": "← Hitamo icyumweru cyangwa igitabo",
    "cd.writeMessagePlaceholder": "Andika ubutumwa… (Enter kugira ngo wohereze, Shift+Enter umurongo mushya)",
    "cd.courseResources": "📖 Ibikoresho by'Isomo", "cd.yourSubmission": "📤 Icyo Wohereje",
    "cd.textTab": "Inyandiko", "cd.linkDriveTab": "Ihuza rya Urubuga", "cd.uploadPdfTab": "Ohereza Dosiye",
    "cd.yourAnswer": "Igisubizo Cyawe", "cd.writeAnswerPlaceholder": "Andika igisubizo cyawe hano…",
    "cd.websiteLink": "Ihuza rya Site / Google Drive", "cd.uploadFileLabel": "Ohereza Dosiye", "cd.submitAssignment": "Ohereza Umwitozo",
    "cd.backToAssignments": "← Subira ku Myitozo", "cd.noDescription": "Nta bisobanuro bihari kuri iri somo.",
    "cd.taughtBy": "Wigishwa na", "cd.yourProgress": "Iterambere Ryawe", "cd.passed": "✓ Byatsinzwe",
    "cd.retake": "↩ Ongera Ugerageze", "cd.inProgress": "Birakomeza", "cd.percentComplete": "byarangiye",
    "cd.modulesCount": "ibice", "cd.assignmentsCount": "imyitozo",

    "facilitator.mySubjects": "Amasomo Yanjye", "facilitator.myStudents": "Abanyeshuri Banjye",
    "facilitator.activeAssignments": "Imyitozo Ikora", "facilitator.pendingGrading": "Bitegereje Gutegwa",
    "facilitator.recentSubmissions": "Ibyoherejwe Vuba", "facilitator.upcomingDueDates": "Igihe cyo Gutanga Kiri Imbere",
    "facilitator.quickActions": "Ibikorwa Byihuse", "facilitator.createSubject": "+ Kora Isomo",
    "facilitator.loadingSubjects": "Birimo gupakira amasomo…", "facilitator.createAssignment": "+ Kora Umwitozo",
    "facilitator.all": "Byose", "facilitator.needsGrading": "Bikeneye Gutegwa",
    "facilitator.searchStudents": "Shakisha abanyeshuri…", "facilitator.loadingStudents": "Birimo gupakira abanyeshuri…",
    "facilitator.studentProgress": "Iterambere ry'Abanyeshuri", "facilitator.loadingProgressData": "Birimo gupakira amakuru…",
    "facilitator.uploadResource": "📤 Ohereza Igikoresho", "facilitator.uploadPdf": "Ohereza PDF",
    "facilitator.markAllRead": "Menya Byose Nkasomye", "facilitator.noNotifications": "Nta matangazo.",
    "facilitator.profileInfo": "Amakuru y'Umwirondoro", "facilitator.newSubject": "+ Isomo Rishya",
    "facilitator.newAssignment": "+ Umwitozo Mushya", "facilitator.messageStudents": "✉ Ohereza Ubutumwa",
    "facilitator.browseResources": "📖 Reba Ibikoresho",

    "admin.userManagement": "Gucunga Abakoresha", "admin.courseManagement": "Gucunga Amasomo",
    "admin.assignmentOversight": "Gukurikirana Imyitozo", "admin.platformSettings": "Igenamiterere rya Porogaramu",
    "admin.controlPanel": "Ikibaho cy'Umuyobozi", "admin.manageSubtitle": "Cunga abakoresha, amasomo, ukurikirane ibikorwa bya porogaramu.",
    "admin.totalUsers": "Abakoresha Bose", "admin.students": "Abanyeshuri", "admin.facilitators": "Abarimu",
    "admin.submissions": "Ibyoherejwe", "admin.pendingApprovals": "Bitegereje Kwemezwa", "admin.recentUsers": "Abakoresha Bashya",
    "admin.manageUsers": "👤 Cunga Abakoresha", "admin.reviewCourses": "📚 Suzuma Amasomo",
    "admin.sendAnnouncement": "✉ Ohereza Itangazo", "admin.viewResources": "📖 Reba Ibikoresho",
    "admin.allRoles": "Uruhare Rwose", "admin.admins": "Abayobozi", "admin.searchUsers": "Shakisha abakoresha…",
    "admin.name": "Izina", "admin.role": "Uruhare", "admin.status": "Imiterere", "admin.actions": "Ibikorwa",
    "admin.allStatus": "Imiterere Yose", "admin.pendingApproval": "Bitegereje Kwemezwa", "admin.approved": "Byemejwe",
    "admin.title": "Umutwe", "admin.subject": "Isomo", "admin.enrolled": "Biyandikishije", "admin.facilitator": "Umwarimu",
    "admin.compose": "+ Andika", "admin.inbox": "Ubutumwa Bwinjiye", "admin.sent": "Byoherejwe",
    "admin.noMessages": "Nta butumwa.", "admin.noSentMessages": "Nta butumwa bwoherejwe.",
    "admin.adminProfile": "Umwirondoro w'Umuyobozi", "admin.platformInfo": "Amakuru ya Porogaramu",
    "admin.platformInfoText": "Abahizi Platform – Sisitemu Nyarwanda y'Uburezi bw'Icyiciro cya Kabiri",
    "admin.version": "Version 1.0.0", "admin.editUser": "Hindura Umukoresha", "admin.to": "Kuri (ID y'Umukoresha)",
    "admin.composeMessage": "Andika Ubutumwa", "admin.message": "Ubutumwa", "admin.send": "Ohereza",
  },
};

const I18N_LANG_KEY = "hw_lang";

function getLang() {
  return localStorage.getItem(I18N_LANG_KEY) || "en";
}

function t(key) {
  const lang = getLang();
  return (I18N_DICT[lang] && I18N_DICT[lang][key]) || I18N_DICT.en[key] || key;
}

function setLang(code) {
  if (!I18N_DICT[code]) return;
  localStorage.setItem(I18N_LANG_KEY, code);
  applyTranslations();
}

function applyTranslations(root) {
  root = root || document;
  const lang = getLang();
  document.documentElement.lang = lang;

  root.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  document.querySelectorAll(".lang-sel").forEach(sel => { sel.value = lang; });
}

document.addEventListener("DOMContentLoaded", () => applyTranslations());
