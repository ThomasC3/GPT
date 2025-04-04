//
//  BatteryValidator.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 18/10/2023.
//  Copyright © 2023 Circuit. All rights reserved.
//

import Foundation

struct BatteryValidator: Validator {

    var priority: Int = 1

    init() {
        // Intentionally unimplemented
    }

    func isValid(_ value: String?) -> Bool {
        if let value = value?.trimmingCharacters(in: .whitespaces), let batteryPercentage = Int(value), batteryPercentage >= 0, batteryPercentage <= 100 {
            return true
        }

        return false
    }

    func localizedDescription(_ value: String?, title: String?) -> String? {
        let text = title ?? "This field".localize()
        return "\(text) \("is not valid percentage number".localize())"
    }
}
