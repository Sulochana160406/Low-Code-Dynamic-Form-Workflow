import { createContext, useContext, useEffect, useState } from "react";

const LANGUAGE_KEY = "formcraft_language";

export const translations = {
  en: {
    dashboard: "Dashboard",
    createForm: "Create Form",
    formsList: "Forms List",
    responses: "Responses",
    auditLog: "Audit Log",
    settings: "Settings",
    logout: "Logout",
    dashboardSubtitle: "Smart Form Builder with Dynamic Logic",
    activeForms: "Active Forms",
    submissionsToday: "Submissions Today",
    avgCompletion: "Avg Completion",
    formsListTitle: "Forms List",
    formsListSubtitle: "Manage all your forms from one place",
    searchByTitle: "Search by title",
    profile: "Profile",
    appearance: "Appearance",
    darkMode: "Dark mode",
    language: "Language",
    edit: "Edit",
    analytics: "Analytics",
    duplicate: "Duplicate",
    publish: "Publish",
    archive: "Archive",
    view: "View",
    shareSettings: "Share & Settings",
    delete: "Delete",
    status: "Status",
    actions: "Actions",
    title: "Title",
    description: "Description",
    totalForms: "Total Forms",
    publishedForms: "Published Forms",
    draftForms: "Draft Forms",
    totalResponses: "Total Responses",
    recentForms: "Recent Forms",
    viewAll: "View all",
    welcomeBack: "Welcome back — here's what's happening with your forms.",
    id: "ID",
  },
  te: {
    dashboard: "డాష్‌బోర్డ్",
    createForm: "ఫారం సృష్టించండి",
    formsList: "ఫారాల జాబితా",
    responses: "స్పందనలు",
    auditLog: "ఆడిట్ లాగ్",
    settings: "సెట్టింగ్‌లు",
    logout: "లాగ్ అవుట్",
    dashboardSubtitle: "డైనమిక్ లాజిక్‌తో స్మార్ట్ ఫారం బిల్డర్",
    activeForms: "యాక్టివ్ ఫారాలు",
    submissionsToday: "ఈరోజు స్పందనలు",
    avgCompletion: "సగటు పూర్తి రేటు",
    formsListTitle: "ఫారాల జాబితా",
    formsListSubtitle: "మీ ఫారాలన్నీ ఒకే చోట నిర్వహించండి",
    searchByTitle: "పేరుతో వెతకండి",
    profile: "ప్రొఫైల్",
    appearance: "రూపురేఖలు",
    darkMode: "డార్క్ మోడ్",
    language: "భాష",
    edit: "సవరించు",
    analytics: "విశ్లేషణ",
    duplicate: "నకలు చేయి",
    publish: "ప్రచురించు",
    archive: "ఆర్కైవ్",
    view: "చూడండి",
    shareSettings: "షేర్ & సెట్టింగ్‌లు",
    delete: "తొలగించు",
    status: "స్థితి",
    actions: "చర్యలు",
    title: "శీర్షిక",
    description: "వివరణ",
    totalForms: "మొత్తం ఫారాలు",
    publishedForms: "ప్రచురించిన ఫారాలు",
    draftForms: "డ్రాఫ్ట్ ఫారాలు",
    totalResponses: "మొత్తం స్పందనలు",
    recentForms: "ఇటీవలి ఫారాలు",
    viewAll: "అన్నీ చూడండి",
    welcomeBack: "స్వాగతం — మీ ఫారాల తాజా స్థితి ఇక్కడ ఉంది.",
    id: "ఐడి",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    createForm: "फॉर्म बनाएं",
    formsList: "फॉर्म सूची",
    responses: "प्रतिक्रियाएं",
    auditLog: "ऑडिट लॉग",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",
    dashboardSubtitle: "डायनामिक लॉजिक के साथ स्मार्ट फॉर्म बिल्डर",
    activeForms: "सक्रिय फॉर्म",
    submissionsToday: "आज की प्रतिक्रियाएं",
    avgCompletion: "औसत पूर्णता",
    formsListTitle: "फॉर्म सूची",
    formsListSubtitle: "अपने सभी फॉर्म एक ही जगह प्रबंधित करें",
    searchByTitle: "शीर्षक से खोजें",
    profile: "प्रोफ़ाइल",
    appearance: "रूप",
    darkMode: "डार्क मोड",
    language: "भाषा",
    edit: "संपादित करें",
    analytics: "विश्लेषण",
    duplicate: "डुप्लिकेट करें",
    publish: "प्रकाशित करें",
    archive: "संग्रहित करें",
    view: "देखें",
    shareSettings: "शेयर व सेटिंग्स",
    delete: "हटाएं",
    status: "स्थिति",
    actions: "कार्रवाई",
    title: "शीर्षक",
    description: "विवरण",
    totalForms: "कुल फॉर्म",
    publishedForms: "प्रकाशित फॉर्म",
    draftForms: "ड्राफ्ट फॉर्म",
    totalResponses: "कुल प्रतिक्रियाएं",
    recentForms: "हाल के फॉर्म",
    viewAll: "सभी देखें",
    welcomeBack: "स्वागत है — आपके फॉर्म की ताज़ा स्थिति यहां है।",
    id: "आईडी",
  },
};

function getInitialLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return saved && translations[saved] ? saved : "en";
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const setLanguage = (lang) => {
    if (translations[lang]) setLanguageState(lang);
  };

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback so components never crash if used outside the provider
    // (e.g. during a hot-reload edge case) — just behaves as English.
    return { language: "en", setLanguage: () => {}, t: (key) => translations.en[key] || key };
  }
  return ctx;
}