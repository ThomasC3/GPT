//
//  LoginResponse.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct LoginResponse: Codable {

    let id: String
    let firstName: String
    let lastName: String
    let displayName: String
    let email: String
    let zip: String
    let gender: String?
    let dob: String?
    let phone: String?
    let isTemporaryPassword: Bool
    let locations: [String]
    let accessToken: String
    let isOnline: Bool
}
