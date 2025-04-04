//
//  FAQResponse.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct FAQResponse: Codable {

    let id: String
    let question: String
    let answer: String

    init(question: String, answer: String) {
        id = ""
        self.question = question
        self.answer = answer
    }
}
