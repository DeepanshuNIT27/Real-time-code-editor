import React from "react";

// Supported languages with Judge0 language IDs
// Har language ka ek unique ID hota hai Judge0 mein
const LANGUAGES = [
  { id: 71, name: "Python" },
  { id: 63, name: "JavaScript" },
  { id: 54, name: "C++" },
  { id: 62, name: "Java" },
  { id: 50, name: "C" },
  { id: 60, name: "Go" },
  { id: 72, name: "Ruby" },
];

const LanguageSelector = ({ selectedLanguage, onLanguageChange }) => {
  return (
    <select
      className="languageSelector"
      value={selectedLanguage}
      onChange={(e) => onLanguageChange(Number(e.target.value))}
    >
      {/* Har language ko dropdown mein dikhao */}
      {LANGUAGES.map((lang) => (
        <option key={lang.id} value={lang.id}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};

export default LanguageSelector;
export { LANGUAGES };
