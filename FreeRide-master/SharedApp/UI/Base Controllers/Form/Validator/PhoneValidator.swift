//
//  PhoneValidator.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/12/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct PhoneValidator: Validator {

    var priority: Int = 2

    func isValid(_ phone: String?) -> Bool {
        guard let phone = phone, !phone.isEmpty else {
            return false
        }

        do {
            let detector = try NSDataDetector(types: NSTextCheckingResult.CheckingType.phoneNumber.rawValue)
            let matches = detector.matches(in: phone, options: [], range: NSMakeRange(0, phone.count))
            if let res = matches.first {
                return res.resultType == .phoneNumber && res.range.location == 0 && res.range.length == phone.count
            } else {
                return false
            }
        } catch {
            return false
        }
    }

    func localizedDescription(_ phone: String?, title: String?) -> String? {
        return "Mobile phone number is not valid".localize()
    }
}
