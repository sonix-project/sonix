import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import translations from "../i18n/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("ar");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("language").then((saved) => {
      if (saved && (saved === "ar" || saved === "en")) setLang(saved);
      setLoading(false);
    });
  }, []);

  const changeLanguage = useCallback(async (newLang) => {
    setLang(newLang);
    await AsyncStorage.setItem("language", newLang);
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      let str = translations[lang]?.[key] || translations.en?.[key] || key;
      Object.keys(params).forEach((p) => {
        str = str.replace(new RegExp(`\\{${p}\\}`, "g"), params[p]);
      });
      return str;
    },
    [lang]
  );

  const isArabic = useMemo(() => lang === "ar", [lang]);

  const value = useMemo(() => ({ lang, changeLanguage, t, isArabic, loading }), [lang, changeLanguage, t, isArabic, loading]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
