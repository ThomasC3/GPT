//
//  HowWouldYouHaveMadeThisTripSurvey.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 28/03/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import Foundation

class HowWouldYouHaveMadeThisTripSurvey: Survey {

    let uniqueCode = "HWYHMTT"

    // GA4 - Event name requirements: Event name must contain only letters, numbers, or underscores, maximum supported length is 40.
    let trackingEventName = "survey_how_would_you_have_made_the_trip"

    let title: String = "If this service wasn’t available, how would you have made this trip?".localize()

    let questions = surveyHowWouldYouHaveMadeThisTripOptions

    var storageKeyname: String {
        return "hasAnsweredSurveyWithId_\(uniqueCode)"
    }

    /// Ask for a survey once every year.
    func shouldAskForSurvey() -> Bool {
        // Retrieve the stored date
        guard let lastSurveyDate = UserDefaults.standard.object(forKey: storageKeyname) as? Date else {
            // If there is no stored date, then this is the first time, so we should ask for the survey
            return true
        }

        let calendar = Calendar.current
        let currentDate = Date()
        // Check if the current date is at least a year after the last survey date
        if let nextSurveyDate = calendar.date(byAdding: .year, value: 1, to: lastSurveyDate), nextSurveyDate <= currentDate {
            // It's been a year or more since the last survey, so we should ask for the survey
            return true
        }

        // It's not been a year yet, so we shouldn't ask for the survey
        return false
    }

    func markHasAnswered() {
        let currentDate = Date()
        return UserDefaults.standard.set(currentDate, forKey: storageKeyname)
    }

}
