//
//  EmailValidator.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/3/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct EmailValidator: Validator {

    var priority: Int = 2

    private let regex: NSRegularExpression

    init() {
        // the regex used in the HTML5 WC3 spec
        let pattern = "^[A-Z0-9a-z.!#$%&'*+/=?^_`{|}~-]+@([A-Za-z0-9-]+\\.)+[A-Za-z]+$"

        do {
            regex = try NSRegularExpression(pattern: pattern, options: .caseInsensitive)
        } catch {
            fatalError("Failure to create email validator regex \(error)")
        }
    }

    func isValid(_ email: String?) -> Bool {
        guard let email = email, !email.isEmpty else {
            return false
        }

        let range = NSRange(location: 0, length: email.count)
        return regex.firstMatch(in: email, options: [], range: range) != nil
    }

    func localizedDescription(_ email: String?, title: String?) -> String? {
        return "Email address is not valid".localize()
    }
}
