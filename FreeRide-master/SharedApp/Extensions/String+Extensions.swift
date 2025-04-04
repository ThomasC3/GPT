//
//  String+Extensions.swift
//  FreeRide
//

import Foundation

extension String {
    
    func utcStringToDate() -> Date {
        let utcDateFormatter = DateFormatter()
        utcDateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        utcDateFormatter.timeZone = TimeZone(abbreviation: "UTC")
        
        guard let date = utcDateFormatter.date(from: self) else {
            return Date()
        }
        
        return date
    }
    
    func utcStringToLocalMonthAndDay() -> String {
        let localDateFormatter = DateFormatter()
        localDateFormatter.timeZone = TimeZone.current
        localDateFormatter.dateFormat = "MMM d"
        return localDateFormatter.string(from: self.utcStringToDate())
    }
    
    func utcStringToLocalHour() -> String {
        let localDateFormatter = DateFormatter()
        localDateFormatter.timeZone = TimeZone.current
        localDateFormatter.dateFormat = "h:mm a"
        return localDateFormatter.string(from: self.utcStringToDate())
    }
    
    func localize() -> String {
        #if RIDER
        return NSLocalizedString(self, comment: "")
        #elseif DRIVER
        return self
        #endif
    }
    
    func toEnglishVersion() -> String {
        guard let path = Bundle.main.path(forResource: "en", ofType: "lproj"), let bundle = Bundle(path: path) else {
            return self.localize()
        }
        return NSLocalizedString(self, bundle: bundle, comment: "")
    }
    
    func capitalizingFirstLetter() -> String {
        return prefix(1).capitalized + dropFirst()
    }

    mutating func capitalizeFirstLetter() {
        self = self.capitalizingFirstLetter()
    }

    public func trim() -> String {
        return trimmingCharacters(in: CharacterSet.whitespaces)
    }

    public func isBlank() -> Bool {
        return trim() == ""
    }

}
