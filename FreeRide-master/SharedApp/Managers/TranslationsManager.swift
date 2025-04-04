//
//  TranslationsManager.swift
//  FreeRide
//

import Foundation
import Stripe

enum TranslationMode: Int {
    case toEn
    case toLocale
}

class TranslationsManager {
    
    static func getCurrentLanguage() -> String {
        return Locale.current.languageCode ?? "en";
    }
    
    static func getGenderOption(_ genderToTranslate: String?, translationMode: TranslationMode) -> String {
        guard let genderToTranslate = genderToTranslate else {
            return ""
        }
        #if RIDER
        for gender in genderOptions {
            let translatingToEn = translationMode == .toEn
            let genderToCompare = translatingToEn ? gender.localize() : gender.toEnglishVersion()
            if genderToCompare == genderToTranslate {
                return translatingToEn ? gender.toEnglishVersion() : gender.localize()
            }
        }
        #endif
        return genderToTranslate
    }
}
