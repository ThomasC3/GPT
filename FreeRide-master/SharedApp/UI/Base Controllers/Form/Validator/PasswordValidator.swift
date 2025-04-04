//
//  PasswordValidator.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/3/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct PasswordValidator: Validator {

    var priority: Int = 2

    struct Options: OptionSet {

        public let rawValue: Int

        public init(rawValue: Int) {
            self.rawValue = rawValue
        }

        static let none = Options([])
        static let eightCharacters = Options(rawValue: 1)
        static let uppercaseCharacter = Options(rawValue: 2)
        static let numberCharacter = Options(rawValue: 4)
        static let specialCharacter = Options(rawValue: 8)

        // the option set required to pass validation
        static let valid: Options = [
            // TODO: Determine criteria
//            eightCharacters, uppercaseCharacter, numberCharacter, specialCharacter
            eightCharacters
        ]

        // an array of options for display in ui
        static let validOptions: [Options] = [
            eightCharacters, uppercaseCharacter, numberCharacter, specialCharacter
        ]
    }

    init() {
        // intentionally unimplemented
    }

    func validate(_ password: String?) -> Options {
        var options: Options = .none

        guard let password = password, !password.isEmpty else {
            return options
        }

        if Options.valid.contains(.eightCharacters), password.count >= 8 {
            options.insert(.eightCharacters)
        }

        if Options.valid.contains(.uppercaseCharacter), password.rangeOfCharacter(from: .uppercaseLetters) != nil {
            options.insert(.uppercaseCharacter)
        }

        let specialCharacters = CharacterSet.alphanumerics.inverted

        if Options.valid.contains(.specialCharacter), password.rangeOfCharacter(from: specialCharacters) != nil {
            options.insert(.specialCharacter)
        }

        if Options.valid.contains(.numberCharacter), password.rangeOfCharacter(from: .decimalDigits) != nil {
            options.insert(.numberCharacter)
        }

        return options
    }

    func isValid(_ password: String?) -> Bool {
        return validate(password) == .valid
    }

    func localizedDescription(_ password: String?, title: String?) -> String? {
        let options = validate(password)
        if !options.contains(.eightCharacters) {
            return "Password must be at least 8 characters".localize()
        } else if !options.contains(.uppercaseCharacter) {
            return "Password must contain at least 1 uppercase letter".localize()
        } else if !options.contains(.specialCharacter) {
            return "Password must contain at least 1 special character".localize()
        } else if !options.contains(.numberCharacter) {
            return "Password must contain at least 1 number".localize()
        } else {
            return nil
        }
    }
}
