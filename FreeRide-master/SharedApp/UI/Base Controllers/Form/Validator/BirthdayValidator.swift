//
//  BirthdayValidator.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/12/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct BirthdayValidator: Validator {

    /// Date formatter for server dates in "yyyy-MM-dd" format, i.e., used for date of birth.
    public static let serverDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()

    public static let displayDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MM/dd/yyyy"
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()

    private static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0) ?? .current
        return calendar
    }()

    var priority: Int = 2

    func isValid(_ dob: String?) -> Bool {
        guard let dob = dob, !dob.isEmpty else {
            return false
        }

        guard let date = Self.displayDateFormatter.date(from: dob) else {
            return false
        }

        let now = Date()
        guard let sixteenYearsAgo = Self.calendar.date(byAdding: .year, value: -16, to: now) else {
            return false
        }

        return date <= sixteenYearsAgo
    }

    func localizedDescription(_ dob: String?, title: String?) -> String? {
        guard let dob = dob, !dob.isEmpty else {
            return "Date of Birth is required".localize()
        }

        guard Self.displayDateFormatter.date(from: dob) != nil else {
            return "Invalid date format".localize()
        }

        return "You must be at least 16 years of age".localize()
    }
}
