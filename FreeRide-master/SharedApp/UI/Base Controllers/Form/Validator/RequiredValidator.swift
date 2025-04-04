//
//  RequiredValidator.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/3/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RequiredValidator: Validator {

    var priority: Int = 1

    init() {
        // Intentionally unimplemented
    }

    func isValid(_ value: String?) -> Bool {        
        if let value = value?.trimmingCharacters(in: .whitespaces), !value.isEmpty {
            return true
        }

        return false
    }

    func localizedDescription(_ value: String?, title: String?) -> String? {
        let text = title ?? "This field".localize()
        return "\(text) \("is required".localize())"
    }
}
