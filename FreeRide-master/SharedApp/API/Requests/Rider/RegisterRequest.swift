//
//  RegisterRequest.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RegisterRequest: Codable {

    let firstName: String?
    let lastName: String?
    let email: String?
    let password: String?
    let zip: String?
    let gender: String?
    let dob: String?
    let phone: String?
    let countryCode: String?
    let google: String?
    let apple: String?

    var isValidRequest: Bool {
        guard firstName != nil, lastName != nil, email != nil, zip != nil, gender != nil, dob != nil, phone != nil else {
            return false
        }

        guard password != nil || google != nil || apple != nil else {
            return false
        }

        return true
    }
}
