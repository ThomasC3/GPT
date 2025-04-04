//
//  Survey.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 28/03/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import Foundation

protocol Survey {

    var trackingEventName: String { get }

    var title: String { get }

    var questions: [String] { get }
    var localizedQuestions: [String] { get }

    var storageKeyname: String { get }
    func shouldAskForSurvey() -> Bool
    func markHasAnswered()

}

extension Survey {

    var localizedQuestions: [String] {
        return questions.map { $0.localize() }
    }

}
